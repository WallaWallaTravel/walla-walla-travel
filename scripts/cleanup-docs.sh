#!/bin/bash
# Documentation Cleanup Script
# Run from project root: bash cleanup-docs.sh

echo "🧹 Starting documentation cleanup..."

# Create archive directory
mkdir -p docs/archive

# Move to archive (historical value)
echo "📦 Archiving historical docs..."
mv TDD_VICTORY.md docs/archive/ 2>/dev/null
mv TDD-IMPLEMENTATION.md docs/archive/ 2>/dev/null
mv TDD-STATUS.md docs/archive/ 2>/dev/null
mv QUALITY_SYSTEM_SETUP.md docs/archive/ 2>/dev/null
mv SETUP_COMPLETE.md docs/archive/ 2>/dev/null
mv SECURITY.md docs/archive/ 2>/dev/null
mv security-test-results.md docs/archive/ 2>/dev/null

# Move to docs/ (reorganize)
echo "📁 Reorganizing documentation..."
mv MOBILE_UI_COMPLETE.md docs/MOBILE_COMPONENTS.md 2>/dev/null

# Delete outdated files
echo "❌ Deleting outdated documentation..."
rm -f STATUS.md
rm -f ACTUAL-STATUS.md
rm -f DOCUMENTATION_UPDATE.md
rm -f WORKING-APP-GUIDE.md
rm -f QUICK_START.md
rm -f API-TEST-GUIDE.md
rm -f DEPLOY-TO-RENDER-GUIDE.md
rm -f DEPLOYMENT-SUCCESS.md
rm -f PYTHON-API-DEPLOYMENT.md
rm -f PYTHON-MIGRATION-ANALYSIS.md
rm -f QUICK-DEPLOY-INSTRUCTIONS.md
rm -f UPDATE-REACT-GUIDE.md

# Clean up temporary files
rm -f DOCUMENTATION_AUDIT.md
rm -f CLEANUP_PROGRESS.md

echo "✅ Cleanup complete!"
echo ""
echo "📚 New structure:"
echo "├── README.md (update needed)"
echo "├── MASTER_STATUS.md"
echo "├── CONTEXT_CARD.md"
echo "├── REVIEW_SUMMARY.md"
echo "└── docs/"
echo "    ├── ARCHITECTURE.md"
echo "    ├── SETUP.md"
echo "    ├── CODE_REVIEW.md"
echo "    ├── MOBILE_COMPONENTS.md"
echo "    └── archive/ (7 files)"
