import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { url, team_id, mode, project_id } = await request.json();

    if (!url || !team_id) {
      return NextResponse.json(
        { error: "URL and Team ID are required" },
        { status: 400 }
      );
    }

    // Validate mode
    const processingMode = mode || "instant"; // Default to instant
    if (!["instant", "project"].includes(processingMode)) {
      return NextResponse.json(
        { error: "Mode must be 'instant' or 'project'" },
        { status: 400 }
      );
    }

    // If project mode, project_id is required
    if (processingMode === "project" && !project_id) {
      return NextResponse.json(
        { error: "project_id required for project mode" },
        { status: 400 }
      );
    }

    // Insert into queue
    const insertData: any = {
      url,
      team_id,
      status: "pending",
      priority: processingMode === "instant", // Instant gets priority
    };

    if (project_id) {
      insertData.project_id = project_id;
    }

    const { data, error } = await supabase
      .from("ingest_queue")
      .insert([insertData])
      .select();

    if (error) throw error;

    const queueItem = data[0];

    // If instant mode, trigger processing immediately
    if (processingMode === "instant") {
      console.log(`[Ingest] Triggering instant processing for ${queueItem.id}`);
      
      // Trigger worker asynchronously (don't wait for response)
      fetch(`${request.url.replace('/ingest', '/process')}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueItemId: queueItem.id }),
      }).catch((err) => {
        console.error("[Ingest] Failed to trigger instant processing:", err);
      });
    }

    return NextResponse.json({
      data: queueItem,
      mode: processingMode,
      message:
        processingMode === "instant"
          ? "Processing started"
          : "Added to project queue",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
