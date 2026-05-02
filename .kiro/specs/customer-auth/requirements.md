# Requirements Document

## Introduction

This document defines the requirements for the Customer Authentication Flow in the LocalLoom backend. The flow covers three sequential steps: customer signup (creating a new account with phone as the primary identifier), login (initiating OTP delivery to phone or email), and OTP verification (confirming the code and issuing JWT tokens). The feature extends the existing auth module, which already supports phone+OTP and email+password flows, to add a dedicated customer-facing signup endpoint and multi-channel (SMS or email) OTP delivery for login.

## Glossary

- **Auth_Service**: The `AuthService` class in `src/modules/auth/auth.service.ts` responsible for all authentication business logic.
- **Auth_Controller**: The `AuthController` class in `src/modules/auth/auth.controller.ts` that handles HTTP request/response for auth endpoints.
- **Auth_Repository**: The `AuthRepository` class in `src/modules/auth/auth.repository.ts` that performs all database queries for auth.
- **OTP**: One-Time Password — a 6-digit numeric code used to verify ownership of a phone number or email address.
- **OTP_Code**: A record in the `otp_codes` table storing a generated OTP, its target (phone or email), purpose, expiry, and attempt count.
- **Customer**: A user with `role = 'customer'` in the `users` table.
- **SMS_Service**: The `SmsService` class in `src/services/sms.service.ts` that delivers OTP codes via Twilio SMS.
- **Email_Service**: A new service responsible for delivering OTP codes via email (e.g., using Nodemailer or SendGrid).
- **JWT**: JSON Web Token — a signed token used for stateless authentication.
- **Token_Pair**: An object containing an `accessToken` and a `refreshToken`, both JWTs.
- **Identifier**: The value used to identify a user during login — either a phone number (E.164 format) or an email address.
- **Identifier_Type**: A string discriminator sent by the frontend indicating whether the login identifier is `'phone'` or `'email'`.
- **Profile_Photo**: An optional image file uploaded during signup, stored as a URL in `users.avatar`.
- **E.164**: International phone number format, e.g., `+61412345678`.

---

## Requirements

### Requirement 1: Customer Signup

**User Story:** As a new customer, I want to register with my phone number and full name so that I can create an account and receive an OTP to verify my identity.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/auth/signup` with a valid `fullName`, `phone`, and `role`, THE Auth_Controller SHALL create a new user record with the submitted `role` (`'customer'` or `'tradie'`), `status = 'active'`, and `isPhoneVerified = false`.
2. WHEN a signup request includes an `email` field, THE Auth_Service SHALL store the email on the user record; WHEN no `email` is provided, THE Auth_Service SHALL leave `users.email` as NULL.
3. WHEN a signup request includes a `profilePhoto` file, THE Auth_Controller SHALL store the uploaded file URL in `users.avatar`; WHEN no `profilePhoto` is provided, THE Auth_Service SHALL leave `users.avatar` as NULL.
4. WHEN a signup request is received with a `phone` that already exists in the `users` table, THE Auth_Service SHALL return a 409 Conflict error with the message `'Phone number already registered'`.
5. WHEN a signup request is received with an `email` that already exists in the `users` table, THE Auth_Service SHALL return a 409 Conflict error with the message `'Email already registered'`.
6. WHEN a new customer user is successfully created, THE Auth_Service SHALL send an OTP to the provided `phone` via SMS_Service using the `'login'` purpose.
7. WHEN a new customer user is successfully created and an `email` was provided but the phone OTP delivery fails, THE Auth_Service SHALL attempt to send the OTP to the `email` via Email_Service as a fallback.
8. WHEN the signup OTP is sent successfully, THE Auth_Controller SHALL return HTTP 201 with the `phone` (and `email` if provided) in the response body, without returning JWT tokens.
9. THE Auth_Service SHALL map the `fullName` request field to the `users.name` column.
10. THE Auth_Controller SHALL validate that `fullName` is a non-empty string between 2 and 100 characters.
11. THE Auth_Controller SHALL validate that `phone` matches the E.164 format pattern `^\+[1-9]\d{6,14}$`.
12. WHERE `email` is provided in the signup request, THE Auth_Controller SHALL validate that `email` is a valid email address format.
13. THE Auth_Controller SHALL validate that `role` is one of `'customer'` or `'tradie'`.

---

### Requirement 2: Customer Login (OTP Initiation)

**User Story:** As a registered customer, I want to log in using my phone number or email address so that I receive an OTP to verify my identity.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/auth/login` with `identifier` and `identifierType = 'phone'`, THE Auth_Service SHALL invalidate any existing unused OTPs for that phone with purpose `'login'`, generate a new 6-digit OTP, store it in `otp_codes` with the `phone` field populated, and send it via SMS_Service.
2. WHEN a POST request is made to `/api/auth/login` with `identifier` and `identifierType = 'email'`, THE Auth_Service SHALL invalidate any existing unused OTPs for that email with purpose `'login'`, generate a new 6-digit OTP, store it in `otp_codes` with the `email` field populated, and send it via Email_Service.
3. WHEN a login request is received with `identifierType = 'phone'` and the phone does not exist in the `users` table, THE Auth_Service SHALL return a 404 Not Found error with the message `'No account found with this phone number'`.
4. WHEN a login request is received with `identifierType = 'email'` and the email does not exist in the `users` table, THE Auth_Service SHALL return a 404 Not Found error with the message `'No account found with this email address'`.
5. WHEN a login request is received for a user whose `status = 'suspended'`, THE Auth_Service SHALL return a 403 Forbidden error with the message `'Account has been suspended'`.
6. WHEN a login request is received for a user whose `status = 'deleted'`, THE Auth_Service SHALL return a 403 Forbidden error with the message `'Account has been deleted'`.
7. WHEN the OTP is sent successfully, THE Auth_Controller SHALL return HTTP 200 with the `identifierType` and masked identifier (e.g., `+61****5678` for phone, `us***@example.com` for email) in the response body.
8. THE Auth_Controller SHALL validate that `identifierType` is one of the values `'phone'` or `'email'`.
9. WHEN `identifierType = 'phone'`, THE Auth_Controller SHALL validate that `identifier` matches the E.164 format pattern `^\+[1-9]\d{6,14}$`.
10. WHEN `identifierType = 'email'`, THE Auth_Controller SHALL validate that `identifier` is a valid email address format.
11. THE Auth_Service SHALL set the OTP expiry to the value configured in `env.otp.expiryMinutes` (default 5 minutes) from the time of generation.
12. THE Auth_Service SHALL set `otp_codes.max_attempts` to 3 for all generated OTPs.

---

### Requirement 3: OTP Verification and Token Issuance

**User Story:** As a customer who has received an OTP, I want to submit the code so that I receive JWT access and refresh tokens to authenticate subsequent requests.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/auth/verify-otp` with a valid `identifier`, `identifierType`, and matching `code`, THE Auth_Service SHALL mark the OTP record as `isUsed = true` and return a Token_Pair along with the user object.
2. WHEN the submitted `code` does not match the stored OTP, THE Auth_Service SHALL increment `otp_codes.attempts` by 1 and return a 400 Bad Request error with the message `'Invalid or expired OTP'`.
3. WHEN `otp_codes.attempts` reaches `otp_codes.max_attempts` before a correct code is submitted, THE Auth_Service SHALL return a 400 Bad Request error with the message `'Maximum OTP attempts exceeded. Please request a new code'` without incrementing attempts further.
4. WHEN the OTP record's `expiresAt` is earlier than the current time, THE Auth_Service SHALL return a 400 Bad Request error with the message `'OTP has expired. Please request a new code'`.
5. WHEN `identifierType = 'phone'` and OTP verification succeeds, THE Auth_Service SHALL set `users.isPhoneVerified = true` for the matching user.
6. WHEN OTP verification succeeds, THE Auth_Service SHALL update `users.lastLogin` to the current timestamp.
7. WHEN OTP verification succeeds, THE Auth_Service SHALL generate a Token_Pair using the user's `id`, `role`, and `userType = 'user'` as the JWT payload, and store the `refreshToken` in `users.refresh_token`.
8. WHEN the `accessToken` is generated, THE Auth_Service SHALL sign it with `env.jwt.accessSecret` and set expiry to `env.jwt.accessExpiry`.
9. WHEN the `refreshToken` is generated, THE Auth_Service SHALL sign it with `env.jwt.refreshSecret` and set expiry to `env.jwt.refreshExpiry`.
10. IF no valid (unused, non-expired) OTP record exists for the given identifier and purpose `'login'`, THEN THE Auth_Service SHALL return a 400 Bad Request error with the message `'Invalid or expired OTP'`.
11. WHEN `env.isProduction` is false and the submitted `code` equals `env.otp.devCode`, THE Auth_Service SHALL bypass the database OTP lookup and proceed directly to token issuance (dev mode bypass).
12. THE Auth_Controller SHALL validate that `identifierType` is one of `'phone'` or `'email'`, `identifier` is non-empty, and `code` is exactly 6 characters.

---

### Requirement 4: OTP Code Database Schema Extension

**User Story:** As a developer, I want the `otp_codes` table to support email-based OTP delivery so that customers who log in with email can receive OTPs.

#### Acceptance Criteria

1. THE Auth_Repository SHALL support creating OTP records with either a `phone` value or an `email` value, where the unused field is NULL.
2. WHEN a new migration is created to add an `email` column to `otp_codes`, THE migration SHALL add `email VARCHAR(255) NULL` without modifying any existing migration files.
3. THE Auth_Repository SHALL query `otp_codes` by `email` (instead of `phone`) when `identifierType = 'email'`, using the same `purpose`, `isUsed = false`, and `expiresAt > NOW()` filters.
4. THE Auth_Repository SHALL invalidate existing unused OTPs by `email` when a new email-based OTP is requested, setting `isUsed = true` for all matching records.
5. THE OtpCode model SHALL declare an optional `email` field of type `DataTypes.STRING(255)` with `allowNull: true`.

---

### Requirement 5: Email OTP Delivery Service

**User Story:** As a developer, I want an Email_Service that can send OTP codes via email so that customers who register or log in with email receive their verification codes.

#### Acceptance Criteria

1. THE Email_Service SHALL expose a `sendOtp(email: string, code: string): Promise<boolean>` method.
2. WHEN email provider credentials are configured in environment variables, THE Email_Service SHALL deliver the OTP code to the specified email address using the configured provider.
3. WHEN email provider credentials are not configured, THE Email_Service SHALL log the OTP code to the console and return `true` (dev mode).
4. WHEN email delivery fails due to a provider error, THE Email_Service SHALL log the error and throw an exception with a descriptive message.
5. THE Email_Service SHALL include the OTP code and an expiry notice (e.g., "expires in 5 minutes") in the email body.

---

### Requirement 6: Token Refresh and Logout (Customer)

**User Story:** As an authenticated customer, I want to refresh my access token and log out so that my session remains secure.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/auth/refresh-token` with a valid `refreshToken` JWT, THE Auth_Service SHALL verify the token signature using `env.jwt.refreshSecret`, look up the user by `userId` from the token payload, and return a new Token_Pair.
2. IF the `refreshToken` is invalid, expired, or the user no longer exists, THEN THE Auth_Service SHALL return a 401 Unauthorized error with the message `'Invalid token'`.
3. WHEN a POST request is made to `/api/auth/logout` by an authenticated customer, THE Auth_Service SHALL set `users.refresh_token` to NULL for that user.
4. WHILE a user's `status = 'suspended'`, THE Auth_Service SHALL reject token refresh requests with a 403 Forbidden error with the message `'Account has been suspended'`.
