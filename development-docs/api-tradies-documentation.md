# LocalLoom — Tradies API Documentation
## Tradie Profiles — Public Browsing & Self-Management

> **Base URL:** `{{BASE_URL}}/api/v1`
> All responses are `application/json` unless noted as `multipart/form-data`.

---

## Table of Contents

1. [Response Envelope](#response-envelope)
2. [Authentication](#authentication)
3. [Endpoints Overview](#endpoints-overview)
4. [Public Endpoints](#public-endpoints)
   - [GET /tradies](#1-get-tradies)
   - [GET /tradies/:id](#2-get-tradiesid)
   - [GET /tradies/:id/details](#3-get-tradiesiddetails)
   - [GET /tradies/:id/reviews](#4-get-tradiesidreviews)
   - [GET /tradies/:id/work-photos](#5-get-tradiesidwork-photos)
5. [Authenticated Endpoints](#authenticated-endpoints)
   - [GET /tradies/:id/contact](#6-get-tradiesidcontact)
   - [POST /tradies/abn-lookup](#7-post-tradiesabn-lookup)
6. [Tradie Self-Management (role: tradie)](#tradie-self-management)
   - [GET /tradies/me/profile](#8-get-tradiesmeprofile)
   - [POST /tradies/business/setup](#9-post-tradiesbusinesssetup)
   - [POST /tradies/profile/work-photos](#10-post-tradiesprofilework-photos)
   - [DELETE /tradies/profile/work-photos/:photoId](#11-delete-tradiesprofilework-photosphotoid)
   - [GET /tradies/profile/stats](#12-get-tradiesprofilestats)

---

## Response Envelope

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Human-readable message",
  "data": { ... }
}
```

Paginated:
```json
{
  "success": true,
  "statusCode": 200,
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

Error:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description"
}
```

---

## Authentication

```
Authorization: Bearer <accessToken>
```

- Public endpoints: no header needed (some support optional auth for extra fields)
- Authenticated endpoints: any logged-in user (customer or tradie)
- Tradie self-management: requires `role: "tradie"` in the JWT

---

## Endpoints Overview

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 1 | GET | /tradies | Optional | List tradies with filters (paginated) |
| 2 | GET | /tradies/:id | None | Get public tradie profile |
| 3 | GET | /tradies/:id/details | None | Get tradie details (about/work/reviews) |
| 4 | GET | /tradies/:id/reviews | None | Get paginated reviews |
| 5 | GET | /tradies/:id/work-photos | None | Get work photos |
| 6 | GET | /tradies/:id/contact | Required | Get profile with contact info |
| 7 | POST | /tradies/abn-lookup | Required | Look up ABN details |
| 8 | GET | /tradies/me/profile | Tradie | Get own profile |
| 9 | POST | /tradies/business/setup | Tradie | Create or update business profile |
| 10 | POST | /tradies/profile/work-photos | Tradie | Upload work photos |
| 11 | DELETE | /tradies/profile/work-photos/:photoId | Tradie | Delete a work photo |
| 12 | GET | /tradies/profile/stats | Tradie | Get profile stats |

---

## Public Endpoints

---

### 1. GET /tradies

List all approved tradie profiles with optional filters. Supports pagination.

**Auth:** Optional (if token provided, `isFavourite` field is populated)

#### Query Parameters

| Param | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `categoryId` | string (UUID) | No | Valid UUID | Filter by service category |
| `regionId` | string (UUID) | No | Valid UUID | Filter by service region |
| `rating` | number | No | 1-5 | Minimum rating filter |
| `availability` | string | No | `"true"` or `"false"` | Filter by general availability |
| `emergency` | string | No | `"true"` or `"false"` | Filter by emergency availability |
| `page` | number | No | min 1 (default: 1) | Page number |
| `limit` | number | No | 1-50 (default: 20) | Items per page |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tradies fetched successfully",
  "data": [
    {
      "id": "uuid",
      "businessName": "Smith Plumbing",
      "businessImage": "https://example.com/uploads/businessDetails/image.jpg",
      "location": "Sydney CBD",
      "services": ["Plumbing", "Gas Fitting"],
      "isOpen": true,
      "openDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
      "timeFrom": "08:00",
      "timeTo": "17:00",
      "averageRating": 4.75,
      "totalRatingCount": 12,
      "isFavourite": false
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

##### List Item Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Tradie profile ID |
| `businessName` | string or null | Business display name |
| `businessImage` | string or null | First business image URL |
| `location` | string or null | Business location text (`businessLocation` field) |
| `services` | string[] | Array of category names |
| `isOpen` | boolean | Whether the tradie is currently open based on server time + business hours |
| `openDays` | string[] | Days of the week the business is open |
| `timeFrom` | string or null | Opening time `HH:MM` |
| `timeTo` | string or null | Closing time `HH:MM` |
| `averageRating` | number | Average review rating |
| `totalRatingCount` | number | Total number of approved reviews |
| `isFavourite` | boolean | Whether current user has favourited (false if not authenticated) |

---

### 2. GET /tradies/:id

Get a single tradie's full public profile. Also records a profile visit.

**Auth:** None

#### URL Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Tradie profile ID |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tradie profile fetched successfully",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "businessName": "Smith Plumbing",
    "businessLocation": "Sydney CBD",
    "serviceDescription": "Expert plumbing services...",
    "website": "https://smithplumbing.com.au",
    "businessImages": ["https://example.com/uploads/businessDetails/img1.jpg"],
    "abn": "12345678901",
    "abnVerified": true,
    "yearsOfExperience": 10,
    "bio": "20 years in the trade...",
    "introVideoUrl": "https://example.com/uploads/businessDetails/video.mp4",
    "awards": "Best Plumber 2025",
    "profilePhoto": null,
    "serviceRadiusKm": 25,
    "profileStatus": "approved",
    "hasLicense": true,
    "licenseNumber": "LIC-12345",
    "licenseExpiryDate": "2027-06-30",
    "insuranceVerified": true,
    "timeFrom": "08:00",
    "timeTo": "17:00",
    "openDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "isAvailable": true,
    "isEmergencyAvailable": true,
    "createdAt": "2026-04-15T10:00:00.000Z",
    "updatedAt": "2026-05-01T10:00:00.000Z",
    "user": {
      "id": "uuid",
      "name": "John Smith",
      "avatar": "https://example.com/uploads/avatar.jpg",
      "phone": "+61412345678",
      "email": "john@example.com"
    },
    "services": [
      { "id": "uuid", "name": "Plumbing" },
      { "id": "uuid", "name": "Gas Fitting" }
    ],
    "serviceRegions": [
      { "id": "uuid", "name": "Sydney", "isActive": true, "createdAt": "...", "updatedAt": "..." }
    ],
    "workPhotos": [
      { "id": "uuid", "tradieProfileId": "uuid", "imageUrl": "https://...", "sortOrder": 1, "createdAt": "...", "updatedAt": "..." }
    ]
  }
}
```

#### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"id" must be a valid GUID` |
| 404 | `"Tradie profile not found"` |

---

### 3. GET /tradies/:id/details

Get specific detail sections for a tradie. Use `type` query param to select which section.

**Auth:** None

#### URL Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Tradie profile ID |

#### Query Parameters

| Param | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `type` | string | Yes | `"about"`, `"work"`, or `"reviews"` | Which detail section to fetch |
| `page` | number | No | min 1 | Page (for reviews type only) |
| `limit` | number | No | 1-50 | Limit (for reviews type only) |

#### Response when `type=about` — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Details fetched",
  "data": {
    "id": "uuid",
    "businessName": "Smith Plumbing",
    "serviceDescription": "Expert plumbing services...",
    "services": [
      { "id": "uuid", "name": "Plumbing" }
    ],
    "profileImage": "https://example.com/uploads/avatar.jpg",
    "tradieName": "John Smith",
    "contactNumber": "+61412345678",
    "email": "john@example.com",
    "website": "https://smithplumbing.com.au",
    "location": "Sydney CBD",
    "timeFrom": "08:00",
    "timeTo": "17:00",
    "openDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "isOpen": true,
    "isEmergencyAvailable": true
  }
}
```

##### About Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Tradie profile ID |
| `businessName` | string or null | Business name |
| `serviceDescription` | string or null | Service description |
| `services` | array | `[{ id, name }]` — service categories |
| `profileImage` | string or null | User avatar or profile photo (falls back to `profilePhoto`) |
| `tradieName` | string or null | Tradie's full name (from user record) |
| `contactNumber` | string or null | Phone number (from user record) |
| `email` | string or null | Email address (from user record) |
| `website` | string or null | Website URL |
| `location` | string or null | Business location (`businessLocation` field) |
| `timeFrom` | string or null | Opening time |
| `timeTo` | string or null | Closing time |
| `openDays` | string[] | Open days |
| `isOpen` | boolean | Currently open based on server time |
| `isEmergencyAvailable` | boolean | Emergency services flag |

#### Response when `type=work` — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Details fetched",
  "data": {
    "images": [
      { "id": "uuid", "imageUrl": "https://...", "sortOrder": 1 },
      { "id": "uuid", "imageUrl": "https://...", "sortOrder": 2 }
    ]
  }
}
```

#### Response when `type=reviews` — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Details fetched",
  "data": {
    "totalReviewCount": 24,
    "averageRating": 4.58,
    "reviews": [
      {
        "id": "uuid",
        "giverName": "Jane Doe",
        "profileImage": "https://example.com/uploads/avatar.jpg",
        "time": "2026-04-20T14:30:00.000Z",
        "rating": 5,
        "comment": "Excellent work, very professional!"
      }
    ],
    "meta": {
      "total": 24,
      "page": 1,
      "limit": 20,
      "totalPages": 2
    }
  }
}
```

##### Review Item Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Review ID |
| `giverName` | string or null | Reviewer's name (from customer record) |
| `profileImage` | string or null | Reviewer's avatar URL (from customer record) |
| `time` | string (ISO 8601) | Review creation timestamp (`createdAt`) |
| `rating` | number | Rating 1-5 |
| `comment` | string or null | Review text |

#### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"id" must be a valid GUID` / `"type" is required` / `"type" must be one of [about, work, reviews]` |
| 404 | `"Tradie profile not found"` |

---

### 4. GET /tradies/:id/reviews

Get paginated approved reviews for a tradie.

**Auth:** None

#### URL Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Tradie profile ID |

#### Query Parameters

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 20 | Items per page |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Reviews fetched",
  "data": [
    {
      "id": "uuid",
      "tradieProfileId": "uuid",
      "customerId": "uuid",
      "rating": 5,
      "comment": "Great work!",
      "status": "approved",
      "createdAt": "2026-04-20T14:30:00.000Z",
      "updatedAt": "2026-04-20T14:30:00.000Z",
      "customer": {
        "id": "uuid",
        "name": "Jane Doe",
        "avatar": "https://..."
      }
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

#### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"id" must be a valid GUID` |

---

### 5. GET /tradies/:id/work-photos

Get all work photos for a tradie, sorted by `sortOrder`.

**Auth:** None

#### URL Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Tradie profile ID |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Work photos fetched",
  "data": [
    {
      "id": "uuid",
      "tradieProfileId": "uuid",
      "imageUrl": "https://example.com/uploads/workImage/photo1.jpg",
      "sortOrder": 1,
      "createdAt": "2026-04-15T10:00:00.000Z",
      "updatedAt": "2026-04-15T10:00:00.000Z"
    }
  ]
}
```

##### Work Photo Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Photo ID |
| `tradieProfileId` | string (UUID) | Parent profile ID |
| `imageUrl` | string | Full URL to the image |
| `sortOrder` | number | Display order (ascending) |
| `createdAt` | string (ISO 8601) | Upload timestamp |
| `updatedAt` | string (ISO 8601) | Last update timestamp |

#### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"id" must be a valid GUID` |

---

## Authenticated Endpoints

---

### 6. GET /tradies/:id/contact

Get a tradie's public profile including contact details. Also logs the contact event (used for review eligibility — user becomes eligible to review after 7 hours).

**Auth:** Required (any role)

#### URL Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Tradie profile ID |

#### Success Response — `200 OK`

Same shape as [GET /tradies/:id](#2-get-tradiesid). The response includes full user contact info (`user.phone`, `user.email`).

#### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"id" must be a valid GUID` |
| 401 | Missing or invalid token |
| 404 | `"Tradie profile not found"` |

---

### 7. POST /tradies/abn-lookup

Look up an Australian Business Number to get business details from the ABR (Australian Business Register).

**Auth:** Required (any role)

**Content-Type:** `application/json`

#### Request Body

```json
{
  "abn": "46002510054"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `abn` | string | Yes | min 9, max 20 chars, trimmed | The ABN to look up |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "ABN lookup successful",
  "data": {
    "abn": "46002510054",
    "abnStatus": "Active",
    "entityName": "Smith Plumbing Pty Ltd",
    "entityType": "Australian Private Company",
    "state": "VIC",
    "postcode": "3000",
    "isActive": true
  }
}
```

##### ABN Lookup Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `abn` | string | The cleaned ABN (whitespace stripped) |
| `abnStatus` | string | ABN status (e.g. "Active", "Cancelled") |
| `entityName` | string | Registered entity/business name |
| `entityType` | string | Entity type description |
| `state` | string | Registered state |
| `postcode` | string | Registered postcode |
| `isActive` | boolean | `true` if `abnStatus === "Active"` |

> **Note:** In development mode (`NODE_ENV=development`), the API returns mock data without calling the real ABR API, regardless of `ABN_LOOKUP_GUID` configuration.

#### Error Responses

| Status | Message |
|--------|---------|
| 400 | Validation error (`"abn" is required` / `"abn" length must be at least 9 characters long`) |
| 401 | Missing or invalid token |
| 500 | `"ABN lookup failed: <upstream reason>"` (e.g. invalid GUID, ABR unreachable) |

---

## Tradie Self-Management

All endpoints below require `Authorization: Bearer <accessToken>` with `role: "tradie"`.

---

### 8. GET /tradies/me/profile

Get the authenticated tradie's own full profile with services, regions, and work photos.

**Auth:** Required (tradie only)

#### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tradie profile fetched successfully",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "businessName": "Smith Plumbing",
    "businessLocation": null,
    "serviceDescription": "Expert plumbing...",
    "website": "https://smithplumbing.com.au",
    "businessImages": ["https://..."],
    "abn": "12345678901",
    "abnVerified": false,
    "abnData": { "businessName": "Smith Plumbing Pty Ltd", "status": "Active", "entityType": "..." },
    "yearsOfExperience": 0,
    "bio": null,
    "introVideoUrl": null,
    "awards": null,
    "profilePhoto": null,
    "serviceRadiusKm": null,
    "profileStatus": "pending",
    "hasLicense": false,
    "licenseNumber": null,
    "licenseExpiryDate": null,
    "insuranceVerified": false,
    "timeFrom": "08:00",
    "timeTo": "17:00",
    "openDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "isAvailable": true,
    "isEmergencyAvailable": true,
    "createdAt": "2026-05-01T10:00:00.000Z",
    "updatedAt": "2026-05-01T10:00:00.000Z",
    "services": [
      { "id": "uuid", "name": "Plumbing", "icon": "...", "description": "...", "isActive": true, "sortOrder": 1, "createdAt": "...", "updatedAt": "..." }
    ],
    "serviceRegions": [
      { "id": "uuid", "name": "Sydney", "isActive": true, "createdAt": "...", "updatedAt": "..." }
    ],
    "workPhotos": [
      { "id": "uuid", "tradieProfileId": "uuid", "imageUrl": "https://...", "sortOrder": 1, "createdAt": "...", "updatedAt": "..." }
    ]
  }
}
```

#### Error Responses

| Status | Message |
|--------|---------|
| 401 | Missing or invalid token |
| 403 | User role is not tradie |
| 404 | `"Tradie profile not found"` |

---

### 9. POST /tradies/business/setup

Create or update the tradie's business profile. This is an upsert — call it for initial setup and for subsequent updates.

**Auth:** Required (tradie only)

**Content-Type:** `multipart/form-data`

#### Request Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `businessName` | string | Yes | max 200 chars, trimmed | Business/trading name |
| `abn` | string | Yes | min 9, max 20 chars, trimmed | Australian Business Number |
| `categoryIds` | string[] or CSV | Yes | Array of UUIDs, max 6 | Service category IDs |
| `regionIds` | string[] or CSV | Yes | Array of UUIDs | Service region IDs |
| `serviceDescription` | string | No | max 2000 chars | Description of services |
| `website` | string | No | max 500 chars | Business website |
| `timeFrom` | string | No | `HH:MM` format (regex: `^([01]\d|2[0-3]):[0-5]\d$`) | Business hours start |
| `timeTo` | string | No | `HH:MM` format (regex: `^([01]\d|2[0-3]):[0-5]\d$`) | Business hours end |
| `openDays` | string[] or CSV | No | Valid values: `sunday`, `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday` | Days open |
| `isEmergencyAvailable` | boolean or string | No | `true`/`false` | Emergency availability |
| `abnData` | JSON string or object | No | `{ businessName?, status?, entityType? }` | Pre-fetched ABN data from lookup |
| `businessImage` | file | No | Image file, max 50MB | Business profile image (field name: `businessImage`) |
| `businessVideo` | file | No | Video file, max 50MB | Business intro video (field name: `businessVideo`) |

> `categoryIds` and `regionIds` accept both JSON arrays and comma-separated strings.
> Example: `categoryIds=uuid1,uuid2` or repeated fields `categoryIds=uuid1&categoryIds=uuid2`

#### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile saved successfully",
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "businessName": "Smith Plumbing",
    "abn": "12345678901",
    "abnVerified": false,
    "abnData": { "businessName": "...", "status": "Active", "entityType": "..." },
    "serviceDescription": "Expert plumbing...",
    "website": "https://smithplumbing.com.au",
    "businessImages": ["https://..."],
    "introVideoUrl": "https://...",
    "timeFrom": "08:00",
    "timeTo": "17:00",
    "openDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "isEmergencyAvailable": true,
    "isAvailable": true,
    "profileStatus": "pending",
    "yearsOfExperience": 0,
    "createdAt": "...",
    "updatedAt": "...",
    "services": [{ "id": "uuid", "name": "Plumbing" }],
    "serviceRegions": [{ "id": "uuid", "name": "Sydney" }],
    "workPhotos": []
  }
}
```

#### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"businessName" is required` / `"abn" is required` / `"categoryIds" is required` / `"regionIds" is required` |
| 400 | `"Maximum 6 services allowed"` |
| 400 | `"Invalid category IDs: uuid1, uuid2"` |
| 400 | `"Invalid region IDs: uuid1"` |
| 400 | `"timeFrom must be in HH:MM format (e.g. 09:00)"` |
| 401 | Missing or invalid token |
| 403 | `"Only tradies can set up a profile"` |

---

### 10. POST /tradies/profile/work-photos

Upload work photos to the tradie's portfolio. Maximum 20 photos total across all uploads.

**Auth:** Required (tradie only)

**Content-Type:** `multipart/form-data`

#### Request Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `images` | file[] | Yes | 1-20 images, max 5MB each | Work photo files (field name: `images`) |

#### Success Response — `201 Created`

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Work photo uploaded successfully",
  "data": [
    {
      "id": "uuid",
      "tradieProfileId": "uuid",
      "imageUrl": "https://example.com/uploads/workImage/photo.jpg",
      "sortOrder": 1,
      "createdAt": "2026-05-04T10:00:00.000Z",
      "updatedAt": "2026-05-04T10:00:00.000Z"
    }
  ]
}
```

#### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"At least one image is required"` |
| 400 | `"Maximum 20 work photos allowed"` |
| 401 | Missing or invalid token |
| 403 | User role is not tradie |
| 404 | `"Tradie profile not found"` |

---

### 11. DELETE /tradies/profile/work-photos/:photoId

Delete a specific work photo from the tradie's portfolio.

**Auth:** Required (tradie only)

#### URL Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `photoId` | string (UUID) | Yes | The work photo ID to delete |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Work photo deleted successfully",
  "data": null
}
```

#### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"photoId" must be a valid GUID` |
| 401 | Missing or invalid token |
| 403 | User role is not tradie |
| 404 | `"Tradie profile not found"` / `"Work photo not found"` |

---

### 12. GET /tradies/profile/stats

Get the authenticated tradie's profile statistics.

**Auth:** Required (tradie only)

#### Success Response — `200 OK`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Stats fetched successfully",
  "data": {
    "visitCount": 156,
    "reviewCount": 12,
    "averageRating": 4.58
  }
}
```

##### Stats Fields

| Field | Type | Description |
|-------|------|-------------|
| `visitCount` | number | Total profile visits |
| `reviewCount` | number | Total approved reviews |
| `averageRating` | number | Average rating (0-5, 2 decimal places) |

#### Error Responses

| Status | Message |
|--------|---------|
| 401 | Missing or invalid token |
| 403 | User role is not tradie |
| 404 | `"Tradie profile not found"` |


---

## Usage Notes for React Native Developer

### Listing tradies with filters
```js
// Basic list
const res = await api.get('/tradies');

// With filters
const res = await api.get('/tradies', {
  params: { categoryId: 'uuid', regionId: 'uuid', page: 1, limit: 10 }
});

// If user is logged in, pass token to get isFavourite field
const res = await api.get('/tradies', {
  headers: { Authorization: `Bearer ${token}` },
  params: { emergency: 'true' }
});
```

### Tradie detail screen (tabbed)
```js
// About tab
const about = await api.get(`/tradies/${id}/details?type=about`);

// Work tab
const work = await api.get(`/tradies/${id}/details?type=work`);

// Reviews tab (paginated)
const reviews = await api.get(`/tradies/${id}/details?type=reviews&page=1&limit=10`);
```

### ABN lookup before profile setup
```js
// Look up ABN first
const abnRes = await api.post('/tradies/abn-lookup', { abn: '46002510054' }, {
  headers: { Authorization: `Bearer ${token}` }
});
const abnData = {
  businessName: abnRes.data.data.entityName,
  status: abnRes.data.data.abnStatus,
  entityType: abnRes.data.data.entityType
};

// Then pass abnData into profile setup
formData.append('abnData', JSON.stringify(abnData));
```

### Business profile setup (multipart)
```js
const formData = new FormData();
formData.append('businessName', 'Smith Plumbing');
formData.append('abn', '12345678901');
formData.append('categoryIds', 'uuid1,uuid2');
formData.append('regionIds', 'uuid3');
formData.append('timeFrom', '08:00');
formData.append('timeTo', '17:00');
formData.append('openDays', 'monday,tuesday,wednesday,thursday,friday');
formData.append('isEmergencyAvailable', 'true');
formData.append('abnData', JSON.stringify({ businessName: '...', status: 'Active', entityType: '...' }));
formData.append('businessImage', { uri: imageUri, type: 'image/jpeg', name: 'photo.jpg' });
formData.append('businessVideo', { uri: videoUri, type: 'video/mp4', name: 'intro.mp4' });

const res = await api.post('/tradies/business/setup', formData, {
  headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
});
```

### Upload work photos
```js
const formData = new FormData();
selectedPhotos.forEach((photo, i) => {
  formData.append('images', { uri: photo.uri, type: 'image/jpeg', name: `work_${i}.jpg` });
});

const res = await api.post('/tradies/profile/work-photos', formData, {
  headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
});
```
