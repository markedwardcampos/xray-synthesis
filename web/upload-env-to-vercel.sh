#!/bin/bash

# Upload all environment variables to Vercel
# This script reads from .env.local and uploads to Vercel

echo "📤 Uploading environment variables to Vercel..."

while IFS='=' read -r key value; do
  # Skip empty lines and comments
  [[ -z "$key" || "$key" =~ ^# ]] && continue
  
  # Remove quotes from value if present
  value=$(echo "$value" | sed 's/^"//;s/"$//')
  
  echo "Setting $key..."
  vercel env add "$key" production <<EOF
$value
EOF

done < .env.local

echo "✅ Environment variables uploaded!"
