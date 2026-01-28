#!/bin/bash
# XRay Synthesis End-to-End Test Script

echo "🧪 Starting XRay Synthesis Pipeline Test..."
echo ""

# Step 1: Get the first team ID from Supabase
echo "📋 Step 1: Fetching team ID..."
TEAM_ID=$(npx -y tsx -e "
require('dotenv').config({path:'.env.local'});
const {createClient} = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
s.from('teams').select('id').limit(1).single().then(r => {
  if (r.data) console.log(r.data.id);
  else process.exit(1);
});
" 2>&1 | grep -v 'dotenv' | grep -v 'injecting' | tail -1)

if [ -z "$TEAM_ID" ]; then
  echo "❌ Failed to fetch team ID. Make sure you have a team created."
  exit 1
fi

echo "✅ Team ID: $TEAM_ID"
echo ""

# Step 2: Queue the test URL
TEST_URL="https://gemini.google.com/share/eff1327b1494"
echo "📥 Step 2: Queueing test URL..."
echo "   URL: $TEST_URL"

INGEST_RESPONSE=$(curl -s -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$TEST_URL\", \"team_id\": \"$TEAM_ID\"}")

echo "   Response: $INGEST_RESPONSE"
echo ""

# Step 3: Trigger the worker
echo "⚙️  Step 3: Triggering worker..."
PROCESS_RESPONSE=$(curl -s -X POST http://localhost:3000/api/process)

echo "   Response: $PROCESS_RESPONSE"
echo ""

echo "✨ Test initiated!"
echo ""
echo "👀 Now watch your browser at http://localhost:3000"
echo "   - The queue should show the item being processed"
echo "   - After ~30-60 seconds, it should appear in 'Recent Synthesis'"
echo ""
echo "🔍 To check GCS uploads after completion:"
echo "   https://console.cloud.google.com/storage/browser/xray-synthesis-assets?project=synthesis-485705"
