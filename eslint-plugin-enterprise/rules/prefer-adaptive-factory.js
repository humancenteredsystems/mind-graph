// eslint-plugin-enterprise/rules/prefer-adaptive-factory.js
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer adaptiveTenantFactory over direct tenant creation'
    },
    messages: {
      preferAdaptiveFactory: 'Use adaptiveTenantFactory.createTenant() instead of direct DgraphTenant construction'
    },
    fixable: 'code'
  },
  create(context) {
    return {
      NewExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'DgraphTenant') {
          context.report({
            node,
            messageId: 'preferAdaptiveFactory',
            fix(fixer) {
              const args = node.arguments.map(arg => context.getSourceCode().getText(arg)).join(', ');
              return fixer.replaceText(node, `await adaptiveTenantFactory.createTenant(${args})`);
            }
          });
        }
      }
    };
  }
};
