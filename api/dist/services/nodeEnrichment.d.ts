interface NodeInput {
    id?: string;
    label: string;
    type: string;
    hierarchyId?: string;
    levelId?: string;
    parentId?: string;
    hierarchyAssignments?: Array<{
        hierarchy: {
            id: string;
        };
        level: {
            id: string;
        };
    }>;
}
interface EnrichedNodeInput {
    id?: string;
    label: string;
    type: string;
    hierarchyAssignments?: Array<{
        hierarchy: {
            id: string;
        };
        level: {
            id: string;
        };
    }>;
}
interface MutationVariables {
    input: NodeInput[];
    [key: string]: any;
}
interface EnrichedMutationVariables {
    input: EnrichedNodeInput[];
    [key: string]: any;
}
/**
 * Enriches addNode inputs with nested hierarchyAssignments
 * Handles validation and transformation of client input for node creation
 */
export declare function enrichNodeInputs(variables: MutationVariables, hierarchyIdFromHeader: string | null, mutation: string): Promise<EnrichedMutationVariables>;
export {};
//# sourceMappingURL=nodeEnrichment.d.ts.map