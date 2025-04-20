# Web Hosting on Render

## 1. Purpose
Outline steps to deploy the MakeItMakeSense.io frontend, backend API, and Dgraph database on Render.

## 2. Prerequisites
- GitHub repository with all code committed.
- Render account with necessary permissions.
- Access to Render dashboard or CLI.
- `docker-compose.yml` for Dgraph checked in.
- Environment variables defined in `.env` or in Render service settings.

## 3. Repository Structure
```
/api             # Express API server
/frontend        # React/Vite application
/docker-compose.yml  # Dgraph Zero, Alpha, Ratel services
/plans           # Deployment and refactor plans
```

## 4. Dgraph Database Deployment (Single Container Dockerfile)
1. Create `Dockerfile.dgraph` at the repository root:
   ```dockerfile
   FROM dgraph/dgraph:latest
   COPY docker/dgraph-entrypoint.sh /usr/local/bin/
   RUN chmod +x /usr/local/bin/dgraph-entrypoint.sh
   ENTRYPOINT ["dgraph-entrypoint.sh"]
   ```
2. In Render, select **Docker** as the service type.
3. Set **Dockerfile Path** to `Dockerfile.dgraph`.
4. Attach an SSD disk (e.g., 10 GB) with **Mount Path** `/dgraph`.
5. Enable **Auto Deploy** on pushes to `main`.

## 5. Backend API Deployment
1. In `api/package.json`, confirm a production start script:
   ```json
   {
     "scripts": {
       "start": "node server.js"
     }
   }
   ```
2. On Render, create a **Web Service**:
   - **Root Directory**: `/api`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start`
   - **Environment Variables**:
     - `DGRAPH_ENDPOINT` = URL of the Render Dgraph private service (e.g., `http://<dgraph-service>.onrender.com:8080`)
     - `PORT` (optional): port for Express (Render defaults to `10000`).
3. Enable “Auto Deploy” on GitHub branch pushes.

## 6. Frontend Static Site Deployment
1. In `frontend/package.json`, add or confirm:
   ```json
   {
     "scripts": {
       "build": "vite build",
       "type-check": "tsc --noEmit"
     }
   }
   ```
2. On Render, create a **Static Site**:
   - **Root Directory**: `/frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Environment Variables**:
  - VITE_API_BASE_URL=`https://mims-graph.onrender.com/api` (point to your Render API service URL)

## 7. DNS & Custom Domain (Optional)
- In Render → Domains, add your custom domain (e.g., `app.makeitmakesense.io`).
- Update DNS records (CNAME or ALIAS) per Render instructions.

## 8. Continuous Deployment
- For each service (Dgraph, API, Static), enable auto‑deploy on GitHub pushes.
- Configure branch protection and deployment previews as required.

## 9. Post‑Deployment Verification
- **Frontend**: Visit the static site URL; confirm graph loads and Expand works.
- **Backend**: Call `GET https://<backend-url>/api/health` and expect status OK.
- **Dgraph**: Access Ratel UI at `https://<dgraph-service>/` or run `tools/query_graph.py`.

## 10. Monitoring & Logging
- Review Render logs for errors and performance.
- Optionally integrate Sentry for frontend JS errors.
- Set up alerts for API failures and Dgraph container restarts.
