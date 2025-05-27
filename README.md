# MakeItMakeSense.io

> A modular, open-source platform for collaboratively building a living, visual knowledge graph.

## Overview

MakeItMakeSense.io is an interactive platform designed for exploring, contributing to, and curating structured knowledge. It utilizes a hybrid hierarchical and non-hierarchical graph structure powered by Dgraph, allowing for flexible and rich data representation.

The core components include:
*   **Dgraph Backend:** Graph database managed via Docker with optional multi-tenant support.
*   **Node.js/Express API:** Provides a GraphQL interface and RESTful endpoints with tenant-aware operations.
*   **React/Vite Frontend:** Interactive graph visualization using Cytoscape.js.
*   **Python Utility Tools:** Scripts for database management and data handling.

Key capabilities include multi-hierarchy support for nodes, automatic hierarchy assignment during node creation, and **enterprise-grade multi-tenant architecture** with complete data isolation.

## Multi-Tenant Support

The platform features a comprehensive multi-tenant architecture:

- **Adaptive Design:** Automatically detects OSS vs Enterprise Dgraph capabilities
- **Complete Data Isolation:** Each tenant operates in a dedicated namespace
- **Shared Infrastructure:** Single Dgraph cluster efficiently serves all tenants
- **Production Ready:** Scalable to 2^64 namespaces with deterministic tenant provisioning

**Tenant Operations:**
```bash
# Create a new tenant
curl -X POST http://localhost:3000/api/tenant \
  -H "X-Admin-API-Key: your-key" \
  -d '{"tenantId": "customer-1"}'

# Query tenant-specific data
curl -X POST http://localhost:3000/api/query \
  -H "X-Tenant-Id: customer-1" \
  -d '{"query": "{ queryNode { id label } }"}'
```

## Tech Stack

*   **Database:** Dgraph (via Docker) - OSS for single-tenant, Enterprise for multi-tenant
*   **Backend API:** Node.js, Express.js with tenant context middleware
*   **Frontend:** React 19, Vite, TypeScript, Cytoscape.js, Axios
*   **Utility Tools:** Python, requests with tenant-aware operations
*   **Development Environment:** Docker Compose, Nodemon, Concurrently
*   **Testing:** Vitest (Frontend), Jest (API), Playwright (E2E) with real database integration tests

## Prerequisites

*   **Docker & Docker Compose:** Essential for running the Dgraph database services.
*   **Node.js & npm:** Version 18+ recommended.
*   **Python:** Version 3.7+ recommended.
*   **Python Environment (Recommended):** Use conda, venv, or similar for managing Python environments.
    *   The `requests` library is needed for Python tools: `pip install requests` (preferably within your Python environment).
*   **Dgraph Enterprise (Optional):** Required for multi-tenant features with namespace isolation.

## Local Development Setup

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/heythisisgordon/mims-graph.git
    cd mims-graph
    ```
2.  **Install Dependencies:**
    *   Root: `npm install` (installs `concurrently`)
    *   API: `cd api && npm install && cd ..`
    *   Frontend: `cd frontend && npm install && cd ..`

3.  **Environment Variables (API):**
    *   The API server (`api/server.js`) requires certain environment variables. Copy `api/.env.example` to `api/.env` and fill in necessary values, especially `ADMIN_API_KEY` for using admin-protected tool scripts. `DGRAPH_BASE_URL` will default to `http://localhost:8080` if not set in `.env`, which is suitable for local development with the provided Docker Compose setup.
    *   **Multi-Tenant Configuration (Optional):**
        ```bash
        ENABLE_MULTI_TENANT=true
        DGRAPH_NAMESPACE_DEFAULT=0x0
        DGRAPH_NAMESPACE_TEST=0x1
        ```

4.  **Start Development Environment:**
    From the project root directory:
    ```bash
    npm run start-dev-env
    ```
    This command concurrently:
    *   Starts Dgraph services via `docker-compose up -d`.
    *   Starts the backend API server with hot-reloading (`cd api && npm run dev`).
    *   Starts the frontend development server with hot-reloading (`cd frontend && npm run dev`).

5.  **Access Services:**
    *   **Frontend Application:** `http://localhost:5173` (or as indicated by Vite)
    *   **API Server:** `http://localhost:3000` (or as specified by `PORT` in `api/.env`)
    *   **Dgraph Ratel UI:** `http://localhost:8000`

6.  **Initial Schema Push (Required on first run or after schema changes):**
    In a separate terminal (ensure Dgraph from `start-dev-env` is running):
    ```bash
    # Activate your Python environment if needed (e.g., conda activate myenv or source venv/bin/activate)
    # Set your admin API key (must match ADMIN_API_KEY in api/.env if set)
    export MIMS_ADMIN_API_KEY=your_secure_key_here 
    
    # Push schema to the local Dgraph instance via the API
    python tools/api_push_schema.py --target local 
    ```
    *(The primary schema is located at `schemas/default.graphql`)*

7.  **Seed Sample Data (Optional):**
    In a separate terminal:
    ```bash
    # Ensure MIMS_ADMIN_API_KEY is set as above
    export MIMS_API_URL="http://localhost:3000/api" # Or your API port if different
    
    # Single-tenant mode (default)
    python tools/seed_data.py
    
    # Multi-tenant mode with test tenant
    python tools/seed_data.py --tenant-id test-tenant
    ```

8.  **Stopping the Environment:**
    *   Press `Ctrl+C` in the terminal running `npm run start-dev-env` to stop API and frontend servers.
    *   To stop Dgraph containers: `npm run stop-dgraph` (or `docker-compose down`).

## Usage

Once the development environment is running and the schema is pushed:
*   Access the frontend at `http://localhost:5173`.
*   Explore the graph.
*   **Node Interaction:** Double-click (or double-tap) on a node to open its details drawer.
*   **Multi-Tenant Testing:** Use `X-Tenant-Id` headers to test tenant isolation.

## Running Tests

The project uses a comprehensive multi-layered testing strategy with organized structure and shared utilities:

### Test Categories

*   **Unit Tests** - Individual components and services in isolation
*   **Mocked Integration Tests** - API interactions with mocked dependencies  
*   **Real Database Integration Tests** - Complete functionality with real Dgraph
*   **End-to-End Tests** - Complete user workflows in the browser

### API Tests (Jest)

**Organized in `api/__tests__/`:**
```bash
cd api

# All tests
npm test                    

# Unit tests only
npm test -- --testPathPattern="unit"

# Mocked integration tests
npm test -- --testPathPattern="integration" --testPathIgnorePatterns="integration-real"

# Real database integration tests (requires Dgraph Enterprise)
npm test -- --testPathPattern="integration-real"

# Coverage and watch modes
npm test -- --coverage     
npm test -- --watch        
```

### Frontend Tests (Vitest & Playwright)

**Organized in `frontend/tests/`:**
```bash
cd frontend

# Unit & integration tests (Vitest)
npm test                    # Run all tests (watch mode)
npm run test:ui             # Interactive UI mode
npm test -- --coverage     # Run with coverage
npm test -- --run          # Single run (no watch)

# E2E tests (Playwright) - requires full dev environment
npm run test:e2e            # Headless
npm run test:e2e:ui         # Interactive UI
npm run test:e2e:report     # View last HTML report
```

### Test Structure

**Backend (`api/__tests__/`):**
- `unit/services/` - Business logic tests (tenantManager, nodeEnrichment, validation)
- `unit/middleware/` - Middleware tests (auth, tenantContext)
- `unit/utils/` - Utility function tests (dgraphAdmin, pushSchema)
- `integration/` - API endpoint integration tests (mocked)
- `integration-real/` - **Real database integration tests** (no mocking)
- `helpers/` - Shared test utilities, mock data, and real test helpers

**Frontend (`frontend/tests/`):**
- `unit/components/` - Component unit tests
- `unit/hooks/` - Custom hook tests
- `unit/services/` - Service layer tests
- `unit/utils/` - Utility function tests
- `integration/` - Component integration tests
- `e2e/` - End-to-end tests (Playwright)
- `helpers/` - Test utilities, mock data, and custom render functions

### Real Database Integration Testing

**New Feature:** Comprehensive tests using actual Dgraph database and tenant infrastructure:

**Requirements:**
- Dgraph Enterprise with namespace support
- Test tenant (0x1) configured
- Schema loaded with Node and Hierarchy types

**Test Features:**
- Complete CRUD operations in real test tenant
- Namespace isolation verification
- GraphQL operations and performance testing
- No mocking - uses production code paths

## API Endpoints

The backend API features a modular architecture with separate route modules for different functional domains, improving maintainability while preserving full backward compatibility. The API exposes several endpoints, primarily under the `/api` prefix:

*   `POST /api/query`: Execute GraphQL queries.
*   `POST /api/mutate`: Execute GraphQL mutations.
*   `POST /api/traverse`: Fetch a node and its immediate neighbors.
*   `GET /api/search`: Search nodes.
*   `GET /api/health`: Check API and Dgraph connectivity.
*   Admin endpoints for schema and data management (e.g., `/api/admin/schema`, `/api/admin/dropAll`).
*   Hierarchy management endpoints for creating and managing hierarchies, levels, and assignments (e.g., `GET /api/hierarchy`, `POST /api/hierarchy/level`).
*   **Multi-tenant endpoints** for tenant management and operations (e.g., `POST /api/tenant`, `GET /api/tenant/info`).

For detailed descriptions, see [API Endpoints Documentation](docs/api_endpoints.md).

## Utility Tools (`tools/`)

Python scripts for database interaction and data management:
*   `api_push_schema.py`: Pushes schema via the API (recommended).
*   `seed_data.py`: Populates the database with sample data via the API (tenant-aware).
*   `drop_data.py`: Clears data from Dgraph via the API (namespace-safe).
*   `query_graph.py`: Executes GraphQL queries directly against Dgraph.
*   `export_graph.py`: Exports graph data to JSON directly from Dgraph.
*   `visualize_mermaid.html`: Browser-based tool to view exported JSON using Mermaid.js.

**Multi-Tenant Features:**
- Tenant-aware seeding with `--tenant-id` option
- Namespace-scoped operations for safety
- Enterprise capability detection and adaptation

**Note:** Tools marked "via the API" use the backend API server, while others connect directly to Dgraph. Refer to `tools/README.md` for detailed usage and configuration requirements.

## Documentation

Comprehensive project documentation can be found in the `/docs` directory:

### Core Documentation
*   [Architecture Overview](docs/architecture.md) - System design and components
*   [API Endpoints](docs/api_endpoints.md) - Complete API reference with multi-tenant features
*   [Deployment Guide](docs/deployment_guide.md) - Local and production deployment with multi-tenant configuration

### Implementation Guides  
*   [Multi-Tenant Implementation](docs/multi-tenant-implementation.md) - Complete multi-tenant architecture details
*   [Testing Guide](docs/testing-guide.md) - Comprehensive testing strategy and best practices
*   [Dgraph Schema Notes](docs/schema_notes.md) - Schema design patterns and considerations

### Reference Documentation
*   [Dgraph dropAll Limitation](docs/dgraph-dropall-limitation.md) - Critical multi-tenant safety information
*   [Dgraph Troubleshooting](docs/dgraph_troubleshooting.md) - Common issues and solutions
*   [UI Elements](docs/ui-elements.md) - Frontend component specifications

## Deployment

For instructions on deploying the services to a production-like environment (e.g., on Render), including multi-tenant configuration and monitoring, please see our [Deployment Guide](docs/deployment_guide.md).

## Future Work

*   Implement remaining features outlined in `docs/architecture.md` (e.g., advanced node types, user authentication).
*   Frontend tenant context and selection UI.
*   Enhanced multi-tenant analytics and monitoring.
*   Tenant-specific API keys and enhanced security.
*   Performance monitoring and resource quotas per tenant.
*   Refine frontend UI/UX and add more visualization options.
*   Increase test coverage across all components.
*   Continuously update and maintain documentation.

## Contributing

Contributions are welcome! Please refer to `CONTRIBUTING.md` (to be created) for guidelines on how to contribute, report issues, or suggest features. For now, please open an issue on GitHub for any bugs or feature requests.

When contributing to multi-tenant features, please:
- Test with both OSS and Enterprise Dgraph configurations
- Follow namespace safety practices
- Update relevant documentation
- Include both mocked and real integration tests

## License

MakeItMakeSense.io is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for the full text.
