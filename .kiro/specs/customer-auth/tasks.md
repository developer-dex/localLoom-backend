# Implementation Plan: Customer Authentication Flow

## Overview

Extend the existing `auth` module with customer signup, multi-channel OTP login, and OTP verification. Add an `EmailService`, migrate the `otp_codes` table to support email, and wire all new endpoints into the existing routes.

## Tasks

- [x] 1. Migrate database and update OtpCode model
  - [x] 1.1 Create migration `20260416100004-add-email-to-otp-codes.js`
    - Add `email VARCHAR(255) NULL` column after `phone` in `otp_codes`
    - Change `phone` column to `allowNull: true`
    - Add index on `otp_codes.email`
    - _Requirements: 4.2_
  - [x] 1.2 Update `OtpCode` model to declare optional `email` field
    - Add `email: DataTypes.STRING(255)` with `allowNull: true` to model attributes
    - Update `IOtpCodeAttributes` interface to include `email: string | null` and `phone: string | null`
    - _Requirements: 4.5_
  - [ ]* 1.3 Write property test for OTP channel exclusivity (Property 21)
    - **Property 21: OTP channel exclusivity invariant**
    - **Validates: Requirements 4.1**

- [x] 2. Add new DTOs, interfaces, and validation schemas
  - [x] 2.1 Add `UserSignupDto`, `UserLoginDto`, `UserVerifyOtpDto` to `auth.interface.ts`
    - _Requirements: 1.1, 2.1, 3.1_
  - [x] 2.2 Add `userSignupSchema`, `userLoginSchema`, `userVerifyOtpSchema` to `auth.validation.ts`
    - `fullName`: trim, min 2, max 100, required
    - `phone`: E.164 pattern, required
    - `role`: valid `'customer'` or `'tradie'`, required
    - `email`: optional valid email
    - `userLoginSchema`: conditional E.164 or email validation based on `identifierType`
    - `userVerifyOtpSchema`: `code` exactly 6 chars
    - _Requirements: 1.10, 1.11, 1.12, 1.13, 2.8, 2.9, 2.10, 3.12_
  - [ ]* 2.3 Write property tests for validation schemas (Properties 7, 8)
    - **Property 7: Invalid fullName is rejected**
    - **Property 8: Invalid phone format is rejected at signup and login**
    - **Validates: Requirements 1.10, 1.11, 2.9**

- [x] 3. Implement EmailService
  - [x] 3.1 Create `src/services/email.service.ts` with `sendOtp(email, code): Promise<boolean>`
    - If `EMAIL_HOST` / `EMAIL_USER` / `EMAIL_PASS` are set → use Nodemailer SMTP transport
    - Otherwise → log `[DEV] OTP for <email>: <code>` and return `true`
    - Email body must include the OTP code and "expires in 5 minutes" notice
    - On provider error: log and re-throw with descriptive message
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 3.2 Write property tests for EmailService (Properties 24, 25)
    - **Property 24: EmailService throws on provider error**
    - **Property 25: Email body contains OTP code and expiry notice**
    - **Validates: Requirements 5.4, 5.5**
  - [ ]* 3.3 Write unit tests for EmailService
    - Test dev mode (no credentials) returns true and logs
    - Test provider error throws with descriptive message
    - _Requirements: 5.3, 5.4_

- [x] 4. Extend AuthRepository with email OTP methods
  - [x] 4.1 Add `createOtpWithEmail`, `findLatestValidOtpByEmail`, `invalidateOtpsForEmail` to `auth.repository.ts`
    - `createOtpWithEmail`: insert record with `email` populated, `phone = NULL`
    - `findLatestValidOtpByEmail`: query by `email`, `purpose`, `isUsed = false`, `expiresAt > NOW()`
    - `invalidateOtpsForEmail`: set `isUsed = true` for all matching `email` + `purpose` unused records
    - _Requirements: 4.1, 4.3, 4.4_
  - [ ]* 4.2 Write property tests for email OTP repository methods (Properties 22, 23)
    - **Property 22: Email OTP lookup uses email field with correct filters**
    - **Property 23: Email OTP invalidation marks all prior unused records**
    - **Validates: Requirements 4.3, 4.4**

- [x] 5. Checkpoint — Ensure migration, model, validation, EmailService, and repository compile without errors

- [ ] 6. Implement `AuthService.userSignup`
  - [ ] 6.1 Add `userSignup(dto: UserSignupDto)` to `auth.service.ts`
    - Check for duplicate phone → throw 409 `'Phone number already registered'`
    - Check for duplicate email (if provided) → throw 409 `'Email already registered'`
    - Create user with `role`, `status = 'active'`, `isPhoneVerified = false`, map `fullName` → `name`, store `email` and `avatar` if provided
    - Generate OTP, store in `otp_codes` (phone channel), set `expiresAt = now + env.otp.expiryMinutes`, `max_attempts = 3`
    - Send via `SmsService`; on failure, fall back to `EmailService` if email provided, else re-throw
    - Return `{ phone, email? }`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_
  - [ ]* 6.2 Write property tests for `userSignup` (Properties 1–6, 13, 14)
    - **Property 1: Signup creates user with correct initial state**
    - **Property 2: Signup stores email when provided, NULL when absent**
    - **Property 3: Signup maps fullName to users.name**
    - **Property 4: Duplicate phone returns 409**
    - **Property 5: Duplicate email returns 409**
    - **Property 6: Signup response is 201 with no tokens**
    - **Property 13: OTP expiry is set to configured expiryMinutes**
    - **Property 14: OTP max_attempts is always 3**
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.5, 1.8, 1.9, 2.11, 2.12**
  - [ ]* 6.3 Write unit tests for `userSignup`
    - Duplicate phone, duplicate email, missing email, SMS failure with email fallback, SMS failure without fallback
    - _Requirements: 1.4, 1.5, 1.6, 1.7_

- [x] 7. Implement `AuthService.userLogin`
  - [x] 7.1 Add `userLogin(dto: UserLoginDto)` to `auth.service.ts`
    - Look up user by phone or email based on `identifierType`
    - Return 404 if not found with appropriate message
    - Return 403 if `status = 'suspended'` or `status = 'deleted'`
    - Invalidate existing unused OTPs for the identifier
    - Generate new OTP, store with correct channel (phone or email), `expiresAt`, `max_attempts = 3`
    - Send via `SmsService` (phone) or `EmailService` (email)
    - Return `{ identifierType, maskedIdentifier }`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.11, 2.12_
  - [ ]* 7.2 Write property tests for `userLogin` (Properties 9–14)
    - **Property 9: Login invalidates old OTPs and creates a new one**
    - **Property 10: Login for non-existent identifier returns 404**
    - **Property 11: Login for suspended or deleted account returns 403**
    - **Property 12: Login response contains masked identifier**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
  - [ ]* 7.3 Write unit tests for `userLogin`
    - Phone not found, email not found, suspended user, deleted user
    - _Requirements: 2.3, 2.4, 2.5, 2.6_

- [x] 8. Implement identifier masking utility
  - [x] 8.1 Add `maskPhone` and `maskEmail` helper functions to `src/common/utils/helpers.ts`
    - Phone: `+XX****YYYY` pattern
    - Email: `XX***@domain` pattern
    - _Requirements: 2.7_
  - [ ]* 8.2 Write property test for identifier masking (Property 12)
    - **Property 12: Login response contains masked identifier**
    - **Validates: Requirements 2.7**

- [x] 9. Implement `AuthService.userVerifyOtp`
  - [x] 9.1 Add `userVerifyOtp(dto: UserVerifyOtpDto)` to `auth.service.ts`
    - Dev mode bypass: if `!env.isProduction && code === env.otp.devCode`, skip DB OTP lookup
    - Look up valid OTP by identifier and `identifierType`; return 400 `'Invalid or expired OTP'` if none found
    - Check `expiresAt < now` → return 400 `'OTP has expired. Please request a new code'`
    - Check `attempts >= max_attempts` → return 400 `'Maximum OTP attempts exceeded. Please request a new code'`
    - Check code mismatch → increment `attempts`, return 400 `'Invalid or expired OTP'`
    - Mark OTP `isUsed = true`
    - If `identifierType = 'phone'`, set `users.isPhoneVerified = true`
    - Update `users.lastLogin` to now
    - Generate Token_Pair with payload `{ userId, role, userType: 'user' }`, sign with correct secrets/expiries, store `refreshToken`
    - Return `{ user, tokens: { accessToken, refreshToken } }`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_
  - [ ]* 9.2 Write property tests for `userVerifyOtp` (Properties 15–20)
    - **Property 15: Successful OTP verification returns Token_Pair and marks OTP used**
    - **Property 16: Wrong OTP code increments attempts by exactly 1**
    - **Property 17: Exhausted OTP attempts returns specific error without further increment**
    - **Property 18: Expired OTP returns expiry error**
    - **Property 19: Successful phone OTP verification sets isPhoneVerified = true**
    - **Property 20: JWT payload contains correct fields**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 3.8**
  - [ ]* 9.3 Write unit tests for `userVerifyOtp`
    - Wrong code, max attempts, expired OTP, dev mode bypass
    - _Requirements: 3.2, 3.3, 3.4, 3.11_

- [x] 10. Checkpoint — Ensure all service methods and utilities compile and unit tests pass

- [x] 11. Add controller methods and wire routes
  - [x] 11.1 Add `userSignup`, `userLogin`, `userVerifyOtp` methods to `auth.controller.ts`
    - `userSignup`: extract DTO from `req.body`, resolve `profilePhotoUrl` from `req.file`, call service, return 201
    - `userLogin`: extract DTO from `req.body`, call service, return 200
    - `userVerifyOtp`: extract DTO from `req.body`, call service, return 200
    - _Requirements: 1.1, 1.3, 1.8, 2.7, 3.1_
  - [x] 11.2 Register new routes in `auth.routes.ts`
    - `POST /signup` — multer upload (`profilePhoto`), `validate(userSignupSchema)`, `controller.userSignup`
    - `POST /login` — `authLimiter`, `validate(userLoginSchema)`, `controller.userLogin`
    - `POST /verify-otp` — `authLimiter`, `validate(userVerifyOtpSchema)`, `controller.userVerifyOtp`
    - Replace existing `/verify-otp` route if it conflicts with the new schema
    - _Requirements: 1.1, 2.1, 3.1_

- [x] 12. Add environment variable support for email config
  - [x] 12.1 Add `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` to `src/config/env.ts` and `.env.example`
    - All optional; absence triggers dev mode in `EmailService`
    - _Requirements: 5.2, 5.3_

- [x] 13. Extend token refresh and logout to handle suspended users
  - [x] 13.1 Update `AuthService.refreshToken` to check `status = 'suspended'` and return 403
    - _Requirements: 6.4_
  - [ ]* 13.2 Write property tests for refresh/logout (Properties 26–29)
    - **Property 26: Token refresh returns new Token_Pair for valid token**
    - **Property 27: Invalid or expired refresh token returns 401**
    - **Property 28: Logout sets refresh_token to NULL**
    - **Property 29: Suspended user cannot refresh token**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 14. Final checkpoint — Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use `fast-check` with `{ numRuns: 100 }` and tag format `// Feature: customer-auth, Property N: <text>`
- The existing `/verify-otp` route uses `phone` + `code`; the new `userVerifyOtpSchema` uses `identifier` + `identifierType` + `code` — reconcile or keep both during task 11.2
- `nodemailer` must be added to `package.json` dependencies before task 3
