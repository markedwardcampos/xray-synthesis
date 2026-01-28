import axios from "axios";
import { detectPlatform } from "./scraping-rules";

const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN!;

export async function scrapeShareLink(url: string) {
  console.log(`[Scraper] Starting advanced scrape for: ${url}`);
  
  // Detect platform and get rules
  const rules = detectPlatform(url);
  console.log(`[Scraper] Detected platform: ${rules.platform}`);
  
  // Build the Browserless function dynamically based on rules
  const scraperFunction = `
export default async function({ page, context }) {
  const { url, rules } = context;
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  console.log('Page loaded, removing overlays...');

  // Remove overlays based on platform rules
  await page.evaluate((overlaySelectors) => {
    const removeOverlays = () => {
      overlaySelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });
      // Force scrollability
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    };

    removeOverlays();
    // Repeat every 1s for dynamic overlays
    setInterval(removeOverlays, 1000);
  }, ${JSON.stringify(rules.overlaySelectors)});

  // Wait for content to render
  await new Promise(r => setTimeout(r, 3000));

  // Image Interception
  const images = [];
  page.on('response', async (response) => {
    const ct = response.headers()['content-type'] || '';
    if (ct.startsWith('image/') && !response.url().includes('pixel') && !response.url().includes('icon')) {
      try {
        const buffer = await response.buffer();
        if (buffer.length > 2000) {
          images.push({
            url: response.url(),
            contentType: ct,
            base64: buffer.toString('base64')
          });
        }
      } catch (e) {}
    }
  });

  // Infinite Scroll
  let lastHeight = await page.evaluate('document.body.scrollHeight');
  for (let i = 0; i < 20; i++) {
    await page.mouse.wheel(0, 4000);
    await new Promise(r => setTimeout(r, 1500));
    let newHeight = await page.evaluate('document.body.scrollHeight');
    if (newHeight === lastHeight) break;
    lastHeight = newHeight;
  }

  // Extract Content using platform-specific logic
  const text = await page.evaluate((contentSelectors, customExtractor, noisePatterns) => {
    // Try custom extractor first (for ChatGPT)
    if (customExtractor) {
      try {
        const extractorFn = new Function('return ' + customExtractor)();
        const result = extractorFn();
        if (result && result.length > 500) {
          // Apply noise filtering
          let cleaned = result;
          noisePatterns.forEach(pattern => {
            cleaned = cleaned.replace(new RegExp(pattern, 'g'), '');
          });
          return cleaned.trim();
        }
      } catch (e) {
        console.log('Custom extractor failed:', e.message);
      }
    }

    // Fallback to selector-based extraction
    for (const sel of contentSelectors) {
      const elements = document.querySelectorAll(sel);
      if (elements.length > 0) {
        let content = Array.from(elements).map(el => el.innerText).join('\\n---\\n');
        
        // Apply noise filtering
        noisePatterns.forEach(pattern => {
          content = content.replace(new RegExp(pattern, 'g'), '');
        });
        
        content = content.trim();
        if (content.length > 500) {
          return content;
        }
      }
    }
    
    return document.body.innerText;
  }, ${JSON.stringify(rules.contentSelectors)}, ${JSON.stringify(rules.customExtractor || '')}, ${JSON.stringify(rules.noisePatterns.map(p => p.source))});

  const title = await page.title();
  const html = await page.content();

  return { 
    data: { title, html, text, images },
    type: "application/json"
  };
};
`;

  // Call Browserless with the dynamic function
  const response = await axios.post(
    `https://chrome.browserless.io/function?token=${BROWSERLESS_TOKEN}`,
    {
      code: scraperFunction,
      context: { url, rules }
    },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 120000,
    }
  );

  if (!response.data || !response.data.data) {
    throw new Error("Invalid Browserless response");
  }

  const { title, html, text, images } = response.data.data;
  
  console.log(`[Scraper] Scraped ${text?.length || 0} characters and ${images?.length || 0} images`);
  
  return {
    title: title || "Untitled",
    text: text || "",
    fullHtml: html || "",
    images: images || [],
  };
}
