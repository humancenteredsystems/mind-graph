---
id: quick-start
title: Quick Start Guide
sidebar_label: Quick Start
sidebar_position: 3
---

# Quick Start Guide

Get MakeItMakeSense.io up and running in minutes.

## Prerequisites

- **Docker & Docker Compose** (Essential for Dgraph database)
- **Node.js & npm** (Version 18+ recommended)
- **Python** (Version 3.7+ recommended)
- **Git** (For cloning the repository)

## 5-Minute Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/heythisisgordon/mims-graph.git
cd mims-graph

# Install dependencies
npm install                    # Root dependencies
cd api && npm install && cd .. # API dependencies
cd frontend && npm install && cd .. # Frontend dependencies
```

### 2. Configure Environment

```bash
# Copy environment template
cp api/.env.example api/.env

# Edit the API key (optional for local development)
# ADMIN_API_KEY=your_secure_key_here
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
# Activate your conda environment if needed
conda activate pointcloud

# Set admin API key (match your .env file)
export MIMS_ADMIN_API_KEY=your_secure_key_here

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

### Common Issues

**Docker not starting?**
```bash
# Check Docker status
docker ps

# Restart Docker service if needed
sudo systemctl restart docker
```

**Port conflicts?**
- Frontend (5173), API (3000), or Dgraph (8080, 8000) ports may be in use
- Check `.env` file to change default ports

**Schema push failing?**
- Ensure Dgraph is running: `docker ps | grep dgraph`
- Check API key matches between `.env` and export command

### Getting Help

- **Full Setup Guide**: [Complete Setup Guide](./setup-guide)
- **Architecture Details**: [System Architecture](./architecture)
- **GitHub Issues**: [Report Problems](https://github.com/heythisisgordon/mims-graph/issues)

## What's Next?

Once you have the system running:

1. **Explore the Graph**: Interact with nodes and relationships in the frontend
2. **Learn the Architecture**: Understand the [system design](./architecture)
3. **Try Multi-Tenant Features**: Set up [multiple tenants](./multi-tenant-implementation)
4. **Review the API**: Explore [available endpoints](./api-endpoints)
5. **Set Up Testing**: Run the [comprehensive test suite](./testing-guide)

## Multi-Tenant Quick Start

To quickly test multi-tenant capabilities:

```bash
# Enable multi-tenant mode
echo "ENABLE_MULTI_TENANT=true" >> api/.env

# Restart the API server
# (Ctrl+C and run npm run start-dev-env again)

# Create a test tenant via API
curl -X POST http://localhost:3000/api/tenant \
  -H "X-Admin-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "test-company"}'

# Seed data for the new tenant
python tools/seed_data.py --tenant-id test-company
```

---

**Need more detailed setup instructions?** Check out our [Complete Setup Guide](./setup-guide) for comprehensive configuration options, production deployment, and advanced features.
