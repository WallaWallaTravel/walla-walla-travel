#!/bin/bash

# WALLA WALLA TRAVEL - GITHUB SETUP SCRIPT
# Run this to initialize Git and push to GitHub

echo "🚀 Setting up Git repository for Walla Walla Travel..."

# Step 1: Initialize Git (if not already done)
if [ ! -d .git ]; then
  echo "📦 Initializing Git repository..."
  git init
  echo "✅ Git initialized"
else
  echo "✅ Git already initialized"
fi

# Step 2: Configure Git (optional, update with your info)
echo "⚙️ Configuring Git..."
git config user.name "Walla Walla Travel"
git config user.email "owner@wallawallatravel.com"

# Step 3: Add all files
echo "📝 Adding all files..."
git add .

# Step 4: Create initial commit
echo "💾 Creating initial commit..."
git commit -m "Initial commit: Walla Walla Travel driver management system

- Next.js 15 app with driver portal
- Heroku Postgres database integration
- Pre-trip and post-trip inspection pages
- Time card system database schema
- FMCSA compliance documentation
- Ready for mobile optimization"

# Step 5: Add GitHub remote
echo ""
echo "🌐 Now create your GitHub repository:"
echo "1. Go to: https://github.com/new"
echo "2. Repository name: walla-walla-travel"
echo "3. Description: Driver management system for wine tour transportation"
echo "4. Select: Private (recommended for business app)"
echo "5. DO NOT initialize with README (we already have files)"
echo "6. Click 'Create repository'"
echo ""
echo "Once created, run these commands:"
echo ""
echo "git remote add origin https://github.com/WallaWallaTravel/walla-walla-travel.git"
echo "git branch -M main"
echo "git push -u origin main"
echo ""
echo "✅ Setup complete! Your code is ready to push to GitHub."
