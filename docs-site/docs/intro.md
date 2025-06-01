---
id: intro
title: Welcome to MakeItMakeSense.io
sidebar_label: Introduction
sidebar_position: 1
---

# MakeItMakeSense.io Documentation

> A modular, open-source platform for collaboratively building a living, visual knowledge graph.

Welcome to the comprehensive documentation for **MakeItMakeSense.io**, developed and maintained by [Human-Centered Systems, LLC](https://humancenteredsystems.io).

## Overview

MakeItMakeSense.io is an interactive platform designed for exploring, contributing to, and curating structured knowledge. It utilizes a hybrid hierarchical and non-hierarchical graph structure powered by Dgraph, allowing for flexible and rich data representation.

### Core Components

- **Dgraph Backend**: Graph database managed via Docker with optional multi-tenant support
- **Node.js/Express API**: Provides a GraphQL interface and RESTful endpoints with tenant-aware operations
- **React/Vite Frontend**: Interactive graph visualization using Cytoscape.js with centralized theme system
- **Python Utility Tools**: Scripts for database management and data handling

### Key Capabilities

- Multi-hierarchy support for nodes
- Automatic hierarchy assignment during node creation
- **Enterprise-grade multi-tenant architecture** with complete data isolation
- Real-time collaborative knowledge graph building

## Multi-Tenant Architecture

The platform features a comprehensive multi-tenant architecture:

- **Adaptive Design**: Automatically detects OSS vs Enterprise Dgraph capabilities
- **Complete Data Isolation**: Each tenant operates in a dedicated namespace
- **Shared Infrastructure**: Single Dgraph cluster efficiently serves all tenants
- **Production Ready**: Scalable to 2^64 namespaces with deterministic tenant provisioning

## Getting Started

Choose your path based on your needs:

### 🚀 Quick Start
New to MakeItMakeSense.io? Start here for a rapid setup and overview.

[Get Started →](./setup-guide)

### 🏗️ System Architecture
Understand the technical architecture and design decisions.

[Learn Architecture →](./system-architecture)

### 📚 API Reference
Comprehensive API documentation for developers.

[View API Docs →](./api-endpoints)

### 🛠️ Developer Guide
Deep-dive into development patterns, testing, and contribution guidelines.

[Developer Resources →](./frontend-development)

## Tech Stack

- **Database**: Dgraph (via Docker) - OSS for single-tenant, Enterprise for multi-tenant
- **Backend API**: Node.js, Express.js with **TypeScript**, tenant context middleware
- **Frontend**: React 19, Vite, TypeScript, Cytoscape.js, Axios with centralized theme system
- **Utility Tools**: Python, requests with tenant-aware operations
- **Development Environment**: Docker Compose, Nodemon, Concurrently
- **Testing**: Vitest (Frontend), Jest (API), Playwright (E2E) with real database integration tests

## Professional Open Source

MakeItMakeSense.io is proudly developed by **Human-Centered Systems, LLC** as a demonstration of professional open-source development practices. This project showcases:

- Enterprise-grade architecture patterns
- Comprehensive testing strategies
- Professional documentation standards
- Multi-tenant SaaS capabilities
- Modern development workflows

## Community & Support

- **GitHub Repository**: [heythisisgordon/mims-graph](https://github.com/heythisisgordon/mims-graph)
- **Issues & Bug Reports**: [GitHub Issues](https://github.com/heythisisgordon/mims-graph/issues)
- **Professional Services**: [Human-Centered Systems, LLC](https://humancenteredsystems.io)

## License

MakeItMakeSense.io is licensed under the **MIT License**, making it free for both commercial and non-commercial use.

---

Ready to get started? Head over to our [Complete Setup Guide](./setup-guide) for detailed installation and configuration instructions.
