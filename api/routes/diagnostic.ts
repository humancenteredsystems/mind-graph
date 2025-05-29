import express, { Request, Response } from 'express';
import config from '../config';
import { executeGraphQL } from '../dgraphClient';
import axios, { AxiosResponse } from 'axios';
import { promises as dns } from 'dns';

const router = express.Router();

// Use URLs from config
const DGRAPH_BASE_URL = config.dgraphBaseUrl;
const DGRAPH_GRAPHQL_URL = `${DGRAPH_BASE_URL.replace(/\/+$/, '')}/graphql`;
const DGRAPH_ADMIN_SCHEMA_URL = config.dgraphAdminUrl;

// Types for diagnostic responses
interface HealthResponse {
  apiStatus: string;
  dgraphStatus: string;
  error?: string;
}

interface DnsLookupResult {
  host: string;
  lookupMs: number;
}

interface DgraphDebugResponse {
  dns: DnsLookupResult;
  httpAdmin: string;
  graphql: any;
}

interface DgraphDebugErrorResponse {
  dnsError: string | null;
  httpError: number | string;
  graphqlError: any;
}

// Diagnostic Endpoints
// -------------------------------------------------------------------

// Endpoint for health check
router.get('/health', async (req: Request, res: Response<HealthResponse>): Promise<void> => {
  const healthQuery = `query { queryNode { id } }`; // Minimal query
  try {
    await executeGraphQL(healthQuery);
    res.json({ apiStatus: "OK", dgraphStatus: "OK" });
  } catch (error: any) {
    console.error(`Health check failed: ${error.message}`);
    res.status(500).json({ apiStatus: "OK", dgraphStatus: "Error", error: error.message });
  }
});

// Diagnostic endpoint for Dgraph connectivity
router.get('/debug/dgraph', async (req: Request, res: Response<DgraphDebugResponse | DgraphDebugErrorResponse>): Promise<void> => {
  const graphqlUrl = DGRAPH_GRAPHQL_URL;
  const adminSchemaUrl = DGRAPH_ADMIN_SCHEMA_URL;
  const baseUrl = DGRAPH_BASE_URL;

  const host = baseUrl.replace(/^https?:\/\//, '').split(':')[0];

  try {
    const dnsStart = Date.now();
    const { address } = await dns.lookup(host);
    const lookupMs = Date.now() - dnsStart;

    console.log(`[DEBUG] Attempting POST request to Dgraph admin schema endpoint: ${adminSchemaUrl}`);
    const adminRes: AxiosResponse = await axios.post(
      adminSchemaUrl,
      "# Empty schema for testing connectivity",
      { headers: { 'Content-Type': 'application/graphql' } }
    );
    console.log('[DEBUG] POST request to Dgraph admin schema endpoint successful.');
    console.log('[DEBUG] Dgraph admin response data:', adminRes.data);

    console.log(`[DEBUG] Attempting POST request to Dgraph GraphQL endpoint: ${graphqlUrl}`);
    const gqlRes: AxiosResponse = await axios.post(
      graphqlUrl,
      { query: '{ __schema { queryType { name } } }', variables: null },
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('[DEBUG] POST request to Dgraph GraphQL endpoint successful.');

    res.json({
      dns: { host: address, lookupMs },
      httpAdmin: 'reachable',
      graphql: gqlRes.data
    });
  } catch (err: any) {
    console.error('[DEBUG] Error in /api/debug/dgraph:', err.message);
    if (err.response) {
      console.error('[DEBUG] Dgraph response status:', err.response.status);
      console.error('[DEBUG] Dgraph response data:', err.response.data);
    }
    res.status(500).json({
      dnsError: err.code || null,
      httpError: err.response?.status || err.message,
      graphqlError: err.response?.data?.errors || null
    });
  }
});

export default router;
