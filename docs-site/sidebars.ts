import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // Getting Started sidebar
  gettingStartedSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'intro',
        'setup-guide',
        'quick-start',
      ],
    },
  ],

  // Architecture sidebar
  architectureSidebar: [
    {
      type: 'category',
      label: 'System Architecture',
      items: [
        'system-architecture',
        'infrastructure',
      ],
    },
  ],

  // Multi-Tenant sidebar
  multiTenantSidebar: [
    {
      type: 'category',
      label: 'Multi-Tenant System',
      items: [
        'multi-tenant-guide',
        'multi-tenant-testing',
      ],
    },
  ],

  // API Reference sidebar
  apiSidebar: [
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api-endpoints',
        'schema-notes',
        'hierarchy',
        'dgraph-operations',
      ],
    },
  ],

  // Developer Guide sidebar
  developerSidebar: [
    {
      type: 'category',
      label: 'Developer Guide',
      items: [
        'frontend-development',
        'tools-overview',
        'tools-library',
        'testing-guide',
        'ui-elements',
      ],
    },
  ],
};

export default sidebars;
