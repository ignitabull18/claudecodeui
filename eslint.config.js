import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        WebSocket: 'readonly',
        MediaRecorder: 'readonly',
        
        // Service Worker globals
        self: 'readonly',
        caches: 'readonly',
        importScripts: 'readonly'
      }
    },
    rules: {
      // Relax some strict rules for development
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_|^(error|e|parseError|jsonError|fileError|configError|readError|cliError|cleanupError|statError|remoteError)$'
      }],
      'no-useless-catch': 'warn',
      'no-control-regex': 'warn',
      'no-case-declarations': 'warn',
      'no-async-promise-executor': 'warn',
      
      // Custom rules to enforce Claude CLI wrapper principle
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="generateMockAnalysisData"]',
          message: 'Mock data generation is forbidden. Use Claude CLI instead.'
        },
        {
          selector: 'CallExpression[callee.name=/^generateMock/]',
          message: 'Mock data generation is forbidden. Use Claude CLI instead.'
        },
        {
          selector: 'CallExpression[callee.name=/^executeDemoAnalysis/]',
          message: 'Demo/fallback analysis is forbidden. Use Claude CLI only.'
        }
      ]
    }
  },
  {
    files: ['server/routes/*.js'],
    rules: {
      // These would require custom plugin implementation
      // 'claude-cli-wrapper/require-claude-cli': 'error',
      // 'claude-cli-wrapper/no-custom-fallbacks': 'error'
    }
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.husky/**',
      'eslint-plugin-claude-cli-wrapper.js'
    ]
  }
];