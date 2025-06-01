"use strict";
// Standardized mock data for backend tests
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockAddNodeInput = exports.createMockHierarchy = exports.createMockNode = exports.mockTraversalResponse = exports.mockGraphQLResponses = exports.mockHierarchies = exports.mockEdges = exports.mockNodes = void 0;
exports.mockNodes = [
    {
        id: 'node1',
        label: 'Test Node 1',
        type: 'concept',
        status: 'active',
        branch: 'main',
        hierarchyAssignments: [
            {
                hierarchy: { id: 'hierarchy1', name: 'Test Hierarchy' },
                level: { id: 'level1', levelNumber: 1, label: 'Domain' }
            }
        ]
    },
    {
        id: 'node2',
        label: 'Test Node 2',
        type: 'example',
        status: 'active',
        branch: 'main',
        hierarchyAssignments: [
            {
                hierarchy: { id: 'hierarchy1', name: 'Test Hierarchy' },
                level: { id: 'level2', levelNumber: 2, label: 'Subdomain' }
            }
        ]
    }
];
exports.mockEdges = [
    {
        from: { id: 'node1' },
        fromId: 'node1',
        to: { id: 'node2' },
        toId: 'node2',
        type: 'connects_to'
    }
];
exports.mockHierarchies = [
    {
        id: 'hierarchy1',
        name: 'Test Hierarchy',
        levels: [
            {
                id: 'level1',
                levelNumber: 1,
                label: 'Domain',
                allowedTypes: [
                    { typeName: 'concept' },
                    { typeName: 'question' }
                ]
            },
            {
                id: 'level2',
                levelNumber: 2,
                label: 'Subdomain',
                allowedTypes: [
                    { typeName: 'example' },
                    { typeName: 'concept' }
                ]
            }
        ]
    }
];
exports.mockGraphQLResponses = {
    queryNode: {
        data: {
            queryNode: exports.mockNodes
        }
    },
    addNode: {
        data: {
            addNode: {
                node: [exports.mockNodes[0]]
            }
        }
    },
    queryHierarchy: {
        data: {
            queryHierarchy: exports.mockHierarchies
        }
    }
};
exports.mockTraversalResponse = {
    data: {
        queryNode: [
            {
                ...exports.mockNodes[0],
                outgoing: [
                    {
                        type: 'connects_to',
                        to: exports.mockNodes[1]
                    }
                ]
            }
        ]
    }
};
// Helper functions to create mock data
const createMockNode = (overrides = {}) => ({
    id: 'mock-node',
    label: 'Mock Node',
    type: 'concept',
    status: 'active',
    branch: 'main',
    hierarchyAssignments: [],
    ...overrides
});
exports.createMockNode = createMockNode;
const createMockHierarchy = (overrides = {}) => ({
    id: 'mock-hierarchy',
    name: 'Mock Hierarchy',
    levels: [
        {
            id: 'mock-level',
            levelNumber: 1,
            label: 'Mock Level',
            allowedTypes: [{ typeName: 'concept' }]
        }
    ],
    ...overrides
});
exports.createMockHierarchy = createMockHierarchy;
const createMockAddNodeInput = (overrides = {}) => ({
    id: 'new-node',
    label: 'New Node',
    type: 'concept',
    hierarchyAssignments: [
        {
            hierarchy: { id: 'hierarchy1' },
            level: { id: 'level1' }
        }
    ],
    ...overrides
});
exports.createMockAddNodeInput = createMockAddNodeInput;
