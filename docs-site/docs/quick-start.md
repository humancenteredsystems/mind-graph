---
id: quick-start
title: Quick Start Guide
sidebar_label: Quick Start
sidebar_position: 3
---

# Quick Start Guide

Get MakeItMakeSense.io up and running in minutes.

## Prerequisites

- **Docker & Docker Compose**, **Node.js 18+**, **Python 3.7+**, **Git**

*For detailed requirements and Python environment setup, see [Complete Setup Guide](./setup-guide)*

## 5-Minute Setup

### 1. Clone and Install

```bash
# Clone and install dependencies
git clone https://github.com/heythisisgordon/mims-graph.git
cd mims-graph
npm install  # Installs all dependencies concurrently
```

### 2. Configure Environment

```bash
cp api/.env.example api/.env
# Edit api/.env if needed (optional for basic local development)
```

### 3. Start Everything

```bash
# Start the complete development environment
npm run start-dev-env
```

This single command:
- ✅ Starts Dgraph database via Docker
- ✅ Starts the API server with hot-reload
- ✅ Starts the frontend with hot-reload

### 4. Initialize Database

In a separate terminal:

```bash
# Initialize the database schema
python tools/api_push_schema.py --target local
```

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000
- **Dgraph UI**: http://localhost:8000

## Optional: Add Sample Data

```bash
# Add sample nodes and relationships
python tools/seed_data.py
```

## Stopping the Environment

Press `Ctrl+C` in the terminal running `npm run start-dev-env`, then:

```bash
npm run stop-dgraph
```

## Troubleshooting

### Quick Fixes

- **Docker issues**: `docker ps` to check status
- **Port conflicts**: Check if ports 3000, 5173, 8080 are available
- **Schema push fails**: Ensure Dgraph is running with `docker ps | grep dgraph`

*For comprehensive troubleshooting, see [Complete Setup Guide](./setup-guide)*

### Getting Help

- **Detailed Setup**: [Complete Setup Guide](./setup-guide)
- **System Architecture**: [System Architecture](./system-architecture)
- **Issues**: [GitHub Issues](https://github.com/heythisisgordon/mims-graph/issues)

## What's Next?

Once you have the system running:

1. **Explore the Graph**: Interact with nodes and relationships in the frontend
2. **Learn the Architecture**: Understand the [system design](./system-architecture)
3. **Try Multi-Tenant Features**: Set up [multiple tenants](./multi-tenant-guide)
4. **Review the API**: Explore [available endpoints](./api-endpoints)
5. **Set Up Testing**: Run the [comprehensive test suite](./testing-guide)

## Multi-Tenant Quick Test

```bash
# Enable multi-tenant mode and restart
echo "ENABLE_MULTI_TENANT=true" >> api/.env
# Restart with: Ctrl+C then npm run start-dev-env

# Create test tenant and seed data
curl -X POST http://localhost:3000/api/tenant \
  -H "X-Admin-API-Key: your-key" -d '{"tenantId": "test-company"}'
python tools/seed_data.py --tenant-id test-company
```

*For complete multi-tenant setup, see [Multi-Tenant Guide](./multi-tenant-guide)*

---

**Need more detailed setup instructions?** Check out our [Complete Setup Guide](./setup-guide) for comprehensive configuration options, production deployment, and advanced features.
