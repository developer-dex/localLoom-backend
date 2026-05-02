---
inclusion: always
---

# TypeScript & General Conventions

## TypeScript Rules

- Strict mode enabled — no implicit `any`
- Use `interface` for object shapes, `type` for unions/intersections
- Prefer `const` over `let`, never use `var`
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Return early to avoid deep nesting
- No magic numbers — use constants

## Import Order

1. Node.js built-in modules
2. Third-party packages (express, mongoose, joi, jsonwebtoken, etc.)
3. Config imports (`../../config/`)
4. Sibling module imports (relative `./`)
5. Common utilities, interfaces, exceptions (`../../common/`)
6. Types (`import type`)

## Middleware Stack Order

When defining routes, apply middleware in this exact order:
```
authenticate → authorize → validate → controller
```

## Environment & Config

- All env vars are validated via Joi in `src/config/env.ts`
- Access env vars through the `env` object, never `process.env` directly
- When adding new env vars: add to Joi schema in `env.ts`, add to `.env.example`, add to the exported `env` object

## Logging

- Use the Winston `logger` from `src/common/utils/logger.ts`
- Never use `console.log` — always `logger.info()`, `logger.error()`, `logger.debug()`, `logger.warn()`

## Pagination

- Use `parsePaginationQuery()` to parse query params into `PaginationOptions`
- Use `buildPaginationMeta()` to build the meta object for paginated responses
- Return paginated data via `ApiResponse.paginated(res, data, meta, message)`
- Default limit: 20, max limit: 100

## Barrel Exports

- Every module has an `index.ts` that re-exports its public API
- `src/common/` subdirectories each have an `index.ts`
- `src/middleware/index.ts` exports all middleware
- `src/models/index.ts` exports all models and their interfaces
