# Implementation Plan: AI Service Classifier

## Overview

Implement the `ai-classifier` module at `src/modules/ai-classifier/` exposing `POST /api/v1/ai/classify-service`. The module uses Anthropic Claude Haiku to classify free-text service descriptions into structured `{ category, region }` pairs validated against the active database catalogs. Implementation follows the existing module conventions (controller, service, routes, validation, interfaces, errors) and wires into the v1 router.

## Tasks

- [x] 1. Set up module structure, interfaces, errors, and configuration
  - [x] 1.1 Create `src/modules/ai-classifier/ai-classifier.interface.ts` with `ClassifyRequestBody`, `ClassificationResult`, `CatalogCategory`, `CatalogRegion`, `CatalogSnapshot` interfaces
    - _Requirements: 1.3, 1.4, 1.5, 3.2, 3.3, 9.1, 9.2_
  - [x] 1.2 Create `src/modules/ai-classifier/ai-classifier.errors.ts` with `AiClassifierErrorCode` enum, `AiClassifierException` base class, and specific error classes (`AiCatalogUnavailableError`, `AiProviderTimeoutError`, `AiProviderError`, `AiInvalidModelResponseError`)
    - _Requirements: 11.2, 11.3_
  - [x] 1.3 Add AI classifier environment variables to the config loader (`src/config/env.ts`) under `env.aiClassifier` namespace with Joi validation and defaults
    - Add `ANTHROPIC_API_KEY`, `ANTHROPIC_CLASSIFIER_MODEL`, `AI_CLASSIFIER_MAX_TOKENS`, `AI_CLASSIFIER_TEMPERATURE`, `AI_CLASSIFIER_TIMEOUT_MS`, `AI_CLASSIFIER_RATE_LIMIT_MAX`, `AI_CLASSIFIER_RATE_LIMIT_WINDOW_MS`, `AI_CLASSIFIER_CATALOG_CACHE_TTL_MS`, `AI_CLASSIFIER_DEBUG_LOG_PROMPT`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_
  - [x] 1.4 Append AI classifier variables to `.env.example` with comments describing each variable's purpose
    - _Requirements: 10.9_

- [x] 2. Implement catalog loader and prompt builder (pure/data layer)
  - [x] 2.1 Create `src/modules/ai-classifier/catalog-loader.ts` implementing the `CatalogLoader` interface with Sequelize queries for active categories (ordered by `sortOrder` ASC, `name` ASC) and active regions (ordered by `name` ASC), with configurable in-memory TTL cache and single-flight refresh
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [x] 2.2 Create `src/modules/ai-classifier/prompt-builder.ts` implementing `buildClassifierSystemPrompt(catalog)` pure function that renders the system prompt template with category names/descriptions and region names, handling empty region list gracefully
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 2.3 Create `src/modules/ai-classifier/response-parser.ts` implementing `parseAndValidateModelResponse(rawText, catalog)` with JSON parsing, shape validation (must have `category` and `region` keys with string|null values), and case-insensitive catalog matching using lowercased lookup maps
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  - [ ]* 2.4 Write unit tests for `prompt-builder.ts`
    - Test that all category names and descriptions appear in output
    - Test empty region list renders "(no regions configured)"
    - Test deterministic output for same input
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ]* 2.5 Write unit tests for `response-parser.ts`
    - Test valid JSON parsing, shape validation, case-insensitive matching
    - Test invalid JSON throws, missing keys throws, non-matching values map to null
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  - [ ]* 2.6 Write property test for response shape (Property 1)
    - **Property 1: Response shape is exact**
    - For any valid parsed model response, the result has exactly `category` and `region` keys with string|null values
    - **Validates: Requirements 1.3, 6.3**
  - [ ]* 2.7 Write property test for case-insensitive catalog matching (Property 5)
    - **Property 5: Catalog matching is case-insensitive and symmetric**
    - For any catalog and any case-variant of a catalog name, the parser resolves to the canonical name; non-matching strings resolve to null
    - **Validates: Requirements 6.4, 6.5, 6.6, 6.7**

- [x] 3. Implement Anthropic SDK wrapper
  - [x] 3.1 Create `src/modules/ai-classifier/anthropic-client.ts` implementing the `AnthropicClassifierClient` interface with `createAnthropicClassifierClient(options)` factory function wrapping `@anthropic-ai/sdk`, including `normalizeAnthropicError` mapping SDK errors to module-specific error classes
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8, 5.9_
  - [x] 3.2 Install `@anthropic-ai/sdk` package dependency
    - _Requirements: 5.1_

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement service orchestration layer
  - [x] 5.1 Create `src/modules/ai-classifier/ai-classifier.service.ts` implementing `AiClassifierService` with dependency-injected `catalogLoader`, `anthropicClient`, and `logger`; orchestrate catalog loading, empty-catalog guard, prompt construction, Anthropic call, response parsing with one-retry on invalid JSON, structured logging, and error mapping
    - _Requirements: 1.3, 3.7, 4.6, 5.7, 6.1, 6.8, 6.9, 6.10, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 12.1, 12.2_
  - [ ]* 5.2 Write property test for catalog-valid category (Property 2)
    - **Property 2: Returned category is catalog-valid or null**
    - For any successful classify call with a mocked Anthropic client, the returned category is null or matches an active category name
    - **Validates: Requirements 1.4, 6.6**
  - [ ]* 5.3 Write property test for catalog-valid region (Property 3)
    - **Property 3: Returned region is catalog-valid or null**
    - For any successful classify call, the returned region is null or matches an active region name; when regions are empty, region is always null
    - **Validates: Requirements 1.5, 6.7, 12.2**
  - [ ]* 5.4 Write property test for empty-categories catalog (Property 6)
    - **Property 6: Empty-categories catalog yields 503**
    - When active categories is empty or catalog loader throws, the service responds 503 with `AI_CLASSIFIER_CATALOG_UNAVAILABLE` and does not invoke Anthropic
    - **Validates: Requirements 3.7, 12.1**
  - [ ]* 5.5 Write property test for JSON-retry path (Property 7)
    - **Property 7: JSON-retry path is bounded and deterministic in outcome**
    - For scripted (s1, s2) pairs where s1 is invalid JSON: if s2 is valid, returns 200; if s2 is also invalid, returns 502; Anthropic is called exactly twice
    - **Validates: Requirements 6.8, 6.9, 6.10**
  - [ ]* 5.6 Write property test for provider failure mapping (Property 8)
    - **Property 8: Provider failures map to documented HTTP statuses**
    - Timeout/connection errors → 504 `AI_CLASSIFIER_PROVIDER_TIMEOUT`; HTTP errors → 502 `AI_CLASSIFIER_PROVIDER_ERROR`
    - **Validates: Requirements 5.8, 5.9, 11.3**
  - [ ]* 5.7 Write property test for prompt logging (Property 12)
    - **Property 12: Prompt length is logged but full prompt is not at info level**
    - INFO log entries contain `promptLength` but no field contains the full prompt text (when debug logging is off)
    - **Validates: Requirements 8.2, 8.3**

- [x] 6. Implement validation, rate limiter, controller, and routes
  - [x] 6.1 Create `src/modules/ai-classifier/ai-classifier.validation.ts` with Joi schema for `ClassifyRequestBody` (prompt: required string, trimmed, min 1, max 2000, stripUnknown)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 6.2 Create `src/modules/ai-classifier/ai-classifier.rate-limiter.ts` using `express-rate-limit` keyed by authenticated user ID with configurable max/window from env, returning 429 with `AI_CLASSIFIER_RATE_LIMITED` error code
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 6.3 Create `src/modules/ai-classifier/ai-classifier.controller.ts` with `AiClassifierController` class adapting Express req/res to the service layer, using `asyncHandler` and `ApiResponse.success`
    - _Requirements: 1.3, 9.2_
  - [x] 6.4 Create `src/modules/ai-classifier/ai-classifier.routes.ts` mounting `authenticateUser` → `aiClassifierRateLimiter` → `validate` → `controller.classify` on `POST /classify-service`
    - _Requirements: 1.1, 1.6, 9.4_
  - [x] 6.5 Create `src/modules/ai-classifier/index.ts` barrel file exporting `aiClassifierRoutes` and key classes
    - _Requirements: 9.2_
  - [x] 6.6 Mount the ai-classifier routes in `src/routes/v1/index.ts` at path prefix `/ai`
    - _Requirements: 9.3_
  - [x] 6.7 Extend the global error handler to forward `error.code` field from `AiClassifierException` into the error envelope
    - _Requirements: 11.1, 11.2_

- [x] 7. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Integration tests and remaining property tests
  - [ ]* 8.1 Write property test for validation rejection (Property 4)
    - **Property 4: Validation rejects non-conforming bodies without invoking Anthropic**
    - For any invalid prompt body (missing, wrong type, empty after trim, >2000 chars), endpoint returns 400 and Anthropic client is never called
    - **Validates: Requirements 1.2, 2.1, 2.2, 2.3, 2.4, 2.6**
  - [ ]* 8.2 Write property test for auth gate (Property 9)
    - **Property 9: Auth gate is enforced before any external call**
    - Requests without valid bearer token get 401; Anthropic client and catalog loader are not invoked
    - **Validates: Requirements 1.6, 9.4**
  - [ ]* 8.3 Write property test for per-user rate limit (Property 10)
    - **Property 10: Per-user rate limit is enforced before any external call**
    - After exceeding rate limit, subsequent requests get 429 and Anthropic client is not invoked
    - **Validates: Requirements 7.1, 7.2, 7.3**
  - [ ]* 8.4 Write property test for extra fields ignored (Property 11)
    - **Property 11: Extra request fields are ignored, not rejected**
    - Requests with extra fields beyond `prompt` behave identically to requests with only `prompt`
    - **Validates: Requirement 2.5**
  - [ ]* 8.5 Write integration tests using supertest covering the full middleware stack
    - Test successful classification, all error codes from the error mapping table, auth rejection, rate limiting, and validation errors
    - _Requirements: 1.1, 1.6, 2.1, 5.8, 5.9, 7.3, 11.1, 11.2, 11.3_

- [x] 9. Swagger documentation
  - [x] 9.1 Create `src/modules/ai-classifier/ai-classifier.swagger.ts` with JSDoc-style swagger annotations for the classify-service endpoint documenting request body, success response, and all error responses
    - _Requirements: 9.2_

- [ ] 10. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with mocked Anthropic client for deterministic execution
- The Anthropic client interface enables full testability without network calls
- Checkpoints ensure incremental validation throughout implementation
