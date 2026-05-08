# LocalLoom — Auth API Documentation
## Customer & Tradie Authentication (Signup · OTP Login)

> **Base URL:** `{{BASE_URL}}/api/v1`
> All requests/responses are `application/json` unless noted as `multipart/form-data`.
> All responses follow the envelope shape described in the [Response Envelope](#response-envelope) section.

---

## Table of Contents

1. [Response Envelope](#response-envelope)
2. [Error Codes](#error-codes)
3. [Authentication Header](#authentication-header)
4. [Dev Mode Notes](#dev-mode-notes)
5. [Auth Flow Overview](#auth-flow-overview)
6. [Endpoints](#endpoints)
   - [POST /auth/signup](#1-post-authsignup)
   - [POST /auth/login](#2-post-authlogin)
   - [POST /auth/verify-otp](#3-post-authverify-otp)
   - [POST /auth/refresh-token](#4-post-authrefresh-token)
   - [POST /auth/logout](#5-post-authlogout)
   - [GET /auth/profile](#6-get-authprofile)
   - [POST /tradies/business/setup](#7-post-tradiesbusinesssetup)

---

## Response Envelope

Every API response wraps its payload in this structure:

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { ... }
}
```

For paginated responses:
```json
{
  "success": true,
  "message": "...",
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

For errors:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ "field-level detail (optional)" ]
}
```

---

## Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Bad Request — validation failed or invalid OTP |
| 401 | Unauthorized — missing or invalid token |
| 403 | Forbidden — account suspended or deleted |
| 404 | Not Found — user not found |
| 409 | Conflict — phone or email already registered |
| 429 | Too Many Requests — rate limit hit on auth endpoints |
| 500 | Internal Server Error |

---

## Authentication Header

Protected endpoints require a Bearer token:

```
Authorization: Bearer <accessToken>
```

---

## Dev Mode Notes

When `NODE_ENV` is not `production`:

- **Phone OTP** — the server does **not** send a real SMS. Use the fixed dev code: `123456`
- **Email OTP** — a real OTP is always sent to the email address (even in dev)
- The dev code `123456` bypasses the database OTP lookup for phone-based verification

---

## Auth Flow Overview

### Customer signup & login
```
Signup  →  POST /auth/signup   (creates account, sends OTP)
           POST /auth/verify-otp  (verify OTP → get tokens)

Login   →  POST /auth/login    (sends OTP to existing account)
           POST /auth/verify-otp  (verify OTP → get tokens)
```

### Tradie signup & login
```
Signup  →  POST /auth/signup  with role: "tradie"
           POST /auth/verify-otp  (verify OTP → get tokens)
           POST /tradies/business/setup  (complete tradie profile — requires token)

Login   →  POST /auth/login
           POST /auth/verify-otp  (verify OTP → get tokens)
```

---

## Endpoints

---

### 1. POST /auth/signup

Register a new customer or tradie account. Sends an OTP to the provided phone (and email if supplied).

**Content-Type:** `multipart/form-data`

#### Request Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `fullName` | string | ✅ | min 2, max 100 chars | User's full name |
| `phone` | string | ✅ | E.164 format e.g. `+61412345678` | Mobile number — used for OTP |
| `role` | string | ✅ | `"customer"` or `"tradie"` | Account type |
| `email` | string | ❌ | Valid email format | Optional email — OTP also sent here if provided |
| `profilePhoto` | file | ❌ | Image file (jpg/png) | Profile photo upload (multipart) |

#### Success Response — `201 Created`

```json
{
  "success": true,
  "message": "Signup successful. OTP sent to your phone.",
  "data": {
    "phone": "+61412345678",
    "email": "user@example.com"
  }
}
```

> `email` is only present in `data` if it was provided in the request.

#### Error Responses

| Status | Message |
|--------|---------|
| 400 | Validation error (missing/invalid fields) |
| 409 | `"Phone number already registered"` |
| 409 | `"Email already registered"` |

---

### 2. POST /auth/login

Initiate login for an existing account. Sends an OTP to the user's phone and/or email.

**Content-Type:** `application/json`

> Rate limited: max 100 requests per 15 minutes per IP.

#### Request Body

```json
{
  "identifier": "+61412345678",
  "identifierType": "phone"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `identifier` | string | ✅ | E.164 phone if `identifierType` is `"phone"`, valid email if `"email"` | The login identifier |
| `identifierType` | string | ✅ | `"phone"` or `"email"` | Which type of identifier is being used |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "identifierType": "phone",
    "maskedIdentifier": "+614*****678"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `identifierType` | string | Echoes back the type used |
| `maskedIdentifier` | string | Partially masked version of the identifier for display |

#### Error Responses

| Status | Message |
|--------|---------|
| 400 | Validation error |
| 403 | `"Account is suspended"` |
| 403 | `"Account has been deleted"` |
| 404 | `"No account found with this phone number"` |
| 404 | `"No account found with this email address"` |
| 429 | Rate limit exceeded |

---

### 3. POST /auth/verify-otp

Verify the OTP received after signup or login. Returns JWT tokens on success.

**Content-Type:** `application/json`

> Rate limited: max 100 requests per 15 minutes per IP.

#### Request Body

```json
{
  "identifier": "+61412345678",
  "identifierType": "phone",
  "code": "123456"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `identifier` | string | ✅ | E.164 phone or valid email | Must match what was used in signup/login |
| `identifierType` | string | ✅ | `"phone"` or `"email"` | Type of identifier |
| `code` | string | ✅ | Exactly 6 characters | The OTP code received via SMS or email |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-v4",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+61412345678",
      "avatar": "https://example.com/api/v1/uploads/businessDetails/photo.jpg",
      "role": "customer",
      "status": "active",
      "isPhoneVerified": true,
      "overallRating": 0,
      "lastLogin": "2026-05-04T10:00:00.000Z",
      "createdAt": "2026-05-01T08:00:00.000Z",
      "updatedAt": "2026-05-04T10:00:00.000Z"
    },
    "tokens": {
      "accessToken": "<jwt>",
      "refreshToken": "<jwt>"
    }
  }
}
```

##### `user` Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique user ID |
| `name` | string | Full name |
| `email` | string \| null | Email address (null if not provided) |
| `phone` | string | E.164 phone number |
| `avatar` | string \| null | Profile photo URL (null if not uploaded) |
| `role` | string | `"customer"` or `"tradie"` |
| `status` | string | `"active"`, `"suspended"`, or `"deleted"` |
| `isPhoneVerified` | boolean | Whether phone has been OTP-verified |
| `overallRating` | number | Rating score (0–5, relevant for tradies) |
| `lastLogin` | string (ISO 8601) | Timestamp of last login |
| `createdAt` | string (ISO 8601) | Account creation timestamp |
| `updatedAt` | string (ISO 8601) | Last update timestamp |

> `password` and `refreshToken` are **never** returned in any user object.

##### `tokens` Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `accessToken` | string | JWT — expires in 15 minutes. Use in `Authorization: Bearer` header |
| `refreshToken` | string | JWT — expires in 7 days. Use to get a new access token |

#### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"Invalid or expired OTP"` |
| 400 | `"OTP has expired"` |
| 400 | `"Maximum OTP attempts exceeded"` |

---

### 4. POST /auth/refresh-token

Exchange a valid refresh token for a new access + refresh token pair.

**Content-Type:** `application/json`

#### Request Body

```json
{
  "refreshToken": "<jwt>"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refreshToken` | string | ✅ | The refresh token received from verify-otp |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "<new-jwt>",
    "refreshToken": "<new-jwt>"
  }
}
```

#### Error Responses

| Status | Message |
|--------|---------|
| 401 | `"Invalid or expired token"` |
| 403 | `"Account is suspended"` |

---

### 5. POST /auth/logout

Invalidates the current session by clearing the stored refresh token.

**Requires:** `Authorization: Bearer <accessToken>`

#### Request Body

None required.

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

#### Error Responses

| Status | Message |
|--------|---------|
| 401 | Missing or invalid access token |

---

### 6. GET /auth/profile

Returns the authenticated user's profile.

**Requires:** `Authorization: Bearer <accessToken>`

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Profile fetched",
  "data": {
    "id": "uuid-v4",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+61412345678",
    "avatar": "https://example.com/api/v1/uploads/businessDetails/photo.jpg",
    "role": "customer",
    "status": "active",
    "isPhoneVerified": true,
    "overallRating": 0,
    "lastLogin": "2026-05-04T10:00:00.000Z",
    "createdAt": "2026-05-01T08:00:00.000Z",
    "updatedAt": "2026-05-04T10:00:00.000Z"
  }
}
```

Same `user` field definitions as [verify-otp response](#user-object-fields).

#### Error Responses

| Status | Message |
|--------|---------|
| 401 | Missing or invalid access token |

---

### 7. POST /tradies/business/setup

Complete or update a tradie's business profile. Must be called after signup + OTP verification for tradie accounts.

**Requires:** `Authorization: Bearer <accessToken>` (role must be `"tradie"`)

**Content-Type:** `multipart/form-data`

#### Request Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `businessName` | string | ✅ | max 200 chars | Trading/business name |
| `abn` | string | ✅ | 9–20 chars | Australian Business Number |
| `categoryIds` | string[] or CSV | ✅ | Array of UUIDs | Service category IDs (comma-separated or repeated field) |
| `regionIds` | string[] or CSV | ✅ | Array of UUIDs | Service region IDs (comma-separated or repeated field) |
| `serviceDescription` | string | ❌ | max 2000 chars | Description of services offered |
| `website` | string | ❌ | max 500 chars | Business website URL |
| `timeFrom` | string | ❌ | `HH:MM` format e.g. `"09:00"` | Business hours start time |
| `timeTo` | string | ❌ | `HH:MM` format e.g. `"17:00"` | Business hours end time |
| `openDays` | string[] or CSV | ❌ | Values: `sunday` `monday` `tuesday` `wednesday` `thursday` `friday` `saturday` | Days open |
| `isEmergencyAvailable` | boolean | ❌ | `true` or `false` | Whether tradie offers emergency services |
| `abnData` | JSON string or object | ❌ | `{ businessName, status, entityType }` | Pre-fetched ABN lookup data (from `/tradies/abn-lookup`) |
| `businessImage` | file | ❌ | Image file | Business profile image (multipart field name: `businessImage`) |
| `businessVideo` | file | ❌ | Video file, max 50MB | Business intro video (multipart field name: `businessVideo`) |

> `categoryIds` and `regionIds` can be sent as a JSON array or as a comma-separated string — both are accepted.
> Example CSV: `categoryIds=uuid1,uuid2,uuid3`

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Profile saved successfully",
  "data": {
    "id": "uuid-v4",
    "userId": "uuid-v4",
    "businessName": "Smith Plumbing",
    "abn": "12345678901",
    "abnVerified": false,
    "abnData": {
      "businessName": "Smith Plumbing Pty Ltd",
      "status": "Active",
      "entityType": "Australian Private Company"
    },
    "serviceDescription": "Expert plumbing services across Sydney.",
    "website": "https://smithplumbing.com.au",
    "businessImages": [
      "https://example.com/api/v1/uploads/businessDetails/image.jpg"
    ],
    "introVideoUrl": "https://example.com/api/v1/uploads/businessDetails/video.mp4",
    "timeFrom": "08:00",
    "timeTo": "18:00",
    "openDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "isEmergencyAvailable": true,
    "isAvailable": true,
    "profileStatus": "pending",
    "hasLicense": false,
    "licenseNumber": null,
    "licenseExpiryDate": null,
    "insuranceVerified": false,
    "yearsOfExperience": 0,
    "bio": null,
    "awards": null,
    "serviceRadiusKm": null,
    "createdAt": "2026-05-04T10:00:00.000Z",
    "updatedAt": "2026-05-04T10:00:00.000Z"
  }
}
```

##### Tradie Profile Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Tradie profile ID |
| `userId` | string (UUID) | Linked user account ID |
| `businessName` | string \| null | Business name |
| `abn` | string | ABN number |
| `abnVerified` | boolean | Whether ABN has been verified by admin |
| `abnData` | object \| null | `{ businessName, status, entityType }` from ABN lookup |
| `serviceDescription` | string \| null | Services description |
| `website` | string \| null | Business website |
| `businessImages` | string[] \| null | Array of business image URLs |
| `introVideoUrl` | string \| null | Intro video URL |
| `timeFrom` | string \| null | Business hours start (`HH:MM`) |
| `timeTo` | string \| null | Business hours end (`HH:MM`) |
| `openDays` | string[] \| null | Open days of the week |
| `isEmergencyAvailable` | boolean | Emergency service availability |
| `isAvailable` | boolean | General availability toggle |
| `profileStatus` | string | `"pending"`, `"approved"`, or `"rejected"` — set by admin |
| `hasLicense` | boolean | Whether tradie has a trade license |
| `licenseNumber` | string \| null | License number |
| `licenseExpiryDate` | string \| null | License expiry (ISO date) |
| `insuranceVerified` | boolean | Whether insurance has been verified by admin |
| `yearsOfExperience` | number | Years of experience |
| `bio` | string \| null | Personal bio |
| `awards` | string \| null | Awards/achievements |
| `serviceRadiusKm` | number \| null | Service radius in km |
| `createdAt` | string (ISO 8601) | Profile creation timestamp |
| `updatedAt` | string (ISO 8601) | Last update timestamp |

#### Error Responses

| Status | Message |
|--------|---------|
| 400 | Validation error (missing required fields) |
| 401 | Missing or invalid access token |
| 403 | User role is not `"tradie"` |

---

## Complete Tradie Signup Flow (Step-by-Step)

```
Step 1 — Signup
POST /api/v1/auth/signup
  Body (multipart/form-data):
    fullName: "John Smith"
    phone: "+61412345678"
    role: "tradie"
    email: "john@example.com"       ← optional
    profilePhoto: <file>            ← optional

  Response 201:
    data.phone: "+61412345678"

---

Step 2 — Verify OTP
POST /api/v1/auth/verify-otp
  Body:
    identifier: "+61412345678"
    identifierType: "phone"
    code: "123456"                  ← dev mode fixed code

  Response 200:
    data.user.id: "uuid"
    data.user.role: "tradie"
    data.tokens.accessToken: "<jwt>"
    data.tokens.refreshToken: "<jwt>"

---

Step 3 — Setup Business Profile
POST /api/v1/tradies/business/setup
  Header: Authorization: Bearer <accessToken>
  Body (multipart/form-data):
    businessName: "Smith Plumbing"
    abn: "12345678901"
    categoryIds: "uuid1,uuid2"
    regionIds: "uuid3"
    serviceDescription: "Expert plumbing..."
    timeFrom: "08:00"
    timeTo: "18:00"
    openDays: "monday,tuesday,wednesday,thursday,friday"
    isEmergencyAvailable: "true"
    businessImage: <file>

  Response 200:
    data.profileStatus: "pending"   ← awaits admin approval
```

---

## Complete Customer Signup Flow (Step-by-Step)

```
Step 1 — Signup
POST /api/v1/auth/signup
  Body (multipart/form-data):
    fullName: "Jane Doe"
    phone: "+61498765432"
    role: "customer"

  Response 201:
    data.phone: "+61498765432"

---

Step 2 — Verify OTP
POST /api/v1/auth/verify-otp
  Body:
    identifier: "+61498765432"
    identifierType: "phone"
    code: "123456"

  Response 200:
    data.user.role: "customer"
    data.tokens.accessToken: "<jwt>"
    data.tokens.refreshToken: "<jwt>"

  ← Customer is now fully authenticated. No further setup required.
```

---

## Token Management

- `accessToken` expires in **15 minutes** — attach to every protected request
- `refreshToken` expires in **7 days** — use `POST /auth/refresh-token` to get a new pair
- On logout, the refresh token is invalidated server-side
- Both tokens are JWTs signed with separate secrets

```
Token payload (decoded):
{
  "userId": "uuid-v4",
  "role": "customer" | "tradie",
  "userType": "user",
  "iat": 1234567890,
  "exp": 1234568790
}
```
