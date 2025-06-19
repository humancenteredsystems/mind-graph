const { RuleTester } = require('eslint');
const rule = require('../rules/no-unguarded-namespace-usage');

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2015 },
});

ruleTester.run('no-unguarded-namespace-usage', rule, {
  valid: [
    // Valid: Namespace usage guarded by capability check (Template Literal)
    {
      code: `
        if (adaptiveTenantFactory.isMultiTenantSupported()) {
          const endpoint = \`\${baseUrl}?namespace=\${namespace}\`;
        }
      `,
    },
    // Valid: Namespace usage guarded by capability check (New Expression)
    {
      code: `
        if (adaptiveTenantFactory.isMultiTenantSupported()) {
          const tenant = new DgraphTenant(namespace);
        }
      `,
    },
    // Valid: No namespace usage
    {
      code: `
        const endpoint = \`\${baseUrl}/graphql\`;
        const tenant = new DgraphTenant(null);
      `,
    },
  ],
  invalid: [
    // Invalid: Unguarded namespace usage (Template Literal)
    {
      code: `
        const endpoint = \`\${baseUrl}?namespace=\${namespace}\`;
      `,
      errors: [{ messageId: 'unguardedNamespace' }],
    },
    // Invalid: Unguarded namespace usage (New Expression)
    {
      code: `
        const tenant = new DgraphTenant(namespace);
      `,
      errors: [{ messageId: 'unguardedNamespace' }],
    },
  ],
});
