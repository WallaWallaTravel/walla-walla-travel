#!/bin/bash

echo "🎭 PLAYWRIGHT MCP SETUP SCRIPT"
echo "================================"
echo ""

# Define paths
CONFIG_DIR="$HOME/Library/Application Support/Claude"
CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
BACKUP_FILE="$CONFIG_DIR/claude_desktop_config.backup.$(date +%Y%m%d-%H%M%S).json"

# Check if config directory exists
if [ ! -d "$CONFIG_DIR" ]; then
    echo "❌ Error: Claude config directory not found"
    echo "   Expected: $CONFIG_DIR"
    exit 1
fi

# Backup existing config if it exists
if [ -f "$CONFIG_FILE" ]; then
    echo "✅ Found existing config, creating backup..."
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    echo "   Backup saved: $BACKUP_FILE"
else
    echo "⚠️  No existing config found, creating new one..."
fi

# Create new config with Playwright MCP
echo "✅ Creating new config with Playwright MCP..."
cat > "$CONFIG_FILE" << 'ENDCONFIG'
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgres://u5eq260aalmaff:pe7531a627c8b4fcccfe9d643266e3f1c1e7a8446926e469883569321509eb8a3@cduf3or326qj7m.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/dcb898ojc53b18"
      ]
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/temp/walla-walla-final"
      ]
    },
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@executeautomation/playwright-mcp-server"
      ]
    }
  }
}
ENDCONFIG

echo "   Config updated: $CONFIG_FILE"

# Verify JSON syntax
echo "✅ Verifying configuration..."
if command -v python3 &> /dev/null; then
    if python3 -m json.tool "$CONFIG_FILE" > /dev/null 2>&1; then
        echo "   ✅ JSON syntax is valid"
    else
        echo "   ❌ JSON syntax error!"
        exit 1
    fi
else
    echo "   ⚠️  Cannot verify JSON (python3 not found)"
fi

# Check if playwright MCP is available via npx
echo "✅ Checking Playwright MCP installation..."
if command -v npx &> /dev/null; then
    # Try to get the package info
    if npx -y @executeautomation/playwright-mcp-server --version &> /dev/null 2>&1; then
        echo "   ✅ @executeautomation/playwright-mcp-server is available via npx"
    else
        echo "   ⚠️  Package will be downloaded on first use"
    fi
else
    echo "   ❌ npx not found - install Node.js first!"
    exit 1
fi

echo ""
echo "🎉 SETUP COMPLETE!"
echo ""
echo "Next steps:"
echo "1. Quit Claude Desktop (Cmd+Q)"
echo "2. Reopen Claude Desktop"
echo "3. Start a new chat"
echo "4. Ask: 'Do you have Playwright MCP?'"
echo ""
echo "Production URL to test:"
echo "https://walla-walla-travel.up.railway.app"
echo ""
