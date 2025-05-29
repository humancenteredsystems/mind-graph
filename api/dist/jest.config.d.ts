export let preset: string;
export let testEnvironment: string;
export let setupFilesAfterEnv: string[];
export let testMatch: string[];
export let transform: {
    '^.+\\.ts$': string;
    '^.+\\.js$': string;
};
export let moduleFileExtensions: string[];
export let collectCoverageFrom: string[];
export let coverageDirectory: string;
export let coverageReporters: string[];
export namespace coverageThreshold {
    namespace global {
        let branches: number;
        let functions: number;
        let lines: number;
        let statements: number;
    }
}
export let testTimeout: number;
export let verbose: boolean;
export let clearMocks: boolean;
export let restoreMocks: boolean;
export let moduleNameMapping: {
    '^@/(.*)$': string;
};
//# sourceMappingURL=jest.config.d.ts.map