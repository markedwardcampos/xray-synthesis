/**
 * Platform-specific scraping rules for different LLM share links
 */

export interface ScrapingRules {
  // Platform identifier
  platform: 'chatgpt' | 'gemini' | 'claude' | 'perplexity' | 'unknown';
  
  // URL pattern to detect this platform
  urlPattern: RegExp;
  
  // Selectors to remove (modals, overlays, sign-in gates)
  overlaySelectors: string[];
  
  // Selectors to try for content extraction (in priority order)
  contentSelectors: string[];
  
  // Regex patterns to filter out noise from extracted text
  noisePatterns: RegExp[];
  
  // Minimum character threshold to consider extraction successful
  minContentLength: number;
  
  // Custom extraction logic (optional)
  customExtractor?: string; // JavaScript code as string for Browserless
}

export const SCRAPING_RULES: ScrapingRules[] = [
  // ChatGPT
  {
    platform: 'chatgpt',
    urlPattern: /chatgpt\.com/i,
    overlaySelectors: [
      'div[class*="modal"]',
      'div[class*="Modal"]',
      'div[data-headlessui-state]',
      'a[href*="/auth/login"]',
      'a[href*="/signup"]',
    ],
    contentSelectors: [
      'article',  // ChatGPT uses multiple <article> tags
      'main[class*="react-scroll"]',
      'div[class*="conversation"]',
      'main',
    ],
    noisePatterns: [
      /Skip to content/g,
      /ChatGPT\s*Log in\s*Sign up/g,
      /Get smarter responses.*?Log in.*?Sign up for free/g,
      /ChatGPT is AI and can make mistakes/g,
    ],
    minContentLength: 500,
    customExtractor: `
      // ChatGPT-specific: extract all article elements
      const articles = Array.from(document.querySelectorAll('article'));
      if (articles.length > 0) {
        return articles.map(a => a.innerText).join('\\n---\\n');
      }
      return null;
    `,
  },
  
  // Gemini
  {
    platform: 'gemini',
    urlPattern: /gemini\.google\.com/i,
    overlaySelectors: [
      'div[role="dialog"]',
      'div[role="presentation"]',
      '.mS787c', // Google Account Overlay
      '.idpc',   // Identity picker
      'iframe[src*="google.com/gsi"]',
      '#credential_picker_container',
    ],
    contentSelectors: [
      '.conversation-container',
      'main',
      '.chat-history',
      'article',
    ],
    noisePatterns: [
      /Sign in.*?Google/g,
      /Use Gemini at work\?/g,
    ],
    minContentLength: 500,
  },
  
  // Claude (Anthropic) - preparing for future use
  {
    platform: 'claude',
    urlPattern: /claude\.ai/i,
    overlaySelectors: [
      'div[role="dialog"]',
      'div[class*="modal"]',
      'button[aria-label*="close"]',
    ],
    contentSelectors: [
      '[data-testid="conversation"]',
      'main',
      'article',
    ],
    noisePatterns: [
      /Sign up.*?Claude/g,
      /Log in to Claude/g,
    ],
    minContentLength: 500,
  },
  
  // Perplexity - preparing for future use
  {
    platform: 'perplexity',
    urlPattern: /perplexity\.ai/i,
    overlaySelectors: [
      'div[role="dialog"]',
      'div[class*="modal"]',
    ],
    contentSelectors: [
      '[class*="thread"]',
      'main',
      'article',
    ],
    noisePatterns: [
      /Sign up.*?Perplexity/g,
    ],
    minContentLength: 500,
  },
];

/**
 * Detect platform from URL and return matching rules
 */
export function detectPlatform(url: string): ScrapingRules {
  const matchedRule = SCRAPING_RULES.find(rule => rule.urlPattern.test(url));
  
  if (matchedRule) {
    return matchedRule;
  }
  
  // Fallback to generic rules
  return {
    platform: 'unknown',
    urlPattern: /.*/,
    overlaySelectors: [
      'div[role="dialog"]',
      'div[role="presentation"]',
    ],
    contentSelectors: ['main', 'article', 'body'],
    noisePatterns: [],
    minContentLength: 100,
  };
}
