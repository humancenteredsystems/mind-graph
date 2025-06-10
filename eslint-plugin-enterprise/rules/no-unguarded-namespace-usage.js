// eslint-plugin-enterprise/rules/no-unguarded-namespace-usage.js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent unguarded namespace parameter usage',
      category: 'Enterprise Features',
      recommended: true
    },
    messages: {
      unguardedNamespace: 'Namespace parameter usage must be guarded with Enterprise capability check'
    }
  },
  create(context) {
    // Helper function to check if a node is within a capability-checked block
    function hasCapabilityCheck(node) {
      let currentNode = node.parent;
      while (currentNode) {
        // Check for if statements
        if (currentNode.type === 'IfStatement') {
          // Check if the test condition involves adaptiveTenantFactory.isMultiTenantSupported()
          if (
            currentNode.test.type === 'CallExpression' &&
            currentNode.test.callee.type === 'MemberExpression' &&
            currentNode.test.callee.object.type === 'Identifier' &&
            currentNode.test.callee.object.name === 'adaptiveTenantFactory' &&
            currentNode.test.callee.property.type === 'Identifier' &&
            currentNode.test.callee.property.name === 'isMultiTenantSupported'
          ) {
            return true;
          }
        }
        // Add checks for other potential guarding structures if needed (e.g., ternary operators)
        currentNode = currentNode.parent;
      }
      return false;
    }

    return {
      // Flag template literals with ?namespace=
      TemplateLiteral(node) {
        if (node.quasis.some(quasi => quasi.value.cooked.includes('?namespace='))) {
          // Check if within a capability-checked block
          if (!hasCapabilityCheck(node)) {
            context.report({
              node,
              messageId: 'unguardedNamespace'
            });
          }
        }
      },
      // Flag direct DgraphTenant construction with namespace
      NewExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'DgraphTenant' && node.arguments.length > 0) {
          // Check if within a capability-checked block
          if (!hasCapabilityCheck(node)) {
            context.report({
              node,
              messageId: 'unguardedNamespace'
            });
          }
        }
      }
    };
  }
};
