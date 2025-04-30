## 🚀 Purpose

Push a local `schema.graphql` to the deployed Dgraph Alpha instance inside Render.

---

## 🧹 Clearing Remote Data

To clear all data (nodes and edges) from the remote Dgraph instance, execute the following command from your local machine via SSH:

```bash
ssh srv-d02m8v3uibrs73b1kan0@ssh.virginia.render.com 'curl -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -d "{\"query\":\"mutation { deleteEdge(filter: {}) { msg numUids } deleteNode(filter: {}) { msg numUids } }\"}"'
```

---

## ✅ Recommended API-Based Schema Push

This is the preferred method for pushing the schema to the remote Dgraph instance as it leverages the backend API's integrated functionality.

### Prerequisites

*   The backend API service must be running on Render.
*   The `ADMIN_API_KEY` environment variable must be configured for the backend API service on Render.
*   The `DGRAPH_ADMIN_URL_REMOTE` environment variable must be configured for the backend API service on Render, pointing to the internal URL of the remote Dgraph Alpha's admin endpoint (e.g., `http://mims-graph-dgraph:8080/admin/schema`).

### Step-by-Step

1.  Ensure the prerequisites above are met.
2.  From your local machine, execute the `tools/api_push_schema.py` script, specifying the remote API base URL and target:

    ```bash
    export MIMS_ADMIN_API_KEY=YOUR_ADMIN_API_KEY # Replace with the actual key
    python tools/api_push_schema.py --target remote --api-base https://mims-graph-docker-api.onrender.com/api
    ```

    Replace `YOUR_ADMIN_API_KEY` with the actual `ADMIN_API_KEY` configured for your Render API service.

3.  Verify the output indicates a successful schema push.

---

# 🧠 Notes

*   The backend API service on Render needs to be able to communicate directly with the Dgraph service on its internal network (e.g., using `http://mims-graph-dgraph:8080`).
*   The `ADMIN_API_KEY` and `DGRAPH_ADMIN_URL_REMOTE` environment variables must be set in the Render dashboard for the backend API service.
*   The legacy SSH/SCP/curl method for pushing schema is no longer the recommended approach.

---

# ✅ Done.
