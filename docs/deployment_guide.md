# Deployment Guide

This document outlines the intended deployment strategy for the MakeItMakeSense.io components.

*(Note: This is currently a placeholder. The deployment strategy needs to be fully defined and documented based on the chosen hosting provider, e.g., Render, and specific configurations.)*

## Components

*   **Dgraph Database:** Intended to run as a Docker container, potentially on a service like Render Private Service with a persistent disk attached.
*   **Backend API (Node.js/Express):** Intended to run as a web service (e.g., Render Web Service). Requires environment variables for Dgraph connection (`DGRAPH_ENDPOINT`) and port (`PORT`).
*   **Frontend (React/Vite):** Intended to be built as a static site and served via a static site hosting service (e.g., Render Static Site). The build process (`npm run build` in `/frontend`) generates the necessary static files in `/frontend/dist`.

## Build Steps

*   **Frontend:** `cd frontend && npm run build`
*   **Backend (Local Dev):** No explicit build step needed; install dependencies:
    ```bash
    cd api && npm install
    ```
*   **Backend (Docker Deploy):** Build and run Docker image:
    ```bash
    cd api
    docker build -f Dockerfile -t mims-graph-api .
    docker run -d -p 3000:3000 \
      -e DGRAPH_URL=http://mims-graph-dgraph.onrender.internal:8080 \
      -e PORT=3000 \
      -e CORS_ORIGIN=https://makeitmakesense.io \
      mims-graph-api
    ```

## Environment Variables

The backend API requires the following environment variables:
*   `DGRAPH_URL`: The HTTP endpoint for your Dgraph service. For example:
    - Local development: `http://localhost:8080`
    - On Render (cross-service): `http://mims-graph-dgraph.onrender.internal:8080`
*   `PORT`: The port the API server should listen on (e.g., `3000`).
*   `CORS_ORIGIN`: The allowed origin for CORS requests (e.g., the URL of the deployed frontend, or `*` for development).

## Deployment Considerations (To Be Detailed)

*   Network configuration between services (e.g., ensuring API can reach Dgraph).
*   Persistent volume setup for Dgraph data.
*   Environment variable management in the hosting provider.
*   Build and deployment automation (CI/CD).
*   Domain name configuration.
*   HTTPS setup.
