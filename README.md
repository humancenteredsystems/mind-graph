# MakeItMakeSense.io

> A modular, open-source platform for collaboratively building a living, visual knowledge graph.

## Overview

MakeItMakeSense.io is an interactive platform designed for exploring, contributing to, and curating structured knowledge. It utilizes a hybrid hierarchical and non-hierarchical graph structure powered by Dgraph, allowing for flexible and rich data representation.

The core components include:
*   **Dgraph Backend:** Graph database managed via Docker.
*   **Node.js/Express API:** Provides a GraphQL interface and RESTful endpoints.
*   **React/Vite Frontend:** Interactive graph visualization using Cytoscape.js.
*   **Python Utility Tools:** Scripts for database management and data handling.

Key capabilities include multi-hierarchy support for nodes and automatic hierarchy assignment during node creation.

## Tech Stack

*   **Database:** Dgraph (via Docker)
*   **Backend API:** Node.js, Express.js
*   **Frontend:** React, Vite, TypeScript, Cytoscape.js, Axios
*   **Utility Tools:** Python, requests
*   **Development Environment:** Docker Compose, Nodemon, Concurrently
*   **Testing:** Vitest (Frontend), Jest (API), Playwright (E2E)

## Prerequisites

*   **Docker & Docker Compose:** Essential for running the Dgraph database services.
*   **Node.js & npm:** Version 18+ recommended.
*   **Python:** Version 3.7+ recommended.
*   **Conda (Recommended):** For managing Python environments (e.g., an environment named 'pointcloud').
    *   The `requests` library is needed for Python tools: `pip install requests` (preferably within your Python environment).

## Local Development Setup

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd mims-graph
    ```
2.  **Install Dependencies:**
    *   Root: `npm install` (installs `concurrently`)
    *   API: `cd api && npm install && cd ..`
    *   Frontend: `cd frontend && npm install && cd ..`

3.  **Environment Variables (API):**
    *   The API server (`api/server.js`) requires certain environment variables. Copy `api/.env.example` to `api/.env` and fill in necessary values, especially `MIMS_ADMIN_API_KEY` for using admin-protected tool scripts. `DGRAPH_BASE_URL` will default to `http://localhost:8080` if not set in `.env`, which is suitable for local development with the provided Docker Compose setup.

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
    # Activate your Python environment if needed (e.g., conda activate pointcloud)
    # Set your admin API key (must match MIMS_ADMIN_API_KEY in api/.env if set)
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
    python tools/seed_data.py
    ```

8.  **Stopping the Environment:**
    *   Press `Ctrl+C` in the terminal running `npm run start-dev-env` to stop API and frontend servers.
    *   To stop Dgraph containers: `npm run stop-dgraph` (or `docker-compose down`).

## Usage

Once the development environment is running and the schema is pushed:
*   Access the frontend at `http://localhost:5173`.
*   Explore the graph.
*   **Node Interaction:** Double-click (or double-tap) on a node to open its details drawer.

## Running Tests

*   **API Tests (Jest):**
    ```bash
    cd api
    npm test
    ```
*   **Frontend Unit & Integration Tests (Vitest):**
    ```bash
    cd frontend
    npm test
    # For UI mode: npm run test:ui
    ```
*   **Frontend E2E Tests (Playwright):** Requires the full dev environment to be running.
    ```bash
    cd frontend
    npm run test:e2e       # Headless
    npm run test:e2e:ui    # Interactive UI
    npm run test:e2e:report # View last HTML report
    ```

## API Endpoints

The backend API exposes several endpoints, primarily under the `/api` prefix. Key endpoints include:
*   `POST /api/query`: Execute GraphQL queries.
*   `POST /api/mutate`: Execute GraphQL mutations.
*   `POST /api/traverse`: Fetch a node and its immediate neighbors.
*   `GET /api/search`: Search nodes.
*   `GET /api/health`: Check API and Dgraph connectivity.
*   Admin endpoints for schema and data management (e.g., `/api/admin/schema`, `/api/admin/dropAll`).
*   Hierarchy management endpoints for creating and managing hierarchies, levels, and assignments (e.g., `GET /api/hierarchy`, `POST /api/hierarchy/level`).

For detailed descriptions, see [API Endpoints Documentation](docs/api_endpoints.md).

## Utility Tools (`tools/`)

Python scripts for database interaction and data management:
*   `api_push_schema.py`: Pushes schema via the API (recommended).
*   `seed_data.py`: Populates the database with sample data.
*   `query_graph.py`: Executes GraphQL queries against the database.
*   `drop_data.py`: Clears data from Dgraph via the API.
*   `export_graph.py`: Exports graph data to JSON.
*   `visualize_mermaid.html`: Browser-based tool to view exported JSON using Mermaid.js.

Refer to `tools/README.md` for detailed usage.

## Documentation

Key project documentation can be found in the `/docs` directory:
*   [Architecture Overview](docs/architecture.md)
*   [API Endpoints](docs/api_endpoints.md)
*   [Deployment Guide](docs/deployment_guide.md) (Covers local and Render deployment)
*   [Dgraph Schema Notes](docs/schema_notes.md)
*   [UI Elements (Legacy)](docs/ui-elements.md)

## Deployment

For instructions on deploying the services to a production-like environment (e.g., on Render), please see our [Deployment Guide](docs/deployment_guide.md).

## Future Work

*   Implement remaining features outlined in `docs/architecture.md` (e.g., advanced node types, user authentication).
*   Enhance API capabilities (e.g., complex traversals, improved search).
*   Refine frontend UI/UX and add more visualization options.
*   Increase test coverage across all components.
*   Continuously update and maintain documentation.

## Contributing

Contributions are welcome! Please refer to `CONTRIBUTING.md` (to be created) for guidelines on how to contribute, report issues, or suggest features. For now, please open an issue on GitHub for any bugs or feature requests.

## License

MakeItMakeSense.io is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for the full text.
