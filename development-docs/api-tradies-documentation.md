# LocalLoom — Tradies API Documentation
## Tradie Profiles — Public Browsing & Self-Management

> **Base URL:** `{{BASE_URL}}/api/v1`
> All responses are `application/json` unless noted as `multipart/form-data`.

---

## Table of Contents

1. [Response Envelope](#response-envelope)
2. [Authentication](#authentication)
3. [Endpoints Overview](#endpoints-overview)
4. [Public Endpoints (No Auth)](#public-endpoints)
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
  "message": "Human-readable message",
  "data": { ... }
}
```

Paginated:
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

Error:
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Authentication

```
Authorization: Bearer <accessToken>
```

- Public endpoints: no header needed
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
| `page` | number | No | min 1 | Page number (default: 1) |
| `limit` | number | No | 1-50 | Items per page (default: 20) |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Tradies fetched",
  "data": [
    {
      "id": "uuid-tradie-profile-id",
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
| `id` | string (UUID) | Tradie profile ID — use for detail endpoints |
| `businessName` | string or null | Business display name |
| `businessImage` | string or null | First business image URL |
| `location` | string or null | Business location text |
| `services` | string[] | Array of category names (e.g. `["Plumbing"]`) |
| `isOpen` | boolean | Whether the tradie is currently open based on business hours |
| `openDays` | string[] | Days of the week the business is open |
| `timeFrom` | string or null | Opening time `HH:MM` |
| `timeTo` | string or null | Closing time `HH:MM` |
| `averageRating` | number | Average review rating (0-5, 2 decimal places) |
| `totalRatingCount` | number | Total number of approved reviews |
| `isFavourite` | boolean | Whether current user has favourited this tradie (false if not authenticated) |

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
  "message": "Profile fetched",
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
      "avatar": "https://example.com/uploads/businessDetails/avatar.jpg",
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
| `profileImage` | string or null | User avatar or profile photo |
| `tradieName` | string or null | Tradie's full name |
| `contactNumber` | string or null | Phone number |
| `email` | string or null | Email address |
| `website` | string or null | Website URL |
| `location` | string or null | Business location |
| `timeFrom` | string or null | Opening time |
| `timeTo` | string or null | Closing time |
| `openDays` | string[] | Open days |
| `isOpen` | boolean | Currently open based on server time |
| `isEmergencyAvailable` | boolean | Emergency services flag |

#### Response when `type=work` — `200 OK`

```json
{
  "success": true,
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
| `giverName` | string or null | Reviewer's name |
| `profileImage` | string or null | Reviewer's avatar URL |
| `time` | string (ISO 8601) | Review creation timestamp |
| `rating` | number | Rating 1-5 |
| `comment` | string or null | Review text |

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

---

## Authenticated Endpoints

---

### 6. GET /tradies/:id/contact

Get a tradie's public profile including contact details. Also logs the contact event (used for review eligibility).

**Auth:** Required (any role)

#### URL Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Tradie profile ID |

#### Success Response — `200 OK`

Same shape as [GET /tradies/:id](#2-get-tradiesid) but includes full user contact info:
- `user.phone` — full phone number
- `user.email` — full email
- `user.overallRating` — user's overall rating

#### Error Responses

| Status | Message |
|--------|---------|
| 401 | Missing or invalid token |
| 404 | `"Tradie profile not found"` |

---

### 7. POST /tradies/abn-lookup

Look up an Australian Business Number to get business details.

**Auth:** Required (any role)

**Content-Type:** `application/json`

#### Request Body

```json
{
  "abn": "12345678901"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `abn` | string | Yes | 9-20 chars, trimmed | The ABN to look up |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "ABN lookup successful",
  "data": {
    "businessName": "Smith Plumbing Pty Ltd",
    "status": "Active",
    "entityType": "Australian Private Company"
  }
}
```

##### ABN Lookup Fields

| Field | Type | Description |
|-------|------|-------------|
| `businessName` | string or undefined | Registered business name |
| `status` | string or undefined | ABN status (e.g. "Active", "Cancelled") |
| `entityType` | string or undefined | Entity type description |

#### Error Responses

| Status | Message |
|--------|---------|
| 400 | Validation error (ABN too short/long) |
| 401 | Missing or invalid token |

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
  "message": "Profile fetched",
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
| 404 | `"Tradie profile not found"` (profile not yet created) |

---

### 9. POST /tradies/business/setup

Create or update the tradie's business profile. This is an upsert — call it for initial setup and for updates.

**Auth:** Required (tradie only)

**Content-Type:** `multipart/form-data`

#### Request Fields

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `businessName` | string | Yes | max 200 chars | Business/trading name |
| `abn` | string | Yes | 9-20 chars | Australian Business Number |
| `categoryIds` | string[] or CSV | Yes | Array of UUIDs, max 6 | Service category IDs |
| `regionIds` | string[] or CSV | Yes | Array of UUIDs | Service region IDs |
| `serviceDescription` | string | No | max 2000 chars | Description of services |
| `website` | string | No | max 500 chars | Business website |
| `timeFrom` | string | No | `HH:MM` format | Business hours start |
| `timeTo` | string | No | `HH:MM` format | Business hours end |
| `openDays` | string[] or CSV | No | Valid days: sunday-saturday | Days open |
| `isEmergencyAvailable` | boolean or string | No | `true`/`false` | Emergency availability |
| `abnData` | JSON string or object | No | `{ businessName, status, entityType }` | Pre-fetched ABN data |
| `businessImage` | file | No | Image file | Business profile image |
| `businessVideo` | file | No | Video, max 50MB | Business intro video |

> `categoryIds` and `regionIds` accept both JSON arrays and comma-separated strings.
> Example: `categoryIds=uuid1,uuid2` or repeated fields `categoryIds=uuid1&categoryIds=uuid2`

#### Success Response — `200 OK`

```json
{
  "success": true,
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
| 400 | Validation error / `"Maximum 6 services allowed"` / `"Invalid category IDs: ..."` / `"Invalid region IDs: ..."` |
| 401 | Missing or invalid token |
| 403 | `"Only tradies can set up a profile"` |

---

### 10. POST /tradies/profile/work-photos

Upload work photos to the tradie's portfolio. Maximum 20 photos total.

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
  "message": "Work photo uploaded",
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
| 400 | `"At least one image is required"` / `"Maximum 20 work photos allowed"` |
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
  "message": "Work photo deleted",
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
  "message": "Stats fetched",
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
formData.append('businessImage', { uri: imageUri, type: 'image/jpeg', name: 'photo.jpg' });

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
