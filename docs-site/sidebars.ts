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
  // Single main sidebar with all content in a tree structure
  mainSidebar: [
    {
      type: 'category',
      label: '🚀 Getting Started',
      collapsed: false, // Keep open by default
      items: [
        'intro',
        'quick-start',
        'setup-guide',
      ],
    },
    {
      type: 'category',
      label: '👥 Multi-Tenant Features',
      items: [
        'multi-tenant-guide',
        'multi-tenant-testing',
      ],
    },
    {
      type: 'category',
      label: '🏗️ System Architecture',
      items: [
        'system-architecture',
        'infrastructure',
        'dgraph-operations',
      ],
    },
    {
      type: 'category',
      label: '📡 API Reference',
      items: [
        'api-endpoints',
        'schema-notes',
      ],
    },
    {
      type: 'category',
      label: '💻 Development',
      items: [
        'frontend-development',
        'tools-overview',
        'tools-library',
        'testing-guide',
      ],
    },
    {
      type: 'category',
      label: '📊 Hierarchy Management',
      items: [
        'hierarchy',
      ],
    },
    {
      type: 'category',
      label: '🎨 UI Components',
      items: [
        'ui-elements',
      ],
    },
  ],
};

export default sidebars;
