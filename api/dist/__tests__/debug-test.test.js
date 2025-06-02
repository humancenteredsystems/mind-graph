"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const server_1 = __importDefault(require("../server"));
describe('Debug Test', () => {
    it('should get a response from root endpoint', async () => {
        const response = await (0, supertest_1.default)(server_1.default)
            .get('/')
            .expect(200);
        console.log('=== ROOT ENDPOINT DEBUG ===');
        console.log('Status:', response.status);
        console.log('Body:', response.text);
        console.log('=== END DEBUG ===');
    });
    it('should get a response from API mutate endpoint', async () => {
        const response = await (0, supertest_1.default)(server_1.default)
            .post('/api/mutate')
            .set('X-Tenant-Id', 'test-tenant')
            .send({
            mutation: 'query { __schema { queryType { name } } }'
        });
        console.log('=== MUTATE ENDPOINT DEBUG ===');
        console.log('Status:', response.status);
        console.log('Headers:', response.headers);
        console.log('Body:', JSON.stringify(response.body, null, 2));
        console.log('Text:', response.text);
        console.log('=== END DEBUG ===');
    });
});
