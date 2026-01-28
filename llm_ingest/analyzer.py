import json
from typing import List, Optional
from google import genai
from pydantic import BaseModel, Field, ValidationError
from .config import GEMINI_API_KEY

# Use v1beta for structured output support
client = genai.Client(
    api_key=GEMINI_API_KEY, 
    http_options={"api_version": "v1beta"}
)

PREFERRED_MODELS = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.0-flash-exp"]

def pick_model(client: genai.Client) -> str:
    """
    Dynamically discovers available models that support generateContent.
    """
    try:
        available = set()
        for m in client.models.list():
            if "generateContent" in getattr(m, "supported_actions", []):
                # m.name is like "models/gemini-3-flash-preview"
                available.add(m.name.replace("models/", ""))

        for name in PREFERRED_MODELS:
            if name in available:
                return name
        
        # Fallback to the first available if none of our preferred ones are found
        if available:
            return sorted(list(available))[0]
            
        raise RuntimeError("No Gemini models available for this API key.")
    except Exception as e:
        print(f"  ! Error listing models: {e}")
        # Final fallback to a sane default
        return "gemini-2.0-flash"

SYSTEM_PROMPT = """
You are the "Pragmatic Architect"—the professional, analytical, and grounded-in-systems persona for Mark's Digital Brain. 
Your goal is to "Destructure" conversation logs into permanent, high-value Obsidian notes.

## Content Segmentation Rules:
1. **The Solution (Strategic)**: Define the core conceptual shift or systemic insight. Why does the new way work better? Focus on inputs, constraints, and feedback loops.
2. **Artifacts (Tactical)**: The "Shippable" technical reference. Provide the checklist, recipe, code block, or sequence. This must be a drop-in asset for the user's daily life. 
3. **Blog Post (The Narrative)**: 
    - **Voice**: 1st person ("I", "my"). Pragmatic, not cynical. Nerdy, not elitist. No flowery adjectives.
    - **Adaptive Length**: If the log is a quick fix, keep it to 2-3 short paragraphs. 
    - **Evolution of Thought**: If the log is a multi-day conversation, describe the *process* of discovery. How did our understanding of the problem evolve? Use subheadings (###) to segment the timeline or thematic shifts.
4. **Signal vs. Noise**: Relentlessly strip away "Thanks", "Hello", or failed prompt attempts unless they illustrate a key learning about the system's failure modes.

## Output Format (Strict JSON):
{
  "topic": "Concise, technical Title Case summary.",
  "tags": ["specific", "tags"],
  "problem_context": "The specific operational challenge or technical bottleneck.",
  "solution_insight": "Strategic overview: The high-level systemic resolution.",
  "code_snippet": "Tactical artifact: The checklist, ratio, sequence, or code.",
  "blog_post": "Narrative reflection. 1st person. Adaptive length. Use ### Headings for long-form content."
}
"""

class KnowledgeMine(BaseModel):
    topic: str = Field(description="Title Case, technical summary.")
    tags: List[str]
    problem_context: str
    solution_insight: str
    code_snippet: Optional[str] = Field(None, description="The 'Utility' artifact. Code, sequence, or recipe.")
    blog_post: str = Field(description="1st-person technical reflection. Scale length to complexity.")

async def analyze_content_async(content: str) -> dict:
    """
    Sends the content to Gemini for extraction using structured output.
    Uses dynamic model selection to avoid 404s.
    """
    try:
        model_name = pick_model(client)
        print(f"  > Analyzing with Gemini model: {model_name}", flush=True)

        prompt = (
            SYSTEM_PROMPT
            + "\n\nAnalyze this conversation log and extract relevant insights.\n\n"
            + "Here is the conversation log to analyze:\n\n"
            + content[:700000] 
        )

        resp = await client.aio.models.generate_content(
            model=model_name,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_json_schema": KnowledgeMine.model_json_schema(),
                "temperature": 0,
            },
        )

        if not resp.text:
            raise ValueError("Empty response from Gemini")

        # Validate via Pydantic
        obj = KnowledgeMine.model_validate_json(resp.text)
        return obj.model_dump()

    except (ValidationError, json.JSONDecodeError, Exception) as e:
        print(f"Error during Gemini Analysis: {e}")
        return {
            "topic": "Processing Error",
            "tags": ["error", "automation"],
            "problem_context": "An error occurred during LLM analysis.",
            "solution_insight": str(e),
            "code_snippet": None,
            "blog_post": "Analysis failed."
        }
