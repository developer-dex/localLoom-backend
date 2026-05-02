---
inclusion: always
---

# LocalLoom Backend — Architecture & Code Standards

## Architecture Overview

This backend follows a Modular Layered Architecture with strict separation of concerns:

```
Request → Route → Middleware → Controller → Service → Repository → Model → Database (PostgreSQL)
```

Every feature lives in `src/modules/<feature>/` and MUST contain these 8 files:
- `<feature>.interface.ts` — DTOs, type definitions
- `<feature>.validation.ts` — Joi schemas for request validation
- `<feature>.controller.ts` — HTTP request handlers (thin layer, delegates to service)
- `<feature>.service.ts` — Business logic (the brains)
- `<feature>.repository.ts` — Database queries via Sequelize (the data layer)
- `<feature>.routes.ts` — Express router with middleware chain
- `<feature>.swagger.ts` — OpenAPI/Swagger JSDoc annotations
- `index.ts` — Barrel export

## Key Project Structure

```
src/
├── app.ts                          # Express app setup (middleware, routes, error handling)
├── server.ts                       # HTTP + Socket.IO server bootstrap
├── config/                         # Environment, CORS, DB, Swagger config
│   ├── env.ts                      # Joi-validated environment variables
│   ├── cors.ts
│   ├── database.ts                 # Sequelize instance + connect/disconnect
│   └── swagger.ts
├── common/
│   ├── constants/messages.ts       # All user-facing message strings
│   ├── enums/                      # UserRole, AccountStatus, etc.
│   ├── exceptions/http.exception.ts # Typed HTTP exceptions (400–500)
│   ├── interfaces/                 # AuthenticatedRequest, PaginationQuery, ApiResponseBody
│   ├── types/
│   └── utils/                      # ApiResponse, asyncHandler, logger, pagination helpers
├── database/
│   ├── config.js                   # Sequelize CLI config (JS, reads .env)
│   ├── migrations/                 # Sequelize migration files
│   └── seeders/                    # Sequelize seed files
├── middleware/                     # authenticate, authorize, validate, errorHandler, rateLimiter, upload
├── models/                         # Sequelize models (shared across modules)
├── modules/                        # Feature modules (auth, user, chat, admin)
├── routes/
│   ├── v1/index.ts                 # Public API routes → /api/v1/*
│   └── admin/index.ts              # Admin routes → /api/admin/*
├── socket/
│   ├── index.ts                    # Socket.IO initialization + online user tracking
│   ├── socket.middleware.ts        # JWT auth for socket connections
│   ├── socket.types.ts             # Typed events (ServerToClient, ClientToServer)
│   └── handlers/                   # chat.handler.ts, notification.handler.ts
└── docs/components/                # Shared Swagger schemas and responses
```

## Database — PostgreSQL + Sequelize

- ORM: Sequelize v6 with PostgreSQL driver (pg)
- Models are class-based extending `Model<Attributes, CreationAttributes>`
- All IDs are UUIDs (UUIDV4), not auto-increment integers
- Use `underscored: true` — JS camelCase maps to DB snake_case
- Migrations live in `src/database/migrations/` (plain JS for sequelize-cli)
- Run migrations: `npm run db:migrate`
- Create new migration: `npm run migration:generate <name>`
- Associations are defined in `src/models/index.ts`

## Controller Rules

- Controllers MUST be classes with methods as arrow functions (for correct `this` binding)
- Controllers MUST NOT contain business logic — delegate everything to the service
- ALWAYS wrap async handlers with `asyncHandler` from `../../common/utils`
- ALWAYS use `ApiResponse` for consistent JSON responses
- ALWAYS cast `req` to `AuthenticatedRequest` when accessing `req.user`

## Service Rules

- Services contain ALL business logic
- Services call repositories for data — NEVER call Sequelize models directly
- Services throw typed exceptions from `common/exceptions/`
- Services MUST NOT access `req`, `res`, or any Express types
- Use descriptive error messages from `common/constants/messages.ts`

## Repository Rules

- Repositories are the ONLY layer that interacts with Sequelize models
- Return model instances or null
- Use `findAndCountAll` for paginated queries with `buildPaginationMeta`
- NEVER throw HTTP exceptions — return `null` and let the service handle it
- Use scopes (e.g., `User.scope('withPassword')`) when needing hidden fields

## Route Rules

- Apply middleware in this order: `authenticate → authorize → validate → controller`
- Group public routes BEFORE the `router.use(authenticate)` barrier
- Use the `validate` middleware with Joi schemas
- Cast authenticate as `unknown as RequestHandler` when using `router.use()`

## Validation Rules

- Use Joi for ALL input validation
- Define separate schemas for create, update, params, and query
- Use `.trim()`, `.lowercase()` where appropriate
- UUID params: `Joi.string().uuid().required()`

## Interface / DTO Rules

- Define DTOs for every request body
- Define filter/query interfaces for list endpoints
- Never use `any` — define proper types
- Export all types from the module's `index.ts`
