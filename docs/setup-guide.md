# Complete Setup Guide

This comprehensive guide covers everything needed to set up MakeItMakeSense.io for local development and production deployment.

## Prerequisites

*   **Docker & Docker Compose:** Essential for running the Dgraph database services.
*   **Node.js & npm:** Version 18+ recommended.
*   **Python:** Version 3.7+ recommended.
*   **Python Environment (Recommended):** Use conda, venv, or similar for managing Python environments.
    *   The `requests` library is needed for Python tools: `pip install requests` (preferably within your Python environment).
*   **Dgraph Enterprise (Optional):** Required for multi-tenant features with namespace isolation.

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/heythisisgordon/mims-graph.git
cd mims-graph

# Install dependencies
npm install                    # Root (installs concurrently)
cd api && npm install && cd .. # API dependencies
cd frontend && npm install && cd .. # Frontend dependencies
```

### 2. Environment Configuration

The API server requires environment variables for proper operation. The system uses a centralized configuration approach for consistency and maintainability.

#### Create Environment File

Copy the example environment file and configure it:

```bash
cp api/.env.example api/.env
```

#### Core Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API server port |
| `DGRAPH_BASE_URL` | `http://localhost:8080` | Dgraph base URL for local development |
| `ADMIN_API_KEY` | `null` | Admin API key for protected operations |

#### Multi-Tenant Configuration (Optional)

For multi-tenant development and testing:

```bash
# Add to api/.env
ENABLE_MULTI_TENANT=true
DGRAPH_NAMESPACE_DEFAULT=0x0
DGRAPH_NAMESPACE_TEST=0x1
DGRAPH_NAMESPACE_PREFIX=0x
DEFAULT_TENANT_ID=default
```

#### Configuration System Architecture

The backend uses a centralized configuration system (`api/config/index.ts`) that:
- Provides a single source of truth for all configuration
- Ensures consistent defaults for all environment variables
- Offers type safety with proper conversion for booleans and numbers
- Prevents race conditions by loading environment variables once at startup

**✅ Correct Usage:**
```typescript
import config from '../config';
const port = config.port;
const dgraphUrl = config.dgraphBaseUrl;
```

**❌ Avoid Direct Environment Access:**
```typescript
// Don't do this - creates anti-patterns
const port = process.env.PORT || 3000;
```

### 3. Start Development Environment

From the project root directory:

```bash
npm run start-dev-env
```

This command concurrently:
*   Starts Dgraph services via `docker-compose up -d`
*   Starts the backend API server with hot-reloading (`cd api && npm run dev`)
*   Starts the frontend development server with hot-reloading (`cd frontend && npm run dev`)

### 4. Access Development Services

*   **Frontend Application:** `http://localhost:5173` (or as indicated by Vite)
*   **API Server:** `http://localhost:3000` (or as specified by `PORT` in `api/.env`)
*   **Dgraph Ratel UI:** `http://localhost:8000`

### 5. Initialize Database Schema

**Required on first run or after schema changes:**

```bash
# Activate your Python environment if needed
# conda activate pointcloud  # or your environment name

# Set your admin API key (must match ADMIN_API_KEY in api/.env)
export MIMS_ADMIN_API_KEY=your_secure_key_here 

# Push schema to the local Dgraph instance via the API
python tools/api_push_schema.py --target local 
```

The primary schema is located at `schemas/default.graphql`.

### 6. Seed Sample Data (Optional)

```bash
# Ensure MIMS_ADMIN_API_KEY is set as above
export MIMS_API_URL="http://localhost:3000/api"

# Single-tenant mode (default)
python tools/seed_data.py

# Multi-tenant mode with test tenant
python tools/seed_data.py --tenant-id test-tenant
```

### 7. Stopping the Development Environment

*   Press `Ctrl+C` in the terminal running `npm run start-dev-env` to stop API and frontend servers
*   To stop Dgraph containers: `npm run stop-dgraph` (or `docker-compose down`)

## Production Deployment

### Render Deployment Architecture

We deploy three separate services on Render for production:

1. **Dgraph (Private Service)** - Graph database
2. **Backend API (Web Service)** - Node.js/Express API
3. **Frontend (Static Site)** - React/Vite application

### 1. Dgraph Database (Private Service)

**Service Configuration:**
- **Service Type:** Docker  
- **Dockerfile Path:** `Dockerfile.dgraph`  
- **Build Context:** Repository root  
- **Entrypoint:** Uses `docker/dgraph-entrypoint.sh` to launch Zero and Alpha, wait for GraphQL admin, and apply `schemas/default.graphql`
- **Persistent Volume:** Attach SSD to `/dgraph` for data persistence
- **Auto-Deploy:** Enable on pushes to `main`

**Multi-Tenant Requirements:**
For production multi-tenant deployment, use Dgraph Enterprise image with namespace support.

### 2. Backend API (Web Service)

**Service Configuration:**
- **Root Directory:** `/api`  
- **Build Command:** `npm install`
- **Start Command:** `npm run start`
- **Auto-Deploy:** Enable on pushes to `main`

**Production Environment Variables:**

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `PORT` | `3000` | API server port (Render sets automatically) |
| `DGRAPH_BASE_URL` | `http://mims-graph-dgraph:8080` | Internal URL to Dgraph Private Service |
| `ADMIN_API_KEY` | `your-secure-key` | Secure key for admin operations |
| `CORS_ORIGIN` | `https://makeitmakesense.io` | Frontend domain for CORS |

**Multi-Tenant Production Configuration:**
```bash
ENABLE_MULTI_TENANT=true
DGRAPH_NAMESPACE_DEFAULT=0x0
DGRAPH_NAMESPACE_TEST=0x1
DGRAPH_NAMESPACE_PREFIX=0x
DEFAULT_TENANT_ID=default
```

### 3. Frontend (Static Site)

**Service Configuration:**
- **Root Directory:** `/frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Auto-Deploy:** Enable on pushes to `main`

**Production Environment Variables:**

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `VITE_API_BASE_URL` | `https://mims-graph-api.onrender.com/api` | Public URL of Backend API service |

### DNS & Custom Domain Setup

For custom domain configuration (e.g., `makeitmakesense.io`):

1. **Add Custom Domain:** In Render dashboard, add your custom domain to the Frontend (Static Site) service
2. **Update DNS Records:** With your domain registrar, create CNAME record pointing to Render's provided alias
3. **Enable HTTPS:** Enable HTTPS in Render for your custom domain
4. **Update Environment Variables:** Ensure `CORS_ORIGIN` and `VITE_API_BASE_URL` reflect your custom domain

## Multi-Tenant Configuration

### OSS vs Enterprise Mode

The application automatically detects Dgraph capabilities and adapts behavior:

**OSS Mode (Single-Tenant):**
- All operations use default namespace (0x0)
- Multi-tenant features gracefully disabled
- No additional configuration required

**Enterprise Mode (Multi-Tenant):**
- Each tenant operates in isolated namespace
- Complete data separation
- Requires Dgraph Enterprise image

### Tenant Management

**Create Production Tenants:**
```bash
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

### Environment-Specific Multi-Tenant Setup

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
# Other variables set via Render dashboard
```

## Verification & Health Checks

### Local Development Verification

**API Health Check:**
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{ "apiStatus": "OK", "dgraphStatus": "OK" }
```

**Multi-Tenant Capabilities:**
```bash
curl http://localhost:3000/api/system/status
```

Expected response:
```json
{ 
  "namespacesSupported": true,
  "multiTenantEnabled": true,
  "defaultTenant": "default"
}
```

### Production Verification

**API Health Check:**
```bash
curl https://your-backend-api-url.onrender.com/api/health
```

**Tenant-Specific Testing:**
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

**Frontend Verification:**
- Open your deployed frontend URL
- Confirm the graph renders and interacts correctly
- Test node creation and interaction features

## Troubleshooting

### Common Development Issues

1. **Schema Not Loaded:**
   ```bash
   # Re-push schema
   python tools/api_push_schema.py --target local
   ```

2. **Environment Variables Not Loading:**
   - Verify `api/.env` file exists and contains required variables
   - Check that variables are properly formatted (no spaces around `=`)
   - Restart the development environment after changes

3. **Multi-Tenant Mode Not Working:**
   ```bash
   # Check if Enterprise features are detected
   curl http://localhost:3000/api/debug/dgraph
   ```

4. **Database Connection Issues:**
   - Ensure Docker containers are running: `docker ps`
   - Check Dgraph logs: `docker-compose logs dgraph-alpha`
   - Verify `DGRAPH_BASE_URL` in environment variables

### Common Production Issues

1. **API Not Accessible:**
   - Check Render service logs
   - Verify environment variables are set correctly
   - Ensure internal service URLs are correct

2. **Frontend Can't Connect to API:**
   - Verify `VITE_API_BASE_URL` points to correct API service URL
   - Check CORS configuration in API environment variables
   - Ensure API service is running and healthy

3. **Multi-Tenant Operations Failing:**
   ```bash
   # Verify namespace environment variables
   curl https://your-api-url.onrender.com/api/system/config
   
   # Test tenant creation
   curl -X POST https://your-api-url.onrender.com/api/tenant/test/init
   ```

## Security Considerations

### Development Security
- Use secure `ADMIN_API_KEY` values
- Never commit `.env` files to version control
- Use environment-specific configuration

### Production Security
- **Admin API Keys:** Rotate regularly and store securely in Render environment variables
- **Tenant Isolation:** Verify complete data separation in production
- **Request Validation:** All tenant operations validate proper context headers
- **Network Security:** Dgraph runs as private service (not publicly accessible)
- **HTTPS:** All external communication encrypted
- **CORS:** Properly configured origin restrictions

## Performance Optimization

### Development Performance
- Use local Dgraph instance for faster development
- Enable hot-reloading for rapid iteration
- Use test tenant for isolated development work

### Production Performance
- **Database Connections:** Monitor connection pooling efficiency
- **Namespace Switching:** Optimize tenant context resolution
- **Query Performance:** Monitor per-tenant query metrics
- **Resource Allocation:** Scale based on tenant usage patterns

## Additional Resources

- [API Endpoints Documentation](api_endpoints.md) - Complete API reference
- [Multi-Tenant Implementation Guide](multi-tenant-implementation.md) - Detailed multi-tenant architecture
- [Testing Guide](testing-guide.md) - Comprehensive testing strategy
- [Dgraph Operations Guide](dgraph-operations.md) - Database operations and troubleshooting

For additional support, refer to the comprehensive documentation in the `/docs` directory or open an issue on GitHub.
