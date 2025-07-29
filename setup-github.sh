#!/bin/bash

echo "🚀 Setting up GitHub repository for Claude Code UI..."
echo ""

# Check if repository URL was provided
if [ -z "$1" ]; then
    echo "Usage: ./setup-github.sh <repository-url>"
    echo ""
    echo "Example:"
    echo "  ./setup-github.sh https://github.com/ignitabull18/claudecodeui.git"
    echo ""
    echo "Or run manually:"
    echo "  git remote add origin https://github.com/ignitabull18/claudecodeui.git"
    echo "  git branch -M main"
    echo "  git push -u origin main"
    exit 1
fi

REPO_URL="$1"

echo "📡 Adding remote origin: $REPO_URL"
git remote add origin "$REPO_URL"

echo "🌿 Setting main branch"
git branch -M main

echo "⬆️  Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Successfully pushed to GitHub!"
echo "🌐 Your repository is now available at: $REPO_URL"
echo ""
echo "🛡️ Enterprise compliance tooling is included:"
echo "  - Pre-commit hooks active"
echo "  - GitHub Actions CI configured"
echo "  - Compliance audit available: bun run audit:claude-compliance"
echo ""
echo "🎉 Happy coding!"