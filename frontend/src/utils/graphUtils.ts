import { NodeData, EdgeData, TraversalQueryResponse, RawNodeResponse } from '../types/graph';
import { log } from './logger';

/**
 * Transform traversal response into nodes and edges arrays.
 */
export const transformTraversalData = (
  data: TraversalQueryResponse
): { nodes: NodeData[]; edges: EdgeData[] } => {
  const nodes: NodeData[] = [];
  const edges: EdgeData[] = [];
  const visited = new Set<string>();

  function process(nodeArray: RawNodeResponse[]) {
    if (!Array.isArray(nodeArray)) return;
    nodeArray.forEach(node => {
      if (!node?.id || visited.has(node.id)) return;
      visited.add(node.id);
      nodes.push({
        id: node.id,
        label: node.label || node.id,
        type: node.type,
        assignments: Array.isArray(node.hierarchyAssignments)
          ? node.hierarchyAssignments.map(a => ({
              hierarchyId: a.hierarchy.id,
              hierarchyName: a.hierarchy.name,
              levelId: a.level.id,
              levelNumber: a.level.levelNumber,
              levelLabel: a.level.label,
            }))
          : [],
        status: node.status,
        branch: node.branch,
      });
      if (Array.isArray(node.outgoing)) {
        node.outgoing.forEach(edge => {
          if (edge?.target?.id) {
            edges.push({ source: node.id, target: edge.target.id, type: edge.type });
            process([edge.target]);
          }
        });
      }
    });
  }

  process(data.queryNode || []);
  return { nodes, edges };
};

/**
 * Transform full graph data response.
 */
export const transformAllGraphData = (
  data: any
): { nodes: NodeData[]; edges: EdgeData[] } => {
  const nodes: NodeData[] = [];
  const edges: EdgeData[] = [];
  const map = new Map<string, NodeData>();

  (data.queryNode || []).forEach((n: RawNodeResponse) => {
    if (!n?.id) return;
    const nd: NodeData = {
      id: n.id,
      label: n.label || n.id,
      type: n.type,
      assignments: Array.isArray(n.hierarchyAssignments)
        ? n.hierarchyAssignments.map(a => ({
            hierarchyId: a.hierarchy.id,
            hierarchyName: a.hierarchy.name,
            levelId: a.level.id,
            levelNumber: a.level.levelNumber,
            levelLabel: a.level.label,
          }))
        : [],
      status: n.status,
      branch: n.branch,
    };
    nodes.push(nd);
    map.set(n.id, nd);
  });

  (data.queryNode || []).forEach((n: RawNodeResponse) => {
    if (!n?.id || !Array.isArray(n.outgoing)) return;
    n.outgoing.forEach(e => {
      if (e?.target?.id && map.has(n.id) && map.has(e.target.id)) {
        edges.push({ source: n.id, target: e.target.id, type: e.type });
      }
    });
  });

  return { nodes, edges };
};

/**
 * Hierarchy assignment resolution and utilities.
 */
export const resolveNodeHierarchyAssignment = (
  nodeId: string,
  nodes: NodeData[],
  hierarchyId: string
) => {
  const node = nodes.find(n => n.id === nodeId);
  const assignments = node?.assignments || [];
  let matches = assignments.filter(a => a.hierarchyId === hierarchyId);
  if (matches.length === 0) {
    const alt = hierarchyId.startsWith('h') ? hierarchyId.slice(1) : `h${hierarchyId}`;
    matches = assignments.filter(a => a.hierarchyId === alt);
  }
  matches.sort((a, b) => b.levelNumber - a.levelNumber);
  return {
    assignment: matches[0],
    levelNumber: matches[0]?.levelNumber ?? 0,
    levelLabel: matches[0]?.levelLabel
  };
};

export const normalizeHierarchyId = (hid: string, cid: string): boolean =>
  hid === cid || (hid.startsWith('h') ? hid.slice(1) === cid : `h${hid}` === cid);

export const getNodeHierarchyLevel = (
  node: NodeData,
  hierarchyId: string
): number => resolveNodeHierarchyAssignment(node.id, [node], hierarchyId).levelNumber || 1;

/**
 * Node visual state for Cytoscape.
 */
export interface NodeVisualState {
  hierarchyId?: string;
  levelId?: string;
  levelNumber: number;
  levelColor: string;
  shape: string;
  borderStyle: { style: string; width: number };
  isAssigned: boolean;
  assignmentStatus: 'assigned' | 'unassigned';
}

export const resolveNodeVisualState = (
  node: NodeData,
  hierarchyId: string
): NodeVisualState => {
  const { assignment, levelNumber } = resolveNodeHierarchyAssignment(
    node.id,
    [node],
    hierarchyId
  );
  const isAssigned = !!assignment;
  const defaultColors: Record<number, string> = {
    1: '#3b82f6',
    2: 'red',
    3: '#10b981',
    4: '#f59e0b',
    5: '#8b5cf6',
    6: '#ef4444',
    7: '#06b6d4',
    8: '#84cc16'
  };
  return {
    hierarchyId: assignment?.hierarchyId,
    levelId: assignment?.levelId,
    levelNumber,
    levelColor: isAssigned
      ? defaultColors[levelNumber] || '#6b7280'
      : '#e5e7eb',
    shape: getNodeTypeShape(node.type),
    borderStyle: getNodeTypeBorderStyle(node.type),
    isAssigned,
    assignmentStatus: isAssigned ? 'assigned' : 'unassigned'
  };
};

/**
 * Type-based shape and border utilities.
 */
export const getNodeTypeShape = (type?: string): string => {
  const map: Record<string, string> = {
    Person: 'ellipse',
    Concept: 'round-rectangle',
    Project: 'diamond',
    Skill: 'hexagon',
    Tool: 'triangle',
    Resource: 'octagon',
    Event: 'star',
    default: 'round-rectangle'
  };
  return map[type || 'default'] || map.default;
};

export const getNodeTypeBorderStyle = (
  type?: string
): { style: string; width: number } => {
  const map: Record<string, { style: string; width: number }> = {
    Person: { style: 'solid', width: 2 },
    Concept: { style: 'solid', width: 1 },
    Project: { style: 'dashed', width: 2 },
    Skill: { style: 'solid', width: 1 },
    Tool: { style: 'dotted', width: 2 },
    Resource: { style: 'double', width: 3 },
    Event: { style: 'dashed', width: 1 },
    default: { style: 'solid', width: 1 }
  };
  return map[type || 'default'] || map.default;
};

export const getNodeDisplayLabel = (node: NodeData): string =>
  node.label || node.id;

/**
 * Drag preview helpers.
 */
export const createDragPreview = (nodeData: NodeData): HTMLDivElement => {
  const preview = document.createElement('div');
  preview.id = 'drag-preview';
  preview.style.cssText = `
    position: fixed; background: rgba(59,130,246,0.9); color: white;
    padding: 8px 12px; border-radius: 6px; font-size: 12px;
    pointer-events: none; z-index: 10000; transform: translate(-50%,-100%);
    white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  preview.textContent = `📦 ${nodeData.label || nodeData.id}`;
  document.body.appendChild(preview);
  return preview;
};

export const updateDragPreview = (
  el: HTMLDivElement,
  x: number,
  y: number
): void => {
  el.style.left = `${x}px`;
  el.style.top = `${y - 10}px`;
};

export const removeDragPreview = (
  el: HTMLDivElement | null
): void => {
  if (el && document.body.contains(el)) {
    document.body.removeChild(el);
  }
};

/**
 * Drop zone and drag feedback handlers.
 */
export const getDropZoneUnderMouse = (
  x: number,
  y: number
): Element | null =>
  document.elementFromPoint(x, y)?.closest('[data-drop-zone]') || null;

export const highlightDropZone = (dz: Element): void =>
  dz.classList.add('drop-zone-active');

export const unhighlightDropZone = (dz: Element): void =>
  dz.classList.remove('drop-zone-active');

export const addDragFeedback = (): void =>
  document.querySelector('.app-graph-area')?.classList.add('dragging');

export const removeDragFeedback = (): void =>
  document.querySelector('.app-graph-area')?.classList.remove('dragging');

/**
 * Deduplicate hierarchy levels by levelNumber, keeping the smallest ID.
 */
export const deduplicateHierarchyLevels = (levels: any[]): any[] => {
  const map = new Map<number, any>();
  levels.forEach(level => {
    if (!level || typeof level.levelNumber !== 'number') return;
    const existing = map.get(level.levelNumber);
    if (!existing || level.id < existing.id) {
      map.set(level.levelNumber, level);
    }
  });
  return Array.from(map.values()).sort((a, b) => a.levelNumber - b.levelNumber);
};

/**
 * Log deduplication results.
 */
export const logLevelDeduplication = (
  original: number,
  deduped: number,
  hierarchyId: string
): void => {
  if (original !== deduped) {
    log(
      'HierarchyLandingPad',
      `Deduplicated levels for hierarchy ${hierarchyId}: ${original} → ${deduped}`
    );
  }
};

/**
 * Graph traversal and hierarchy expansion utilities.
 */

/**
 * Find immediate children of a node via graph edges.
 */
export const findImmediateChildren = (nodeId: string, edges: EdgeData[]): Set<string> => {
  const childNodeIds = new Set<string>();
  edges.forEach(edge => {
    if (edge.source === nodeId) {
      childNodeIds.add(edge.target);
    }
  });
  return childNodeIds;
};

/**
 * Find hierarchy-aware descendants of a node.
 * Returns nodes that are:
 * 1. Reachable from nodeId via graph traversal
 * 2. Assigned to the specified hierarchyId 
 * 3. At hierarchy levels greater than clickedNodeLevel
 */
export const findHierarchyDescendants = (
  nodeId: string,
  nodes: NodeData[],
  edges: EdgeData[],
  hierarchyId: string,
  clickedNodeLevel: number
): Set<string> => {
  const descendantNodeIds = new Set<string>();
  const visited = new Set<string>();
  const queue: string[] = [nodeId];
  
  // Start with the clicked node in visited to avoid including it in results
  visited.add(nodeId);
  
  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    
    // Find immediate children of current node
    const childIds = findImmediateChildren(currentNodeId, edges);
    
    childIds.forEach(childId => {
      if (visited.has(childId)) return;
      visited.add(childId);
      
      // Find the child node data
      const childNode = nodes.find(n => n.id === childId);
      if (!childNode) return;
      
      // Get child's hierarchy level
      const childLevel = getNodeHierarchyLevel(childNode, hierarchyId);
      
      // Check if child is assigned to this hierarchy and at a lower level
      const childAssignment = childNode.assignments?.find(a => 
        normalizeHierarchyId(a.hierarchyId, hierarchyId)
      );
      
      if (childAssignment && childLevel > clickedNodeLevel) {
        descendantNodeIds.add(childId);
      }
      
      // Continue traversal to find deeper descendants
      queue.push(childId);
    });
  }
  
  return descendantNodeIds;
};

/**
 * Log expansion/collapse operations for debugging.
 */
export const logExpansionOperation = (
  operation: string,
  nodeId: string,
  clickedNodeLevel: number,
  descendantNodeIds: Set<string>
): void => {
  log(
    'useGraphState',
    `${operation} for node ${nodeId} (level ${clickedNodeLevel}): ${descendantNodeIds.size} descendants - ${Array.from(descendantNodeIds).join(', ')}`
  );
};
