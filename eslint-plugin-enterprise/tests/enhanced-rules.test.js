const { RuleTester } = require('eslint');
const preferAdaptiveFactoryRule = require('../rules/prefer-adaptive-factory');
const requireErrorHandlingRule = require('../rules/require-enterprise-error-handling');

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2020, sourceType: 'module' }, // Use a later ecmaVersion for async/await
});

// Tests for prefer-adaptive-factory
ruleTester.run('prefer-adaptive-factory', preferAdaptiveFactoryRule, {
  valid: [
    // Valid: Using adaptiveTenantFactory
    {
      code: `
        async function create() {
          const tenant = await adaptiveTenantFactory.createTenant(namespace);
        }
      `,
    },
    // Valid: Using DgraphTenant with null (default)
    {
      code: `
        const tenant = new DgraphTenant(null);
      `,
    },
  ],
  invalid: [
    // Invalid: Direct DgraphTenant construction with namespace
    {
      code: `
        const tenant = new DgraphTenant(namespace);
      `,
      errors: [{ messageId: 'preferAdaptiveFactory' }],
      output: `
        const tenant = await adaptiveTenantFactory.createTenant(namespace);
      `,
    },
    // Invalid: Direct DgraphTenant construction with string literal namespace
    {
      code: `
        const tenant = new DgraphTenant('my-namespace');
      `,
      errors: [{ messageId: 'preferAdaptiveFactory' }],
      output: `
        const tenant = await adaptiveTenantFactory.createTenant('my-namespace');
      `,
    },
  ],
});

// Tests for require-enterprise-error-handling
ruleTester.run('require-enterprise-error-handling', requireErrorHandlingRule, {
  valid: [
    // Valid: executeGraphQL within try...catch
    {
      code: `
        async function fetchData(tenant) {
          try {
            await tenant.executeGraphQL(query);
          } catch (error) {
            // handle error
          }
        }
      `,
    },
    // Valid: pushSchema within try...catch
    {
      code: `
        async function push(tenant) {
          try {
            await tenant.pushSchema(schema);
          } catch (error) {
            // handle error
          }
        }
      `,
    },
  ],
  invalid: [
    // Invalid: Unguarded executeGraphQL call
    {
      code: `
        async function fetchData(tenant) {
          await tenant.executeGraphQL(query);
        }
      `,
      errors: [{ messageId: 'missingErrorHandling' }],
    },
    // Invalid: Unguarded pushSchema call
    {
      code: `
        async function push(tenant) {
          await tenant.pushSchema(schema);
        }
      `,
      errors: [{ messageId: 'missingErrorHandling' }],
    },
  ],
});
