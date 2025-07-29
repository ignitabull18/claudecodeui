# Claude CLI Compliance Tooling

This document explains the automated tooling setup to enforce the "Claude CLI only" principle in Claude Code UI.

## Core Principle

**Claude Code UI is a web-based frontend for Claude Code CLI. It is NOT a standalone implementation.**

Every feature must use Claude Code CLI commands instead of creating custom implementations.

## Automated Tools

### 1. ESLint Custom Rules (`.eslintrc.js`)

**Purpose**: Catch violations during development in your IDE

**Rules**:
- `no-restricted-syntax`: Blocks calls to `generateMock*`, `executeDemoAnalysis`, etc.
- `no-restricted-imports`: Prevents importing mock generators or custom services
- `claude-cli-wrapper/require-claude-cli`: Ensures route handlers use Claude CLI
- `claude-cli-wrapper/no-custom-fallbacks`: Blocks custom fallback implementations

**Usage**:
```bash
# Check for violations
bun run lint:check

# Auto-fix violations (where possible)
bun run lint
```

### 2. Compliance Audit Script (`scripts/audit-claude-compliance.js`)

**Purpose**: Comprehensive codebase scanning for violations

**What it detects**:
- Mock/fake data generation (`mockData`, `generateMock`, etc.)
- Custom implementations (`function generate*`, `function analyze*`)
- Fallback patterns (`fallback mode`, `demo mode`, `backup implementation`)
- Missing Claude CLI usage in route handlers

**Usage**:
```bash
# Run full compliance audit
bun run audit:claude-compliance

# Example output:
🔍 Starting Claude CLI Compliance Audit...

📊 Audit Results:
Files scanned: 45
Violations found: 3
Errors: 2
Warnings: 1

🚨 Violations found:

📁 server/routes/code-analysis.js
  ❌ Line 23: Mock/fake data generation detected. Use Claude CLI instead.
     Code: const mockData = generateMockAnalysis();
     Match: "mockData"

  ⚠️ Line 45: Custom implementation detected. Verify it uses Claude CLI.
     Code: function analyzeProject(files) {
```

### 3. Git Hooks (Husky) (`.husky/pre-commit`)

**Purpose**: Prevent violations from being committed

**What it does**:
- Runs ESLint check before commit
- Runs compliance audit before commit
- Blocks commit if violations found

**Automatic triggers**:
- Every `git commit`
- Can be skipped with `git commit --no-verify` (not recommended)

### 4. GitHub Actions CI (`.github/workflows/claude-compliance.yml`)

**Purpose**: Continuous compliance checking in CI/CD

**Runs on**:
- Push to main/develop branches
- Pull requests to main/develop

**Jobs**:
- `compliance-check`: ESLint + audit script
- `security-check`: Vulnerability scanning + pattern detection

## Quick Start

### Install Dependencies
```bash
bun install
```

### Run Initial Audit
```bash
# Check current compliance status
bun run audit:claude-compliance
```

### Set up Git Hooks
```bash
# Hooks are automatically installed with bun install
# Or manually run:
bun run prepare
```

## Common Violations & Fixes

### ❌ Mock Data Generation
```javascript
// WRONG
const mockData = generateMockAnalysis(projectPath);
const results = createFakeMetrics();

// CORRECT
const { stdout } = await execAsync(`claude --print "Analyze this project"`);
const results = parseClaudeOutput(stdout);
```

### ❌ Custom Analysis Functions
```javascript
// WRONG
function analyzeCodeQuality(files) {
  // Custom analysis logic
  return calculateMetrics(files);
}

// CORRECT
async function analyzeCodeQuality(projectPath) {
  const prompt = "Analyze code quality metrics for this project";
  const { stdout } = await execAsync(`claude --print "${prompt}"`, { cwd: projectPath });
  return stdout;
}
```

### ❌ Fallback Implementations
```javascript
// WRONG
try {
  const result = await executeClaudeAnalysis();
} catch (error) {
  // Fallback to mock data
  return generateMockResults();
}

// CORRECT
try {
  const result = await executeClaudeAnalysis();
  return result;
} catch (error) {
  // Return error, no fallback
  throw new Error('Claude CLI analysis failed: ' + error.message);
}
```

### ❌ Missing Claude CLI Usage
```javascript
// WRONG - Route handler without Claude CLI
router.post('/analyze', async (req, res) => {
  const results = performCustomAnalysis(req.body.files);
  res.json(results);
});

// CORRECT - Uses Claude CLI
router.post('/analyze', async (req, res) => {
  const { projectName } = req.params;
  const projectPath = path.join(os.homedir(), '.claude', 'projects', projectName);
  
  const { stdout } = await execAsync(`claude --print "Analyze this project"`, { 
    cwd: projectPath 
  });
  
  res.json({ analysis: stdout });
});
```

## Allowed Exceptions

These patterns are **allowed** as legitimate web app functionality:

### ✅ Authentication & File Operations
```javascript
// OK - Basic auth operations
router.post('/login', async (req, res) => { /* ... */ });
router.post('/upload', async (req, res) => { /* ... */ });

// OK - File system operations
await fs.readFile(filePath);
await fs.writeFile(filePath, content);
```

### ✅ Database Operations (Auth Only)
```javascript
// OK - User authentication database
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
```

### ✅ UI State Management
```javascript
// OK - Frontend React components, contexts, hooks
const [isLoading, setIsLoading] = useState(false);
```

## Troubleshooting

### Pre-commit Hook Not Running
```bash
# Check if hooks are installed
ls -la .husky/

# Reinstall hooks
rm -rf .husky && bun run prepare
```

### False Positives in Audit
Edit `scripts/audit-claude-compliance.js` to add exceptions:
```javascript
const allowedPaths = [
  '/login', '/logout', '/auth', '/upload', '/download', 
  '/health', '/status', '/team', '/workspaces'
];
```

### ESLint Rule Too Strict
Update `.eslintrc.js` to modify rules:
```javascript
// Disable specific rule
'claude-cli-wrapper/require-claude-cli': 'off'

// Change severity
'claude-cli-wrapper/require-claude-cli': 'warn'
```

## Integration with IDEs

### VS Code
Install the ESLint extension to see violations inline:
```bash
code --install-extension dbaeumer.vscode-eslint
```

### Cursor
ESLint integration is built-in. Violations will show as red squiggles.

## Monitoring & Metrics

### View Compliance Status
```bash
# Get summary
bun run audit:claude-compliance | grep "Audit Results" -A 5

# Count total violations
bun run audit:claude-compliance 2>/dev/null | grep "Violations found" | grep -o '[0-9]*'
```

### CI/CD Integration
Check compliance status in pull requests via GitHub Actions status checks.

---

## Philosophy

> **"We stand on the shoulders of Claude Code - we don't rebuild its legs."**

This tooling ensures we maintain the core principle: Claude Code UI is a **window** into Claude Code, not a replacement for it.

Every line of code should respect this principle. When in doubt, check how Claude CLI does it and mirror that approach in the UI.