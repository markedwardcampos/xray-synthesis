import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { scrapeShareLink } from "@/lib/scraper";
import { analyzeContent } from "@/lib/analyzer";
import { uploadToGCS } from "@/lib/gcs";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { queueItemId } = body;

    // 1. Get next pending item (priority first, or specific item)
    let query = supabase
      .from("ingest_queue")
      .select("*")
      .eq("status", "pending");

    if (queueItemId) {
      // Process specific item (for instant mode)
      query = query.eq("id", queueItemId);
    } else {
      // Get highest priority item first
      query = query.order("priority", { ascending: false }).order("created_at", { ascending: true });
    }

    const { data: queueItem, error: fetchError } = await query.limit(1).single();

    if (fetchError || !queueItem) {
      return NextResponse.json({ message: "No pending items" });
    }

    // 2. Mark as processing
    const updateActivity = async (activity: string) => {
      await supabase
        .from("ingest_queue")
        .update({ status: "processing", last_activity: activity })
        .eq("id", queueItem.id);
    };

    await updateActivity("Initializing worker...");

    try {
      // 3. Scrape
      console.log(`[Worker] Scraping URL: ${queueItem.url}`);
      await updateActivity("Scraping content and capturing assets...");
      
      // Cache busting
      const scrapeUrl = queueItem.url.includes('?') 
        ? `${queueItem.url}&_cb=${Date.now()}` 
        : `${queueItem.url}?_cb=${Date.now()}`;

      const scrapeData = await scrapeShareLink(scrapeUrl);
      console.log(`[Worker] Scrape successful. Text: ${scrapeData.text.length}, Images: ${scrapeData.images.length}`);

      // 4. Store Raw Content in GCS
      await updateActivity("Archiving raw content to GCS...");
      const rawPath = `raw/${queueItem.id}/${Date.now()}.html`;
      const rawUrl = await uploadToGCS(rawPath, scrapeData.fullHtml, "text/html");

      // 5. Store Assets in GCS and track in assets array
      await updateActivity(`Uploading ${scrapeData.images.length} images to GCS...`);
      const assetRefs: any[] = [];
      for (const img of scrapeData.images) {
        try {
          const imgExt = img.contentType.split('/')[1] || 'img';
          const imgHash = uuidv4().slice(0, 8);
          const imgPath = `assets/${queueItem.id}/${imgHash}.${imgExt}`;
          const imgBuffer = Buffer.from(img.base64, 'base64');
          const imgUrl = await uploadToGCS(imgPath, imgBuffer, img.contentType);
          
          assetRefs.push({
            original_url: img.url,
            gcs_path: imgPath,
            content_type: img.contentType,
            team_id: queueItem.team_id
          });
        } catch (imgErr) {
          console.error(`[Worker] Failed image upload:`, imgErr);
        }
      }

      // 6. Analyze
      console.log(`[Worker] Analyzing content with Gemini...`);
      await updateActivity("Synthesizing with Gemini 3 Flash...");
      const analysis = await analyzeContent(scrapeData.text);
      console.log(`[Worker] Analysis complete: ${analysis.title}`);

      // 7. Store result in Supabase
      await updateActivity("Finalizing synthesis and saving to DB...");
      const { data: processedItem, error: storeError } = await supabase
        .from("processed_items")
        .insert([{
          original_url: queueItem.url,
          title: analysis.title,
          summary: analysis.summary,
          content_markdown: analysis.content_markdown,
          metadata: analysis.metadata,
          team_id: queueItem.team_id,
          raw_content_path: rawPath
        }])
        .select()
        .single();

      if (storeError) throw storeError;

      // 8. Link assets to processed_item
      if (assetRefs.length > 0 && processedItem) {
        const assetsToInsert = assetRefs.map(a => ({
          ...a,
          processed_item_id: processedItem.id
        }));
        await supabase.from("assets").insert(assetsToInsert);
      }

      // 9. Mark as completed
      await supabase
        .from("ingest_queue")
        .update({ status: "completed" })
        .eq("id", queueItem.id);

      return NextResponse.json({ success: true, item: analysis, assets: assetRefs.length });

    } catch (procError: any) {
      console.error("[Worker] Process Error:", procError);
      // Mark as failed
      await supabase
        .from("ingest_queue")
        .update({ 
          status: "failed", 
          error_message: procError.message,
          last_activity: `FAILED: ${procError.message}`
        })
        .eq("id", queueItem.id);
      
      return NextResponse.json({ 
        error: procError.message, 
        stack: procError.stack,
        activity: "process_failed"
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("[Worker] Critical Error:", error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack,
      activity: "critical_system_failure"
    }, { status: 500 });
  }
}
