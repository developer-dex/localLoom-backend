# Bugfix Requirements Document

## Introduction

The admin tradies read endpoints (`GET /api/admin/tradies` and `GET /api/admin/tradies/:id`) return image fields as relative/stored paths instead of absolute URLs. The admin frontend cannot render these images directly because it has no reliable way to resolve them against the backend host. The affected fields are:

- `businessImages[]` (array on the tradie profile)
- `profilePhoto` (single image on the tradie profile)
- `user.avatar` (single image on the related user)
- `workPhotos[].imageUrl` (returned by the detail endpoint only)

A related defect lives in `src/config/env.ts`: `env.backendBaseUrl` is exposed from `envVars.BACKEND_BASE_URL`, but `BACKEND_BASE_URL` is not declared in the Joi `envSchema`. As a result the value is never validated, has no default, and may be `undefined` at runtime, which would corrupt any URL transformation that depends on it (producing strings like `"undefined/uploads/..."`).

The fix must:
1. Return absolute URLs for the image fields above on both admin tradies read endpoints, while leaving the persisted database values as stored relative paths.
2. Leave any value that is already an absolute URL (starts with `http://` or `https://`) unchanged, so existing well-formed URLs are not double-prefixed.
3. Declare `BACKEND_BASE_URL` in the env schema so `env.backendBaseUrl` is always a validated, non-empty string at runtime.
4. Preserve all other response shape and behavior on these endpoints (pagination, ordering, filtering, status updates, bulk actions, non-image fields, null handling).

## Bug Analysis

### Current Behavior (Defect)

When an admin client calls the admin tradies read endpoints, image-typed fields come back as the raw values stored in the database (relative paths like `/uploads/businessDetails/img1.jpg`), and the env layer silently accepts a missing `BACKEND_BASE_URL`.

1.1 WHEN an admin calls `GET /api/admin/tradies` AND a returned tradie has a non-empty `businessImages` array of relative paths THEN the response returns those paths verbatim (e.g. `"/uploads/businessDetails/img1.jpg"`) instead of absolute URLs.

1.2 WHEN an admin calls `GET /api/admin/tradies` AND a returned tradie has a non-null `profilePhoto` stored as a relative path THEN the response returns that path verbatim instead of an absolute URL.

1.3 WHEN an admin calls `GET /api/admin/tradies` AND a returned tradie's related `user.avatar` is a non-null relative path THEN the response returns that path verbatim instead of an absolute URL.

1.4 WHEN an admin calls `GET /api/admin/tradies/:id` AND the tradie has any of `businessImages[]`, `profilePhoto`, `user.avatar`, or `workPhotos[].imageUrl` stored as relative paths THEN the response returns those paths verbatim instead of absolute URLs.

1.5 WHEN the process starts without `BACKEND_BASE_URL` set in the environment THEN the Joi `envSchema` does not flag it, `env.backendBaseUrl` resolves to `undefined`, and any code that prefixes URLs with it would produce malformed strings (e.g. `"undefined/uploads/..."`).

### Expected Behavior (Correct)

The admin tradies read endpoints SHALL return absolute URLs for all image fields, computed by prepending `env.backendBaseUrl` to relative paths, while passing through values that are already absolute. The env layer SHALL guarantee `env.backendBaseUrl` is a validated, non-empty string.

2.1 WHEN an admin calls `GET /api/admin/tradies` AND a returned tradie has a non-empty `businessImages` array THEN the system SHALL return each entry transformed such that any relative path is prefixed with `env.backendBaseUrl` and any value already starting with `http://` or `https://` is returned unchanged.

2.2 WHEN an admin calls `GET /api/admin/tradies` AND a returned tradie has a non-null `profilePhoto` THEN the system SHALL return it as an absolute URL prefixed with `env.backendBaseUrl` if the stored value is a relative path, or unchanged if it already starts with `http://` or `https://`.

2.3 WHEN an admin calls `GET /api/admin/tradies` AND a returned tradie's related `user.avatar` is non-null THEN the system SHALL return it as an absolute URL prefixed with `env.backendBaseUrl` if the stored value is a relative path, or unchanged if it already starts with `http://` or `https://`.

2.4 WHEN an admin calls `GET /api/admin/tradies/:id` AND the tradie has any of `businessImages[]`, `profilePhoto`, `user.avatar`, or `workPhotos[].imageUrl` THEN the system SHALL apply the same absolute-URL transformation rule (prefix relative paths with `env.backendBaseUrl`; leave already-absolute `http(s)://` values unchanged) to each of those fields.

2.5 WHEN the process starts THEN the env validation layer SHALL declare `BACKEND_BASE_URL` in the Joi `envSchema` such that it has a sensible default in development (e.g. `http://localhost:5000`) and is required in production, guaranteeing `env.backendBaseUrl` is always a non-empty validated string at runtime.

2.6 WHEN any image field's stored value is `null`, `undefined`, or an empty string THEN the system SHALL return that value unchanged (no transformation, no `env.backendBaseUrl` prefix added to an empty value).

2.7 WHEN the transformation runs THEN the system SHALL NOT mutate the persisted database row; only the API response payload is transformed.

### Unchanged Behavior (Regression Prevention)

Everything else about the admin tradies endpoints, the underlying data, and unrelated endpoints must keep working exactly as it does today.

3.1 WHEN an admin calls `GET /api/admin/tradies` with any combination of `page`, `limit`, `status`, or `search` query params THEN the system SHALL CONTINUE TO return the same paginated result set, ordering (`createdAt DESC`), and pagination metadata as before.

3.2 WHEN an admin calls `GET /api/admin/tradies` or `GET /api/admin/tradies/:id` THEN all non-image fields (e.g. `id`, `businessName`, `abn`, `abnVerified`, `profileStatus`, `services`, `serviceRegions`, `user.name`, `user.email`, `user.phone`, timestamps) SHALL CONTINUE TO be returned with the same values and shape.

3.3 WHEN an admin calls `GET /api/admin/tradies/:id` for an id that does not exist THEN the system SHALL CONTINUE TO respond with the existing not-found behavior.

3.4 WHEN any image field on a returned tradie is already an absolute URL starting with `http://` or `https://` THEN the system SHALL CONTINUE TO return that exact value without modification (no double-prefix).

3.5 WHEN admin write endpoints run (`PATCH /api/admin/tradies/:id/approve`, `PATCH /api/admin/tradies/:id/reject`, `POST /api/admin/tradies/bulk-approve`, `POST /api/admin/tradies/bulk-reject`) THEN they SHALL CONTINUE TO persist data exactly as before; stored values for image fields in the database remain relative paths, unchanged by this fix.

3.6 WHEN any other module reads `TradieProfile`, `User.avatar`, or `TradieWorkPhoto` directly (e.g. the public `/api/v1/tradies` flow) THEN it SHALL CONTINUE TO observe the same stored values as today; the response transformation introduced by this fix is scoped to the admin tradies read endpoints and does not alter shared data access.

3.7 WHEN the process starts in development with `BACKEND_BASE_URL` already set in `.env` THEN env validation SHALL CONTINUE TO accept that value and expose it as `env.backendBaseUrl` unchanged.

3.8 WHEN any other env-derived config is read (db, jwt, twilio, email, etc.) THEN those values SHALL CONTINUE TO validate and resolve exactly as they do today; the schema change is additive and only declares `BACKEND_BASE_URL`.

## Deriving the Bug Condition

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type AdminTradiesReadResponse
  OUTPUT: boolean

  // X is the JSON payload returned by GET /api/admin/tradies
  // or GET /api/admin/tradies/:id

  RETURN EXISTS tradie IN X.tradies SUCH THAT (
       (tradie.businessImages CONTAINS p WHERE isRelativePath(p))
    OR (tradie.profilePhoto IS NOT NULL AND isRelativePath(tradie.profilePhoto))
    OR (tradie.user.avatar IS NOT NULL AND isRelativePath(tradie.user.avatar))
    OR (tradie.workPhotos CONTAINS w WHERE isRelativePath(w.imageUrl))
  )
END FUNCTION

FUNCTION isRelativePath(s)
  INPUT: s of type string
  OUTPUT: boolean

  RETURN s IS NOT NULL
     AND s <> ""
     AND NOT startsWith(s, "http://")
     AND NOT startsWith(s, "https://")
END FUNCTION
```

A separate, related bug condition for env validation:

```pascal
FUNCTION isEnvBugCondition()
  INPUT: process.env at boot
  OUTPUT: boolean

  // Bug present when BACKEND_BASE_URL is unset/empty AND validation does not catch it
  RETURN (process.env.BACKEND_BASE_URL IS UNDEFINED OR process.env.BACKEND_BASE_URL = "")
     AND env.backendBaseUrl IS UNDEFINED
END FUNCTION
```

### Property Specification (Fix Checking)

```pascal
// Property: Image fields are absolute URLs in admin tradies responses
FOR ALL X WHERE isBugCondition(X) DO
  result ← adminTradiesReadEndpoint'(X.request)
  FOR EACH tradie IN result.tradies DO
    FOR EACH p IN tradie.businessImages DO
      ASSERT startsWith(p, "http://") OR startsWith(p, "https://")
    END FOR
    IF tradie.profilePhoto IS NOT NULL THEN
      ASSERT startsWith(tradie.profilePhoto, "http://")
          OR startsWith(tradie.profilePhoto, "https://")
    END IF
    IF tradie.user.avatar IS NOT NULL THEN
      ASSERT startsWith(tradie.user.avatar, "http://")
          OR startsWith(tradie.user.avatar, "https://")
    END IF
    FOR EACH w IN (tradie.workPhotos OR []) DO
      ASSERT startsWith(w.imageUrl, "http://")
          OR startsWith(w.imageUrl, "https://")
    END FOR
  END FOR
END FOR

// Property: env.backendBaseUrl is always validated and non-empty
FOR ALL boots WHERE isEnvBugCondition() DO
  ASSERT env.backendBaseUrl IS DEFINED
     AND env.backendBaseUrl <> ""
     AND (startsWith(env.backendBaseUrl, "http://")
       OR startsWith(env.backendBaseUrl, "https://"))
END FOR
```

### Preservation Goal

```pascal
// Property: Preservation Checking
// For all read responses where no field needs transformation,
// the fixed endpoint output equals the original endpoint output.
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT adminTradiesReadEndpoint(X.request) = adminTradiesReadEndpoint'(X.request)
END FOR

// Property: Database state is unchanged by reads
FOR ALL X DO
  ASSERT dbState_after(adminTradiesReadEndpoint'(X.request))
       = dbState_before(adminTradiesReadEndpoint'(X.request))
END FOR
```

**Key Definitions**
- **F**: `adminTradiesReadEndpoint` — current behavior of `GET /api/admin/tradies` and `GET /api/admin/tradies/:id`, which returns stored relative paths verbatim and runs against an env layer that does not validate `BACKEND_BASE_URL`.
- **F'**: `adminTradiesReadEndpoint'` — fixed behavior, which transforms image fields to absolute URLs in the response payload (without mutating persisted data) and runs against an env layer where `BACKEND_BASE_URL` is declared in the Joi schema with a development default and a production requirement.
