# MakeItMakeSense.io

> A modular, open-source platform for collaboratively building a living, visual knowledge graph.

## Overview

MakeItMakeSense.io is developed and maintained by [Human-Centered Systems, LLC](https://humancenteredsystems.io).

MakeItMakeSense.io is an interactive platform designed for exploring, contributing to, and curating structured knowledge. It utilizes a hybrid hierarchical and non-hierarchical graph structure powered by Dgraph, allowing for flexible and rich data representation.

The core components include:
*   **Dgraph Backend:** Graph database managed via Docker with optional multi-tenant support.
*   **Node.js/Express API:** Provides a GraphQL interface and RESTful endpoints with tenant-aware operations.
*   **React/Vite Frontend:** Interactive graph visualization using Cytoscape.js with centralized theme system.
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
*   **Backend API:** Node.js, Express.js with **TypeScript**, tenant context middleware
*   **Frontend:** React 19, Vite, TypeScript, Cytoscape.js, Axios with centralized theme system and CSS-in-JS styling
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

## Quick Start

For complete setup instructions including local development, environment configuration, and production deployment, see the **[Complete Setup Guide](docs/setup-guide.md)**.

**Essential steps:**
1. Clone the repository and install dependencies
2. Configure environment variables (`api/.env`)
3. Start development environment: `npm run start-dev-env`
4. Initialize database schema: `python tools/api_push_schema.py --target local`
5. Access frontend at `http://localhost:5173`

For detailed instructions, troubleshooting, and production deployment, refer to the [Setup Guide](docs/setup-guide.md).

## Usage

Once the development environment is running and the schema is pushed:
*   Access the frontend at `http://localhost:5173`.
*   Explore the graph.
*   **Node Interaction:** Double-click (or double-tap) on a node to open its details drawer.
*   **Multi-Tenant Testing:** Use `X-Tenant-Id` headers to test tenant isolation.

## Frontend Architecture

The frontend features a modern, maintainable styling architecture:

### Theme System
- **Design Tokens** (`frontend/src/config/tokens.ts`): Base design values (colors, spacing, typography)
- **Theme Configuration** (`frontend/src/config/theme.ts`): Semantic theme built from tokens with component-specific styling
- **Style Utilities** (`frontend/src/utils/styleUtils.ts`): Helper functions for consistent component styling

### Key Features
- **Dynamic Level Colors**: Automatically generated colors for 8 hierarchy levels using HSL color space
- **CSS-in-JS Approach**: Type-safe styling with theme integration
- **Centralized Styling**: No inline styles or hardcoded values
- **Component Builders**: Reusable style builders for modals, forms, buttons, and other UI elements

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
*   [Complete Setup Guide](docs/setup-guide.md) - Local development and production deployment
*   [Architecture Overview](docs/architecture.md) - System design and components
*   [API Endpoints](docs/api_endpoints.md) - Complete API reference with multi-tenant features

### Implementation Guides  
*   [Multi-Tenant Implementation](docs/multi-tenant-implementation.md) - Complete multi-tenant architecture details
*   [Testing Guide](docs/testing-guide.md) - Comprehensive testing strategy and best practices
*   [Dgraph Schema Notes](docs/schema_notes.md) - Schema design patterns and considerations

### Reference Documentation
*   [Dgraph Operations Guide](docs/dgraph-operations.md) - Comprehensive Dgraph operations, troubleshooting, and critical multi-tenant safety information
*   [UI Elements](docs/ui-elements.md) - Frontend component specifications and styling guide

## Setup and Deployment

For complete instructions on local development setup and deploying services to production (e.g., on Render), including multi-tenant configuration and monitoring, please see our [Complete Setup Guide](docs/setup-guide.md).

## Future Work

*   Implement remaining features outlined in `docs/architecture.md` (e.g., advanced node types, user authentication).
*   Frontend tenant context and selection UI.
*   Enhanced multi-tenant analytics and monitoring.
*   Tenant-specific API keys and enhanced security.
*   Performance monitoring and resource quotas per tenant.
*   Increase test coverage across all components.
*   Continuously update and maintain documentation.

## Contributing

Contributions are welcome! Please refer to `CONTRIBUTING.md` (to be created) for guidelines on how to contribute, report issues, or suggest features. For now, please open an issue on GitHub for any bugs or feature requests.

When contributing to multi-tenant features, please:
- Test with both OSS and Enterprise Dgraph configurations
- Follow namespace safety practices
- Update relevant documentation
- Include both mocked and real integration tests

When contributing to frontend features, please:
- Use the centralized theme system for all styling
- Follow the CSS-in-JS patterns with style utilities
- Avoid inline styles and hardcoded colors
- Maintain consistency with existing component patterns

## License

MakeItMakeSense.io is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for the full text.
