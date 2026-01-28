import { analyzeContent } from "./analyzer";

interface SynthesisInput {
  title: string;
  key_insights: string[];
  action_items: string[];
  themes: string[];
}

export async function synthesizeProject(
  projectName: string,
  items: SynthesisInput[]
): Promise<any> {
  console.log(`[Synthesizer] Starting synthesis for project: ${projectName}`);
  console.log(`[Synthesizer] Combining ${items.length} conversations`);

  // Build comprehensive synthesis prompt
  const conversationSummaries = items.map((item, i) => `
=== Conversation ${i + 1}: ${item.title} ===

Key Insights:
${item.key_insights.map(insight => `• ${insight}`).join('\n')}

Action Items:
${item.action_items.map(action => `• ${action}`).join('\n')}

Themes:
${item.themes.map(theme => `• ${theme}`).join('\n')}
  `).join('\n---\n');

  const prompt = `You are synthesizing ${items.length} related conversations into a cohesive narrative for a project called "${projectName}".

${conversationSummaries}

Create a comprehensive synthesis that:
1. **Identifies overarching themes** across all conversations
2. **Consolidates key insights** (merge similar, highlight unique)
3. **Unifies action items** (remove duplicates, prioritize)
4. **Provides a cohesive narrative** linking the conversations
5. **Highlights contradictions** or differing perspectives if any exist
6. **Suggests next steps** based on the combined insights

Output ONLY valid JSON (no markdown, no code blocks) with this structure:
{
  "key_insights": ["insight 1", "insight 2", ...],
  "action_items": ["action 1", "action 2", ...],
  "themes": ["theme 1", "theme 2", ...],
  "contradictions": ["contradiction 1 if any", ...],
  "synthesis_narrative": "A 2-3 paragraph cohesive summary that ties everything together",
  "next_steps": ["recommended next step 1", ...]
}`;

  // Use existing analyzer infrastructure
  const parsed = await analyzeContent(prompt);

  console.log(`[Synthesizer] Successfully synthesized ${items.length} conversations`);
  
  return parsed;
}
