# MakeItMakeSense.io

> A modular, open-source platform for collaboratively building a living, visual knowledge graph.

## Overview

MakeItMakeSense.io aims to be an interactive knowledge map platform. It allows users to explore, contribute to, and curate structured knowledge using a hybrid hierarchical and non-hierarchical graph structure powered by Dgraph.

## Current Status

This repository currently contains the core Dgraph database setup using Docker Compose and a suite of Python tools for managing and interacting with the graph data. Frontend (React) and Backend API (Node.js/Python) components described in the architecture document are planned for future development.

## Features (Current)

*   **Dgraph Backend:** Configured via `docker-compose.yml` to run Dgraph Zero, Alpha, and Ratel services.
*   **GraphQL Schema:** Defined in `schema.graphql`.
*   **Database Tools (`tools/` directory):**
    *   `push_schema.py`: Pushes the GraphQL schema to the Dgraph Alpha admin endpoint.
    *   `seed_data.py`: Populates the database with sample data (uses built-in data or a specified JSON file).
    *   `query_graph.py`: Executes predefined or custom GraphQL queries against the database.
    *   `export_graph.py`: Exports graph data (full graph or specific nodes) to JSON files in the `exports/` directory. Creates both a timestamped file and overwrites `exports/latest_json_graph.json`.
    *   `visualize_mermaid.html`: A browser-based tool to visualize exported graph data using Mermaid.js. Automatically loads `exports/latest_json_graph.json` on startup and allows manual loading of other export files.
*   **Documentation (`docs/` directory):** Includes system architecture (`architecture.md`) and schema notes (`schema_notes.md`).

## Prerequisites

*   **Docker & Docker Compose:** To run the Dgraph database services.
*   **Python:** Version 3.6+ is recommended. (Note: This project uses a conda environment named 'pointcloud').
*   **Python `requests` library:** Install using pip:
    ```bash
    pip install requests
    # or if using the conda environment:
    # conda activate pointcloud
    # pip install requests
    ```

## Getting Started / Development Environment

The easiest way to start the full development environment (Dgraph database, backend API server, and frontend development server) is to use the root-level npm script:

1.  **Ensure Prerequisites:** Make sure you have Docker, Docker Compose, Node.js (which includes npm), and Python installed.
2.  **Install Root Dependencies:** If you haven't already, run `npm install` in the project root directory (`/home/gb/coding/mims-graph`) to install `concurrently`.
3.  **Start Everything:** In the project root directory, run:
    ```bash
    npm run start-dev-env
    ```
    This command will:
    *   Start the Dgraph Docker containers (`docker-compose up -d`).
    *   Start the backend API server (`cd api && npm run dev`).
    *   Start the frontend development server (`cd frontend && npm run dev`).
    You will see combined output from the API and frontend servers in your terminal.
4.  **Access Frontend:** Open your web browser and navigate to the URL provided by the Vite frontend server (usually `http://localhost:5173`). You should see the React application displaying the graph.
5.  **Stopping:** Press `Ctrl+C` in the terminal where `npm run start-dev-env` is running. This will stop both the API and frontend servers. To stop the Dgraph database containers, run:
    ```bash
    npm run stop-dgraph
    # or directly: docker-compose down
    ```

## Manual Component Startup / Common Workflow (Alternative)

1.  **Start Dgraph Services (if not using `start-dev-env`):**
    In the project root:
    ```bash
    docker-compose up -d
    # or: npm run start-dgraph
    ```

2.  **Push the Schema (Required on first run or after schema changes):**
    Apply the GraphQL schema to the running Dgraph instance:
    ```bash
    python tools/push_schema.py
    ```
    *(This uses the default `schema.graphql` file in the project root).*

3.  **Start API Server (if not using `start-dev-env`):**
    In a separate terminal:
    ```bash
    cd api
    npm install # If first time
    npm run dev
    ```

4.  **Start Frontend Server (if not using `start-dev-env`):**
    In another separate terminal:
    ```bash
    cd frontend
    npm install # If first time
    npm run dev
    ```
    Then open `http://localhost:5173` (or the port shown) in your browser.

5.  **Seed with Sample Data (Optional):**
    Add some initial data to the graph:
    ```bash
    python tools/seed_data.py
    ```

6.  **Query the Graph (Using Python tool):**
    Run a sample query to verify data:
    ```bash
    python tools/query_graph.py --query all_nodes
    ```
    *(See `tools/README.md` for more query options).*

7.  **Export Graph Data (Using Python tool):**
    Export the current graph state to JSON:
    ```bash
    python tools/export_graph.py
    ```
    *(This creates a timestamped file in `exports/` and updates `exports/latest_json_graph.json`).*

8.  **Visualize the Graph (Using Mermaid tool):**
    Open the visualizer tool in your browser:
    ```bash
    # On Linux (like Ubuntu)
    xdg-open tools/visualize_mermaid.html
    # On macOS
    # open tools/visualize_mermaid.html
    ```
    The page will automatically load and display the data from `exports/latest_json_graph.json`. You can use the file input on the page to load older timestamped exports if needed.

9.  **Access Dgraph Ratel UI (Optional):**
    You can explore the graph data directly using Dgraph's Ratel UI by navigating to `http://localhost:8000` in your browser.

10. **Stop Dgraph Services (if started manually):**
    When finished, stop the Docker containers:
    ```bash
    docker-compose down
    # or: npm run stop-dgraph
    ```

## Project Structure

```
.
├── .gitignore          # Specifies intentionally untracked files (like /exports/)
├── docker-compose.yml  # Defines Dgraph services (Zero, Alpha, Ratel)
├── schema.graphql      # The GraphQL schema for the Dgraph database
├── setup_schema.py     # (Purpose might need clarification - seems related to schema setup)
├── docs/               # Project documentation
│   ├── architecture.md # High-level system design
│   └── schema_notes.md # Notes related to the schema
├── exports/            # Default directory for graph JSON exports (ignored by Git)
└── tools/              # Utility scripts and visualization tool
    ├── export_graph.py
    ├── push_schema.py
    ├── query_graph.py
    ├── README.md       # README specific to the tools directory
    ├── seed_data.py
    └── visualize_mermaid.html
```

## Future Work

As outlined in `docs/architecture.md`, future development includes:
*   A React-based frontend for interactive graph visualization and editing.
*   A backend API (Node.js or Python) to handle graph operations, branching, and merging.
*   User authentication and contribution workflows.

## Contributing

(Placeholder - contribution guidelines can be added here later.)
