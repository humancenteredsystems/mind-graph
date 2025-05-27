# Deployment Guide

This guide describes how to deploy the MakeItMakeSense.io full stack to Render for production. For local development setup, please refer to the main [README.md](../README.md).

---

## Production Deployment on Render

We deploy three separate services on Render:

### 1. Dgraph (Private Service)

- **Service Type:** Docker  
- **Dockerfile Path:** `Dockerfile.dgraph`  
- **Build Context:** Repository root  
- **Entrypoint:** Uses `docker/dgraph-entrypoint.sh` to launch Zero and Alpha, wait for GraphQL admin, and apply `schemas/default.graphql`.  
- **Persistent Volume:** Attach SSD to `/dgraph` for data persistence.  
- **Auto-Deploy:** Enable on pushes to `main`.
- **Multi-Tenant Requirements:** For production multi-tenant deployment, use Dgraph Enterprise image with namespace support.

### 2. Backend API (Web Service)

- **Root Directory:** `/api`  
- **Build Command:**  
  ```
  npm install
  ```
- **Start Command:**  
  ```
  npm run start
  ```
- **Environment Variables:**  
  - `PORT` (e.g., 3000, Render will set this)
  - `DGRAPH_BASE_URL=http://mims-graph-dgraph:8080` (Internal URL to your Dgraph Private Service on Render)
  - `MIMS_ADMIN_API_KEY` (A secure key for admin operations, ensure this is set in Render)
  - `CORS_ORIGIN=https://your-frontend-domain.com` (e.g., `https://makeitmakesense.io` or your Render static site URL)
  - **Multi-Tenant Configuration:**
    - `ENABLE_MULTI_TENANT=true` (Enable multi-tenant mode)
    - `DGRAPH_NAMESPACE_DEFAULT=0x0` (Default namespace)
    - `DGRAPH_NAMESPACE_TEST=0x1` (Test tenant namespace)
    - `DGRAPH_NAMESPACE_PREFIX=0x` (Namespace prefix)
    - `DEFAULT_TENANT_ID=default` (Default tenant identifier)
- **Auto-Deploy:** Enable on pushes to `main`.

### 3. Frontend (Static Site)

- **Root Directory:** `/frontend`  
- **Build Command:**  
  ```
  npm install && npm run build
  ```
- **Publish Directory:** `dist`  
- **Environment Variables:**  
  - `VITE_API_BASE_URL=https://your-backend-api-url.onrender.com/api` (The public URL of your Backend API service on Render, e.g., `https://mims-graph-docker-api.onrender.com/api`)
- **Auto-Deploy:** Enable on pushes to `main`.

---

## Multi-Tenant Configuration

### OSS vs Enterprise Mode

The application automatically detects Dgraph capabilities and adapts behavior:

- **OSS Mode (Single-Tenant):**
  - All operations use default namespace (0x0)
  - Multi-tenant features gracefully disabled
  - No additional configuration required

- **Enterprise Mode (Multi-Tenant):**
  - Each tenant operates in isolated namespace
  - Complete data separation
  - Requires Dgraph Enterprise image

### Production Tenant Management

**Initial Setup:**
```bash
# Create production tenants via API
curl -X POST https://your-api-url.onrender.com/api/tenant \
  -H "X-Admin-API-Key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "customer-1"}'
```

**Tenant Operations:**
- Each tenant gets deterministic namespace (0x2, 0x3, etc.)
- Isolated schemas and data
- Independent backup/restore capabilities
- Complete request isolation via `X-Tenant-Id` header

### Environment-Specific Configuration

**Development:**
```bash
ENABLE_MULTI_TENANT=true
DGRAPH_BASE_URL=http://localhost:8080
DGRAPH_NAMESPACE_TEST=0x1
```

**Production:**
```bash
ENABLE_MULTI_TENANT=true
DGRAPH_BASE_URL=http://mims-graph-dgraph:8080
# Render will set other variables via dashboard
```

---

## DNS & Custom Domain

If you are using a custom domain for your frontend (e.g., `makeitmakesense.io`):

1. In the Render dashboard, add your custom domain to the **Frontend (Static Site)** service.  
2. Update your DNS records with your domain registrar (e.g., CNAME record) to point to Render's provided alias for the static site.  
3. Enable HTTPS in Render for your custom domain.

Your `CORS_ORIGIN` on the Backend API service and `VITE_API_BASE_URL` on the Frontend service should reflect your custom domain setup if applicable.

---

## Verification & Monitoring

### Basic Health Checks

- **API Health:**  
  Check the health of your deployed Backend API service:
  ```
  curl https://your-backend-api-url.onrender.com/api/health
  ```
  Expect:
  ```json
  { "apiStatus": "OK", "dgraphStatus": "OK" }
  ```

- **Multi-Tenant Capabilities:**
  ```
  curl https://your-backend-api-url.onrender.com/api/system/status
  ```
  Expect:
  ```json
  { 
    "namespacesSupported": true,
    "multiTenantEnabled": true,
    "defaultTenant": "default"
  }
  ```

### Tenant-Specific Testing

- **Test Tenant Operations:**
  ```bash
  # Query test tenant data
  curl -X POST https://your-api-url.onrender.com/api/query \
    -H "X-Tenant-Id: test-tenant" \
    -H "Content-Type: application/json" \
    -d '{"query": "{ queryNode { id label } }"}'
  
  # Get tenant information
  curl https://your-api-url.onrender.com/api/tenant/info \
    -H "X-Tenant-Id: test-tenant"
  ```

### Production Monitoring

- **Frontend Graph Load:**  
  Open your deployed frontend URL and confirm the graph renders and interacts correctly.

- **Tenant Isolation Verification:**
  - Create test data in different tenants
  - Verify complete data separation
  - Test cross-tenant access prevention

- **Dgraph Admin Access:**  
  For Enterprise deployments, Dgraph admin interfaces are not directly exposed. Use:
  - API admin endpoints for schema management
  - Tenant management APIs for operations
  - Log analysis for troubleshooting

### Operational Monitoring

- **Logs & Alerts:**  
  Review logs for all services in the Render dashboard:
  - Monitor tenant creation/deletion activities
  - Track namespace isolation compliance
  - Alert on admin operation anomalies

- **Performance Metrics:**
  - Response times per tenant
  - Database query performance
  - Resource utilization per namespace

### Backup & Recovery

**Per-Tenant Backup:**
```bash
# Export specific tenant data
curl -X POST https://your-api-url.onrender.com/api/admin/export \
  -H "X-Admin-API-Key: your-admin-key" \
  -H "X-Tenant-Id: customer-1" \
  -d '{"format": "json"}'
```

**Namespace Safety:**
- Always specify tenant context for admin operations
- Use namespace-scoped operations (avoid cluster-wide dropAll)
- Maintain separate backup schedules per tenant

---

## Security Considerations

### Multi-Tenant Security

- **Admin API Keys:** Rotate regularly and store securely in Render environment variables
- **Tenant Isolation:** Verify complete data separation in production
- **Request Validation:** All tenant operations validate proper context headers
- **Audit Logging:** Monitor all admin and cross-tenant operations

### Network Security

- **Private Services:** Dgraph runs as private service (not publicly accessible)
- **HTTPS:** All external communication encrypted
- **CORS:** Properly configured origin restrictions
- **API Authentication:** Admin operations protected by API keys

---

## Troubleshooting

### Common Deployment Issues

1. **Multi-Tenant Mode Detection:**
   ```bash
   # Check if Enterprise features are detected
   curl https://your-api-url.onrender.com/api/debug/dgraph
   ```

2. **Namespace Configuration:**
   ```bash
   # Verify namespace environment variables
   curl https://your-api-url.onrender.com/api/system/config
   ```

3. **Tenant Operations:**
   ```bash
   # Test tenant creation
   curl -X POST https://your-api-url.onrender.com/api/tenant/test/init
   ```

### Performance Optimization

- **Database Connections:** Monitor connection pooling efficiency
- **Namespace Switching:** Optimize tenant context resolution
- **Query Performance:** Monitor per-tenant query metrics
- **Resource Allocation:** Scale based on tenant usage patterns

For additional troubleshooting, see the [Multi-Tenant Implementation Guide](multi-tenant-implementation.md) and [Testing Guide](testing-guide.md).

---
