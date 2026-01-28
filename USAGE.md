# LLM Ingest Pipeline Usage

## Quick Start
1. **Activate Environment**:
   `source .venv/bin/activate` or use `./.venv/bin/python` directly.

2. **Run Watcher**:
   ```bash
   python3 watcher.py
   ```

3. **Ingest**:
   - Save your chat logs (select text -> save as .txt, or use the Export feature) to:
   - `Chat_Ingest/` folder.

4. **Result**:
   - Structured notes appear in `Obsidian/1 - Rough Notes/AI Ingest`.
   - Source files move to `Chat_Ingest/archive`.

## Troubleshooting
- **No output?** Check the terminal where `watcher.py` is running for error logs.
- **API Error?** Check `.env` for valid `ANTHROPIC_API_KEY`.
- **JSON Parsing Error?** Ensure the `conversations.json` format matches standard ChatGPT exports.
