# LocalLoom — Implementation Plan

Step-by-step implementation plan for the LocalLoom backend.
Each phase builds on the previous one. No phase should start until the prior phase is fully tested.

Reference docs:
- `development-docs/database-models.md` — 19 database tables
- `development-docs/api-list.md` — all API endpoints and Socket.IO events

---

## SMS/OTP Provider: Twilio Verify

For sending OTP SMS to Australian phone numbers, we will use **Twilio Verify API**.

**Why Twilio:**
- Native Australia support with local phone numbers and high delivery rates
- Twilio Verify is a purpose-built OTP service (handles code generation, delivery, rate limiting, and verification)
- ACMA (Australian Communications and Media Authority) compliant
- Official Node.js SDK: `npm install twilio`
- Pay-as-you-go pricing: ~$0.05 per verification (SMS to Australia)
- Built-in fraud protection and rate limiting
- Supports SMS, WhatsApp, and voice fallback channels

**npm package:** `twilio` (official SDK)

**Environment variables needed:**
```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid
```

**Note:** In development mode, we will skip actual SMS sending and use a hardcoded OTP (e.g., `123456`) to avoid burning Twilio credits during development. This is controlled via `NODE_ENV`.

---

## Phase 0: Project Cleanup & Foundation Reset

**Goal:** Clean up the existing codebase to match the new LocalLoom domain. Remove old models/modules that don't apply, update enums, update env config.

### 0.1 Update enums to match new roles
- `roles.enum.ts` → `UserRole`: `customer`, `tradie` (remove `user`, `admin`, `super_admin` — admins are separate)
- Add `AdminRole` enum: `admin`, `super_admin`
- `status.enum.ts` → keep `AccountStatus`, `ChatStatus`, `MessageStatus`, `MessageType` as-is
- Add new enums: `ProfileStatus` (pending, approved, rejected, suspended), `ReviewStatus` (pending, approved, rejected), `OtpPurpose` (login, verify_phone)

### 0.2 Update env config
- Add Twilio env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`
- Add OTP config: `OTP_EXPIRY_MINUTES` (default 5), `OTP_MAX_ATTEMPTS` (default 3)
- Update `.env`, `.env.example`

### 0.3 Update common interfaces
- `AuthPayload` → add `userType` field ('user' | 'admin') to distinguish JWT tokens from users vs admins
- Update `AuthenticatedRequest` accordingly

### 0.4 Remove old models that will be replaced
- Remove `conversation-participant.model.ts` (conversations are now 1:1, no join table)
- Remove `message-read.model.ts` (read status tracked on message directly)
- Keep `user.model.ts`, `conversation.model.ts`, `message.model.ts` — will be rewritten

### 0.5 Delete old migration files
- Remove all existing migration files in `src/database/migrations/`
- We will create fresh migrations in Phase 1

---

## Phase 1: Database Models & Migrations

**Goal:** Create all 19 Sequelize models and migration files. No API code yet — just the data layer.

### 1.1 Core models (no FK dependencies)
Create models + migrations in this order:
1. `users` — rewrite existing model (phone-based, no password, add overall_rating)
2. `admins` — new model (email + password auth)
3. `otp_codes` — new model (OTP storage)
4. `categories` — new model
5. `regions` — new model

### 1.2 Models with single FK dependency
6. `suburbs` — FK → regions
7. `tradie_profiles` — FK → users

### 1.3 Join tables and dependent models
8. `tradie_services` — FK → tradie_profiles, categories
9. `tradie_suburbs` — FK → tradie_profiles, suburbs
10. `tradie_work_photos` — FK → tradie_profiles
11. `contact_logs` — FK → users, tradie_profiles
12. `reviews` — FK → users, tradie_profiles, admins
13. `favourites` — FK → users, tradie_profiles
14. `profile_visits` — FK → tradie_profiles, users

### 1.4 Notification & device models
15. `notifications` — FK → users
16. `device_tokens` — FK → users

### 1.5 Chat models (rewrite existing)
17. `conversations` — rewrite (1:1 customer↔tradie, FK → users, messages)
18. `messages` — rewrite (FK → conversations, users)

### 1.6 Reports
19. `reports` — FK → users, admins

### 1.7 Set up associations in `src/models/index.ts`
- Define all belongsTo, hasMany, belongsToMany relationships
- Export all models and types

### 1.8 Run migrations and verify
```bash
npm run db:migrate
```

---

## Phase 2: Auth Module — User (Phone + OTP)

**Goal:** Implement phone + OTP authentication for customers and tradies.

### 2.1 Install Twilio SDK
```bash
npm install twilio
```

### 2.2 Create SMS service
- `src/services/sms.service.ts` — wraps Twilio Verify API
- Methods: `sendOtp(phone)`, `verifyOtp(phone, code)`
- In development mode: skip Twilio, accept `123456` as valid OTP

### 2.3 Build auth module (8 files)
```
src/modules/auth/
├── auth.interface.ts      # SendOtpDto, VerifyOtpDto, TokenPair
├── auth.validation.ts     # Joi schemas for send-otp, verify-otp, refresh-token
├── auth.controller.ts     # sendOtp, verifyOtp, refreshToken, logout, getProfile
├── auth.service.ts        # OTP logic, JWT generation, user creation on first login
├── auth.repository.ts     # User + OtpCode queries
├── auth.routes.ts         # POST /send-otp, POST /verify-otp, POST /refresh-token, POST /logout, GET /profile
├── auth.swagger.ts        # Swagger docs
└── index.ts               # Barrel export
```

### 2.4 Auth flow implementation
1. `POST /send-otp` → validate phone → create OTP record → send SMS via Twilio
2. `POST /verify-otp` → validate phone + code → check expiry + attempts → if valid:
   - If user exists: generate tokens, return `isNewUser: false`
   - If user doesn't exist: create user with phone + default role, generate tokens, return `isNewUser: true`
3. `POST /refresh-token` → verify refresh token → generate new token pair
4. `POST /logout` → clear refresh token
5. `GET /profile` → return current user

### 2.5 Update middleware
- Update `authenticate` middleware to handle both user and admin JWT tokens
- Add `authenticateAdmin` middleware for admin routes

### 2.6 Register routes
- Add to `src/routes/v1/index.ts`

### 2.7 Test all auth endpoints manually

---

## Phase 3: Auth Module — Admin (Email + Password)

**Goal:** Implement email + password authentication for admins.

### 3.1 Build admin-auth module (8 files)
```
src/modules/admin-auth/
├── admin-auth.interface.ts
├── admin-auth.validation.ts
├── admin-auth.controller.ts
├── admin-auth.service.ts
├── admin-auth.repository.ts
├── admin-auth.routes.ts
├── admin-auth.swagger.ts
└── index.ts
```

### 3.2 Endpoints
- `POST /api/admin/auth/login` — email + password → JWT tokens
- `POST /api/admin/auth/refresh-token`
- `POST /api/admin/auth/logout`
- `GET /api/admin/auth/profile`
- `PATCH /api/admin/auth/change-password`

### 3.3 Create seed script for initial super_admin
- `src/database/seeders/YYYYMMDD-create-super-admin.js`
- Creates a default super_admin account

### 3.4 Register routes
- Add to `src/routes/admin/index.ts`

---

## Phase 4: User Module

**Goal:** User profile management for customers and tradies.

### 4.1 Rewrite user module (8 files)
- `GET /me` — get my details
- `PATCH /me` — update first_name, last_name, email
- `PATCH /me/avatar` — upload avatar (multer)
- `DELETE /me` — soft-delete (set status to 'deleted')

### 4.2 Register routes

---

## Phase 5: Category Module

**Goal:** Public category listing + admin CRUD.

### 5.1 Build category module (8 files)
```
src/modules/category/
```

### 5.2 Public endpoints
- `GET /api/v1/categories` — list active categories
- `GET /api/v1/categories/:id` — get by ID

### 5.3 Build admin-categories module (8 files)
```
src/modules/admin-categories/
```

### 5.4 Admin endpoints
- `GET /api/admin/categories` — list all (including inactive)
- `POST /api/admin/categories` — create (auto-generate slug)
- `PATCH /api/admin/categories/:id` — update
- `DELETE /api/admin/categories/:id` — soft-delete (set is_active = false)

### 5.5 Register routes

---

## Phase 6: Region Module

**Goal:** Public region listing + admin CRUD. Tradies select regions they service (not individual suburbs).

### 6.1 Build region module (8 files)
```
src/modules/region/
```

### 6.2 Public endpoints
- `GET /api/v1/regions` — list all active regions
- `GET /api/v1/regions/:id` — get region by ID

### 6.3 Build admin-regions module (8 files)
```
src/modules/admin-regions/
```

### 6.4 Admin endpoints
- `GET /api/admin/regions` — list all regions (including inactive)
- `POST /api/admin/regions` — create a region
- `PATCH /api/admin/regions/:id` — update region
- `DELETE /api/admin/regions/:id` — soft-delete region

### 6.5 Create seed data
- Seed the 4 Melbourne regions: Northern Melbourne, South East Melbourne, Western Melbourne, Eastern Melbourne
- Only Northern Melbourne is `is_active: true` initially (others are `is_active: true` but marked "Coming soon" at API level)

### 6.6 Register routes

---

## Phase 7: Tradie Profile Module

**Goal:** Tradie profile creation, management, and public browsing. This is the largest module.

### 7.1 Build tradie module (8 files)
```
src/modules/tradie/
```

### 7.2 Public endpoints (no auth)
- `GET /api/v1/tradies` — list with filters (category, region, rating, availability, emergency availability)
- `GET /api/v1/tradies/:id` — get public profile (increment visit count, hide contact until logged in)
- `GET /api/v1/tradies/:id/reviews` — get approved reviews
- `GET /api/v1/tradies/:id/work-photos` — get work photos

### 7.3 Customer endpoints
- `GET /api/v1/tradies/:id/contact` — view contact details (creates contact_log)

### 7.4 Tradie self-management endpoints
- `GET /me/profile`, `POST /me/profile`, `PATCH /me/profile`
- `POST /me/profile/services` — set categories (max 6)
- `POST /me/profile/regions` — set service regions (multiple, only Northern Melbourne selectable initially)
- `POST /me/profile/work-photos` — upload photos (max 20, multer)
- `DELETE /me/profile/work-photos/:photoId`
- `POST /me/profile/insurance` — upload insurance document
- `GET /me/profile/stats` — visit count + rating stats
- `PATCH /me/profile/availability` — toggle availability + emergency availability
- `POST /me/profile/abn-lookup` — validate ABN via ABN Lookup API

### 7.5 Build admin-tradies module (8 files)
```
src/modules/admin-tradies/
```

### 7.6 Admin endpoints
- List, view, approve, reject, suspend, verify-license, verify-insurance, simulated-visits

### 7.7 Register routes

---

## Phase 8: Favourites Module

**Goal:** Customers can save/remove favourite tradies.

### 8.1 Build favourite module (8 files)
```
src/modules/favourite/
```

### 8.2 Endpoints
- `GET /api/v1/favourites` — list my favourites
- `POST /api/v1/tradies/:id/favourite` — add (handled in tradie routes)
- `DELETE /api/v1/tradies/:id/favourite` — remove (handled in tradie routes)

### 8.3 Register routes

---

## Phase 9: Review Module

**Goal:** Customer reviews with admin approval workflow.

### 9.1 Build review module (8 files)
```
src/modules/review/
```

### 9.2 Customer endpoints
- `POST /api/v1/reviews` — submit review (validate: contact_log exists, 7hr elapsed, no existing review)
- `GET /api/v1/reviews/my-reviews` — list my reviews
- `GET /api/v1/reviews/eligibility/:tradieId` — check eligibility

### 9.3 Build admin-reviews module (8 files)
```
src/modules/admin-reviews/
```

### 9.4 Admin endpoints
- List, view, approve (recalculate overall_rating), reject

### 9.5 Rating recalculation logic
- On review approval: query all approved reviews for the tradie → compute AVG(rating) → update `users.overall_rating`

### 9.6 Register routes

---

## Phase 10: Chat Module (REST + Socket.IO)

**Goal:** 1:1 chat between customer and tradie with real-time messaging.

### 10.1 Rewrite chat module for 1:1 conversations
- Simplify from the existing group-chat model to 1:1 (customer_id + tradie_id)
- Remove ConversationParticipant and MessageRead models (no longer needed)

### 10.2 REST endpoints (8 files)
```
src/modules/chat/
```
- `POST /conversations` — create or get existing conversation
- `GET /conversations` — list my conversations
- `GET /conversations/:id` — get conversation
- `POST /messages` — send message (REST fallback)
- `GET /conversations/:id/messages` — get messages (paginated)
- `PATCH /conversations/:id/read` — mark as read

### 10.3 Socket.IO handlers
Update existing socket handlers to work with the new 1:1 conversation model:

```
src/socket/
├── index.ts                    # Socket.IO init, online tracking
├── socket.middleware.ts        # JWT auth for socket connections
├── socket.types.ts             # Typed events
└── handlers/
    ├── chat.handler.ts         # chat:join, chat:leave, chat:send-message, chat:typing, chat:mark-read
    └── notification.handler.ts # notification room join
```

### 10.4 Socket events
- `chat:join` / `chat:leave` — join/leave conversation room
- `chat:send-message` — send message with ACK callback
- `chat:message` — broadcast to conversation room
- `chat:typing` / `chat:stop-typing` — typing indicators
- `chat:mark-read` → `chat:read` — read receipts
- `chat:online-status` — online/offline tracking

### 10.5 Register routes

---

## Phase 11: Notification Module

**Goal:** In-app notifications with real-time push via Socket.IO.

### 11.1 Build notification module (8 files)
```
src/modules/notification/
```

### 11.2 REST endpoints
- `GET /notifications` — list (paginated)
- `GET /notifications/unread-count`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`

### 11.3 Notification service
- `createNotification(userId, type, title, body, data)` — creates DB record + emits via Socket.IO
- Used by other modules (review approved, profile approved, chat message, etc.)

### 11.4 Socket.IO integration
- `notification:new` event emitted to `user:<userId>` room

### 11.5 Register routes

---

## Phase 12: Device Token Module

**Goal:** Register/remove FCM/APNs tokens for push notifications.

### 12.1 Build device module (8 files)
```
src/modules/device/
```

### 12.2 Endpoints
- `POST /api/v1/devices` — register token
- `DELETE /api/v1/devices` — remove token (on logout)

### 12.3 Register routes

---

## Phase 13: Report Module

**Goal:** Users can report inappropriate content.

### 13.1 Build report module (8 files)
```
src/modules/report/
```

### 13.2 User endpoint
- `POST /api/v1/reports` — submit report

### 13.3 Build admin-reports module (8 files)
```
src/modules/admin-reports/
```

### 13.4 Admin endpoints
- List, view, resolve, dismiss

### 13.5 Register routes

---

## Phase 14: Admin Dashboard Module

**Goal:** Dashboard statistics and activity feed.

### 14.1 Build admin-dashboard module (8 files)
```
src/modules/admin-dashboard/
```

### 14.2 Endpoints
- `GET /api/admin/dashboard/stats` — total users, tradies, reviews, conversations, etc.
- `GET /api/admin/dashboard/recent-activity` — recent signups, reviews, reports

### 14.3 Build admin-users module (8 files)
```
src/modules/admin-users/
```

### 14.4 Admin user management endpoints
- `GET /api/admin/users` — list all users
- `GET /api/admin/users/:id` — get user details
- `PATCH /api/admin/users/:id/status` — update status

### 14.5 Register routes

---

## Phase 15: Background Jobs (Cron Tasks)

**Goal:** Scheduled tasks for review reminders and cleanup.

### 15.1 Install node-cron
```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

### 15.2 Create job runner
```
src/jobs/
├── index.ts                    # Register all cron jobs
├── review-reminder.job.ts      # Send review reminders (24h, 48h, 72h)
├── otp-cleanup.job.ts          # Delete expired/used OTPs
└── rating-recalculation.job.ts # Recalculate ratings (fallback, normally done on approval)
```

### 15.3 Review reminder job (runs every hour)
- Query `contact_logs` where:
  - `contacted_at + 24h < NOW()` AND `reminder_24h_sent = false` → send notification, set flag
  - `contacted_at + 48h < NOW()` AND `reminder_48h_sent = false` → send notification, set flag
  - `contacted_at + 72h < NOW()` AND `reminder_72h_sent = false` → send notification, set flag
- Uses the notification service from Phase 11

### 15.4 OTP cleanup job (runs every hour)
- Delete records from `otp_codes` where `expires_at < NOW()` OR `is_used = true`

### 15.5 Initialize jobs in `server.ts`

---

## Phase 16: File Upload (S3 or Local)

**Goal:** Centralized file upload handling for avatars, work photos, licenses, insurance docs.

### 16.1 Update upload middleware
- Support both local storage (development) and S3 (production)
- File types: images (JPEG, PNG, WebP), documents (PDF), video (MP4 for intro video)
- Size limits: images 5MB, documents 10MB, video 50MB

### 16.2 Create upload service
```
src/services/upload.service.ts
```
- `uploadImage(file)` → returns URL
- `uploadDocument(file)` → returns URL
- `uploadVideo(file)` → returns URL
- `deleteFile(url)` → removes from storage

### 16.3 Add S3 env vars (optional, for production)
```
AWS_S3_BUCKET=
AWS_S3_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

---

## Phase 17: Final Integration & Testing

### 17.1 End-to-end flow testing
1. Customer registers via OTP → browses tradies → views contact → writes review
2. Tradie registers via OTP → creates profile → uploads photos/docs → waits for approval
3. Admin logs in → approves tradie → approves review → manages categories/locations
4. Customer ↔ Tradie chat via Socket.IO
5. Review reminders fire at correct intervals
6. Notifications delivered in real-time

### 17.2 Update Swagger documentation
- Ensure all modules have complete swagger annotations
- Test via `/api-docs`

### 17.3 Update README.md
- New API endpoints table
- Updated environment variables
- New migration commands
- OTP auth flow documentation

### 17.4 Docker Compose verification
- Verify `docker-compose.dev.yml` works with PostgreSQL
- Test full stack: API + PostgreSQL + Socket.IO

---

## Implementation Order Summary

| Phase | Module                        | Dependencies              | Estimated Effort |
|-------|-------------------------------|---------------------------|------------------|
| 0     | Cleanup & Foundation Reset    | —                         | Small            |
| 1     | Database Models & Migrations  | Phase 0                   | Large            |
| 2     | Auth — User (Phone + OTP)     | Phase 1                   | Medium           |
| 3     | Auth — Admin (Email + Pass)   | Phase 1                   | Medium           |
| 4     | User Module                   | Phase 2                   | Small            |
| 5     | Category Module               | Phase 3                   | Small            |
| 6     | Region Module               | Phase 3, 5                | Small            |
| 7     | Tradie Profile Module         | Phase 4, 5, 6             | Large            |
| 8     | Favourites Module             | Phase 7                   | Small            |
| 9     | Review Module                 | Phase 7                   | Medium           |
| 10    | Chat Module (REST + Socket)   | Phase 2                   | Large            |
| 11    | Notification Module           | Phase 2                   | Medium           |
| 12    | Device Token Module           | Phase 2                   | Small            |
| 13    | Report Module                 | Phase 2, 3                | Small            |
| 14    | Admin Dashboard & Users       | Phase 3                   | Medium           |
| 15    | Background Jobs               | Phase 9, 11               | Medium           |
| 16    | File Upload Service           | Phase 4                   | Medium           |
| 17    | Integration & Testing         | All phases                | Medium           |

---

## New npm Packages Required

| Package          | Purpose                                    | Install Command                          |
|------------------|--------------------------------------------|------------------------------------------|
| `twilio`         | SMS OTP via Twilio Verify API              | `npm install twilio`                     |
| `node-cron`      | Scheduled background jobs                  | `npm install node-cron`                  |
| `@types/node-cron` | TypeScript types for node-cron           | `npm install --save-dev @types/node-cron`|
| `aws-sdk` or `@aws-sdk/client-s3` | S3 file uploads (production) | `npm install @aws-sdk/client-s3`    |

Existing packages that stay: `express`, `sequelize`, `pg`, `jsonwebtoken`, `joi`, `bcrypt`, `socket.io`, `multer`, `helmet`, `cors`, `compression`, `morgan`, `winston`, `swagger-jsdoc`, `swagger-ui-express`, `express-rate-limit`, `cookie-parser`, `uuid`
