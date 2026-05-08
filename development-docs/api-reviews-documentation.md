# LocalLoom — Reviews API Documentation
## Customer Reviews Module (Rating & Comments)

> **Base URL:** `{{BASE_URL}}/api/v1`
> All requests/responses are `application/json`.
> All endpoints require authentication.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Business Rules](#business-rules)
4. [Endpoints](#endpoints)
   - [POST /reviews](#1-post-reviews)
   - [GET /reviews/my-reviews](#2-get-reviewsmy-reviews)
5. [Data Objects](#data-objects)
6. [Error Reference](#error-reference)
7. [Usage Flow](#usage-flow)

---

## Overview

The Reviews module allows authenticated customers to submit a one-time rating (1-5) and optional comment for tradies they have previously contacted. Reviews go through admin moderation before becoming publicly visible.

Key rules:
- Only customers can submit reviews (not tradies)
- A customer can only review a tradie they have contacted (via `GET /tradies/:id/contact`)
- A customer can only submit ONE review per tradie (no duplicates)
- Reviews start with status `"pending"` and become `"approved"` or `"rejected"` by admin
- Only approved reviews are visible publicly on the tradie's profile

---

## Authentication

All endpoints require:
```
Authorization: Bearer <accessToken>
```

The user must have `role: "customer"`.

---

## Business Rules

### Contact Eligibility
Before a customer can review a tradie, they must have:
1. Viewed the tradie's contact details (`GET /tradies/:id/contact`) — this creates a contact log
2. Waited until the `reviewEligibleAt` time has passed (7 hours after contact)

### One Review Per Tradie
Each customer can only submit one review per tradie. Attempting a second review returns a 409 Conflict.

### Review Moderation
- New reviews are created with `status: "pending"`
- Admin approves or rejects reviews
- Only `"approved"` reviews appear on the tradie's public profile
- The customer can see all their own reviews regardless of status

---

## Endpoints

---

### 1. POST /reviews

Submit a rating and optional comment for a tradie.

**Auth:** Required (customer role only)

**Content-Type:** `application/json`

#### Request Body

```json
{
  "tradieProfileId": "uuid-of-tradie-profile",
  "rating": 5,
  "comment": "Excellent work, very professional and on time!"
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `tradieProfileId` | string (UUID) | Yes | Valid UUID | The tradie profile to review |
| `rating` | number (integer) | Yes | 1-5 inclusive | Rating score |
| `comment` | string | No | max 1000 chars, can be empty string | Optional review text |

#### Success Response — `201 Created`

```json
{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "id": "uuid-review-id",
    "customerId": "uuid-customer-id",
    "tradieProfileId": "uuid-tradie-profile-id",
    "rating": 5,
    "comment": "Excellent work, very professional and on time!",
    "status": "pending",
    "rejectionReason": null,
    "reviewedByAdmin": null,
    "reviewedAt": null,
    "createdAt": "2026-05-05T10:00:00.000Z",
    "updatedAt": "2026-05-05T10:00:00.000Z"
  }
}
```

##### Review Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique review ID |
| `customerId` | string (UUID) | The customer who submitted the review |
| `tradieProfileId` | string (UUID) | The tradie profile being reviewed |
| `rating` | number | Rating 1-5 |
| `comment` | string or null | Review comment text |
| `status` | string | `"pending"`, `"approved"`, or `"rejected"` |
| `rejectionReason` | string or null | Reason if rejected by admin |
| `reviewedByAdmin` | string (UUID) or null | Admin who moderated the review |
| `reviewedAt` | string (ISO 8601) or null | When admin moderated |
| `createdAt` | string (ISO 8601) | Submission timestamp |
| `updatedAt` | string (ISO 8601) | Last update timestamp |

#### Error Responses

| Status | Message | When |
|--------|---------|------|
| 400 | `"rating" must be an integer between 1 and 5` | Invalid rating value |
| 400 | `"tradieProfileId" must be a valid GUID` | Invalid UUID |
| 400 | `"comment" must be less than or equal to 1000 characters` | Comment too long |
| 401 | `"Authentication token is required"` | No/invalid token |
| 403 | `"Only customers can submit reviews"` | User role is not customer |
| 403 | `"You can only review tradies you have contacted"` | No contact log exists |
| 403 | `"You are not yet eligible to review this tradie"` | Contact too recent (< 7 hours) |
| 404 | `"Tradie profile not found"` | Profile doesn't exist or not approved |
| 409 | `"You have already reviewed this tradie"` | Duplicate review attempt |

---

### 2. GET /reviews/my-reviews

Get the authenticated customer's own submitted reviews (all statuses).

**Auth:** Required (customer role only)

#### Query Parameters

| Param | Type | Required | Default | Constraints | Description |
|-------|------|----------|---------|-------------|-------------|
| `page` | number | No | 1 | min 1 | Page number |
| `limit` | number | No | 20 | 1-50 | Items per page |

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Reviews fetched",
  "data": [
    {
      "id": "uuid-review-id",
      "customerId": "uuid-customer-id",
      "tradieProfileId": "uuid-tradie-profile-id",
      "rating": 5,
      "comment": "Excellent work!",
      "status": "approved",
      "rejectionReason": null,
      "reviewedByAdmin": "uuid-admin-id",
      "reviewedAt": "2026-05-06T08:00:00.000Z",
      "createdAt": "2026-05-05T10:00:00.000Z",
      "updatedAt": "2026-05-06T08:00:00.000Z",
      "tradieProfile": {
        "businessName": "Smith Plumbing"
      }
    },
    {
      "id": "uuid-review-id-2",
      "customerId": "uuid-customer-id",
      "tradieProfileId": "uuid-tradie-profile-id-2",
      "rating": 3,
      "comment": "Average service",
      "status": "pending",
      "rejectionReason": null,
      "reviewedByAdmin": null,
      "reviewedAt": null,
      "createdAt": "2026-05-04T14:00:00.000Z",
      "updatedAt": "2026-05-04T14:00:00.000Z",
      "tradieProfile": {
        "businessName": "Jones Electrical"
      }
    }
  ],
  "meta": {
    "total": 2,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

##### My Reviews Item Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Review ID |
| `customerId` | string (UUID) | Your user ID |
| `tradieProfileId` | string (UUID) | Tradie profile ID |
| `rating` | number | Your rating (1-5) |
| `comment` | string or null | Your comment |
| `status` | string | `"pending"`, `"approved"`, or `"rejected"` |
| `rejectionReason` | string or null | Why admin rejected (if applicable) |
| `reviewedByAdmin` | string or null | Admin who reviewed |
| `reviewedAt` | string or null | When admin reviewed |
| `createdAt` | string (ISO 8601) | When you submitted |
| `updatedAt` | string (ISO 8601) | Last update |
| `tradieProfile.businessName` | string | The tradie's business name for display |

#### Error Responses

| Status | Message |
|--------|---------|
| 401 | Missing or invalid token |
| 403 | User role is not customer |

---

## Data Objects

### Review Status Flow

```
Customer submits → status: "pending"
                        ↓
            Admin reviews the submission
                   ↙         ↘
    status: "approved"    status: "rejected"
    (visible publicly)    (rejectionReason set)
```

---

## Error Reference

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Bad Request — validation failed |
| 401 | Unauthorized — missing or invalid token |
| 403 | Forbidden — wrong role, no contact, or not yet eligible |
| 404 | Not Found — tradie profile doesn't exist or not approved |
| 409 | Conflict — already reviewed this tradie |
| 500 | Internal Server Error |

---

## Usage Flow for React Native

### Complete Review Flow

```
Step 1 — Customer views tradie contact (creates eligibility)
GET /api/v1/tradies/:tradieId/contact
  Header: Authorization: Bearer <token>
  → This creates a contact_log with reviewEligibleAt = now + 7 hours

Step 2 — Wait for eligibility (7 hours after contact)

Step 3 — Submit review
POST /api/v1/reviews
  Header: Authorization: Bearer <token>
  Body:
    tradieProfileId: "uuid"
    rating: 5
    comment: "Great work!"

  → Response 201: review created with status "pending"

Step 4 — View my reviews
GET /api/v1/reviews/my-reviews?page=1&limit=10
  Header: Authorization: Bearer <token>
  → Shows all submitted reviews with their moderation status
```

### React Native Code Examples

#### Submit a review
```js
const submitReview = async (tradieProfileId, rating, comment) => {
  const response = await api.post('/reviews', {
    tradieProfileId,
    rating,
    comment: comment || undefined  // omit if empty
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};
```

#### Get my reviews (paginated)
```js
const getMyReviews = async (page = 1, limit = 20) => {
  const response = await api.get('/reviews/my-reviews', {
    params: { page, limit },
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data; // { data: Review[], meta: { total, page, limit, totalPages } }
};
```

#### Check if user can review (client-side logic)
```js
// After calling GET /tradies/:id/contact, store the contact time
// The user becomes eligible to review 7 hours later
const canReview = (contactedAt) => {
  const eligibleAt = new Date(new Date(contactedAt).getTime() + 7 * 60 * 60 * 1000);
  return new Date() >= eligibleAt;
};
```

#### Handle review submission errors
```js
try {
  await submitReview(tradieId, rating, comment);
  // Success — show confirmation
} catch (error) {
  const msg = error.response?.data?.message;
  switch (error.response?.status) {
    case 403:
      if (msg.includes('not yet eligible')) {
        // Show "Please wait before reviewing" message
      } else if (msg.includes('only review tradies you have contacted')) {
        // Show "You need to contact this tradie first"
      } else {
        // Show "Only customers can submit reviews"
      }
      break;
    case 409:
      // Show "You have already reviewed this tradie"
      break;
    case 404:
      // Show "Tradie not found"
      break;
  }
}
```

---

## Notes for the Developer

- The `tradieProfileId` is the tradie's profile UUID (from `GET /tradies` list or `GET /tradies/:id`)
- Rating is an integer 1-5, not a decimal — validate on client side before sending
- Comment is optional — you can omit it entirely or send an empty string
- After submission, the review status is always `"pending"` — inform the user their review is under moderation
- Use `GET /reviews/my-reviews` to show the user their review history with status badges (pending/approved/rejected)
- The 7-hour eligibility window starts from when the customer first views the tradie's contact details
- If a review is rejected, `rejectionReason` will contain the admin's explanation — display this to the user
