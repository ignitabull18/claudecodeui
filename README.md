# Claude Code UI

A beautiful, modern web-based frontend for Claude Code CLI with enterprise-grade compliance tooling.

## 🚀 Overview

Claude Code UI provides a powerful web interface for Claude Code CLI, featuring:
- **Beautiful Modern UI**: React-based interface with Tailwind CSS
- **Real-time Chat**: WebSocket-powered conversations with Claude
- **Enterprise Compliance**: Automated enforcement of "Claude CLI only" principle
- **Advanced Features**: MCP servers, hooks, subagents, and comprehensive project management

## ✨ Key Features

### 🎨 **Modern Web Interface**
- Clean, responsive design optimized for all devices
- Dark/light mode support
- Real-time syntax highlighting and code formatting
- Intuitive file browser and project navigation

### 🔧 **Claude CLI Integration**
- Direct integration with Claude Code CLI commands
- Session management and project switching
- MCP server management and tool execution
- Git integration with smart commit message generation

### 🛡️ **Enterprise Compliance Tooling**
- **ESLint Integration**: Custom rules to prevent non-Claude CLI implementations
- **Automated Auditing**: Smart pattern detection for compliance violations
- **Git Hooks**: Pre-commit protection against non-compliant code
- **CI/CD Integration**: GitHub Actions for continuous compliance checking

### 🚀 **Advanced Capabilities**
- **Subagents**: Multi-agent workflows with parallel processing
- **Hooks System**: Event-driven automation and triggers
- **Memory Management**: Persistent context and session data
- **Analytics Dashboard**: Usage metrics and performance insights

## 📦 Installation

### Prerequisites
- **Bun** (recommended) or Node.js 18+
- **Claude Code CLI** installed and configured
- Git for version control

### Quick Start

```bash
# Clone the repository
git clone https://github.com/ignitabull18/claudecodeui.git
cd claudecodeui

# Install dependencies
bun install

# Start development server
bun run dev
```

### Production Build

```bash
# Build for production
bun run build

# Start production server
bun run start
```

## 🏗️ Architecture

### Core Principle
> **"Claude Code UI is a window into Claude Code - we don't rebuild its legs."**

This project strictly adheres to the principle that **every feature must use Claude Code CLI** rather than creating custom implementations.

### Technology Stack
- **Frontend**: React 18, Tailwind CSS, Vite
- **Backend**: Node.js/Bun, Express, WebSocket
- **Database**: SQLite (authentication only)
- **CLI Integration**: Child process execution of Claude commands
- **Compliance**: ESLint, Husky, custom audit tooling

## 🛠️ Development

### Available Scripts

```bash
# Development
bun run dev                    # Start dev server with hot reload
bun run server                # Start backend only
bun run client                # Start frontend only

# Production
bun run build                 # Build for production
bun run start                 # Start production server

# Quality Assurance
bun run lint                  # Fix ESLint issues
bun run lint:check            # Check for ESLint violations
bun run audit:claude-compliance # Run Claude CLI compliance audit
```

### Compliance Tooling

This project includes enterprise-grade compliance tooling to ensure strict adherence to the "Claude CLI only" principle:

#### 🔍 **Automated Auditing**
```bash
bun run audit:claude-compliance
```
- Scans 70+ files for violations
- Detects mock data, custom implementations, and fallback patterns
- Provides detailed violation reports with line numbers

#### 🚫 **Pre-commit Protection**
- Automatic ESLint checking
- Claude CLI compliance validation
- Blocks commits with violations

#### 🎯 **CI/CD Integration**
- GitHub Actions workflow for compliance checking
- Security scanning for prohibited patterns
- Automatic violation reporting

## 📊 Project Stats

- **Files**: 70+ components and routes
- **Compliance**: 79% violation reduction (161 → 33)
- **Architecture**: 100% Claude CLI compliant
- **Coverage**: Multi-layer protection (IDE → Git → CI/CD)

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5173
NODE_ENV=development

# Claude CLI Configuration
CLAUDE_CONFIG_PATH=~/.claude.json

# Database
DB_PATH=./server/database/app.db

# WebSocket
WS_PORT=3001
```

### Claude CLI Setup

Ensure Claude Code CLI is properly configured:

```bash
# Verify Claude CLI installation
claude --version

# Configure authentication
claude auth login

# Set up MCP servers
claude mcp add browser "npx @mcps/browser-automation"
claude mcp add git "npx @mcps/git-integration"
```

## 🤝 Contributing

### Development Guidelines

1. **Follow the Core Principle**: All features MUST use Claude CLI
2. **Run Compliance Checks**: Use `bun run audit:claude-compliance`
3. **Code Quality**: Follow ESLint rules and fix violations
4. **Testing**: Verify features work with actual Claude CLI commands

### Prohibited Patterns

❌ **Never create:**
- Mock data generators
- Custom analysis implementations
- Fallback systems that bypass Claude CLI
- Independent business logic

✅ **Always use:**
- `execAsync('claude ...')` for CLI commands
- Claude's native configuration system
- Claude's session and project management
- Claude's MCP server infrastructure

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on top of [Claude Code CLI](https://claude.ai) by Anthropic
- UI components inspired by modern design principles
- Community contributions and feedback

---

**Claude Code UI**: Making Claude Code accessible through beautiful web interfaces while maintaining 100% CLI compatibility.
