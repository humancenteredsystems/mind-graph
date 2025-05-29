export interface Node {
    id: string;
    label: string;
    type: string;
    status?: string;
    branch?: string;
    outgoing?: Edge[];
    hierarchyAssignments?: HierarchyAssignment[];
}
export interface Edge {
    id?: string;
    from: Node;
    fromId: string;
    to?: Node;
    toId: string;
    type: string;
}
export interface Hierarchy {
    id: string;
    name: string;
    levels?: HierarchyLevel[];
}
export interface HierarchyLevel {
    id: string;
    hierarchy: Hierarchy;
    levelNumber: number;
    label?: string;
    allowedTypes?: HierarchyLevelType[];
    assignments?: HierarchyAssignment[];
}
export interface HierarchyLevelType {
    id: string;
    level: HierarchyLevel;
    typeName: string;
}
export interface HierarchyAssignment {
    id: string;
    node: Node;
    hierarchy: Hierarchy;
    level: HierarchyLevel;
}
export interface NodeInput {
    id: string;
    label: string;
    type: string;
    status?: string;
    branch?: string;
    hierarchyAssignments?: HierarchyAssignmentInput[];
}
export interface EdgeInput {
    fromId: string;
    toId: string;
    type: string;
}
export interface HierarchyInput {
    id: string;
    name: string;
}
export interface HierarchyLevelInput {
    hierarchyId: string;
    levelNumber: number;
    label?: string;
    allowedTypes?: string[];
}
export interface HierarchyAssignmentInput {
    nodeId: string;
    hierarchyId: string;
    levelId?: string;
    hierarchy?: {
        id: string;
    };
    level?: {
        id: string;
    };
}
export interface NodeFilter {
    id?: string;
    label?: string;
    type?: string;
    status?: string;
    hierarchyId?: string;
    levelNumber?: number;
}
export interface EdgeFilter {
    fromId?: string;
    toId?: string;
    type?: string;
}
export interface PaginationInput {
    first?: number;
    offset?: number;
    after?: string;
}
export type NodeType = 'concept' | 'example' | 'question' | 'application' | 'domain';
export type EdgeType = 'related_to' | 'contains' | 'depends_on' | 'applies_to';
export type NodeStatus = 'active' | 'draft' | 'archived';
//# sourceMappingURL=domain.d.ts.map