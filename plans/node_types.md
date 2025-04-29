# Node Types and Hierarchy Configuration Plan

## Overview
This document outlines the implementation plan for adding a settings interface that allows users to configure node types and their hierarchical levels. This will enable custom hierarchies like taxonomic classifications (Kingdom → Phylum → Class...) or capability structures (Capability → Technology → Implementation...).

## Feature Requirements
1. **Settings Interface**:
   - Persistent gear icon in the upper left corner of the main UI
   - Multi-tab settings modal with "Hierarchy" as the first tab
   
2. **Hierarchy Configuration**:
   - List with two columns: "Node Type" and "Level"
   - Initially display 5 rows for configuration
   - "+" button to add more rows as needed
   - Number input field for Level with direct entry and up/down arrows
   - Save and Cancel buttons

3. **Persistence**:
   - Store configurations in localStorage for simplicity and to avoid schema changes
   - Provide clear error handling and recovery mechanisms

4. **Node Type Renaming Compatibility**:
   - Detect when node types are renamed (same level, different name)
   - Use existing GraphQL mutation APIs to update all affected nodes
   - Provide feedback on the number of nodes updated during rename operations

5. **Integration**:
   - Use configured node types in node creation and editing interfaces
   - Apply level values based on node type selection
   - Update existing UIs to respect these configurations

## Implementation Phases

### Phase 1: Settings Storage and Context
1. **Create Settings Storage Utility**:
   - Implement functions to save/load settings from localStorage
   - Add error handling and validation
   - Provide default values for when settings don't exist

2. **Create Settings Context**:
   - Create a new React context for app settings
   - Include state for node types and their levels
   - Provide default values matching the current hardcoded types
   - Implement functions for updating settings

3. **Type Rename Detection & Migration**:
   - Create utility to detect renamed types (same level, different name)
   - Implement a function to update nodes using existing GraphQL mutation API
   - Add feedback mechanism to inform users of migration results

### Phase 2: UI Components
1. **Create Settings Icon and Modal**:
   - Implement a gear icon component fixed to upper left corner
   - Implement SettingsModal component with tab interface
   - Create base structure for modal with tabs

2. **Implement Hierarchy Tab**:
   - Create a form with dynamic rows for node type configuration
   - Implement add/remove row functionality
   - Add validation for duplicate types and valid level values
   - Include saving indicators and confirmation

3. **Update UI Context**:
   - Add state and functions for controlling settings modal visibility
   - Integrate with existing context system

### Phase 3: Integration with Existing Components
1. **Update NodeFormModal**:
   - Modify to use configured node types from settings context
   - Update UI to show all available types

2. **Update NodeDrawer**:
   - Update to use configured node types
   - Add logic to automatically set level based on selected type
   - Maintain ability to manually override level if needed

3. **Level Calculation Logic**:
   - Update `addNode` function in `useGraphState.ts` to determine level based on node type from settings
   - Maintain fallback to parent-based calculation when needed
   - Add error handling for missing settings

### Phase 4: Testing and Refinement
1. **Unit Tests**:
   - Test settings persistence in localStorage
   - Test type rename detection and migration logic
   - Test component rendering with different configurations
   - Test integration with node creation/editing

2. **Edge Cases**:
   - Handle scenario when settings are cleared/corrupted
   - Test migration from hardcoded to configured types
   - Ensure proper behavior when localStorage is unavailable

3. **UI/UX Review**:
   - Ensure modal appears correctly on different screen sizes
   - Verify settings are applied immediately after saving
   - Check for any visual inconsistencies

## Component Structure

```
App
└── SettingsProvider (new)
    ├── SettingsIcon (new)
    ├── SettingsModal (new)
    │   └── HierarchyTab (new)
    │       └── NodeTypeRow (new)
    └── [existing components]
```

## Data Structures

```typescript
// Node type configuration interface
interface NodeTypeConfig {
  type: string;    // The name/label of the type (e.g., "concept", "Kingdom", "Capability")
  level: number;   // The hierarchical level (e.g., 1, 2, 3)
}

// Settings context state
interface SettingsState {
  nodeTypes: NodeTypeConfig[];
  // Other settings can be added here later
}
```

## File Changes

1. Create new files:
   - `frontend/src/context/SettingsContext.tsx`
   - `frontend/src/components/settings/SettingsIcon.tsx`
   - `frontend/src/components/settings/SettingsModal.tsx`
   - `frontend/src/components/settings/HierarchyTab.tsx`
   - `frontend/src/hooks/useSettings.ts`
   - `frontend/src/utils/settingsStorage.ts`

2. Modify existing files:
   - `frontend/src/App.tsx` - Add SettingsProvider and SettingsIcon
   - `frontend/src/components/NodeFormModal.tsx` - Use dynamic node types
   - `frontend/src/components/NodeDrawer.tsx` - Use dynamic node types
   - `frontend/src/hooks/useGraphState.ts` - Update level calculation logic
   - `frontend/src/context/UIContext.tsx` - Add settings modal control

## Technical Considerations

1. **Performance**:
   - Settings should be cached to avoid repeated localStorage reads
   - Modal should be lazy-loaded to avoid impact on initial page load
   - Use optimistic updates for better UX when saving settings

2. **Compatibility**:
   - Ensure backwards compatibility with existing nodes
   - Handle case where a type is removed but nodes of that type exist
   - Provide clear migration path for renamed types

3. **Resilience**:
   - Implement graceful error handling for localStorage operations
   - Add recovery mechanisms for corrupted settings data
   - Provide clear user feedback during settings operations

4. **Extensibility**:
   - Design the settings system to easily add more tabs/configurations in the future
   - Structure code to support future persistence mechanisms without major rewrites
   - Keep settings data model flexible for future expansion

5. **Accessibility**:
   - Ensure modal is keyboard navigable
   - Provide appropriate ARIA labels for all form elements
   - Include focus management for modal interactions

## Type Rename Implementation

For handling type renames, we'll use the existing GraphQL mutation API:

```typescript
const updateNodesWithRenamedTypes = async (oldType, newType) => {
  try {
    const mutation = `
      mutation {
        updateNode(input: {
          filter: { type: { eq: "${oldType}" } },
          set: { type: "${newType}" }
        }) {
          numUids
        }
      }
    `;
    const result = await executeMutation(mutation);
    return result.updateNode?.numUids || 0;
  } catch (error) {
    console.error('Error updating nodes with renamed types:', error);
    return 0;
  }
};
```

This approach lets us maintain consistency of node types without requiring any schema changes.

## Future Enhancements

1. **Server-side Storage**:
   - If needed in the future, implement API endpoints to save/load settings from the database
   - Support user-specific settings

2. **Additional Settings**:
   - Node appearance (colors, shapes)
   - Default view configurations
   - Edge type configurations

3. **Import/Export**:
   - Allow exporting settings configurations
   - Support importing configurations from file
