// src/index.ts
var LensError = class extends Error {
  constructor(message, lensId, operation) {
    super(message);
    this.lensId = lensId;
    this.operation = operation;
    this.name = "LensError";
  }
};
var ComputeError = class extends Error {
  constructor(message, endpoint, params) {
    super(message);
    this.endpoint = endpoint;
    this.params = params;
    this.name = "ComputeError";
  }
};
export {
  ComputeError,
  LensError
};
