require('dotenv').config({ path: '.env.local' });
const { scrapeShareLink } = require('./src/lib/scraper');

async function testAllPlatforms() {
  const tests = [
    {
      name: 'ChatGPT',
      url: 'https://chatgpt.com/share/6979ce62-35d4-8000-8593-06d4554ed681'
    },
    {
      name: 'Gemini',
      url: 'https://gemini.google.com/share/eff1327b1494'
    },
  ];

  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Testing ${test.name}`);
    console.log(`${'='.repeat(60)}\n`);
    
    try {
      const result = await scrapeShareLink(test.url);
      
      console.log(`✅ ${test.name} Scrape Successful!\n`);
      console.log(`📊 Results:`);
      console.log(`  Title: ${result.title}`);
      console.log(`  Text Length: ${result.text.length} chars`);
      console.log(`  HTML Length: ${result.fullHtml.length} chars`);
      console.log(`  Images: ${result.images.length}`);
      
      console.log(`\n📝 First 300 characters:`);
      console.log(result.text.substring(0, 300));
      console.log('...\n');
      
      // Quality checks
      if (result.text.includes('Sign up') || result.text.includes('Log in')) {
        console.log('⚠️  WARNING: Contains sign-in prompts');
      } else {
        console.log('✓ No sign-in noise detected');
      }
      
      if (result.text.length < 1000) {
        console.log('⚠️  WARNING: Very short text');
      } else {
        console.log('✓ Substantial content extracted');
      }
      
    } catch (err) {
      console.error(`❌ ${test.name} Failed:`, err.message);
    }
  }
}

testAllPlatforms();
