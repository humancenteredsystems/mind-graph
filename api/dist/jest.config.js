"use strict";
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    testMatch: [
        '**/__tests__/**/*.test.{js,ts}',
        '**/?(*.)+(spec|test).{js,ts}'
    ],
    transform: {
        '^.+\\.ts$': 'ts-jest',
        '^.+\\.js$': 'babel-jest'
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    collectCoverageFrom: [
        'services/**/*.{js,ts}',
        'middleware/**/*.{js,ts}',
        'utils/**/*.{js,ts}',
        'routes/**/*.{js,ts}',
        'controllers/**/*.{js,ts}',
        '!**/__tests__/**',
        '!**/node_modules/**',
        '!**/dist/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
    testTimeout: 10000,
    verbose: true,
    clearMocks: true,
    restoreMocks: true,
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/$1'
    }
};
//# sourceMappingURL=jest.config.js.map