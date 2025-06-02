"use strict";
// Load environment variables before Jest starts
require('dotenv').config();
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    setupFilesAfterEnv: ['./jest.setup.ts'],
    testMatch: [
        '**/__tests__/**/*.test.ts',
        '**/?(*.)+(spec|test).ts'
    ],
    collectCoverageFrom: [
        'services/**/*.ts',
        'middleware/**/*.ts',
        'utils/**/*.ts',
        'routes/**/*.ts',
        'controllers/**/*.ts',
        '!**/__tests__/**',
        '!**/node_modules/**'
    ],
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    },
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
    verbose: false,
    silent: process.env.VERBOSE_TESTS !== 'true',
    clearMocks: true,
    restoreMocks: true,
    reporters: [
        ['default', {
                summaryOnly: process.env.VERBOSE_TESTS !== 'true',
                silent: process.env.VERBOSE_TESTS !== 'true'
            }]
    ]
};
