// eslint-plugin-enterprise/rules/require-enterprise-error-handling.js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require error handling for Enterprise feature calls',
      category: 'Enterprise Features'
    },
    messages: {
      missingErrorHandling: 'Enterprise feature calls must include error handling for EnterpriseFeatureNotAvailableError'
    }
  },
  create(context) {
    const enterpriseMethods = [
      'createTenant', // Although prefer-adaptive-factory handles this, keep for completeness
      'executeGraphQL',
      'pushSchema' // Assuming pushSchema might interact with enterprise features
    ];

    // Helper function to check if a node is within a try block
    function isInTryCatch(node) {
      let currentNode = node.parent;
      while (currentNode) {
        if (currentNode.type === 'TryStatement') {
          // Check if the node is within the 'block' of the try statement
          if (currentNode.block.range[0] <= node.range[0] && node.range[1] <= currentNode.block.range[1]) {
             // Check if there is a catch clause
             if (currentNode.handler) {
               // Basic check: does the catch block contain logic to handle the specific error?
               // This is a simplified check; a more robust rule might analyze the catch block content.
               // For now, just being in a try/catch is sufficient.
               return true;
             }
          }
        }
        currentNode = currentNode.parent;
      }
      return false;
    }

    return {
      CallExpression(node) {
        // Check if the call is on a MemberExpression (e.g., tenant.executeGraphQL)
        if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
          const methodName = node.callee.property.name;

          // Check if the method is one of the identified enterprise methods
          if (enterpriseMethods.includes(methodName)) {
            // Check if the call is not within a try...catch block
            if (!isInTryCatch(node)) {
              context.report({
                node,
                messageId: 'missingErrorHandling'
              });
            }
          }
        }
      }
    };
  }
};
