# Platform-Specific Scraping Rules

## Overview

The scraper now uses a **platform-specific rules system** that automatically detects the LLM platform from the URL and applies customized scraping logic. This makes it easy to handle different platforms' unique overlay systems, content structures, and noise patterns.

## Architecture

### Core Components

1. **`scraping-rules.ts`**: Configuration file defining rules for each platform
2. **`scraper.ts`**: Main scraper that detects platform and applies rules dynamically
3. **Platform Detection**: Automatic URL pattern matching

### Supported Platforms

| Platform | Detection | Status |
|----------|-----------|--------|
| **ChatGPT** | `chatgpt.com` | ✅ Fully tested |
| **Gemini** | `gemini.google.com` | ✅ Fully tested |
| **Claude** | `claude.ai` | 🚧 Prepared |
| **Perplexity** | `perplexity.ai` | 🚧 Prepared |

## Rule Structure

Each platform has a `ScrapingRules` object with:

```typescript
{
  platform: string;           // Platform identifier
  urlPattern: RegExp;         // URL detection regex
  overlaySelectors: string[]; // Elements to remove (modals, gates)
  contentSelectors: string[]; // Where to find content (priority order)
  noisePatterns: RegExp[];    // Text patterns to filter out
  minContentLength: number;   // Minimum chars to consider success
  customExtractor?: string;   // Optional custom JavaScript logic
}
```

## How It Works

### 1. Detection Phase
```typescript
const rules = detectPlatform(url);
// Returns matching rules or falls back to generic rules
```

### 2. Browserless Function Generation
The scraper dynamically builds a Browserless function that:
- Removes platform-specific overlays
- Scrolls to load all content
- Intercepts images
- Extracts content using platform-specific selectors
- Filters noise patterns

### 3. Content Extraction Strategy

**For ChatGPT:**
- Uses custom extractor to grab all `<article>` elements
- Joins them with separators
- Filters sign-in noise

**For Gemini:**
- Tries `.conversation-container`, `main`, `.chat-history`
- Falls back to generic selectors
- Removes Google sign-in prompts

**For Unknown Platforms:**
- Generic overlay removal
- Standard selectors: `main`, `article`, `body`
- Minimal noise filtering

## Adding a New Platform

1. **Add rules to `scraping-rules.ts`:**
```typescript
{
  platform: 'newplatform',
  urlPattern: /newplatform\.com/i,
  overlaySelectors: [
    'div.modal',
    'div.overlay',
  ],
  contentSelectors: [
    '.conversation',
    'main',
  ],
  noisePatterns: [
    /Sign up/g,
  ],
  minContentLength: 500,
}
```

2. **Test it:**
```bash
npx tsx test-platforms.js
```

That's it! No changes to `scraper.ts` needed.

## Custom Extractors

For platforms with unique DOM structures (like ChatGPT's multiple `<article>` tags), you can define custom extraction logic:

```typescript
customExtractor: `
  const articles = Array.from(document.querySelectorAll('article'));
  if (articles.length > 0) {
    return articles.map(a => a.innerText).join('\\n---\\n');
  }
  return null;
`
```

This executes in the Browserless context and returns extracted text.

## Testing Results

### ChatGPT
- ✅ Extracted **25,780 characters**
- ✅ No sign-in noise detected
- ✅ Full conversation captured
- 📊 12 article elements successfully merged

### Gemini
- ✅ Extracted **3,403 characters**
- ✅ No sign-in noise detected
- ✅ Full conversation captured

## Future Enhancements

1. **Per-platform custom scrolling logic** (some platforms load differently)
2. **Authentication token injection** (for private conversations)
3. **Rate limiting configuration** per platform
4. **Platform-specific image handling** (some platforms use base64, others CDN)
5. **Retry strategies** based on platform reliability

## Troubleshooting

### Content is empty
- Check if `contentSelectors` match the platform's DOM
- Increase `minContentLength` threshold
- Add more specific selectors

### Sign-in prompts in text
- Add patterns to `noisePatterns`
- Check if overlays are being removed

### Wrong platform detected
- Verify `urlPattern` regex
- Check URL normalization (http vs https)

## Configuration Reference

### Overlay Selectors (Common Patterns)
- `div[role="dialog"]` - Modals
- `div[role="presentation"]` - Overlays
- `iframe[src*="login"]` - Auth frames
- `a[href*="/signup"]` - Sign-up CTAs

### Content Selectors (Priority)
1. Platform-specific containers
2. Semantic HTML (`main`, `article`)
3. Generic fallbacks (`body`)

### Noise Patterns
Use simple regex with `/g` flag (ES2017 compatible):
- `/Sign up.*?account/g` - Sign-up prompts
- `/Log in/g` - Login prompts
- `/Cookie policy/g` - Legal text
