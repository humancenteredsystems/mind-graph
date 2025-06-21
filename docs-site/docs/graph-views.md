# Graph Views/Lens System

The Graph Views/Lens System provides a powerful way to visualize the same knowledge graph from multiple perspectives. Users can switch between different "lenses" that filter, transform, and style graph data according to specific use cases.

## Overview

A **View** (composed of one or more **Lenses**) is a recipe that:

1. **Filters** which nodes/edges to display
2. **Computes** additional data from the backend (optional)
3. **Maps** and transforms the data
4. **Styles** nodes and edges with custom colors and shapes
5. **Applies** appropriate layout algorithms

## Available Views

### Static Views

- **Default** (⚪): Standard graph view with basic styling
- **Type Clusters** (📦): Groups nodes by type with distinct colors

### Dynamic Hierarchy Views

- **Hierarchy Views** (🌳): Auto-generated for each hierarchy
  - Filters nodes belonging to the specific hierarchy
  - Uses backend computation for optimal performance
  - Applies hierarchy-level styling and dagre layout
  - Shows hierarchical relationships clearly

## Architecture

### Frontend Components

```
ViewContext ──► useLens Hook ──► GraphView
     │              │               │
     │              ▼               │
     │         Lens Registry        │
     │              │               │
     ▼              ▼               ▼
ViewsSection   Dynamic Lenses   Styled Graph
```

### Key Files

- **`frontend/src/context/ViewContext.tsx`**: Manages active view state
- **`frontend/src/hooks/useLens.ts`**: Core lens transformation logic
- **`frontend/src/lenses/index.ts`**: Lens registry and hierarchy generation
- **`frontend/src/components/ViewsSection.tsx`**: UI for view selection
- **`packages/lens-types/`**: Shared TypeScript types

### Backend Integration

- **`/api/compute/hierarchyView`**: Computes hierarchy-specific graph data
- Returns filtered nodes and edges with hierarchy metadata
- Caps results to 500 nodes/1000 edges for performance

## Usage

### Switching Views

1. Open the right-side **Graph Tools Panel**
2. Expand the **Views** section
3. Click on any available view:
   - **Default**: Basic graph visualization
   - **Type Clusters**: Nodes grouped by type
   - **[Hierarchy Name]**: Hierarchy-specific view

### View Persistence

- Active view is saved to localStorage
- Persists across browser sessions
- Defaults to "default" view on first load

## Creating Custom Lenses

### Static Lens Example

```typescript
// frontend/src/lenses/myCustomLens.ts
import { LensDefinition } from '@mims/lens-types';
import { theme } from '../config';

const myCustomLens: LensDefinition = {
  id: 'my-custom',
  label: 'My Custom View',
  icon: '🎨',
  
  // Filter nodes by criteria
  filter: (node) => node?.type === 'Project',
  
  // Transform data
  map: (el) => ({
    ...el,
    customProperty: 'value'
  }),
  
  // Apply custom styling
  style: (el) => ({
    'background-color': '#ff6b6b',
    'border-color': '#ee5a52',
  }),
  
  // Use specific layout
  layout: { 
    name: 'circle',
    options: { radius: 200 }
  }
};

export default myCustomLens;
```

### Register Custom Lens

```typescript
// frontend/src/lenses/index.ts
import myCustomLens from './myCustomLens';

export const staticLensRegistry: LensRegistry = {
  default: defaultLens,
  'type-cluster': typeClusterLens,
  'my-custom': myCustomLens, // Add here
};
```

## Backend Compute Endpoints

### Hierarchy View Endpoint

**POST** `/api/compute/hierarchyView`

```json
{
  "hierarchyId": "h1"
}
```

**Response:**
```json
{
  "nodes": [
    {
      "id": "node1",
      "label": "Node 1",
      "type": "Person",
      "hierarchyLevel": 1,
      "levelLabel": "Executive"
    }
  ],
  "edges": [
    {
      "id": "edge1",
      "source": "node1",
      "target": "node2",
      "type": "REPORTS_TO"
    }
  ],
  "metadata": {
    "hierarchyId": "h1",
    "totalNodes": 25,
    "totalEdges": 30,
    "truncated": false
  }
}
```

## Performance Considerations

- **Lens transformations** are memoized and only re-run when data changes
- **Backend compute** endpoints cap results to prevent performance issues
- **View switching** is instant for static lenses
- **Hierarchy views** may have slight delay for backend computation

## Error Handling

- **Backend errors** are gracefully handled with user-friendly messages
- **Lens errors** fall back to raw graph data
- **Missing lenses** automatically fall back to default view
- **Empty results** show appropriate empty state messages

## Testing

The lens system includes comprehensive unit tests:

```bash
# Run lens-specific tests
npm test lenses

# Run all frontend tests
npm test
```

## Future Enhancements

- **Custom lens editor** in the UI
- **Lens sharing** between users
- **Advanced filtering** with query builders
- **Animation transitions** between views
- **Lens composition** (combining multiple lenses)
