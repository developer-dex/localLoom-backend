# Requirements Document

## Introduction

This document defines the requirements for the Customer Rating module in the LocalLoom backend. The module allows authenticated customers to submit ratings and optional comments for tradies they have previously contacted. Reviews require admin approval before becoming publicly visible. The module follows the existing controller → service → repository pattern and integrates with the existing `reviews` table, `Review` model, and `ContactLog` model.

## Glossary

- **Review_Controller**: The `ReviewController` class in `src/modules/review/review.controller.ts` that handles HTTP request/response for review endpoints.
- **Review_Service**: The `ReviewService` class in `src/modules/review/review.service.ts` that contains all business logic for review operations.
- **Review_Repository**: The `ReviewRepository` class in `src/modules/review/review.repository.ts` that performs all database queries for reviews.
- **Review_Validator**: The Joi validation schemas in `src/modules/review/review.validation.ts` that validate incoming request payloads.
- **Review**: A record in the `reviews` table representing a customer's rating and optional comment for a tradie.
- **Customer**: A user with `role = 'customer'` in the `users` table.
- **Tradie_Profile**: A record in the `tradie_profiles` table representing a tradie's business profile.
- **Contact_Log**: A record in the `contact_logs` table that tracks when a customer contacts a tradie, used to determine review eligibility.
- **Review_Status**: One of `'pending'`, `'approved'`, or `'rejected'` — the moderation state of a review.
- **Rating**: An integer value from 1 to 5 representing the customer's satisfaction score.

---

## Requirements

### Requirement 1: Submit a Review

**User Story:** As a customer, I want to submit a rating and optional comment for a tradie I have contacted, so that other customers can benefit from my experience.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/v1/reviews` with a valid `tradieProfileId`, `rating`, and optional `comment`, THE Review_Controller SHALL create a new Review record with `customerId` set to the authenticated user's ID, `status` set to `'pending'`, and the provided `rating` and `comment` values.
2. WHEN a review is successfully created, THE Review_Controller SHALL return HTTP 201 with the created Review object in the response body.
3. THE Review_Validator SHALL validate that `rating` is an integer between 1 and 5 inclusive.
4. THE Review_Validator SHALL validate that `tradieProfileId` is a valid UUID.
5. THE Review_Validator SHALL validate that `comment`, when provided, is a string with a maximum length of 1000 characters.
6. THE Review_Validator SHALL allow `comment` to be omitted or sent as an empty string.

---

### Requirement 2: Authentication and Authorization

**User Story:** As a system administrator, I want only authenticated customers to submit reviews, so that reviews are attributed to verified users.

#### Acceptance Criteria

1. THE Review_Controller SHALL require a valid JWT Bearer token on all review submission endpoints by using the `authenticateUser` middleware.
2. WHEN an authenticated user with `role` other than `'customer'` attempts to submit a review, THE Review_Service SHALL return a 403 Forbidden error with the message `'Only customers can submit reviews'`.
3. IF no valid Bearer token is provided in the request, THEN THE authenticateUser middleware SHALL return a 401 Unauthorized error with the message `'Authentication token is required'`.

---

### Requirement 3: Contact Eligibility Check

**User Story:** As a system administrator, I want customers to only review tradies they have contacted, so that reviews reflect genuine interactions.

#### Acceptance Criteria

1. WHEN a customer submits a review, THE Review_Service SHALL verify that a Contact_Log record exists with the customer's ID and the specified `tradieProfileId`.
2. IF no Contact_Log record exists for the customer and tradie combination, THEN THE Review_Service SHALL return a 403 Forbidden error with the message `'You can only review tradies you have contacted'`.
3. WHEN a Contact_Log record exists, THE Review_Service SHALL verify that the current time is at or after the `reviewEligibleAt` timestamp on the Contact_Log record.
4. IF the current time is before the `reviewEligibleAt` timestamp, THEN THE Review_Service SHALL return a 403 Forbidden error with the message `'You are not yet eligible to review this tradie'`.

---

### Requirement 4: Duplicate Review Prevention

**User Story:** As a system administrator, I want to prevent customers from submitting multiple reviews for the same tradie, so that ratings remain fair and unbiased.

#### Acceptance Criteria

1. WHEN a customer submits a review, THE Review_Service SHALL check whether a Review record already exists with the same `customerId` and `tradieProfileId`.
2. IF a Review record already exists for the customer and tradie combination, THEN THE Review_Service SHALL return a 409 Conflict error with the message `'You have already reviewed this tradie'`.

---

### Requirement 5: Tradie Profile Validation

**User Story:** As a developer, I want the system to validate that the target tradie profile exists and is approved, so that reviews are only submitted for valid tradies.

#### Acceptance Criteria

1. WHEN a customer submits a review, THE Review_Service SHALL verify that a Tradie_Profile record exists with the specified `tradieProfileId` and `profileStatus = 'approved'`.
2. IF no approved Tradie_Profile record exists for the specified `tradieProfileId`, THEN THE Review_Service SHALL return a 404 Not Found error with the message `'Tradie profile not found'`.

---

### Requirement 6: Retrieve Customer's Own Reviews

**User Story:** As a customer, I want to view the reviews I have submitted, so that I can track my feedback history.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/v1/reviews/my-reviews`, THE Review_Controller SHALL return a paginated list of Review records where `customerId` matches the authenticated user's ID.
2. THE Review_Controller SHALL accept optional `page` and `limit` query parameters for pagination, defaulting to `page = 1` and `limit = 20`.
3. THE Review_Controller SHALL include the associated Tradie_Profile `businessName` in each review item in the response.

---

### Requirement 7: Module Structure and Integration

**User Story:** As a developer, I want the review module to follow the established project conventions, so that the codebase remains consistent and maintainable.

#### Acceptance Criteria

1. THE review module SHALL be structured with separate files for routes (`review.routes.ts`), controller (`review.controller.ts`), service (`review.service.ts`), repository (`review.repository.ts`), validation (`review.validation.ts`), interface (`review.interface.ts`), and Swagger documentation (`review.swagger.ts`) inside `src/modules/review/`.
2. THE review module SHALL export its routes via an `index.ts` barrel file.
3. THE v1 route index (`src/routes/v1/index.ts`) SHALL mount the review routes at `/reviews`.
4. THE Review_Controller SHALL use the `asyncHandler` utility to wrap all route handlers.
5. THE Review_Controller SHALL use the `ApiResponse` utility class for all HTTP responses.
6. THE Review_Controller SHALL use the `validate` middleware with Joi schemas for request validation.
7. THE review module SHALL include Swagger JSDoc annotations for all endpoints.
