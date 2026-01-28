import axios from "axios";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function analyzeContent(content: string) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing");

  const prompt = `
    You are the "Pragmatic Architect"—technical, 1st-person, economical, and systems-focused.
    Your goal is to synthesize the following LLM conversation into a structured Obsidian/Markdown asset.
    
    STRUCTURE:
    1. Frontmatter: date, source, tags (array), status (unverified).
    2. Header: # Title
    3. Context: Brief overview of the challenge.
    4. The Solution: Technical breakthroughs and insights (Theory).
    5. Blog Post draft: A narrative-style reflection for sharing (Execution).

    RULES:
    - Voice: Direct, intellectually honest, direct wittiness as a de-pressurizer, no marketing fluff.
    - breakthroughs: Focus on MANUFACTURING problems, Ops, and specific technical friction points.
    - Format: High-fidelity Markdown.

    ${content}
    
    Provide the output in JSON format with fields: 
    - title: (Short string)
    - summary: (1-2 sentences)
    - content_markdown: (The full structured markdown asset)
    - metadata: { tags: string[] }
  `;

  // Truncate content to avoid extremely large payloads (adjust as needed)
  const truncatedContent = content.substring(0, 30000);

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: `${prompt}\n\nContent: ${truncatedContent}` }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }
    );

    let text = response.data.candidates[0].content.parts[0].text;
    console.log("[Analyzer] Raw Response:", text);
    
    // Clean potential markdown wrapping
    text = text.replace(/```json\n?/, "").replace(/\n?```/, "").trim();
    
    return JSON.parse(text);
  } catch (err: any) {
    if (err.response) {
      console.error("[Analyzer] Gemini Error:", JSON.stringify(err.response.data));
    } else {
      console.error("[Analyzer] Error:", err.message);
    }
    throw err;
  }
}
