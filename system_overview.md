# System Overview: XRay Synthesis v3

> **Handover Notice**: This document serves as the "Source of Truth" for transitioning from the local Python pipeline to a public-facing Next.js/Supabase application.

## 1. Core Objectives
- **Mine Signal from Noise**: Transform ephemeral LLM conversations (Share Links) into permanent, structured Obsidian assets.
- **Pragmatic Persona**: Maintain the "Pragmatic Architect" voice—technical, 1st-person, economical, and systems-focused.
- **Atomic Reliability**: Every ingest must be idempotent and race-condition-proof.

## 2. Technical Logic (Python Baseline)
| Component | Logic | Key Feature |
| :--- | :--- | :--- |
| **Parser** | Playwright (Async) | Infinite scroll (150 steps), image interception, hash-based deduplication. |
| **Analyzer** | `google-genai` (v1beta) | Pydantic validation, Gemini 3 Flash, Adaptive Synthesis (complexity scales length). |
| **Watcher** | Atomic Rename | Locks files by renaming to `.processing` before scraping starts. |

## 3. The "Pragmatic Architect" Prompt
The core synthesis engine uses the following persona rules:
- **Strategic vs. Tactical**: "The Solution" field explains the *Why* (theory), while "Artifacts" provides the *How* (technical reference).
- **Evolution of Thought**: For long logs, document the process of discovery and how the solution shifted over time.
- **Voice**: Direct, intellectually honest, Wittiness as a de-pressurizer, no marketing fluff.

## 4. Infrastructure for Phase 2 (XRay Synthesis)
You are moving to a **Next.js (App Router) + Supabase + Vercel** stack.

### Staged API Tokens
- **Supabase**: `sbp_4f4b05c4...`
- **Browserless**: `2TsATEnEsx...`
- **Vercel**: `RmLvaGEpYr...`
- **Gemini**: (Existing in [.env](file:///Users/mark/Documents/Code.nosync/Brain.Mark.Digital%20Posting%20Improvements/.env))

### Key Transitions Required:
1. **Queue System**: Move from [watcher.py](file:///Users/mark/Documents/Code.nosync/Brain.Mark.Digital%20Posting%20Improvements/watcher.py) (filesystem) to a Supabase `ingest_queue` table.
2. **Scraping**: Refactor Playwright to run via **Browserless.io** (websockets) to avoid Vercel Function timeouts.
3. **Database**: Store `processed_ids` and "Scraped Content" in Postgres instead of local JSON/Folders.
4. **Auth**: Use Supabase Auth for your personal subdomain access.

---
**Next Step**: Create a new thread and paste: *"I want to build Phase 2 of XRay Synthesis. Here is the system_overview.md from my previous architect session."*
