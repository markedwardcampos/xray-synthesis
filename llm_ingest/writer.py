import re
import shutil
from datetime import datetime
from pathlib import Path
from .config import VAULT_DIR, ATTACHMENTS_DIR

def sanitize_filename(title: str) -> str:
    s = re.sub(r'[<>:"/\\|?*]', '', title)
    return s.strip()

def get_unique_path(base_path: Path) -> Path:
    if not base_path.exists():
        return base_path
    counter = 1
    while True:
        new_path = base_path.with_name(f"{base_path.stem} ({counter}){base_path.suffix}")
        if not new_path.exists():
            return new_path
        counter += 1

def write_note_sync(analysis: dict, original_source: str, staging_dir: Path = None) -> Path:
    """
    Formats the analysis and syncs images to the Vault.
    Returns the final note path.
    """
    date_str = datetime.now().strftime('%Y-%m-%d')
    topic = analysis.get('topic', 'Untitled Insight')
    safe_title = sanitize_filename(topic)
    filename = f"{date_str} - {safe_title}.md"
    
    target_path = VAULT_DIR / filename
    final_path = get_unique_path(target_path)
    # Extract unique ID for attachments (use timestamp or path stem)
    vault_id = f"{date_str}_{int(datetime.now().timestamp())}"
    
    tags = analysis.get('tags', [])
    tags_str = ", ".join(tags)
    
    # Handle Attachments
    attachment_links = ""
    if staging_dir:
        staged_imgs = staging_dir / "images"
        if staged_imgs.exists():
            vault_img_dir = ATTACHMENTS_DIR / vault_id
            images = list(staged_imgs.glob("*"))
            if images:
                vault_img_dir.mkdir(parents=True, exist_ok=True)
                attachment_links = "\n## Attachments\n"
                for img in images:
                    dest = vault_img_dir / img.name
                    shutil.copy2(img, dest)
                    # Obsidian internal link
                    attachment_links += f"![[Resources/AI_Attachments/{vault_id}/{img.name}]]\n"

    # Handle optional code snippet
    code_block = ""
    if analysis.get('code_snippet'):
        code_block = f"\n## Artifacts\n```\n{analysis['code_snippet']}\n```\n"

    # Construct Content
    content = f"""---
date: {date_str}
source: {original_source}
tags: [{tags_str}]
status: unverified
---
# {topic}

## Context
{analysis.get('problem_context', '')}

## The Solution
{analysis.get('solution_insight', '')}
{code_block}{attachment_links}
## Blog Post draft
{analysis.get('blog_post', '')}
"""

    with open(final_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    return final_path
