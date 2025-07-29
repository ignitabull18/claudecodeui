// Custom ESLint plugin to enforce Claude CLI wrapper principles
module.exports = {
  rules: {
    'require-claude-cli': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Require Claude CLI usage in route handlers',
          category: 'Claude CLI Wrapper'
        },
        messages: {
          missingClaudeCli: 'Route handler must use Claude CLI (execAsync with "claude" command)',
          customImplementation: 'Custom implementation detected. Use Claude CLI instead.'
        }
      },
      create(context) {
        return {
          // Check route handler functions
          'CallExpression[callee.property.name="post"], CallExpression[callee.property.name="get"], CallExpression[callee.property.name="put"], CallExpression[callee.property.name="delete"]'(node) {
            const handler = node.arguments[1];
            if (handler && handler.type === 'ArrowFunctionExpression' || handler.type === 'FunctionExpression') {
              const sourceCode = context.getSourceCode();
              const handlerText = sourceCode.getText(handler);
              
              // Check if handler uses Claude CLI
              if (!handlerText.includes('claude') && !handlerText.includes('execAsync')) {
                // Allow certain exceptions (auth, file operations, etc.)
                const routePath = node.arguments[0];
                if (routePath && routePath.type === 'Literal') {
                  const path = routePath.value;
                  const allowedPaths = ['/login', '/logout', '/auth', '/upload', '/download'];
                  if (allowedPaths.some(allowed => path.includes(allowed))) {
                    return;
                  }
                }
                
                context.report({
                  node: handler,
                  messageId: 'missingClaudeCli'
                });
              }
            }
          },
          
          // Detect custom implementation patterns
          'VariableDeclarator[id.name=/^(generate|create|analyze|process).*$/]'(node) {
            if (node.init && node.init.type === 'FunctionExpression' || node.init.type === 'ArrowFunctionExpression') {
              const sourceCode = context.getSourceCode();
              const funcText = sourceCode.getText(node.init);
              
              // If function doesn't use Claude CLI but does analysis/generation
              if (!funcText.includes('claude') && !funcText.includes('execAsync')) {
                if (funcText.includes('analysis') || funcText.includes('generate') || funcText.includes('mock')) {
                  context.report({
                    node: node.init,
                    messageId: 'customImplementation'
                  });
                }
              }
            }
          }
        };
      }
    },
    
    'no-custom-fallbacks': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Prohibit custom fallback implementations',
          category: 'Claude CLI Wrapper'
        },
        messages: {
          customFallback: 'Custom fallback detected. If Claude CLI fails, return error instead.'
        }
      },
      create(context) {
        return {
          'IfStatement'(node) {
            const sourceCode = context.getSourceCode();
            const ifText = sourceCode.getText(node);
            
            // Detect fallback patterns
            if (ifText.includes('fallback') || ifText.includes('backup') || ifText.includes('alternative')) {
              if (ifText.includes('mock') || ifText.includes('demo') || ifText.includes('generate')) {
                context.report({
                  node,
                  messageId: 'customFallback'
                });
              }
            }
          },
          
          'CatchClause'(node) {
            const sourceCode = context.getSourceCode();
            const catchText = sourceCode.getText(node);
            
            // Detect fallback in catch blocks
            if (catchText.includes('fallback') || catchText.includes('generateMock') || catchText.includes('demo')) {
              context.report({
                node,
                messageId: 'customFallback'
              });
            }
          }
        };
      }
    }
  }
};