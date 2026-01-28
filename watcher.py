import sys
import time
import shutil
import asyncio
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from llm_ingest.config import INGEST_DIR, ARCHIVE_DIR
from llm_ingest import parser, analyzer, writer

class IngestHandler(FileSystemEventHandler):
    def __init__(self, loop):
        self.loop = loop

    def on_created(self, event):
        if event.is_directory:
            return
        filepath = Path(event.src_path)
        
        # Filter: Only process if it's NOT a .processing file and NOT hidden
        if filepath.name.startswith('.') or filepath.suffix == '.processing':
            return

        print(f"\n[DETECTED] New file: {filepath.name}", flush=True)
        # Schedule the async processing on the main loop
        asyncio.run_coroutine_threadsafe(self.process_file_async(filepath), self.loop)

    async def process_file_async(self, filepath: Path):
        # 0. Atomic Lock Strategy
        processing_path = filepath.with_suffix(filepath.suffix + '.processing')
        
        try:
            # Atomic rename serves as a lock
            # If this fails (e.g. file already gone), we just exit
            if not filepath.exists():
                return
            filepath.rename(processing_path)
            print(f"  > Locked: {processing_path.name}", flush=True)
        except Exception:
            # File might have been grabbed by another event fire
            return
            
        print(f"  > Processing...", flush=True)
        # Debounce/wait for write (though rename already happened)
        await asyncio.sleep(0.5)
        
        try:
            # 1. Parse (Async) - NOTE: parser now reads the .processing file
            content, staging_dir = await parser.parse_file_async(processing_path)
            
            if content is None:
                # Likely deduplicated or empty
                processing_path.unlink(missing_ok=True)
                return
                
            if not content.strip():
                print("  ! Text extraction failed or empty.", flush=True)
                processing_path.unlink(missing_ok=True)
                return

            print("  > Analyzing with Gemini 3 (Flash)...", flush=True)
            
            # 2. Analyze (Async)
            analysis = await analyzer.analyze_content_async(content)
            
            # 3. Write
            output_path = writer.write_note_sync(analysis, original_source=filepath.name, staging_dir=staging_dir)
            print(f"  [SUCCESS] Note created: {output_path}", flush=True)

            # 4. Archive (Move from .processing to archive)
            archive_path = ARCHIVE_DIR / filepath.name
            if archive_path.exists():
                archive_path = ARCHIVE_DIR / f"{filepath.stem}_{int(time.time())}{filepath.suffix}"
            
            shutil.move(str(processing_path), str(archive_path))
            print(f"  > Archived source file to {archive_path.name}", flush=True)

        except Exception as e:
            print(f"  [ERROR] Failed to process {filepath.name}: {e}", flush=True)
            # Cleanup on failure so we don't leave .processing files behind if possible
            if processing_path.exists():
                # On error, maybe move to an 'error' folder or just leave it?
                # For now let's just rename it back or to .error
                error_path = processing_path.with_suffix('.error')
                processing_path.rename(error_path)

async def main():
    print(f"Starting Ingest Watcher (Atomic + Gemini 3)...", flush=True)
    print(f"Watching: {INGEST_DIR}")
    print(f"Output: {writer.VAULT_DIR}")
    print("Press Ctrl+C to stop.")

    loop = asyncio.get_running_loop()
    event_handler = IngestHandler(loop)
    observer = Observer()
    observer.schedule(event_handler, str(INGEST_DIR), recursive=False)
    observer.start()

    try:
        while True:
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        observer.stop()
    
    observer.join()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
