
const axios = require('axios');

const BROWSERLESS_TOKEN = "2TsATEnEsxWHKirfff8f204a1d7b76338518024b98a30064f";
const GEMINI_API_KEY = "AIzaSyABPwFa2-ntPp58yyjxbD-gVU94tyJaMyE";

async function testScraper(url) {
    console.log(`[Test] Scraping ${url}...`);
    try {
        const response = await axios.post(
            `https://chrome.browserless.io/content?token=${BROWSERLESS_TOKEN}`,
            {
                url,
                waitForSelector: { selector: "body" },
            }
        );
        console.log(`[Test] Scraped length: ${response.data.length}`);
        return response.data;
    } catch (err) {
        console.error(`[Test] Scraper failed: ${err.message}`);
        if (err.response) console.error(err.response.data);
    }
}

async function testAnalyzer(content) {
    console.log(`[Test] Analyzing content...`);
    try {
        const prompt = `
            You are the "Pragmatic Architect"—technical, 1st-person, economical, and systems-focused.
            Synthesize the following content into JSON with fields: title, summary, solution, artifacts, metadata.
            Content: ${content.substring(0, 2000)}
        `;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,
            {
                contents: [{ parts: [{ text: `${prompt}\n\nContent: ${content.substring(0, 1000)}` }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                },
            }
        );
        console.log(`[Test] Analysis success: ${response.data.candidates[0].content.parts[0].text}`);
    } catch (err) {
        console.error(`[Test] Analyzer failed: ${err.message}`);
        if (err.response) console.error(err.response.data);
    }
}

(async () => {
    const url = "https://chatgpt.com/share/6797f76b-94c0-8009-847e-8c460d3d548f";
    const content = await testScraper(url);
    if (content) {
        await testAnalyzer(content);
    }
})();
