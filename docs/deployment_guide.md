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

## DNS & Custom Domain

If you are using a custom domain for your frontend (e.g., `makeitmakesense.io`):

1. In the Render dashboard, add your custom domain to the **Frontend (Static Site)** service.  
2. Update your DNS records with your domain registrar (e.g., CNAME record) to point to Render’s provided alias for the static site.  
3. Enable HTTPS in Render for your custom domain.

Your `CORS_ORIGIN` on the Backend API service and `VITE_API_BASE_URL` on the Frontend service should reflect your custom domain setup if applicable.

---

## Verification & Monitoring

- **API Health:**  
  Check the health of your deployed Backend API service:
  ```
  curl https://your-backend-api-url.onrender.com/api/health
  ```
  Expect:
  ```json
  { "apiStatus": "OK", "dgraphStatus": "OK" }
  ```
  (Replace `https://your-backend-api-url.onrender.com` with the actual public URL of your API service).

- **Frontend Graph Load:**  
  Open your deployed frontend URL (e.g., `https://your-frontend-domain.com` or the `*.onrender.com` URL for the static site) and confirm the graph renders and interacts correctly.

- **Dgraph Ratel UI (Accessing Private Service):**  
  Dgraph Ratel UI is not directly exposed publicly from the Private Service. To inspect schema and data:
    *   Use the Dgraph Cloud offering if migrating in the future.
    *   For Render Private Services, you might need to temporarily set up a way to access it, such as running a one-off job with port forwarding or using Render's shell access if available to execute Dgraph commands or queries internally.
    *   Alternatively, rely on your API endpoints and utility tools (configured for remote access) to inspect data.

- **Logs & Alerts:**  
  Review logs for all three services (Dgraph, Backend API, Frontend) in the Render dashboard for any errors or issues. Consider integrating an external logging/monitoring service for more advanced insights.

---
