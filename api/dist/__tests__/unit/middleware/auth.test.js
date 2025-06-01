"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../../../middleware/auth");
describe('auth middleware', () => {
    let req;
    let res;
    let next;
    beforeEach(() => {
        req = testUtils.createMockReq();
        res = testUtils.createMockRes();
        next = testUtils.createMockNext();
        // ADMIN_API_KEY is already loaded from .env file via jest.setup.ts
    });
    describe('authenticateAdmin', () => {
        it('should call next() with valid API key', () => {
            req.headers = { 'x-admin-api-key': process.env.ADMIN_API_KEY };
            (0, auth_1.authenticateAdmin)(req, res, next);
            expect(next).toHaveBeenCalledWith();
            expect(res.status).not.toHaveBeenCalled();
        });
        it('should return 401 with missing API key', () => {
            (0, auth_1.authenticateAdmin)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Unauthorized'
            });
            expect(next).not.toHaveBeenCalled();
        });
        it('should return 401 with invalid API key', () => {
            req.headers = { 'x-admin-api-key': 'invalid-key' };
            (0, auth_1.authenticateAdmin)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Unauthorized'
            });
            expect(next).not.toHaveBeenCalled();
        });
        it('should return 401 when environment variable is missing', () => {
            delete process.env.ADMIN_API_KEY;
            req.headers = { 'x-admin-api-key': 'any-key' };
            (0, auth_1.authenticateAdmin)(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Unauthorized'
            });
            expect(next).not.toHaveBeenCalled();
        });
        it('should handle different header case (Express normalizes headers)', () => {
            // Express.js automatically normalizes headers to lowercase
            // So 'X-Admin-API-Key' becomes 'x-admin-api-key'
            req.headers = { 'X-Admin-API-Key': process.env.ADMIN_API_KEY };
            (0, auth_1.authenticateAdmin)(req, res, next);
            // Should succeed because Express normalizes the header name
            expect(next).toHaveBeenCalledWith();
            expect(res.status).not.toHaveBeenCalled();
        });
    });
});
