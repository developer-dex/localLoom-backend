# LocalLoom — Regions API Documentation
## Public Regions Module

> **Base URL:** `{{BASE_URL}}/api/v1`
> All responses are `application/json`.
> No authentication required for any endpoint in this module.

---

## Overview

The Regions module exposes service regions/areas used throughout the app — for example "Sydney", "Melbourne", "Brisbane". These are used when:
- A tradie sets up their business profile (`regionIds` field)
- A customer filters the tradie listing by region

Both endpoints are fully public — no `Authorization` header needed.

---

## Response Envelope

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { ... }
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

## Region Object

Every region response returns objects with these fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique region ID — use this as `regionIds` value when setting up a tradie profile or filtering |
| `name` | string | Region display name e.g. `"Sydney"` |
| `isActive` | boolean | Always `true` — inactive regions are filtered out server-side |
| `createdAt` | string (ISO 8601) | Creation timestamp |
| `updatedAt` | string (ISO 8601) | Last update timestamp |

---

## Endpoints

---

### 1. GET /regions

Returns all active regions, ordered alphabetically by `name`.

**Auth:** None required

**Query Params:** None

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Regions fetched",
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Brisbane",
      "isActive": true,
      "createdAt": "2026-04-15T10:00:00.000Z",
      "updatedAt": "2026-04-15T10:00:00.000Z"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "name": "Melbourne",
      "isActive": true,
      "createdAt": "2026-04-15T10:00:00.000Z",
      "updatedAt": "2026-04-15T10:00:00.000Z"
    },
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "name": "Sydney",
      "isActive": true,
      "createdAt": "2026-04-15T10:00:00.000Z",
      "updatedAt": "2026-04-15T10:00:00.000Z"
    }
  ]
}
```

> `data` is an array. It will be an empty array `[]` if no active regions exist.

#### Error Responses

| Status | Message |
|--------|---------|
| 500 | Internal server error |

---

### 2. GET /regions/:id

Returns a single active region by its UUID.

**Auth:** None required

#### URL Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | The region's UUID |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Region fetched",
  "data": {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "name": "Sydney",
    "isActive": true,
    "createdAt": "2026-04-15T10:00:00.000Z",
    "updatedAt": "2026-04-15T10:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"id" must be a valid GUID` — invalid UUID format |
| 404 | `"Region not found"` — ID doesn't exist or region is inactive |

---

## Usage in React Native

### Fetch all regions (e.g. for a picker/dropdown)

```js
const response = await fetch(`${BASE_URL}/api/v1/regions`);
const { data: regions } = await response.json();
// regions is Region[]
// Use region.id as the value, region.name as the label
```

### Fetch a single region

```js
const response = await fetch(`${BASE_URL}/api/v1/regions/${regionId}`);
const { data: region } = await response.json();
```

### Passing regionIds to tradie profile setup

```js
// After user selects regions from the list:
const selectedIds = ["uuid1", "uuid2"];

// Send as comma-separated string in multipart/form-data:
formData.append("regionIds", selectedIds.join(","));

// OR append each ID individually:
selectedIds.forEach(id => formData.append("regionIds", id));
```

### Filtering tradies by region

```js
const res = await api.get('/tradies', {
  params: { regionId: 'c3d4e5f6-a7b8-9012-cdef-123456789012', page: 1, limit: 20 }
});
```

---

## Notes for the Developer

- Always call `GET /regions` on app startup or before showing any region picker — do not hardcode region IDs
- The `id` (UUID) is what gets sent to the backend; `name` is display-only
- Results are already sorted alphabetically — no client-side sorting needed
- This module is structurally identical to the Categories module — same patterns apply
