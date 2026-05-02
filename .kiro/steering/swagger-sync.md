---
inclusion: always
---

# Swagger Sync Rule

Whenever any API endpoint is added, modified, or removed — including request body fields, response shapes, route paths, HTTP methods, authentication requirements, or validation schemas — you MUST immediately update the corresponding `*.swagger.ts` file in the same module directory.

## Rules

- Every change to a controller method, service response shape, validation schema, or route registration requires a corresponding swagger doc update in the same turn.
- Check the module's `*.swagger.ts` file exists. If it doesn't, create it.
- The swagger path must match the actual mounted route path (e.g. admin routes mounted at `/admin/auth/` must use `/admin/auth/login` not `/auth/login`).
- Never leave swagger docs out of sync with the actual API behaviour.
- After making code changes, always verify the swagger doc reflects the current request/response contract before finishing.
