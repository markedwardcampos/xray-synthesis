import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { synthesizeProject } from "@/lib/synthesizer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  console.log(`[Synthesize] Starting synthesis for project: ${projectId}`);

  try {
    // 1. Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // 2. Update project status
    await supabase
      .from("projects")
      .update({ status: "processing" })
      .eq("id", projectId);

    // 3. Get all processed items for this project
    const { data: items, error: itemsError } = await supabase
      .from("processed_items")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_synthesis", false);

    if (itemsError || !items || items.length === 0) {
      await supabase
        .from("projects")
        .update({ status: "failed" })
        .eq("id", projectId);

      return NextResponse.json(
        { error: "No processed items found for project" },
        { status: 400 }
      );
    }

    console.log(`[Synthesize] Found ${items.length} items to synthesize`);

    // 4. Run synthesis
    const synthesisResult = await synthesizeProject(project.name, items);

    // 5. Store synthesis as new processed_item
    const { data: synthesisItem, error: insertError } = await supabase
      .from("processed_items")
      .insert({
        project_id: projectId,
        team_id: project.team_id,
        is_synthesis: true,
        title: `Synthesis: ${project.name}`,
        key_insights: synthesisResult.key_insights || [],
        action_items: synthesisResult.action_items || [],
        themes: synthesisResult.themes || [],
        synthesis_narrative: synthesisResult.synthesis_narrative || "",
        contradictions: synthesisResult.contradictions || [],
        next_steps: synthesisResult.next_steps || [],
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Synthesize] Error storing synthesis:", insertError);
      await supabase
        .from("projects")
        .update({ status: "failed" })
        .eq("id", projectId);

      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    // 6. Update project with synthesis_id and mark completed
    await supabase
      .from("projects")
      .update({
        synthesis_id: synthesisItem.id,
        status: "completed",
      })
      .eq("id", projectId);

    console.log(`[Synthesize] Successfully synthesized project ${projectId}`);

    return NextResponse.json({
      success: true,
      synthesisId: synthesisItem.id,
      synthesis: synthesisResult,
    });
  } catch (error: any) {
    console.error("[Synthesize] Error:", error);

    await supabase
      .from("projects")
      .update({ status: "failed" })
      .eq("id", projectId);

    return NextResponse.json(
      { error: error.message || "Synthesis failed" },
      { status: 500 }
    );
  }
}
