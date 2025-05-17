# Refactoring Plan 08: Modularize Backend Structure and Logic

This plan addresses "Top Recommendation #3" from the external review, focusing on modularizing backend route handlers and validation logic. It also incorporates specific suggestions for the backend route structure from the detailed review. The goal is to improve maintainability, scalability, testability, and separation of concerns in the API.

## 1. Introduce Controller Layer for Route Handling Logic

**Affected Files:**
*   `api/server.js`
*   `api/hierarchyRoutes.js`
*   New files/directories (e.g., `api/controllers/`)

**Current Issue (as noted in review):**
*   Route handlers in `api/server.js` and `api/hierarchyRoutes.js` directly embed business logic, data transformation, and response formatting, making these files lengthy and harder to maintain.

**Recommendation:**
*   **Create Controller Modules:** For each group of related routes (e.g., hierarchy management, node operations, admin tasks), create a dedicated controller module.
    *   Example: `api/controllers/hierarchyController.js`, `api/controllers/nodeController.js`, `api/controllers/adminController.js`.
*   **Move Logic to Controllers:** Transfer the core request handling logic (processing input, interacting with services/data layers, formatting responses) from the route definitions into methods within these controllers.
*   **Route Definitions Call Controllers:** The route definitions in `api/server.js` and `api/hierarchyRoutes.js` (or new route files in an `api/routes/` directory) will become leaner, primarily responsible for defining the route path, HTTP method, applying middleware, and then calling the appropriate controller method.
    *   Example (`api/routes/hierarchyRoutes.js`):
        ```javascript
        const express = require('express');
        const router = express.Router();
        const hierarchyController = require('../controllers/hierarchyController');
        const authMiddleware = require('../middleware/authMiddleware'); // Example
        const hierarchyValidator = require('../validators/hierarchyValidator'); // Example

        router.post('/', authMiddleware.isAdmin, hierarchyValidator.validateCreate, hierarchyController.createHierarchy);
        router.get('/', hierarchyController.getAllHierarchies);
        // ... other routes
        module.exports = router;
        ```

**Benefits:**
*   **Separation of Concerns:** Route definitions are for routing; controllers handle application logic.
*   **Improved Readability & Maintainability:** Smaller, focused files.
*   **Enhanced Testability:** Controllers can be unit-tested more easily without needing to mock the entire Express request/response lifecycle.

## 2. Implement a Dedicated Service Layer for Business Logic

**Affected Files:**
*   Controllers (new)
*   New files/directories (e.g., `api/services/`)

**Current Issue (as noted in review for Backend Route Structure):**
*   Business logic (especially complex logic like hierarchy assignment inference) is embedded within route handlers (soon to be controllers).
*   Potential for duplicated logic if multiple controllers/routes need similar core operations.

**Recommendation:**
*   **Create Service Modules:** For core business domains or entities, create service modules that encapsulate the primary business logic and data interaction rules.
    *   Example: `api/services/hierarchyService.js` (could include logic from `getHierarchyAssignmentContext` mentioned in `refactor07.md`), `api/services/nodeService.js`, `api/services/dgraphService.js` (could wrap `dgraphClient.js` or be an evolution of it).
*   **Controllers Use Services:** Controllers should delegate business logic operations to these services. Services would then interact with the data layer (e.g., `dgraphClient.js` or a further abstracted data access layer).
    *   Example (`api/controllers/hierarchyController.js`):
        ```javascript
        const hierarchyService = require('../services/hierarchyService');
        exports.createHierarchy = async (req, res, next) => {
          try {
            const newHierarchy = await hierarchyService.create(req.body);
            res.status(201).json(newHierarchy);
          } catch (error) {
            next(error); // Pass to error handling middleware
          }
        };
        ```

**Benefits:**
*   **Further Separation of Concerns:** Controllers manage HTTP aspects; services manage business rules.
*   **Reusability of Business Logic:** Services can be called by multiple controllers or even other services.
*   **Improved Testability:** Business logic in services can be unit-tested in isolation from HTTP concerns.
*   **Clearer Data Flow:** Request -> Route -> Middleware (Validation) -> Controller -> Service -> Data Access.

## 3. Separate Request Validation into Middleware

**Affected Files:**
*   Route definition files (e.g., `api/routes/hierarchyRoutes.js`)
*   New files/directories (e.g., `api/validators/` or `api/middleware/`)

**Current Issue:**
*   Input validation (e.g., checking for required fields) is often done at the beginning of route handlers.

**Recommendation:**
*   **Create Validation Middleware:** For each set of routes or specific operations, create dedicated validation middleware functions. These can use libraries like Joi, Express Validator, or be custom functions.
    *   Example (`api/validators/hierarchyValidator.js`):
        ```javascript
        exports.validateCreate = (req, res, next) => {
          const { id, name } = req.body;
          if (!id || !name) {
            return res.status(400).json({ error: 'Missing required fields: id and name' });
          }
          next();
        };
        ```
*   **Apply Middleware in Route Definitions:**
    *   As shown in the controller example above, validation middleware is applied before the controller method.

**Benefits:**
*   **Cleaner Route Handlers/Controllers:** Validation logic is not mixed with business/request logic.
*   **Reusable Validation Rules:** Validation logic can be reused.
*   **Early Error Handling:** Invalid requests are rejected before hitting core business logic.

## 4. Adopt a Structured Directory Approach for the API

**Recommendation:**
*   Organize the `api/` directory more formally:
    ```
    api/
    ├── controllers/
    │   ├── hierarchyController.js
    │   └── nodeController.js
    ├── routes/
    │   ├── index.js (mounts all other route modules)
    │   ├── hierarchyRoutes.js
    │   └── nodeRoutes.js
    ├── services/
    │   ├── hierarchyService.js
    │   └── nodeService.js
    ├── middleware/ (or validators/)
    │   ├── authMiddleware.js
    │   └── hierarchyValidator.js
    ├── utils/
    │   ├── dgraphAdmin.js
    │   └── pushSchema.js
    ├── dgraphClient.js
    ├── schemaRegistry.js
    ├── server.js (main Express setup, mounts routes from api/routes/index.js)
    └── package.json
    ```

**Benefits:**
*   **Improved Clarity and Navigation:** Easier to find relevant code.
*   **Scalability:** Easier to add new features and modules.
*   **Standardization:** Follows common patterns for structuring Node.js/Express applications.

## Implementation Steps:

1.  **Plan Directory Structure:** Finalize the new directory structure within `api/`.
2.  **Create Validation Middleware:** Start by extracting validation logic from existing route handlers into dedicated middleware functions.
3.  **Create Service Layer:** Identify core business logic (especially complex or reusable parts like hierarchy assignment) and move it into service modules.
4.  **Create Controller Layer:** Move the remaining request handling logic (after validation and delegating to services) into controller modules.
5.  **Update Route Definitions:** Refactor `api/server.js` and `api/hierarchyRoutes.js` (or create new files in `api/routes/`) to define routes that use the new validation middleware and call controller methods.
6.  **Refactor `api/server.js`:** Ensure it primarily handles Express app setup, global middleware, mounting of main routers (e.g., from `api/routes/index.js`), and error handling.
7.  **Test Thoroughly:** Unit test new services, controllers, and validators. Integration test routes.

This refactoring represents a significant structural improvement to the backend, paving the way for easier maintenance and future development.
