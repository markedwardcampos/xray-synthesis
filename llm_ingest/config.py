import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv(Path(__file__).parent.parent / '.env')

# API Keys
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

# Paths
BASE_DIR = Path('/Users/mark/Documents/Code.nosync/Brain.Mark.Digital Posting Improvements') # Keeping path for now, but project is XRay Synthesis
INGEST_DIR = BASE_DIR / 'Chat_Ingest'
ARCHIVE_DIR = INGEST_DIR / 'archive'
STAGING_DIR = BASE_DIR / 'llm_ingest' / 'scraped'
VAULT_DIR = Path('/Users/mark/Documents/Code.nosync/pkm/1 - Rough Notes/AI Ingest')
ATTACHMENTS_DIR = VAULT_DIR.parent.parent / 'Resources' / 'AI_Attachments'
PROCESSED_IDS_FILE = BASE_DIR / 'llm_ingest' / 'processed_ids.json'

# Ensure directories exist
INGEST_DIR.mkdir(parents=True, exist_ok=True)
ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
STAGING_DIR.mkdir(parents=True, exist_ok=True)
VAULT_DIR.mkdir(parents=True, exist_ok=True)
ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)

# 2026 Model Selection
# Using Claude Sonnet 4.5 (200k Context)
MODEL_NAME = "claude-sonnet-4-5-20250929"
