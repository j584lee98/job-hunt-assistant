#!/bin/bash
set -e

echo "🚀 Starting pre-deploy checks..."

echo "--------------------------------------------------"
echo "🎨 Checking Code Formatting..."
npm run check-format

echo "--------------------------------------------------"
echo "👀 Linting Code..."
npm run lint

echo "--------------------------------------------------"
echo "📘 Checking Types..."
npm run type-check

echo "--------------------------------------------------"
echo "🧪 Running Tests..."
npm run test

echo "--------------------------------------------------"
echo "✅ All checks passed! Ready for deployment."
