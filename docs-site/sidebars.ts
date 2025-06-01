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
        'architecture',
        'multi-tenant-implementation',
        'dgraph-operations',
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
      ],
    },
  ],

  // Developer Guide sidebar
  developerSidebar: [
    {
      type: 'category',
      label: 'Developer Guide',
      items: [
        'hierarchy',
        'testing-guide',
        'ui-elements',
      ],
    },
  ],
};

export default sidebars;
