"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = __importDefault(require("../config"));
const dgraphClient_1 = require("../dgraphClient");
const axios_1 = __importDefault(require("axios"));
const dns_1 = require("dns");
const router = express_1.default.Router();
// Use URLs from config
const DGRAPH_BASE_URL = config_1.default.dgraphBaseUrl;
const DGRAPH_GRAPHQL_URL = `${DGRAPH_BASE_URL.replace(/\/+$/, '')}/graphql`;
const DGRAPH_ADMIN_SCHEMA_URL = config_1.default.dgraphAdminUrl;
// Diagnostic Endpoints
// -------------------------------------------------------------------
// Endpoint for health check
router.get('/health', async (req, res) => {
    const healthQuery = `query { queryNode { id } }`; // Minimal query
    try {
        await (0, dgraphClient_1.executeGraphQL)(healthQuery);
        res.json({ apiStatus: "OK", dgraphStatus: "OK" });
    }
    catch (error) {
        const err = error;
        console.error(`Health check failed: ${err.message}`);
        res.status(500).json({ apiStatus: "OK", dgraphStatus: "Error", error: err.message });
    }
});
// Diagnostic endpoint for Dgraph connectivity
router.get('/debug/dgraph', async (req, res) => {
    const graphqlUrl = DGRAPH_GRAPHQL_URL;
    const adminSchemaUrl = DGRAPH_ADMIN_SCHEMA_URL;
    const baseUrl = DGRAPH_BASE_URL;
    let host = baseUrl.replace(/^https?:\/\//, '').split(':')[0];
    try {
        const dnsStart = Date.now();
        const { address } = await dns_1.promises.lookup(host);
        const lookupMs = Date.now() - dnsStart;
        console.log(`[DEBUG] Attempting POST request to Dgraph admin schema endpoint: ${adminSchemaUrl}`);
        const adminRes = await axios_1.default.post(adminSchemaUrl, "# Empty schema for testing connectivity", { headers: { 'Content-Type': 'application/graphql' } });
        console.log('[DEBUG] POST request to Dgraph admin schema endpoint successful.');
        console.log('[DEBUG] Dgraph admin response data:', adminRes.data);
        console.log(`[DEBUG] Attempting POST request to Dgraph GraphQL endpoint: ${graphqlUrl}`);
        const gqlRes = await axios_1.default.post(graphqlUrl, { query: '{ __schema { queryType { name } } }', variables: null }, { headers: { 'Content-Type': 'application/json' } });
        console.log('[DEBUG] POST request to Dgraph GraphQL endpoint successful.');
        res.json({
            dns: { host: address, lookupMs },
            httpAdmin: 'reachable',
            graphql: gqlRes.data
        });
    }
    catch (err) {
        const error = err; // Using any for axios error handling
        console.error('[DEBUG] Error in /api/debug/dgraph:', error.message);
        if (error.response) {
            console.error('[DEBUG] Dgraph response status:', error.response.status);
            console.error('[DEBUG] Dgraph response data:', error.response.data);
        }
        res.status(500).json({
            dnsError: error.code || null,
            httpError: error.response?.status || error.message,
            graphqlError: error.response?.data?.errors || null
        });
    }
});
exports.default = router;
