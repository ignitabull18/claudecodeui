#!/usr/bin/env node

/**
 * Claude CLI Compliance Audit Script
 * Automatically detects violations of the "Claude CLI only" principle
 */

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

// Violation patterns to detect
const VIOLATION_PATTERNS = {
  // Mock/fake data patterns
  mockData: {
    patterns: [
      /mock.*data/gi,
      /fake.*data/gi,
      /demo.*data/gi,
      /synthetic.*data/gi,
      /generateMock/gi,
      /createMock/gi,
      /mockAnalysis/gi
    ],
    severity: 'error',
    message: 'Mock/fake data generation detected. Use Claude CLI instead.'
  },
  
  // Custom implementation patterns
  customImplementation: {
    patterns: [
      /function generate(?!d\s|.*Error|.*Token)/gi, // generateSomething but not "generated" or "generateError"
      /function analyze(?!d\s|.*Error)/gi,
      /function process(?!\.|\s|Error)/gi,
      /async function create(?!d\s|.*Error)/gi
    ],
    severity: 'warning',
    message: 'Custom implementation detected. Verify it uses Claude CLI.'
  },
  
  // Fallback patterns
  fallbacks: {
    patterns: [
      /fallback.*mode/gi,
      /demo.*mode/gi,
      /backup.*implementation/gi,
      /alternative.*method/gi,
      /catch.*generateMock/gi
    ],
    severity: 'error',
    message: 'Custom fallback detected. Use Claude CLI only or return error.'
  },
  
  // Required Claude CLI usage
  missingClaudeCli: {
    patterns: [
      // This will be checked differently - looking for route handlers without Claude CLI
    ],
    severity: 'error',
    message: 'Route handler missing Claude CLI usage.'
  }
};

// Files to audit
const AUDIT_PATTERNS = [
  'server/routes/*.js',
  'server/*.js',
  'src/components/*.jsx',
  'src/utils/*.js',
  'src/hooks/*.js'
];

// Files to exclude
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/*.test.js',
  '**/*.spec.js',
  'scripts/**'
];

class ComplianceAuditor {
  constructor() {
    this.violations = [];
    this.stats = {
      filesScanned: 0,
      violations: 0,
      errors: 0,
      warnings: 0
    };
  }

  async audit() {
    console.log('🔍 Starting Claude CLI Compliance Audit...\n');
    
    const files = await this.getFilesToAudit();
    
    for (const file of files) {
      await this.auditFile(file);
    }
    
    this.printResults();
    return this.violations.length === 0;
  }

  async getFilesToAudit() {
    const allFiles = [];
    
    for (const pattern of AUDIT_PATTERNS) {
      const files = await glob(pattern, { ignore: EXCLUDE_PATTERNS });
      allFiles.push(...files);
    }
    
    return [...new Set(allFiles)];
  }

  async auditFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      this.stats.filesScanned++;
      
      // Check each violation pattern
      for (const [violationType, config] of Object.entries(VIOLATION_PATTERNS)) {
        if (violationType === 'missingClaudeCli') {
          await this.checkMissingClaudeCli(filePath, content);
        } else {
          this.checkPatterns(filePath, content, violationType, config);
        }
      }
    } catch (error) {
      console.error(`❌ Error reading ${filePath}:`, error.message);
    }
  }

  checkPatterns(filePath, content, violationType, config) {
    const lines = content.split('\n');
    
    for (const pattern of config.patterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const line = lines[lineNumber - 1];
        
        this.addViolation({
          file: filePath,
          line: lineNumber,
          type: violationType,
          severity: config.severity,
          message: config.message,
          code: line.trim(),
          match: match[0]
        });
      }
    }
  }

  async checkMissingClaudeCli(filePath, content) {
    // Only check route files
    if (!filePath.includes('server/routes/')) return;
    
    // Look for route handlers - improved regex to capture full handler body
    const routeHandlerRegex = /router\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s*\([^)]*\)\s*=>\s*\{/g;
    let match;
    
    while ((match = routeHandlerRegex.exec(content)) !== null) {
      const routePath = match[2];
      const handlerStart = match.index + match[0].length;
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      // Find the end of the handler by matching braces
      let braceCount = 1;
      let handlerEnd = handlerStart;
      
      for (let i = handlerStart; i < content.length && braceCount > 0; i++) {
        if (content[i] === '{') braceCount++;
        else if (content[i] === '}') braceCount--;
        handlerEnd = i;
      }
      
      const fullHandler = content.substring(match.index, handlerEnd + 1);
      
      // Check if handler uses Claude CLI - look for execAsync with claude command or direct claude calls
      const hasClaudeCli = /claude\s+(mcp|config|--print|list|add|remove)/.test(fullHandler) || 
                          /execAsync\s*\(\s*['"`]claude/.test(fullHandler) ||
                          /execAsync\s*\(\s*`claude/.test(fullHandler);
      
      if (!hasClaudeCli) {
        // Allow certain exceptions - routePath already extracted above
        if (routePath) {
          const allowedPaths = [
            // Authentication & Security
            '/login', '/logout', '/auth', '/register', '/verify',
            
            // File Operations
            '/upload', '/download', '/tree', '/search', '/compare', '/bulk', 
            '/replace', '/refactor', '/history', '/supported-types',
            
            // System & Health
            '/health', '/status', '/check',
            
            // User Management & Settings  
            '/team', '/workspaces', '/sync', '/preferences', '/shortcuts', 
            '/themes', '/reset', '/export', '/import',
            
            // Database Operations
            '/sessions', '/templates', '/tags', '/bookmarks', '/permissions',
            '/config', '/execution-log', '/auto-start',
            
            // Git Operations (legitimate file system commands)
            '/diff', '/commit', '/branches', '/checkout', '/create-branch',
            '/commits', '/commit-diff', '/remote-status', '/fetch', '/pull', 
            '/push', '/publish', '/discard', '/delete-untracked',
            
            // Analytics & Monitoring (UI-only features)
            '/overview', '/usage', '/costs', '/tools', '/productivity', '/track', '/data',
            
            // Collaboration (UI-only features)
            '/shared', '/live', '/share', '/invite', '/cursor',
            
            // Memory Management (legitimate data operations)
            '/list', '/save', '/delete', '/context', '/auto-update'
          ];
          if (allowedPaths.some(allowed => routePath.includes(allowed))) {
            continue;
          }
        }
        
        this.addViolation({
          file: filePath,
          line: lineNumber,
          type: 'missingClaudeCli',
          severity: 'error',
          message: 'Route handler must use Claude CLI (execAsync with "claude" command)',
          code: fullHandler.substring(0, 100) + '...'
        });
      }
    }
  }

  addViolation(violation) {
    this.violations.push(violation);
    this.stats.violations++;
    
    if (violation.severity === 'error') {
      this.stats.errors++;
    } else {
      this.stats.warnings++;
    }
  }

  printResults() {
    console.log('\n📊 Audit Results:');
    console.log(`Files scanned: ${this.stats.filesScanned}`);
    console.log(`Violations found: ${this.stats.violations}`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log(`Warnings: ${this.stats.warnings}`);
    
    if (this.violations.length === 0) {
      console.log('\n✅ No violations found! Codebase is Claude CLI compliant.');
      return;
    }
    
    console.log('\n🚨 Violations found:\n');
    
    // Group by file
    const byFile = {};
    for (const violation of this.violations) {
      if (!byFile[violation.file]) {
        byFile[violation.file] = [];
      }
      byFile[violation.file].push(violation);
    }
    
    for (const [file, violations] of Object.entries(byFile)) {
      console.log(`📁 ${file}`);
      
      for (const violation of violations) {
        const icon = violation.severity === 'error' ? '❌' : '⚠️';
        console.log(`  ${icon} Line ${violation.line}: ${violation.message}`);
        console.log(`     Code: ${violation.code}`);
        if (violation.match) {
          console.log(`     Match: "${violation.match}"`);
        }
        console.log('');
      }
    }
    
    console.log(`\n🎯 Next steps:`);
    console.log(`1. Fix ${this.stats.errors} errors (required)`);
    console.log(`2. Review ${this.stats.warnings} warnings`);
    console.log(`3. Run audit again to verify fixes`);
  }
}

// Run audit
const auditor = new ComplianceAuditor();
auditor.audit().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Audit failed:', error);
  process.exit(1);
});