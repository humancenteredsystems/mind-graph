"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const nodeEnrichment_1 = require("../../../services/nodeEnrichment");
const mockData_1 = require("../../helpers/mockData");
// Mock the validation service
jest.mock('../../../services/validation', () => ({
    validateHierarchyId: jest.fn(),
    validateLevelIdAndAllowedType: jest.fn(),
    getLevelIdForNode: jest.fn()
}));
const validation = __importStar(require("../../../services/validation"));
// Type the mocked validation functions
const mockValidation = validation;
describe('nodeEnrichment service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('enrichNodeInputs', () => {
        it('should return variables unchanged for non-AddNodeWithHierarchy mutations', async () => {
            const variables = { input: [(0, mockData_1.createMockAddNodeInput)()] };
            const hierarchyId = 'hierarchy1';
            const mutation = 'mutation AddNode($input: [AddNodeInput!]!) { addNode(input: $input) { node { id } } }';
            const result = await (0, nodeEnrichment_1.enrichNodeInputs)(variables, hierarchyId, mutation);
            expect(result).toEqual(variables);
        });
        it('should enrich node input with hierarchy assignments for AddNodeWithHierarchy mutations', async () => {
            const input = [(0, mockData_1.createMockAddNodeInput)({
                    hierarchyAssignments: [
                        {
                            hierarchy: { id: 'hierarchy1' },
                            level: { id: 'level1' }
                        }
                    ]
                })];
            const variables = { input };
            const hierarchyId = 'hierarchy1';
            const mutation = 'mutation AddNodeWithHierarchy($input: [AddNodeInput!]!) { addNode(input: $input) { node { id } } }';
            mockValidation.validateLevelIdAndAllowedType.mockResolvedValueOnce({});
            const result = await (0, nodeEnrichment_1.enrichNodeInputs)(variables, hierarchyId, mutation);
            expect(result.input).toHaveLength(1);
            expect(result.input[0]).toHaveProperty('hierarchyAssignments');
            expect(result.input[0].hierarchyAssignments).toHaveLength(1);
            expect(result.input[0].hierarchyAssignments[0]).toEqual({
                hierarchy: { id: 'hierarchy1' },
                level: { id: 'level1' }
            });
        });
        it('should validate node type against level restrictions', async () => {
            const input = [(0, mockData_1.createMockAddNodeInput)({
                    type: 'invalid-type',
                    hierarchyAssignments: [
                        {
                            hierarchy: { id: 'hierarchy1' },
                            level: { id: 'level1' }
                        }
                    ]
                })];
            const variables = { input };
            const hierarchyId = 'hierarchy1';
            const mutation = 'mutation AddNodeWithHierarchy($input: [AddNodeInput!]!) { addNode(input: $input) { node { id } } }';
            mockValidation.validateLevelIdAndAllowedType.mockRejectedValueOnce(new Error('Node type "invalid-type" is not allowed at level "Domain"'));
            await expect((0, nodeEnrichment_1.enrichNodeInputs)(variables, hierarchyId, mutation))
                .rejects
                .toThrow('Node type "invalid-type" is not allowed at level "Domain"');
        });
        it('should handle levelId provided directly', async () => {
            const input = [(0, mockData_1.createMockAddNodeInput)({
                    hierarchyAssignments: undefined, // Remove default hierarchyAssignments
                    levelId: 'level1'
                })];
            const variables = { input };
            const hierarchyId = 'hierarchy1';
            const mutation = 'mutation AddNodeWithHierarchy($input: [AddNodeInput!]!) { addNode(input: $input) { node { id } } }';
            mockValidation.validateLevelIdAndAllowedType.mockResolvedValueOnce({});
            const result = await (0, nodeEnrichment_1.enrichNodeInputs)(variables, hierarchyId, mutation);
            expect(result.input[0]).toHaveProperty('hierarchyAssignments');
            expect(result.input[0].hierarchyAssignments[0]).toEqual({
                hierarchy: { id: 'hierarchy1' },
                level: { id: 'level1' }
            });
        });
        it('should handle parentId by calculating level', async () => {
            const input = [(0, mockData_1.createMockAddNodeInput)({
                    hierarchyAssignments: undefined, // Remove default hierarchyAssignments
                    parentId: 'parent-node'
                })];
            const variables = { input };
            const hierarchyId = 'hierarchy1';
            const mutation = 'mutation AddNodeWithHierarchy($input: [AddNodeInput!]!) { addNode(input: $input) { node { id } } }';
            mockValidation.getLevelIdForNode.mockResolvedValueOnce('level2');
            mockValidation.validateLevelIdAndAllowedType.mockResolvedValueOnce({});
            const result = await (0, nodeEnrichment_1.enrichNodeInputs)(variables, hierarchyId, mutation);
            expect(mockValidation.getLevelIdForNode).toHaveBeenCalledWith('parent-node', 'hierarchy1');
            expect(result.input[0]).toHaveProperty('hierarchyAssignments');
            expect(result.input[0].hierarchyAssignments[0]).toEqual({
                hierarchy: { id: 'hierarchy1' },
                level: { id: 'level2' }
            });
        });
        it('should handle multiple nodes in batch', async () => {
            const input = [
                (0, mockData_1.createMockAddNodeInput)({ id: 'node1', type: 'concept', hierarchyAssignments: undefined, levelId: 'level1' }),
                (0, mockData_1.createMockAddNodeInput)({ id: 'node2', type: 'concept', hierarchyAssignments: undefined, levelId: 'level1' })
            ];
            const variables = { input };
            const hierarchyId = 'hierarchy1';
            const mutation = 'mutation AddNodeWithHierarchy($input: [AddNodeInput!]!) { addNode(input: $input) { node { id } } }';
            mockValidation.validateLevelIdAndAllowedType.mockResolvedValue({});
            const result = await (0, nodeEnrichment_1.enrichNodeInputs)(variables, hierarchyId, mutation);
            expect(result.input).toHaveLength(2);
            expect(result.input[0].id).toBe('node1');
            expect(result.input[1].id).toBe('node2');
            expect(result.input[0]).toHaveProperty('hierarchyAssignments');
            expect(result.input[1]).toHaveProperty('hierarchyAssignments');
        });
        it('should create node without assignment when no hierarchy info provided', async () => {
            const input = [(0, mockData_1.createMockAddNodeInput)({
                    hierarchyAssignments: undefined,
                    levelId: undefined,
                    parentId: undefined
                })];
            const variables = { input };
            const hierarchyId = 'hierarchy1';
            const mutation = 'mutation AddNodeWithHierarchy($input: [AddNodeInput!]!) { addNode(input: $input) { node { id } } }';
            const result = await (0, nodeEnrichment_1.enrichNodeInputs)(variables, hierarchyId, mutation);
            expect(result.input[0]).not.toHaveProperty('hierarchyAssignments');
        });
    });
});
