import json
import hashlib
import asyncio
import os
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright
from .config import STAGING_DIR, PROCESSED_IDS_FILE

IMAGE_CT_PREFIX = "image/"

def _safe_ext(content_type: str) -> str:
    ct = (content_type or "").split(";")[0].strip().lower()
    return {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "image/svg+xml": ".svg",
    }.get(ct, "")

def get_url_hash(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()[:16]

def is_already_processed(url: str) -> bool:
    if not PROCESSED_IDS_FILE.exists():
        return False
    try:
        with open(PROCESSED_IDS_FILE, 'r') as f:
            data = json.load(f)
            return get_url_hash(url) in data
    except:
        return False

def mark_as_processed(url: str):
    data = {}
    if PROCESSED_IDS_FILE.exists():
        try:
            with open(PROCESSED_IDS_FILE, 'r') as f:
                data = json.load(f)
        except:
            pass
    data[get_url_hash(url)] = True
    with open(PROCESSED_IDS_FILE, 'w') as f:
        json.dump(data, f)

async def scrape_text_and_images(url: str):
    """
    Scrapes text and images into a staged folder.
    Returns the path to the staging directory.
    """
    url_hash = get_url_hash(url)
    out_dir = STAGING_DIR / url_hash
    out_dir.mkdir(parents=True, exist_ok=True)
    img_dir = out_dir / "images"
    img_dir.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context()
        page = await ctx.new_page()

        async def on_response(resp):
            try:
                ct = (resp.headers.get("content-type") or "").lower()
                if not ct.startswith(IMAGE_CT_PREFIX):
                    return
                # Filter small icons/pixels
                if "pixel" in resp.url or "icon" in resp.url:
                    return
                
                body = await resp.body()
                if not body or len(body) < 1000: # Skip tiny images
                    return

                h = hashlib.sha256(resp.url.encode("utf-8")).hexdigest()[:12]
                ext = _safe_ext(ct) or ".img"
                path = img_dir / f"{h}{ext}"

                if not path.exists():
                    with open(path, "wb") as f:
                        f.write(body)
            except:
                pass

        page.on("response", on_response)
        
        print(f"    - Navigating to {url}...")
        try:
            # Use 'commit' or 'domcontentloaded' instead of 'networkidle' to avoid timeouts on heavy pages
            await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            
            # Wait for any of the common message containers
            selectors = [
              ".conversation-container", # Gemini
              "main",                    # ChatGPT
              ".chat-content",           # Generic
              "article"                  # Generic
            ]
            found = False
            for selector in selectors:
                try:
                    await page.wait_for_selector(selector, timeout=5000)
                    found = True
                    break
                except:
                    continue
            
            if not found:
                print("    ! Warning: Primary content container not found, proceeding with body.")

        except Exception as e:
            print(f"    ! Initial load failed: {e}. Trying to proceed anyway...")

        # Incremental Smart Scroll (Dynamic/Infinite)
        print("    - Performing dynamic scroll to capture massive conversation history...")
        
        # We use a larger max steps and check for stability
        max_scroll_steps = 150 
        stable_count = 0
        last_height = await page.evaluate("document.body.scrollHeight")
        
        for i in range(max_scroll_steps):
            # Scroll down
            await page.mouse.wheel(0, 3000)
            await asyncio.sleep(1.0) # Wait for page to react/lazy-load
            
            new_height = await page.evaluate("document.body.scrollHeight")
            
            # If height didn't change, we might be at the bottom or waiting for lazy load
            if new_height == last_height:
                stable_count += 1
                if stable_count >= 3: # Allow 3 attempts to be sure
                    break
            else:
                stable_count = 0 # Reset if we found new content
                if i % 5 == 0:
                    print(f"      > Scrolled {i} times, height: {new_height}...")
            
            last_height = new_height

        print(f"    - Scroll complete. Final height: {last_height}")

        title = await page.title()
        text = await page.evaluate("() => document.body?.innerText || ''")
        
        # Save staging files
        with open(out_dir / "page.txt", "w", encoding="utf-8") as f:
            f.write(f"TITLE: {title}\nURL: {url}\n\n{text}")

        await browser.close()

    return out_dir

async def parse_file_async(file_path: Path):
    """
    Async version of parser. Returns (content_string, optional_staging_dir).
    """
    if file_path.suffix == '.json':
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if isinstance(data, list) and len(data) > 0 and 'mapping' in data[0]:
            return extract_chatgpt_json(data), None
        return json.dumps(data, indent=2), None

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read().strip()
    
    if content.startswith('https://') and '\n' not in content and ' ' not in content:
        if is_already_processed(content):
            print(f"  ! URL already processed: {content}")
            return None, None
        
        staging_dir = await scrape_text_and_images(content)
        mark_as_processed(content)
        
        # Read the scraped text back for the analyzer
        with open(staging_dir / "page.txt", "r", encoding="utf-8") as f:
            return f.read(), staging_dir
            
    return content, None

def extract_chatgpt_json(data) -> str:
    text = ""
    for conv in data:
        title = conv.get('title', 'Unknown Title')
        text += f"\n\n# Conversation: {title}\n\n"
        mapping = conv.get('mapping', {})
        messages = []
        for key, value in mapping.items():
            msg = value.get('message')
            if msg and msg.get('content') and msg.get('create_time'):
                role = msg.get('author', {}).get('role', 'unknown')
                content_parts = msg['content'].get('parts', [])
                c_text = "".join([str(p) for p in content_parts if isinstance(p, str)])
                if c_text.strip():
                    messages.append({'time': msg['create_time'], 'role': role, 'text': c_text})
        messages.sort(key=lambda x: x['time'])
        for m in messages:
            text += f"**{m['role'].upper()}**: {m['text']}\n\n"
    return text
