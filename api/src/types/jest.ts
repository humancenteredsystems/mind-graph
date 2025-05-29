// Helper type for Jest mocks
// This provides a strongly-typed version of a mocked module
export type JestMockOf<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any
    ? jest.Mock<ReturnType<T[P]>, Parameters<T[P]>>
    : T[P];
};
