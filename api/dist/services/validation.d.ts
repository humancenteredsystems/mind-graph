export declare class InvalidLevelError extends Error {
    constructor(message: string);
}
export declare class NodeTypeNotAllowedError extends Error {
    constructor(message: string);
}
export declare function validateHierarchyId(hierarchyId: string): Promise<boolean>;
export declare function validateLevelIdAndAllowedType(levelId: string, nodeType: string, hierarchyId?: string): Promise<{
    id: string;
    levelNumber: number;
    hierarchy: {
        id: string;
    };
    allowedTypes: {
        typeName: string;
    }[] | null;
}>;
export declare function getLevelIdForNode(parentId: string | null, hierarchyId: string): Promise<string>;
//# sourceMappingURL=validation.d.ts.map