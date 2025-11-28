#!/bin/bash
set -e

echo "🚀 Starting MARS://NEXUS Server..."
echo "📋 Environment: ${NODE_ENV:-development}"
echo "🔌 PORT: ${PORT:-8080}"
echo "📁 Working directory: $(pwd)"
echo "📦 Node version: $(node --version)"
echo "📦 NPM version: $(npm --version)"

# Verify the dist/index.js file exists
if [ ! -f "dist/index.js" ]; then
  echo "❌ ERROR: dist/index.js not found!"
  echo "📁 Contents of current directory:"
  ls -la
  echo "📁 Contents of dist directory (if exists):"
  ls -la dist/ 2>/dev/null || echo "dist directory does not exist"
  exit 1
fi

echo "✅ Found dist/index.js"
echo "📊 File size: $(ls -lh dist/index.js | awk '{print $5}')"

# Start the server
echo "🌐 Starting server..."
exec node dist/index.js

