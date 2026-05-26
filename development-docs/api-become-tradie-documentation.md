# Become Tradie API

Quick guide for the mobile/app developer to switch a logged-in user from the `customer` role to the `tradie` role.

---

## Endpoint

```
POST /api/v1/auth/become-tradie
```

## Headers

| Header        | Value                          |
|---------------|--------------------------------|
| Authorization | `Bearer <current accessToken>` |
| Content-Type  | `application/json`             |

## Request body

None — the user is identified from the token.

---

## How it works

The server reads the user's id from the JWT, looks up their tradie profile in `tradie_profiles`, and decides which response shape to return based on whether the profile exists and its `profileStatus`.

When the profile is `approved`, the server:
1. Updates `users.role` to `tradie`.
2. Issues a brand-new `accessToken` and `refreshToken` with `role: "tradie"` baked into the JWT.
3. Persists the new refresh token server-side.

The app should replace the stored tokens with the new pair only in scenario 3 below.

---

## Scenario 1 — User has no tradie profile

The user never set up a tradie profile.

**Status:** `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tradie profile not found",
  "data": {
    "profile_exist": false,
    "profile_status": "not found"
  }
}
```

**App action:** prompt the user to complete the tradie profile setup flow.

---

## Scenario 2 — Tradie profile exists but is NOT approved

The user has set up a profile, but it is `pending`, `rejected`, or any non-approved status.

**Status:** `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tradie profile is not approved yet",
  "data": {
    "profile_exist": true,
    "profile_status": "pending"
  }
}
```

`profile_status` will reflect whatever the current state is (`pending`, `rejected`, etc.).

**App action:** show a status screen ("Your tradie profile is under review" / "Your tradie profile was rejected"). Do not change the stored tokens.

---

## Scenario 3 — Tradie profile is approved → role switched

The user's tradie profile is approved. The server flips the role and returns a new token pair.

**Status:** `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Switched to tradie role",
  "data": {
    "profile_exist": true,
    "profile_status": "approved",
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**App action:**
- Replace the stored `accessToken` and `refreshToken` with the new pair.
- The new JWT carries `role: "tradie"`, so subsequent calls to tradie-only endpoints will pass authorization.
- Refresh any cached user/profile state so the UI reflects the tradie role.

---

## Error responses

| Status | When                                              |
|--------|---------------------------------------------------|
| 401    | Token missing, expired, or invalid                |
| 403    | Token belongs to an admin (not a regular user)    |

---

## Related: profile_setup on profile endpoints

The following endpoints also include a `profile_setup` block in the response so the app can check tradie status without calling `become-tradie`:

- `GET /api/v1/auth/profile`
- `GET /api/v1/users/me`

```json
{
  "data": {
    "id": "...",
    "name": "...",
    "role": "customer",
    "profile_setup": {
      "profile_exist": true,
      "profile_status": "pending"
    }
  }
}
```

`profile_status` is `"not found"` when no tradie profile exists, otherwise the actual status.
