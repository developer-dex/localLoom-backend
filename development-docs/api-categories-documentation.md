# LocalLoom — Categories API Documentation
## Public Categories Module

> **Base URL:** `{{BASE_URL}}/api/v1`
> All responses are `application/json`.
> No authentication required for any endpoint in this module.

---

## Overview

The Categories module exposes service categories used throughout the app — for example "Plumbing", "Electrical", "Carpentry". These are used when:
- A tradie sets up their business profile (`categoryIds` field)
- A customer filters the tradie listing by category

Both endpoints are fully public — no `Authorization` header needed.

---

## Response Envelope

All responses follow this shape:

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { ... }
}
```

Error shape:
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Category Object

Every category response returns objects with these fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique category ID — use this as `categoryIds` value when setting up a tradie profile |
| `name` | string | Category display name e.g. `"Plumbing"` |
| `icon` | string \| null | URL or icon identifier for the category image |
| `description` | string \| null | Optional description of the category |
| `isActive` | boolean | Always `true` — inactive categories are filtered out server-side |
| `sortOrder` | number | Display order (ascending) — use this to sort the list in UI |
| `createdAt` | string (ISO 8601) | Creation timestamp |
| `updatedAt` | string (ISO 8601) | Last update timestamp |

---

## Endpoints

---

### 1. GET /categories

Returns all active categories, ordered by `sortOrder` ascending then `name` ascending.

**Auth:** None required

**Query Params:** None

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Categories fetched",
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Plumbing",
      "icon": "https://example.com/api/v1/uploads/category/plumbing.jpg",
      "description": "All plumbing related services",
      "isActive": true,
      "sortOrder": 1,
      "createdAt": "2026-04-15T10:00:00.000Z",
      "updatedAt": "2026-04-15T10:00:00.000Z"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "name": "Electrical",
      "icon": "https://example.com/api/v1/uploads/category/electrical.jpg",
      "description": null,
      "isActive": true,
      "sortOrder": 2,
      "createdAt": "2026-04-15T10:00:00.000Z",
      "updatedAt": "2026-04-15T10:00:00.000Z"
    }
  ]
}
```

> `data` is an array. It will be an empty array `[]` if no active categories exist.

#### Error Responses

| Status | Message |
|--------|---------|
| 500 | Internal server error |

---

### 2. GET /categories/:id

Returns a single active category by its UUID.

**Auth:** None required

#### URL Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | ✅ | The category's UUID |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Category fetched",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Plumbing",
    "icon": "https://example.com/api/v1/uploads/category/plumbing.jpg",
    "description": "All plumbing related services",
    "isActive": true,
    "sortOrder": 1,
    "createdAt": "2026-04-15T10:00:00.000Z",
    "updatedAt": "2026-04-15T10:00:00.000Z"
  }
}
```

#### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"id" must be a valid GUID` — invalid UUID format |
| 404 | `"Category not found"` — ID doesn't exist or category is inactive |

---

## Usage in React Native

### Fetch all categories (e.g. for a picker/dropdown)

```js
const response = await fetch(`${BASE_URL}/api/v1/categories`);
const { data: categories } = await response.json();
// categories is Category[]
// Use category.id as the value, category.name as the label
```

### Fetch a single category

```js
const response = await fetch(`${BASE_URL}/api/v1/categories/${categoryId}`);
const { data: category } = await response.json();
```

### Passing categoryIds to tradie profile setup

```js
// After user selects categories from the list:
const selectedIds = ["a1b2c3d4-...", "b2c3d4e5-..."];

// Send as comma-separated string in multipart/form-data:
formData.append("categoryIds", selectedIds.join(","));

// OR append each ID individually:
selectedIds.forEach(id => formData.append("categoryIds", id));
```

---

## Notes for the Developer

- Always call `GET /categories` on app startup or before showing any category picker — do not hardcode category IDs
- The `id` (UUID) is what gets sent to the backend; `name` and `icon` are display-only
- Results are already sorted by `sortOrder` — no client-side sorting needed
- `icon` may be a full URL or null — handle both cases in the UI
