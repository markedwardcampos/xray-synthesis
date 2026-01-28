# XRay Synthesis

AI-powered conversational analysis and synthesis platform. Transform ChatGPT, Gemini, Claude, and Perplexity conversations into actionable insights and unified narratives.

## 🚀 Features

- **Dual-Mode Processing**: Instant single-conversation analysis or batch multiple related conversations into projects
- **Multi-Platform Support**: ChatGPT, Gemini, Claude, Perplexity with platform-specific scraping rules
- **Project Synthesis**: Combine multiple conversations into cohesive narratives with consolidated insights
- **Image Extraction**: Automatic screenshot capture and gallery display
- **Team Collaboration**: Shareable invite links (no email required)
- **Smart Analysis**: Gemini-powered extraction of key insights, action items, and themes

## 🏗️ Architecture

**Stack:**
- Next.js 16 (App Router, Turbopack)
- Supabase (Database, Auth, RLS)
- Google Cloud Storage (Raw content & assets)
- Browserless (Advanced web scraping)
- Gemini 2.0 Flash (AI analysis)

**Key Components:**
- `/src/app/api/ingest` - Queue management
- `/src/app/api/process` - Scraping & analysis worker
- `/src/app/api/projects` - Project synthesis
- `/src/lib/scraper.ts` - Platform-specific scraping
- `/src/lib/synthesizer.ts` - Multi-conversation synthesis

## 📦 Setup

### Prerequisites
- Node.js 18+
- Supabase account
- Google Cloud Storage bucket
- Browserless API token
- Gemini API key

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Browserless
BROWSERLESS_TOKEN=your_browserless_token

# Gemini
GEMINI_API_KEY=your_gemini_key

# Google Cloud Storage
GCP_PROJECT_ID=your_project_id
GCP_CLIENT_EMAIL=your_service_account_email
GCP_PRIVATE_KEY=your_private_key
GCS_BUCKET_NAME=your_bucket_name
```

### Database Schema

Run SQL files in order:
1. `/src/lib/schema_update.sql` - Base tables
2. `/src/lib/projects_schema.sql` - Projects & synthesis
3. `/src/lib/team_invites_schema.sql` - Team invites

### Installation

```bash
npm install
npm run dev
```

Build for production:
```bash
npm run build
```

## 🎯 Usage

### Instant Processing
1. Paste a conversation link
2. Click "Process Now"
3. View analysis with images

### Project Synthesis
1. Create a new project
2. Add multiple related conversations
3. Click "Synthesize Project"
4. Get unified insights across all conversations

### Team Collaboration
1. Click "Invite" to generate a shareable link
2. Share the code (e.g., `QMGW-ZBNS`)
3. Team members join at `/join?code=XXX`

## 📊 Platform Support

| Platform | Scraping | Images | Notes |
|----------|----------|--------|-------|
| ChatGPT | ✅ | ✅ | Custom article extractor |
| Gemini | ✅ | ✅ | Aggressive noise filtering |
| Claude | ✅ | ✅ | Standard content selectors |
| Perplexity | ✅ | ✅ | Answer-specific targeting |

## 🔧 Development

### Project Structure
```
/src
  /app
    /api          # API routes
    /projects     # Project pages
    /synthesis    # Analysis results
  /lib
    scraper.ts           # Web scraping
    scraping-rules.ts    # Platform configs
    synthesizer.ts       # Multi-conversation AI
    analyzer.ts          # Single conversation AI
    gcs.ts              # Cloud storage
```

### Adding New Platforms

Edit `/src/lib/scraping-rules.ts`:

```typescript
{
  name: "YourPlatform",
  urlPattern: /yourplatform\.com/,
  overlaySelectors: ["#modal", ".popup"],
  contentSelectors: ["main", ".content"],
  noiseFilters: [".ads", ".footer"]
}
```

## 🚀 Deployment

Deployed on Vercel: **https://web-swart-three-45.vercel.app**

Deploy your own:
```bash
vercel --prod
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

---

Built with ❤️ for making sense of AI conversations
