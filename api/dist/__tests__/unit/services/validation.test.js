"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validation_1 = require("../../../services/validation");
// Mock the dgraphClient
jest.mock('../../../dgraphClient', () => ({
    executeGraphQL: jest.fn()
}));
const dgraphClient_1 = require("../../../dgraphClient");
// Type the mocked function
const mockExecuteGraphQL = dgraphClient_1.executeGraphQL;
describe('validation service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('validateHierarchyId', () => {
        it('should return true for valid hierarchy ID', async () => {
            mockExecuteGraphQL.mockResolvedValueOnce({
                getHierarchy: { id: 'hierarchy1' }
            });
            const result = await (0, validation_1.validateHierarchyId)('hierarchy1');
            expect(result).toBe(true);
        });
        it('should return false for invalid hierarchy ID', async () => {
            mockExecuteGraphQL.mockResolvedValueOnce({
                getHierarchy: null
            });
            const result = await (0, validation_1.validateHierarchyId)('nonexistent');
            expect(result).toBe(false);
        });
        it('should return false for invalid input types', async () => {
            const result1 = await (0, validation_1.validateHierarchyId)(null);
            const result2 = await (0, validation_1.validateHierarchyId)(123);
            const result3 = await (0, validation_1.validateHierarchyId)('');
            expect(result1).toBe(false);
            expect(result2).toBe(false);
            expect(result3).toBe(false);
        });
        it('should handle database errors gracefully', async () => {
            mockExecuteGraphQL.mockRejectedValueOnce(new Error('Database error'));
            const result = await (0, validation_1.validateHierarchyId)('hierarchy1');
            expect(result).toBe(false);
        });
    });
    describe('validateLevelIdAndAllowedType', () => {
        it('should validate successfully for allowed node type at level', async () => {
            mockExecuteGraphQL.mockResolvedValueOnce({
                getHierarchyLevel: {
                    id: 'level1',
                    levelNumber: 1,
                    hierarchy: { id: 'hierarchy1' },
                    allowedTypes: [
                        { typeName: 'concept' },
                        { typeName: 'question' }
                    ]
                }
            });
            const result = await (0, validation_1.validateLevelIdAndAllowedType)('level1', 'concept', 'hierarchy1');
            expect(result).toBeDefined();
            expect(result.id).toBe('level1');
        });
        it('should throw NodeTypeNotAllowedError for disallowed node type', async () => {
            mockExecuteGraphQL.mockResolvedValueOnce({
                getHierarchyLevel: {
                    id: 'level1',
                    levelNumber: 1,
                    hierarchy: { id: 'hierarchy1' },
                    allowedTypes: [
                        { typeName: 'concept' }
                    ]
                }
            });
            await expect((0, validation_1.validateLevelIdAndAllowedType)('level1', 'invalid-type', 'hierarchy1'))
                .rejects
                .toThrow(validation_1.NodeTypeNotAllowedError);
        });
        it('should allow any type when allowedTypes is empty', async () => {
            mockExecuteGraphQL.mockResolvedValueOnce({
                getHierarchyLevel: {
                    id: 'level1',
                    levelNumber: 1,
                    hierarchy: { id: 'hierarchy1' },
                    allowedTypes: []
                }
            });
            const result = await (0, validation_1.validateLevelIdAndAllowedType)('level1', 'any-type', 'hierarchy1');
            expect(result).toBeDefined();
        });
        it('should throw InvalidLevelError for missing level', async () => {
            mockExecuteGraphQL.mockResolvedValueOnce({
                getHierarchyLevel: null
            });
            await expect((0, validation_1.validateLevelIdAndAllowedType)('nonexistent-level', 'concept', 'hierarchy1'))
                .rejects
                .toThrow(validation_1.InvalidLevelError);
        });
        it('should throw error for invalid input parameters', async () => {
            await expect((0, validation_1.validateLevelIdAndAllowedType)(null, 'concept', 'hierarchy1'))
                .rejects
                .toThrow(validation_1.InvalidLevelError);
            await expect((0, validation_1.validateLevelIdAndAllowedType)('level1', null, 'hierarchy1'))
                .rejects
                .toThrow('A valid nodeType string must be provided');
        });
    });
    describe('getLevelIdForNode', () => {
        it('should return level 1 when no parent provided', async () => {
            mockExecuteGraphQL.mockResolvedValueOnce({
                queryHierarchy: [{
                        levels: [
                            { id: 'level1', levelNumber: 1 },
                            { id: 'level2', levelNumber: 2 }
                        ]
                    }]
            });
            const result = await (0, validation_1.getLevelIdForNode)(null, 'hierarchy1');
            expect(result).toBe('level1');
        });
        it('should return next level when parent has assignment in hierarchy', async () => {
            // Mock parent query
            mockExecuteGraphQL.mockResolvedValueOnce({
                queryNode: [{
                        hierarchyAssignments: [{
                                hierarchy: { id: 'hierarchy1' },
                                level: { levelNumber: 1 }
                            }]
                    }]
            });
            // Mock levels query
            mockExecuteGraphQL.mockResolvedValueOnce({
                queryHierarchy: [{
                        levels: [
                            { id: 'level1', levelNumber: 1 },
                            { id: 'level2', levelNumber: 2 }
                        ]
                    }]
            });
            const result = await (0, validation_1.getLevelIdForNode)('parent-node', 'hierarchy1');
            expect(result).toBe('level2');
        });
        it('should return level 1 when parent has no assignment in target hierarchy', async () => {
            // Mock parent query - parent exists but no assignment in target hierarchy
            mockExecuteGraphQL.mockResolvedValueOnce({
                queryNode: [{
                        hierarchyAssignments: [{
                                hierarchy: { id: 'other-hierarchy' },
                                level: { levelNumber: 1 }
                            }]
                    }]
            });
            // Mock levels query
            mockExecuteGraphQL.mockResolvedValueOnce({
                queryHierarchy: [{
                        levels: [
                            { id: 'level1', levelNumber: 1 },
                            { id: 'level2', levelNumber: 2 }
                        ]
                    }]
            });
            const result = await (0, validation_1.getLevelIdForNode)('parent-node', 'hierarchy1');
            expect(result).toBe('level1');
        });
        it('should throw InvalidLevelError when calculated level does not exist', async () => {
            // Mock parent query - parent at level 2
            mockExecuteGraphQL.mockResolvedValueOnce({
                queryNode: [{
                        hierarchyAssignments: [{
                                hierarchy: { id: 'hierarchy1' },
                                level: { levelNumber: 2 }
                            }]
                    }]
            });
            // Mock levels query - only has levels 1 and 2, so level 3 doesn't exist
            mockExecuteGraphQL.mockResolvedValueOnce({
                queryHierarchy: [{
                        levels: [
                            { id: 'level1', levelNumber: 1 },
                            { id: 'level2', levelNumber: 2 }
                        ]
                    }]
            });
            await expect((0, validation_1.getLevelIdForNode)('parent-node', 'hierarchy1'))
                .rejects
                .toThrow(validation_1.InvalidLevelError);
        });
        it('should throw InvalidLevelError when hierarchy has no levels', async () => {
            mockExecuteGraphQL.mockResolvedValueOnce({
                queryHierarchy: [{
                        levels: []
                    }]
            });
            await expect((0, validation_1.getLevelIdForNode)(null, 'hierarchy1'))
                .rejects
                .toThrow(validation_1.InvalidLevelError);
        });
    });
});
