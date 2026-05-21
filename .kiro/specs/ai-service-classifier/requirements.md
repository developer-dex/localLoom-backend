# Requirements Document

## Introduction

The AI Service Classifier feature adds a new backend module that interprets a user's free-text description of a service they need (for example, "I need a plumber to fix a leaking tap in Sydney") and maps it to two structured fields drawn from the existing LocalLoom catalogs:

1. `category` — the best-matching active service Category from the `categories` table.
2. `region` — the active Region from the `regions` table that the user explicitly mentioned in the prompt, or `null` if no region is mentioned.

Classification is performed by Anthropic's Claude Haiku model, accessed through the official `@anthropic-ai/sdk` Node package. The active Category and Region catalogs are injected into the model's system prompt so that the model is constrained to choose only from values that already exist in the database.

A single authenticated REST endpoint exposes this capability to the rest of the LocalLoom platform.

## Glossary

- **Classifier_API**: The HTTP endpoint `POST /api/v1/ai/classify-service` exposed by the new module.
- **Classifier_Service**: The backend service class that orchestrates catalog loading, prompt construction, Anthropic SDK invocation, and response parsing.
- **Anthropic_Client**: The wrapper around `@anthropic-ai/sdk` used by the Classifier_Service to call Claude Haiku.
- **Catalog_Loader**: The component that retrieves active Categories and Regions from the database for inclusion in the system prompt.
- **Classification_Result**: The JSON object `{ "category": string | null, "region": string | null }` returned to the API caller.
- **Category**: A row in the `categories` table where `is_active = true`. Identified to the model by its `name`.
- **Region**: A row in the `regions` table where `is_active = true`. Identified to the model by its `name`.
- **User_Prompt**: The free-text string supplied by the API caller describing the service they want.
- **System_Prompt**: The instruction text plus injected Category and Region catalog sent to Claude Haiku as the `system` parameter.
- **Model_Response**: The raw text returned by Claude Haiku for one classification call.
- **Authenticated_User**: A LocalLoom end-user who has presented a valid JWT access token via the existing user auth middleware.

## Requirements

### Requirement 1: Classify Service Endpoint

**User Story:** As an authenticated LocalLoom user, I want to submit a free-text description of the service I need and receive a structured category and region, so that the application can route my request to the right tradies without me filling in dropdowns manually.

#### Acceptance Criteria

1. THE Classifier_API SHALL accept HTTP `POST` requests at the path `/api/v1/ai/classify-service`.
2. THE Classifier_API SHALL accept a JSON request body with a single required string field named `prompt`.
3. WHEN a request to the Classifier_API completes successfully, THE Classifier_API SHALL respond with HTTP status `200` and a JSON body containing exactly two keys: `category` and `region`.
4. THE Classifier_API SHALL return the `category` value as either the `name` string of an active Category or `null`.
5. THE Classifier_API SHALL return the `region` value as either the `name` string of an active Region or `null`.
6. IF the request does not include a valid bearer token for an Authenticated_User, THEN THE Classifier_API SHALL respond with HTTP status `401` and SHALL NOT invoke the Anthropic_Client.

### Requirement 2: Request Validation

**User Story:** As a backend developer, I want the classify endpoint to reject malformed inputs before any model call is made, so that we do not waste Anthropic API quota on invalid traffic.

#### Acceptance Criteria

1. IF the request body is missing the `prompt` field, THEN THE Classifier_API SHALL respond with HTTP status `400` and a body whose `error.message` describes the missing field.
2. IF the `prompt` field is not a string, THEN THE Classifier_API SHALL respond with HTTP status `400`.
3. IF the `prompt` field is a string with length less than 1 character after trimming whitespace, THEN THE Classifier_API SHALL respond with HTTP status `400`.
4. IF the `prompt` field is a string with length greater than 2000 characters, THEN THE Classifier_API SHALL respond with HTTP status `400`.
5. WHEN the request body contains fields other than `prompt`, THE Classifier_API SHALL ignore those fields and SHALL process the request based solely on the `prompt` value.
6. IF request validation fails, THEN THE Classifier_API SHALL NOT invoke the Anthropic_Client.

### Requirement 3: Catalog Loading

**User Story:** As a backend developer, I want the classifier to use the live database catalog of categories and regions, so that newly added admin-managed entries are immediately classifiable without redeploying.

#### Acceptance Criteria

1. WHEN the Classifier_Service handles a request, THE Catalog_Loader SHALL retrieve every Category row where `is_active = true` and SHALL retrieve every Region row where `is_active = true`.
2. THE Catalog_Loader SHALL return Category data containing each Category's `name` and `description`.
3. THE Catalog_Loader SHALL return Region data containing each Region's `name`.
4. THE Catalog_Loader SHALL order Categories by `sort_order` ascending and then by `name` ascending.
5. THE Catalog_Loader SHALL order Regions by `name` ascending.
6. WHERE catalog caching is enabled by configuration, THE Catalog_Loader SHALL serve catalog data from an in-memory cache with a configurable time-to-live and SHALL refresh the cache when the time-to-live has elapsed.
7. IF a database error occurs while loading the catalog, THEN THE Classifier_Service SHALL respond with HTTP status `503` and SHALL NOT invoke the Anthropic_Client.

### Requirement 4: System Prompt Construction

**User Story:** As a backend developer, I want the system prompt to constrain Claude Haiku to choose only from our existing catalog, so that the model cannot return a category or region that does not exist in our database.

#### Acceptance Criteria

1. WHEN the Classifier_Service prepares a model call, THE Classifier_Service SHALL build a System_Prompt that contains the full list of active Category names loaded by the Catalog_Loader.
2. WHEN the Classifier_Service prepares a model call, THE Classifier_Service SHALL build a System_Prompt that contains the full list of active Region names loaded by the Catalog_Loader.
3. THE System_Prompt SHALL instruct the model to select the `category` value only from the provided Category list or to return `null`.
4. THE System_Prompt SHALL instruct the model to select the `region` value only from the provided Region list, to return `null` when the User_Prompt does not mention a Region, and to return `null` when the mentioned location does not match any provided Region.
5. THE System_Prompt SHALL instruct the model to respond with a single JSON object containing exactly the keys `category` and `region` and no surrounding prose, code fences, or commentary.
6. THE Classifier_Service SHALL send the User_Prompt as the user-role message and the System_Prompt as the `system` parameter on the Anthropic SDK call.

### Requirement 5: Anthropic SDK Integration

**User Story:** As a platform operator, I want the AI calls to use the official Anthropic SDK with configurable credentials and model name, so that we can rotate keys and upgrade models without code changes.

#### Acceptance Criteria

1. THE Anthropic_Client SHALL use the `@anthropic-ai/sdk` package to call the Anthropic Messages API.
2. THE Anthropic_Client SHALL read the API key from the environment variable `ANTHROPIC_API_KEY`.
3. THE Anthropic_Client SHALL read the model identifier from the environment variable `ANTHROPIC_CLASSIFIER_MODEL` and SHALL default to `claude-haiku-4-5` when the variable is not set.
4. THE Anthropic_Client SHALL set the `max_tokens` parameter to a configurable value with default `256`.
5. THE Anthropic_Client SHALL set the `temperature` parameter to a configurable value with default `0`.
6. THE Anthropic_Client SHALL apply a configurable request timeout with default `15` seconds to each Anthropic API call.
7. IF the environment variable `ANTHROPIC_API_KEY` is not set when the application starts, THEN THE backend SHALL log a configuration error at startup.
8. IF the Anthropic_Client receives a network error or timeout, THEN THE Classifier_Service SHALL respond with HTTP status `504`.
9. IF the Anthropic_Client receives an HTTP error response from the Anthropic API, THEN THE Classifier_Service SHALL respond with HTTP status `502`.

### Requirement 6: Response Parsing and Catalog Validation

**User Story:** As a backend developer, I want every model response to be validated against our catalog before being returned to the caller, so that callers can trust the result without re-checking it themselves.

#### Acceptance Criteria

1. WHEN the Anthropic_Client returns a Model_Response, THE Classifier_Service SHALL extract the text content of the first message block.
2. THE Classifier_Service SHALL parse the extracted text as JSON.
3. THE Classifier_Service SHALL accept a parsed JSON object that contains the keys `category` and `region` whose values are each either a string or `null`.
4. WHEN the parsed `category` value is a non-null string that case-insensitively matches the `name` of an active Category loaded by the Catalog_Loader, THE Classifier_Service SHALL set the response `category` to that Category's stored `name`.
5. WHEN the parsed `region` value is a non-null string that case-insensitively matches the `name` of an active Region loaded by the Catalog_Loader, THE Classifier_Service SHALL set the response `region` to that Region's stored `name`.
6. IF the parsed `category` value is `null` or does not match any active Category name, THEN THE Classifier_Service SHALL set the response `category` to `null`.
7. IF the parsed `region` value is `null` or does not match any active Region name, THEN THE Classifier_Service SHALL set the response `region` to `null`.
8. IF the Model_Response text is not valid JSON, THEN THE Classifier_Service SHALL retry the model call once with the same System_Prompt and User_Prompt.
9. IF the Model_Response text is still not valid JSON after one retry, THEN THE Classifier_Service SHALL respond with HTTP status `502` and a body whose `error.message` indicates an invalid model response.
10. IF the parsed JSON object does not contain both keys `category` and `region`, THEN THE Classifier_Service SHALL treat the response as invalid and apply the same retry behaviour described above.

### Requirement 7: Rate Limiting

**User Story:** As a platform operator, I want the classify endpoint to be rate-limited per authenticated user, so that a single account cannot exhaust our Anthropic budget.

#### Acceptance Criteria

1. THE Classifier_API SHALL enforce a per-Authenticated_User rate limit of a configurable number of requests within a configurable time window.
2. THE Classifier_API SHALL default the rate limit to 30 requests per 60 seconds per Authenticated_User.
3. IF an Authenticated_User exceeds the configured rate limit, THEN THE Classifier_API SHALL respond with HTTP status `429` and SHALL NOT invoke the Anthropic_Client.
4. WHERE the existing global rate limiter middleware is enabled, THE Classifier_API SHALL also be subject to that middleware.

### Requirement 8: Logging and Observability

**User Story:** As a backend developer, I want each classification request logged with enough detail to debug issues, while protecting user-supplied prompt content, so that I can investigate failures without leaking PII into logs.

#### Acceptance Criteria

1. WHEN the Classifier_Service handles a request, THE Classifier_Service SHALL log a structured entry containing the Authenticated_User identifier, the request identifier, the resolved model name, the response latency in milliseconds, and the classification outcome status.
2. THE Classifier_Service SHALL log the length in characters of the User_Prompt.
3. THE Classifier_Service SHALL NOT log the full text of the User_Prompt at log level `info` or below.
4. WHERE the environment variable `AI_CLASSIFIER_DEBUG_LOG_PROMPT` is set to `true`, THE Classifier_Service SHALL log the full User_Prompt at log level `debug`.
5. IF an Anthropic API call fails, THEN THE Classifier_Service SHALL log the failure at log level `error` with the Anthropic-provided error type and HTTP status code.
6. THE Classifier_Service SHALL NOT log the value of `ANTHROPIC_API_KEY`.

### Requirement 9: Module Layout and Routing

**User Story:** As a backend developer, I want the AI classifier to follow the existing module conventions, so that it is consistent with the rest of the codebase.

#### Acceptance Criteria

1. THE backend SHALL contain a new module directory at `src/modules/ai-classifier/`.
2. THE `ai-classifier` module SHALL export controller, service, validation, route, interface, and Swagger files following the same file naming pattern used by the existing `category` module.
3. THE v1 router at `src/routes/v1/index.ts` SHALL mount the `ai-classifier` routes at the path prefix `/ai`.
4. THE `ai-classifier` routes SHALL apply the existing user authentication middleware to every endpoint in the module.
5. THE Anthropic_Client SHALL be implemented as a separate file inside the `ai-classifier` module so that it can be replaced with a mock during testing.

### Requirement 10: Configuration

**User Story:** As a platform operator, I want the AI classifier's tunables exposed through environment variables, so that I can change behaviour per environment without code changes.

#### Acceptance Criteria

1. THE backend configuration loader SHALL read the variable `ANTHROPIC_API_KEY` and expose it to the Anthropic_Client.
2. THE backend configuration loader SHALL read the variable `ANTHROPIC_CLASSIFIER_MODEL` and SHALL default it to `claude-haiku-4-5`.
3. THE backend configuration loader SHALL read the variable `AI_CLASSIFIER_MAX_TOKENS` as an integer and SHALL default it to `256`.
4. THE backend configuration loader SHALL read the variable `AI_CLASSIFIER_TEMPERATURE` as a number between 0 and 1 inclusive and SHALL default it to `0`.
5. THE backend configuration loader SHALL read the variable `AI_CLASSIFIER_TIMEOUT_MS` as an integer and SHALL default it to `15000`.
6. THE backend configuration loader SHALL read the variable `AI_CLASSIFIER_RATE_LIMIT_MAX` as an integer and SHALL default it to `30`.
7. THE backend configuration loader SHALL read the variable `AI_CLASSIFIER_RATE_LIMIT_WINDOW_MS` as an integer and SHALL default it to `60000`.
8. THE backend configuration loader SHALL read the variable `AI_CLASSIFIER_CATALOG_CACHE_TTL_MS` as an integer and SHALL default it to `60000`.
9. THE `.env.example` file SHALL include every environment variable named in this requirement with an empty or default value and a short comment describing its purpose.

### Requirement 11: Error Response Format

**User Story:** As a frontend developer, I want classifier errors to follow the same error envelope used by the rest of the API, so that I can handle them with shared error-handling code.

#### Acceptance Criteria

1. WHEN the Classifier_API returns any HTTP error response, THE Classifier_API SHALL return a JSON body that conforms to the existing global error response envelope used by the other v1 modules.
2. THE Classifier_API error response body SHALL include a stable `error.code` value drawn from a defined set of codes for this module.
3. THE Classifier_API SHALL define at minimum the error codes `AI_CLASSIFIER_VALIDATION_ERROR`, `AI_CLASSIFIER_UNAUTHORIZED`, `AI_CLASSIFIER_RATE_LIMITED`, `AI_CLASSIFIER_PROVIDER_ERROR`, `AI_CLASSIFIER_PROVIDER_TIMEOUT`, `AI_CLASSIFIER_INVALID_MODEL_RESPONSE`, and `AI_CLASSIFIER_CATALOG_UNAVAILABLE`.

### Requirement 12: Empty Catalog Handling

**User Story:** As a platform operator, I want the classifier to fail safely when the database has no active categories or regions, so that we never call Anthropic with an empty catalog and get garbage results.

#### Acceptance Criteria

1. IF the Catalog_Loader returns zero active Categories, THEN THE Classifier_Service SHALL respond with HTTP status `503` and error code `AI_CLASSIFIER_CATALOG_UNAVAILABLE` and SHALL NOT invoke the Anthropic_Client.
2. WHEN the Catalog_Loader returns zero active Regions, THE Classifier_Service SHALL still invoke the Anthropic_Client with an empty Region list and SHALL always return `region` as `null` in the Classification_Result.
