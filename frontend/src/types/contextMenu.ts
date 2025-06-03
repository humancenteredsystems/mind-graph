import { NodeData } from './graph';

export type MenuType = 'background' | 'node' | 'multi-node' | 'edge' | 'multi-edge';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
}

// Context menu payload types
export interface BackgroundMenuPayload {
  loadInitialGraph?: () => void;
  resetGraph?: () => void;
}

export interface NodeMenuPayload {
  node: NodeData;
  onEditNode?: (node: NodeData) => void;
  onDeleteNode?: (nodeId: string) => void;
  onHideNode?: (nodeId: string) => void;
  onExpandChildren?: (nodeId: string) => void;
  onExpandAll?: (nodeId: string) => void;
  onCollapseNode?: (nodeId: string) => void;
}

export interface EdgeMenuPayload {
  edgeIds: string[];
  onDeleteEdge?: (edgeId: string) => void;
}

export interface MultiEdgeMenuPayload {
  edgeIds: string[];
  onDeleteEdges?: (edgeIds: string[]) => void;
}

export interface MultiNodeMenuPayload {
  nodeIds: string[];
  onConnect?: (fromId: string, toId: string) => void;
  onDeleteNodes?: (nodeIds: string[]) => void;
  onHideNodes?: (nodeIds: string[]) => void;
  canConnect?: boolean;
  connectFrom?: string;
  connectTo?: string;
}

export type ContextMenuPayload = 
  | BackgroundMenuPayload
  | NodeMenuPayload
  | EdgeMenuPayload
  | MultiEdgeMenuPayload
  | MultiNodeMenuPayload;
