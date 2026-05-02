---
inclusion: manual
---

# Adding a New Module — Checklist

When creating a new feature module, follow these steps exactly:

## 1. Create the module folder and all 8 files

```
src/modules/<name>/
├── <name>.interface.ts      # DTOs and type definitions
├── <name>.validation.ts     # Joi schemas (create, update, params, query)
├── <name>.controller.ts     # Class with arrow function methods, uses asyncHandler + ApiResponse
├── <name>.service.ts        # Business logic class, calls repository, throws exceptions
├── <name>.repository.ts     # Data access class, only layer touching Sequelize models
├── <name>.routes.ts         # Express Router with middleware chain
├── <name>.swagger.ts        # OpenAPI/Swagger JSDoc annotations (MUST include response schemas)
└── index.ts                 # Barrel export: controller, service, routes, types
```

## 2. Create model (if new collection needed)

- Add to `src/models/<name>.model.ts`
- Use class-based Sequelize model extending `Model<Attributes, CreationAttributes>`
- Use UUID primary keys, `underscored: true`, `timestamps: true`
- Export from `src/models/index.ts`

## 3. Register routes

- Public API: add to `src/routes/v1/index.ts`
- Admin API: add to `src/routes/admin/index.ts`

```typescript
import { featureRoutes } from '../../modules/<name>';
router.use('/<name>', featureRoutes);
```

## 4. Add constants

- Add message constants to `src/common/constants/messages.ts` as `<NAME>_MESSAGES`
- Add enums to `src/common/enums/` if needed, export from `src/common/enums/index.ts`

## 5. Write Swagger docs — MUST include response structure

- Add JSDoc annotations in `<name>.swagger.ts`
- Swagger auto-discovers from `./src/modules/**/*.swagger.ts`
- **EVERY endpoint MUST document its response schema** including:
  - Success response with full `content.application/json.schema` showing the `ApiResponse` wrapper (`success`, `statusCode`, `message`, `data`)
  - The `data` property must describe the actual response payload (object shape, array items, etc.)
  - Error responses (400, 401, 403, 404, 409) with their response body
  - For paginated endpoints, include the `meta` object in the response schema

Example pattern for a success response:

```yaml
responses:
  200:
    description: Resource fetched successfully
    content:
      application/json:
        schema:
          type: object
          properties:
            success:
              type: boolean
              example: true
            statusCode:
              type: integer
              example: 200
            message:
              type: string
              example: Resource fetched successfully
            data:
              type: object
              properties:
                id:
                  type: string
                  format: uuid
                name:
                  type: string
  401:
    $ref: '#/components/responses/UnauthorizedError'
  404:
    $ref: '#/components/responses/NotFoundError'
```

Example for paginated response:

```yaml
responses:
  200:
    description: List fetched successfully
    content:
      application/json:
        schema:
          type: object
          properties:
            success:
              type: boolean
            statusCode:
              type: integer
            message:
              type: string
            data:
              type: array
              items:
                $ref: '#/components/schemas/ModelName'
            meta:
              $ref: '#/components/schemas/PaginationMeta'
```

## File Naming Conventions

- All files: `kebab-case` or `feature.purpose.ts`
- Module files: `<module>.<purpose>.ts` (e.g., `auth.controller.ts`)
- Middleware: `<name>.middleware.ts`
- Models: `<name>.model.ts`
- Enums: `<name>.enum.ts`

## Import Order

1. Node.js built-in modules
2. Third-party packages
3. Config imports (`../../config/`)
4. Sibling module imports (relative `./`)
5. Common utilities, interfaces, exceptions
6. Types (`import type`)

## 6. Database Migration Rules — CRITICAL

- **NEVER modify an existing migration file** — always create a NEW migration for schema changes
- Only create new migrations when explicitly told to, or when adding a new table
- New migration file naming: `YYYYMMDDHHMMSS-description.js` (timestamp must be after all existing migrations)
- Always define both `up` and `down` methods
- Examples of new migrations for changes:
  - Adding a column: `addColumn`
  - Removing a column: `removeColumn`
  - Renaming a column: `renameColumn`
  - Adding an index: `addIndex`
  - Dropping a table: `dropTable`
- The only exception is when the user explicitly says to modify an existing migration (e.g., during initial development before first production deploy)
