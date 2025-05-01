# MakeItMakeSense.io

> A modular, open-source platform for collaboratively building a living, visual knowledge graph.

## Overview

MakeItMakeSense.io aims to be an interactive knowledge map platform. It allows users to explore, contribute to, and curate structured knowledge using a hybrid hierarchical and non-hierarchical graph structure powered by Dgraph.

## Current Status

This repository contains the core components for the MakeItMakeSense.io platform:
*   **Dgraph Backend:** A graph database configured via Docker Compose.
*   **Backend API:** A Node.js/Express server providing a GraphQL interface and other endpoints to interact with Dgraph.
*   **Frontend:** A React/Vite application using Cytoscape.js for interactive graph visualization.
*   **Utility Tools:** Python scripts for database management (schema push, seeding, querying, exporting) and a simple HTML/Mermaid.js visualizer for exported data.

## Tech Stack

*   **Database:** Dgraph (via Docker)
*   **Backend API:** Node.js, Express.js
*   **Frontend:** React, Vite, TypeScript, Cytoscape.js, Axios
*   **Utility Tools:** Python, requests, Mermaid.js
*   **Development:** Docker Compose, Nodemon, Concurrently, Vitest, Jest

## Project Structure

```
.
├── .gitignore          # Specifies intentionally untracked files (like /exports/)
├── docker-compose.yml  # Defines Dgraph services (Zero, Alpha, Ratel)
├── package.json        # Root package file with helper scripts
├── package-lock.json
├── README.md           # This file
├── schema.graphql      # The GraphQL schema for the Dgraph database
├── setup_schema.py     # (DEPRECATED - Use tools/push_schema.py instead)
├── api/                # Backend API (Node.js/Express)
│   ├── .env            # Environment variables (e.g., DGRAPH_ENDPOINT, PORT) - Not committed
│   ├── .gitignore
│   ├── dgraphClient.js # Dgraph client logic
│   ├── endpoints.test.js # API endpoint tests
│   ├── jest.config.js  # Jest configuration
│   ├── package.json
│   ├── package-lock.json
│   └── server.js       # Express server entry point
├── docs/               # Project documentation
│   ├── architecture.md # High-level system design
│   └── schema_notes.md # Notes related to the Dgraph schema
├── exports/            # Default directory for graph JSON exports (ignored by Git)
├── frontend/           # Frontend application (React/Vite)
│   ├── .gitignore
│   ├── index.html      # Vite entry HTML
│   ├── package.json
│   ├── package-lock.json
│   ├── README.md       # (Default Vite README)
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts  # Vite configuration (includes proxy setup)
│   ├── public/         # Static assets
│   └── src/            # Frontend source code
│       ├── App.tsx         # Main application component
│       ├── main.tsx        # React entry point
│       ├── setupTests.ts   # Vitest setup
│       ├── vite-env.d.ts   # Vite TypeScript environment types
│       ├── assets/
│       ├── components/
│       │   └── GraphView.tsx # Cytoscape graph rendering component
│       ├── services/
│       │   └── ApiService.ts # Functions for calling the backend API
│       └── utils/
│           └── graphUtils.ts # Helper functions for graph data transformation
└── tools/              # Utility scripts and visualization tool
    ├── export_graph.py
    ├── push_schema.py  # Preferred script for pushing schema
    ├── query_graph.py
    ├── README.md       # README specific to the tools directory
    ├── seed_data.py
    └── visualize_mermaid.html # HTML/Mermaid visualizer for exports
```
*(Note: `setup_schema.py` in the root is redundant; use `tools/push_schema.py`.)*

## Prerequisites

*   **Docker & Docker Compose:** To run the Dgraph database services.
*   **Node.js & npm:** Version 18+ recommended (includes npm).
*   **Python:** Version 3.6+ recommended.
*   **Conda (Recommended):** This project uses a conda environment named 'pointcloud' for Python dependencies.
*   **Python `requests` library:** Install via pip (preferably within the conda environment):
    ```bash
    # Activate conda environment (if using)
    # conda activate pointcloud

    pip install requests
    ```

## Getting Started / Development Environment

The easiest way to start the full development environment (Dgraph database, backend API server, and frontend development server) is to use the root-level npm script:

1.  **Clone the Repository:**
    ```bash
    git clone <repository_url>
    cd mims-graph
    ```
2.  **Install Root Dependencies:** Run `npm install` in the project root directory (`/home/gb/coding/mims-graph`) to install `concurrently`.
    ```bash
    npm install
    ```
3.  **Install API & Frontend Dependencies:** The `start-dev-env` script *does not* automatically install dependencies in the sub-directories. You need to do this manually the first time:
    ```bash
    cd api && npm install && cd ..
    cd frontend && npm install && npm install cytoscape-dblclick && cd ..
    ```
4.  **Start Everything:** In the project root directory, run:
    ```bash
    npm run start-dev-env
    ```
    This command will:
    *   Start the Dgraph Docker containers (`docker-compose up -d`).
    *   Start the backend API server (`cd api && npm run dev`).
    *   Start the frontend development server (`cd frontend && npm run dev`).
    You will see combined output from the API and frontend servers in your terminal.
5.  **Access Services:**
    *   **Frontend Application:** Open your web browser to `http://localhost:5173` (or the port shown by Vite).
    *   **Dgraph Ratel UI:** Open `http://localhost:8000` to explore the graph data directly.
    *   **API Base:** The API server runs on `http://localhost:3000` (or the `PORT` in `api/.env`). The frontend proxy handles requests to `/api`.
6.  **Push Schema (Required on first run or after schema changes):**
    In a separate terminal, while Dgraph is running:
    
    **Option 1: Direct push (legacy):**
    ```bash
    # Ensure conda environment is active if needed
    # conda activate pointcloud
    python tools/push_schema.py
    ```
    
    **Option 2: API-based push (recommended):**
    ```bash
    # Set your admin API key
    export MIMS_ADMIN_API_KEY=your_secure_key
    
    # Push to local Dgraph
    python tools/api_push_schema.py --target local
    
    # Push to remote Dgraph (requires SSH config in .env)
    python tools/api_push_schema.py --target remote
    
    # Push to both local and remote
    python tools/api_push_schema.py --target both
    ```
7.  **Seed Data (Optional):**
    In a separate terminal:
    ```bash
    # Ensure conda environment is active if needed
    # conda activate pointcloud
    python tools/seed_data.py
    ```
8.  **Stopping:**
    *   Press `Ctrl+C` in the terminal where `npm run start-dev-env` is running to stop the API and frontend servers.
    *   To stop the Dgraph database containers, run:
        ```bash
        npm run stop-dgraph
        # or directly: docker-compose down
        ```

## Running Tests

*   **API Tests:**
    ```bash
    cd api
    npm test
    ```
*   **Frontend Tests:**
    ```bash
    cd frontend
    npm test
    # Or for UI mode:
    # npm run test:ui
    ```
*   **E2E Tests (Frontend):** Requires the dev environment (`npm run start-dev-env`) to be running.
    ```bash
    cd frontend
    # Run all E2E tests headlessly
    npm run test:e2e
    # Run tests with interactive UI mode
    npm run test:e2e:ui
    # View the last HTML report
    npm run test:e2e:report
    ```

## API Endpoints

The backend API provides several endpoints under `/api`:
*   `POST /api/query`: Execute GraphQL queries.
*   `POST /api/mutate`: Execute GraphQL mutations.
*   `POST /api/traverse`: Fetch a node and its immediate neighbors.
*   `GET /api/search`: Search nodes by label.
*   `GET /api/schema`: Retrieve the current GraphQL schema text.
*   `GET /api/health`: Check API and Dgraph connectivity.
*   `POST /api/deleteNodeCascade`: Performs cascade deletion of a node and all associated edges.
*   `GET /api/debug/dgraph`: Diagnostic endpoint to test Dgraph connectivity.

*(See `/docs/api_endpoints.md` for detailed descriptions).*

## Utility Tools (`tools/` directory)

This directory contains Python scripts for interacting with the Dgraph database and visualizing data:
*   `push_schema.py`: Pushes `schema.graphql` to Dgraph.
*   `seed_data.py`: Populates the database with sample data.
*   `query_graph.py`: Executes GraphQL queries.
*   `export_graph.py`: Exports graph data to JSON.
*   `visualize_mermaid.html`: Browser-based tool to view exported JSON using Mermaid.js.

*(See `tools/README.md` for detailed usage of these tools).*

## Documentation

*   `/docs/architecture.md`: High-level system design.
*   `/docs/schema_notes.md`: Notes related to the Dgraph schema.
*   `/docs/api_endpoints.md`: API endpoint reference
*   `/docs/deployment_guide.md`: Local and Render deployment instructions

## Future Work

*   Implement remaining features outlined in `docs/architecture.md` (e.g., branching, merging, user auth).
*   Expand API functionality (e.g., more complex traversals, advanced search).
*   Enhance frontend UI/UX (e.g., better layout controls).
*   Improve test coverage.
*   Maintain documentation (e.g., `deployment_guide.md` and API reference).
*   Remove redundant `setup_schema.py`.

## License

MakeItMakeSense.io is licensed under the [MIT License](LICENSE). This means you are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software, as long as you include the original copyright notice and license text.

The MIT License is one of the most permissive and widely used open-source licenses, ensuring the code remains freely available while allowing for maximum flexibility in how it can be used.

See the [LICENSE](LICENSE) file for the full text of the license.

## User Interaction

- Double-click (or double-tap) on a node to open the drawer.
- Single-click (or single-tap) no longer opens the drawer.

## Contributing

(Placeholder - contribution guidelines can be added here later.)
