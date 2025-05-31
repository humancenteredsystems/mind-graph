# Configuration Management Guide

This guide explains how to properly manage configuration and environment variables in the MakeItMakeSense.io backend API.

## Centralized Configuration System

The backend API uses a centralized configuration system located at `api/config/index.ts` to manage all environment variables and configuration settings.

### Why Use Centralized Configuration?

- **Single source of truth** - All configuration is managed in one place
- **Consistent defaults** - Ensures all environment variables have proper fallback values
- **Type safety** - Proper conversion for booleans, numbers, and other types
- **No race conditions** - Environment variables are loaded once at startup
- **Better maintainability** - Changes only need to be made in one location

### Configuration Module Structure

```typescript
// api/config/index.ts
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables ONCE

const config = {
  port: parseInt(process.env.PORT || '3000'),
  dgraphBaseUrl: process.env.DGRAPH_BASE_URL || 'http://localhost:8080',
  adminApiKey: process.env.ADMIN_API_KEY || null,
  enableMultiTenant: process.env.ENABLE_MULTI_TENANT === 'true',
  // ... other configuration values
};

export default Object.freeze(config); // Prevent runtime modifications
```

## How to Use Configuration

### ✅ Correct Way - Use the Config Module

```typescript
// In any backend file
import config from '../config'; // or appropriate path

// Use configuration values
const port = config.port;
const dgraphUrl = config.dgraphBaseUrl;
const isMultiTenant = config.enableMultiTenant;
```

### ❌ Wrong Way - Direct Environment Access

```typescript
// DON'T do this (creates the anti-pattern we fixed)
import dotenv from 'dotenv';
dotenv.config(); // Multiple dotenv calls
const port = process.env.PORT || 3000; // Inconsistent defaults
const url = process.env.DGRAPH_BASE_URL; // No fallback
```

## Available Configuration Values

| Config Property | Environment Variable | Default Value | Description |
|-----------------|---------------------|---------------|-------------|
| `port` | `PORT` | `3000` | API server port |
| `dgraphBaseUrl` | `DGRAPH_BASE_URL` | `http://localhost:8080` | Dgraph base URL |
| `dgraphEndpoint` | - | `{dgraphBaseUrl}/graphql` | Computed GraphQL endpoint |
| `dgraphAdminUrl` | - | `{dgraphBaseUrl}/admin/schema` | Computed admin endpoint |
| `adminApiKey` | `ADMIN_API_KEY` | `null` | Admin API key for protected routes |
| `enableMultiTenant` | `ENABLE_MULTI_TENANT` | `false` | Enable multi-tenant features |
| `defaultNamespace` | `DGRAPH_NAMESPACE_DEFAULT` | `0x0` | Default tenant namespace |
| `testNamespace` | `DGRAPH_NAMESPACE_TEST` | `0x1` | Test tenant namespace |
| `namespacePrefix` | `DGRAPH_NAMESPACE_PREFIX` | `0x` | Namespace prefix for generated IDs |

## Adding New Configuration

When adding new configuration options:

1. **Add to config module** (`api/config/index.ts`):
```typescript
const config = {
  // ... existing config
  newOption: process.env.NEW_OPTION || 'default-value',
};
```

2. **Add to .env.example**:
```bash
# Description of what this does
NEW_OPTION=example-value
```

3. **Update this documentation** with the new option in the table above.

4. **Use in your code**:
```typescript
import config from '../config';
const value = config.newOption;
```

## Special Cases

### Authentication Middleware Exception

The authentication middleware (`api/middleware/auth.ts`) is the **only** file that still uses `process.env.ADMIN_API_KEY` directly. This is intentional to maintain compatibility with existing tests that dynamically set environment variables.

```typescript
// api/middleware/auth.ts - Exception to the rule
const authenticateAdmin = (req, res, next) => {
  const apiKey = req.headers['x-admin-api-key'];
  // Use process.env directly for test compatibility
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
```

## Testing Considerations

- Unit tests work seamlessly with the centralized config
- Integration tests that need to modify environment variables should do so before importing any modules that use the config
- The config module freezes the configuration object to prevent accidental modifications

## Migration from Direct Environment Access

If you find code that directly accesses `process.env`:

1. **Identify the environment variable** being accessed
2. **Check if it exists** in `api/config/index.ts`
3. **If it doesn't exist**, add it to the config module
4. **Replace direct access** with config module usage
5. **Remove any extra** `require('dotenv').config()` calls

## Best Practices

- **Always use the config module** instead of `process.env`
- **Provide sensible defaults** for all configuration options
- **Document new configuration** options in this guide
- **Use appropriate types** (convert strings to numbers/booleans as needed)
- **Group related config** options together logically
- **Keep the config module** at the top level of the API directory

This centralized approach ensures consistency, maintainability, and eliminates the environment variable handling anti-patterns that can cause race conditions and configuration conflicts.
