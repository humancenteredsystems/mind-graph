# Enhanced Hierarchy Management UI Plan

## Overview
This document outlines the implementation plan for enhancing the existing hierarchy management system with improved user interfaces for configuring hierarchies, levels, and allowed node types. The current system already supports multi-hierarchy structures with proper database persistence - this plan focuses on making these capabilities more accessible through better UX.

## Current Architecture (As of 2025)
The system already implements:
- **Multi-hierarchy support** via `HierarchyContext` and database entities
- **Hierarchy entities**: `Hierarchy`, `HierarchyLevel`, `HierarchyLevelType`, `HierarchyAssignment`
- **Server-side validation** in `services/validation.js` and `services/nodeEnrichment.js`
- **API endpoints** for hierarchy management (`/api/hierarchy/*`)
- **Frontend integration** in `NodeFormModal` with type filtering based on hierarchy levels

## Feature Requirements
1. **Enhanced Settings Interface**:
   - Persistent gear icon in the upper left corner of the main UI
   - Multi-tab settings modal with "Hierarchy Management" as the primary tab
   
2. **Hierarchy Management Dashboard**:
   - List/manage existing hierarchies
   - Create new hierarchies with custom level structures
   - Configure allowed node types per hierarchy level
   - Bulk operations for hierarchy setup

3. **Improved User Experience**:
   - Visual hierarchy tree representation
   - Drag-and-drop level reordering
   - Type assignment with visual feedback
   - Import/export hierarchy configurations

4. **Admin Operations**:
   - Hierarchy cloning/templating
   - Bulk node type updates across hierarchies
   - Migration tools for hierarchy restructuring

## Implementation Phases

### Phase 1: Enhanced Settings Infrastructure
1. **Extend Settings Context**:
   - Build upon existing `HierarchyContext`
   - Add admin-focused hierarchy management state
   - Integrate with existing API endpoints (`/api/hierarchy/*`)

2. **Create Settings Modal Framework**:
   - Implement gear icon component fixed to upper left corner
   - Create tabbed settings modal (extensible for future settings)
   - Add proper admin authentication checks

### Phase 2: Hierarchy Management Dashboard
1. **Hierarchy Overview Component**:
   - List all existing hierarchies with metadata
   - Quick actions: edit, clone, delete
   - Create new hierarchy wizard

2. **Hierarchy Editor Component**:
   - Visual level management (add/remove/reorder levels)
   - Level configuration: number, label, description
   - Allowed node types configuration per level
   - Real-time validation and preview

3. **Node Type Management**:
   - Manage `HierarchyLevelType` entities through UI
   - Bulk assignment of types to levels
   - Visual type-to-level mapping interface

### Phase 3: Advanced Features
1. **Hierarchy Templates**:
   - Pre-built hierarchy templates (Academic, Taxonomic, Business, etc.)
   - Template import/export functionality
   - Custom template creation and sharing

2. **Migration Tools**:
   - Hierarchy restructuring with node migration
   - Bulk node type updates using existing API endpoints
   - Preview changes before applying

3. **Visual Enhancements**:
   - Hierarchy tree visualization
   - Drag-and-drop level reordering
   - Color coding for different node types

### Phase 4: Integration and Polish
1. **Enhanced Node Creation Flow**:
   - Improve existing `NodeFormModal` with better hierarchy selection
   - Add hierarchy-aware type suggestions
   - Quick hierarchy switching in node creation

2. **Bulk Operations**:
   - Multi-select node operations
   - Batch hierarchy assignment changes
   - Import nodes with hierarchy assignments

## Component Structure

```
App
├── HierarchyContext (existing - enhanced)
├── SettingsIcon (new)
├── SettingsModal (new)
│   ├── HierarchyManagementTab (new)
│   │   ├── HierarchyOverview (new)
│   │   ├── HierarchyEditor (new)
│   │   └── NodeTypeManager (new)
│   └── [future settings tabs]
└── [existing components - enhanced]
```

## Data Structures (Leveraging Existing Schema)

```typescript
// Existing entities (already implemented)
interface Hierarchy {
  id: string;
  name: string;
  levels: HierarchyLevel[];
}

interface HierarchyLevel {
  id: string;
  hierarchy: Hierarchy;
  levelNumber: number;
  label: string;
  allowedTypes: HierarchyLevelType[];
}

interface HierarchyLevelType {
  id: string;
  level: HierarchyLevel;
  typeName: string;
}

// New UI-specific interfaces
interface HierarchyTemplate {
  name: string;
  description: string;
  levels: {
    levelNumber: number;
    label: string;
    allowedTypes: string[];
  }[];
}

interface HierarchyManagementState {
  hierarchies: Hierarchy[];
  selectedHierarchy: Hierarchy | null;
  templates: HierarchyTemplate[];
  isEditing: boolean;
}
```

## API Integration (Using Existing Endpoints)

The implementation will use existing API endpoints:
- `GET /api/hierarchy` - List hierarchies
- `POST /api/hierarchy` - Create hierarchy
- `PUT /api/hierarchy/:id` - Update hierarchy
- `DELETE /api/hierarchy/:id` - Delete hierarchy
- `POST /api/hierarchy/level` - Create level
- `PUT /api/hierarchy/level/:id` - Update level
- `DELETE /api/hierarchy/level/:id` - Delete level
- `POST /api/mutate` - Create `HierarchyLevelType` entities

## File Changes

1. Create new files:
   - `frontend/src/components/settings/SettingsIcon.tsx`
   - `frontend/src/components/settings/SettingsModal.tsx`
   - `frontend/src/components/settings/HierarchyManagementTab.tsx`
   - `frontend/src/components/settings/HierarchyOverview.tsx`
   - `frontend/src/components/settings/HierarchyEditor.tsx`
   - `frontend/src/components/settings/NodeTypeManager.tsx`
   - `frontend/src/hooks/useHierarchyManagement.ts`
   - `frontend/src/utils/hierarchyTemplates.ts`

2. Enhance existing files:
   - `frontend/src/App.tsx` - Add SettingsIcon
   - `frontend/src/context/HierarchyContext.tsx` - Add management functions
   - `frontend/src/components/NodeFormModal.tsx` - Enhance hierarchy selection UX
   - `frontend/src/context/UIContext.tsx` - Add settings modal control

## Technical Considerations

1. **Performance**:
   - Cache hierarchy data in `HierarchyContext`
   - Lazy-load settings modal components
   - Optimize API calls with proper caching

2. **Data Consistency**:
   - Use existing server-side validation
   - Implement optimistic updates with rollback
   - Real-time validation of hierarchy configurations

3. **User Experience**:
   - Progressive disclosure of advanced features
   - Clear visual feedback for all operations
   - Undo/redo functionality for hierarchy changes

4. **Security**:
   - Leverage existing admin authentication (`X-Admin-API-Key`)
   - Proper authorization checks for hierarchy management
   - Audit logging for hierarchy changes

5. **Extensibility**:
   - Design settings framework for future expansion
   - Modular hierarchy management components
   - Plugin architecture for custom hierarchy types

## Migration Strategy

Since the core hierarchy system already exists:

1. **Phase 1**: Add UI layer on top of existing APIs
2. **Phase 2**: Enhance existing components with new management features
3. **Phase 3**: Add advanced features while maintaining backward compatibility
4. **Phase 4**: Optimize and polish based on user feedback

## Node Type Updates (Using Existing System)

For bulk node type updates, leverage existing mutation endpoints:

```typescript
const updateNodeTypes = async (hierarchyId: string, oldType: string, newType: string) => {
  // Use existing /api/mutate endpoint with proper hierarchy context
  const mutation = `
    mutation UpdateNodeTypes($oldType: String!, $newType: String!) {
      updateNode(input: {
        filter: { 
          and: [
            { type: { eq: $oldType } },
            { hierarchyAssignments: { hierarchy: { id: { eq: "${hierarchyId}" } } } }
          ]
        },
        set: { type: $newType }
      }) {
        numUids
      }
    }
  `;
  
  return await ApiService.executeMutation(mutation, { oldType, newType });
};
```

## Future Enhancements

1. **Advanced Hierarchy Features**:
   - Conditional level progression rules
   - Dynamic level creation based on content
   - Cross-hierarchy relationships

2. **Collaboration Features**:
   - Hierarchy sharing between users
   - Collaborative hierarchy editing
   - Version control for hierarchy changes

3. **Analytics and Insights**:
   - Hierarchy usage statistics
   - Node distribution analysis
   - Optimization suggestions

4. **Integration Enhancements**:
   - API webhooks for hierarchy changes
   - External system synchronization
   - Bulk import/export tools

## Success Metrics

1. **Usability**: Reduced time to create and configure hierarchies
2. **Adoption**: Increased use of custom hierarchies vs. default
3. **Efficiency**: Faster node creation with proper hierarchy assignment
4. **Flexibility**: Support for diverse hierarchy structures across use cases
