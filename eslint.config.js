import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        window: 'readonly',
        document: 'readonly'
      }
    },
    rules: {
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