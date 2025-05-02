# Deployment Guide

This guide describes how to run the full stack locally for development and how to deploy to Render in production.

---

## Local Development

1. Clone the repository:
   ```
   git clone <repository_url>
   cd mims-graph
   ```
2. Install dependencies:
   - Root: `npm install`
   - API: `cd api && npm install && cd ..`
   - Frontend: `cd frontend && npm install && cd ..`
3. Ensure Docker and Docker Compose are installed on your machine.
4. Start the development environment:
   ```bash
   npm run start-dev-env
   ```
   This will:
   - Launch Dgraph (Zero, Alpha, Ratel) via Docker Compose.
   - Start the API server on port 3000.
   - Start the frontend dev server on port 5173.
5. Push your GraphQL schema (Recommended: Use API push):
   ```bash
   # Ensure conda environment is active if needed
   # conda activate pointcloud
   # Set your admin API key
   export MIMS_ADMIN_API_KEY=your_secure_key 
   python tools/api_push_schema.py --target local
   ```
   (Legacy direct push: `python tools/push_schema.py`)
6. (Optional) Seed sample data:
   ```bash
   python tools/seed_data.py
   ```
7. Access services:
   - Frontend: http://localhost:5173  
   - API health check: http://localhost:3000/api/health  
   - Dgraph Ratel UI: http://localhost:8000  

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
  - `PORT` (e.g., 3000)  
  - `DGRAPH_BASE_URL=http://mims-graph-dgraph:8080` # Base URL for Dgraph service
  - `CORS_ORIGIN=https://makeitmakesense.io`  
- **Auto-Deploy:** Enable on pushes to `main`.

### 3. Frontend (Static Site)

- **Root Directory:** `/frontend`  
- **Build Command:**  
  ```
  npm install && npm run build
  ```
- **Publish Directory:** `dist`  
- **Environment Variables:**  
  - `VITE_API_BASE_URL=https://mims-graph.onrender.com/api`  
- **Auto-Deploy:** Enable on pushes to `main`.

---

## DNS & Custom Domain

1. In the Render dashboard, add your custom domain (`makeitmakesense.io`) to the Static Site service.  
2. Update your DNS records (CNAME) to point to Render’s provided alias.  
3. Enable HTTPS in Render for your domain.

---

## Verification & Monitoring

- **API Health:**  
  ```
  curl https://mims-graph.onrender.com/api/health
  ```
  Expect:
  ```json
  { "apiStatus": "OK", "dgraphStatus": "OK" }
  ```
- **Frontend Graph Load:**  
  Open https://makeitmakesense.io and confirm the graph renders without errors.  
- **Dgraph Ratel UI:**  
  Access the private service (if network rules allow) or run a one‑off port-forward locally to inspect schema and data.  
- **Logs & Alerts:**  
  Review Render logs for errors. Optionally integrate Sentry or another monitoring service.

---
