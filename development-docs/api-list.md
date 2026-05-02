# LocalLoom — API List (Module-wise)

Base URL: `/api/v1`
Admin URL: `/api/admin`

Auth: Bearer JWT token (unless marked Public)
User Auth: Phone number + OTP (no password for customers/tradies)
Admin Auth: Email + password
Roles: `customer`, `tradie`, `admin`, `super_admin`

---

## 1. Auth Module — Users (`/api/v1/auth`)

Phone + OTP based authentication for customers and tradies.

| Method | Endpoint                  | Auth     | Description                              |
|--------|---------------------------|----------|------------------------------------------|
| POST   | /send-otp                 | Public   | Send OTP to phone number (for login or signup) |
| POST   | /verify-otp               | Public   | Verify OTP and get tokens (creates user if first time) |
| POST   | /refresh-token            | Public   | Refresh access token                     |
| POST   | /logout                   | Yes      | Logout (invalidate refresh token)        |
| GET    | /profile                  | Yes      | Get current user profile                 |

### Auth Flow

1. User enters phone number → `POST /send-otp` → OTP sent via SMS
2. User enters OTP → `POST /verify-otp` → returns JWT tokens
   - If phone is new: creates user record, returns `isNewUser: true` (client redirects to profile setup)
   - If phone exists: logs in, returns `isNewUser: false`
3. For tradies: after first login, they complete profile setup via the Tradie Profile module

---

## 2. Auth Module — Admin (`/api/admin/auth`)

Email + password based authentication for admins.

| Method | Endpoint                  | Auth     | Description                              |
|--------|---------------------------|----------|------------------------------------------|
| POST   | /login                    | Public   | Admin login with email + password        |
| POST   | /refresh-token            | Public   | Refresh admin access token               |
| POST   | /logout                   | Admin    | Admin logout                             |
| GET    | /profile                  | Admin    | Get current admin profile                |
| PATCH  | /change-password          | Admin    | Change admin password                    |

---

## 3. User Module (`/api/v1/users`)

| Method | Endpoint                  | Auth     | Description                              |
|--------|---------------------------|----------|------------------------------------------|
| GET    | /me                       | Yes      | Get my details                           |
| PATCH  | /me                       | Yes      | Update my profile (first_name, last_name, email) |
| PATCH  | /me/avatar                | Yes      | Upload/update avatar                     |
| DELETE | /me                       | Yes      | Soft-delete my account                   |

---

## 4. Category Module (`/api/v1/categories`)

| Method | Endpoint                  | Auth     | Description                              |
|--------|---------------------------|----------|------------------------------------------|
| GET    | /                         | Public   | List all active categories               |
| GET    | /:id                      | Public   | Get category by ID                       |

---

## 5. Region & Suburb Module (`/api/v1/locations`)

| Method | Endpoint                  | Auth     | Description                              |
|--------|---------------------------|----------|------------------------------------------|
| GET    | /regions                  | Public   | List all active regions                  |
| GET    | /regions/:id/suburbs      | Public   | List suburbs in a region                 |
| GET    | /suburbs                  | Public   | List/search all suburbs                  |
| GET    | /suburbs/:id              | Public   | Get suburb details                       |

---

## 6. Tradie Profile Module (`/api/v1/tradies`)

### Public (browsing without login)

| Method | Endpoint                  | Auth     | Description                              |
|--------|---------------------------|----------|------------------------------------------|
| GET    | /                         | Public   | Search/list tradies (filter by category, suburb, region, radius, keyword) |
| GET    | /:id                      | Public   | Get tradie public profile (increments visit count) |
| GET    | /:id/reviews              | Public   | Get approved reviews for a tradie        |
| GET    | /:id/work-photos          | Public   | Get tradie work photos                   |

### Authenticated (customer actions)

| Method | Endpoint                  | Auth     | Role     | Description                              |
|--------|---------------------------|----------|----------|------------------------------------------|
| GET    | /:id/contact              | Yes      | Customer | View tradie contact details (creates contact_log, triggers review eligibility timer) |
| POST   | /:id/favourite            | Yes      | Customer | Add tradie to favourites                 |
| DELETE | /:id/favourite            | Yes      | Customer | Remove tradie from favourites            |

### Tradie own profile management

| Method | Endpoint                  | Auth     | Role     | Description                              |
|--------|---------------------------|----------|----------|------------------------------------------|
| GET    | /me/profile               | Yes      | Tradie   | Get my tradie profile                    |
| POST   | /me/profile               | Yes      | Tradie   | Create my tradie profile (initial setup) |
| PATCH  | /me/profile               | Yes      | Tradie   | Update my tradie profile                 |
| POST   | /me/profile/services      | Yes      | Tradie   | Set my service categories (max 6)        |
| POST   | /me/profile/suburbs       | Yes      | Tradie   | Set my service suburbs (max 10)          |
| POST   | /me/profile/work-photos   | Yes      | Tradie   | Upload work photos (max 20)              |
| DELETE | /me/profile/work-photos/:photoId | Yes | Tradie | Delete a work photo                     |
| POST   | /me/profile/license       | Yes      | Tradie   | Upload license document                  |
| POST   | /me/profile/insurance     | Yes      | Tradie   | Upload insurance document                |
| GET    | /me/profile/stats         | Yes      | Tradie   | Get profile visit count, rating stats    |
| PATCH  | /me/profile/availability  | Yes      | Tradie   | Toggle availability on/off               |

---

## 7. Favourites Module (`/api/v1/favourites`)

| Method | Endpoint                  | Auth     | Role     | Description                              |
|--------|---------------------------|----------|----------|------------------------------------------|
| GET    | /                         | Yes      | Customer | List my favourite tradies                |

---

## 8. Review Module (`/api/v1/reviews`)

| Method | Endpoint                  | Auth     | Role     | Description                              |
|--------|---------------------------|----------|----------|------------------------------------------|
| POST   | /                         | Yes      | Customer | Submit a review for a tradie (requires contact_log + 7hr elapsed) |
| GET    | /my-reviews               | Yes      | Customer | List reviews I've written                |
| GET    | /eligibility/:tradieId    | Yes      | Customer | Check if I can review this tradie (has contact_log, 7hr passed, no existing review) |

---

## 9. Chat Module (`/api/v1/chat`)

| Method | Endpoint                              | Auth | Description                              |
|--------|---------------------------------------|------|------------------------------------------|
| POST   | /conversations                        | Yes  | Create/get conversation with a tradie    |
| GET    | /conversations                        | Yes  | List my conversations                    |
| GET    | /conversations/:conversationId        | Yes  | Get conversation details                 |
| POST   | /messages                             | Yes  | Send a message (REST fallback)           |
| GET    | /conversations/:conversationId/messages | Yes | Get messages (paginated)               |
| PATCH  | /conversations/:conversationId/read   | Yes  | Mark messages as read                    |

### Socket.IO Events

| Event                 | Direction       | Description                    |
|-----------------------|-----------------|--------------------------------|
| `chat:join`           | Client → Server | Join conversation room         |
| `chat:leave`          | Client → Server | Leave conversation room        |
| `chat:send-message`   | Client → Server | Send message (with ACK)        |
| `chat:message`        | Server → Client | New message broadcast          |
| `chat:typing`         | Bidirectional   | Typing indicator               |
| `chat:stop-typing`    | Bidirectional   | Stopped typing                 |
| `chat:mark-read`      | Client → Server | Mark messages as read          |
| `chat:read`           | Server → Client | Read receipt broadcast         |
| `chat:online-status`  | Server → Client | User online/offline            |

---

## 10. Notification Module (`/api/v1/notifications`)

| Method | Endpoint                  | Auth | Description                              |
|--------|---------------------------|------|------------------------------------------|
| GET    | /                         | Yes  | List my notifications (paginated)        |
| GET    | /unread-count             | Yes  | Get unread notification count            |
| PATCH  | /:id/read                 | Yes  | Mark notification as read                |
| PATCH  | /read-all                 | Yes  | Mark all notifications as read           |

### Socket.IO Events

| Event                 | Direction       | Description                    |
|-----------------------|-----------------|--------------------------------|
| `notification:new`    | Server → Client | Push new notification          |

---

## 11. Device Token Module (`/api/v1/devices`)

| Method | Endpoint                  | Auth | Description                              |
|--------|---------------------------|------|------------------------------------------|
| POST   | /                         | Yes  | Register device token (FCM/APNs)         |
| DELETE | /                         | Yes  | Remove device token (on logout)          |

---

## 12. Report Module (`/api/v1/reports`)

| Method | Endpoint                  | Auth | Description                              |
|--------|---------------------------|------|------------------------------------------|
| POST   | /                         | Yes  | Report a user/review/tradie profile      |

---

---

# Admin Panel APIs (`/api/admin`)

All admin endpoints require `admin` or `super_admin` role (authenticated via email + password).

---

## 13. Admin — Dashboard (`/api/admin/dashboard`)

| Method | Endpoint                  | Description                              |
|--------|---------------------------|------------------------------------------|
| GET    | /stats                    | Dashboard statistics (total users, tradies, reviews, etc.) |
| GET    | /recent-activity          | Recent platform activity feed            |

---

## 14. Admin — User Management (`/api/admin/users`)

| Method | Endpoint                  | Description                              |
|--------|---------------------------|------------------------------------------|
| GET    | /                         | List all users (paginated, filterable by role/status) |
| GET    | /:id                      | Get user details                         |
| PATCH  | /:id/status               | Update user status (active/suspended/deleted) |

---

## 15. Admin — Tradie Management (`/api/admin/tradies`)

| Method | Endpoint                  | Description                              |
|--------|---------------------------|------------------------------------------|
| GET    | /                         | List all tradie profiles (filterable by profile_status) |
| GET    | /:id                      | Get full tradie profile with documents   |
| PATCH  | /:id/approve              | Approve tradie profile                   |
| PATCH  | /:id/reject               | Reject tradie profile (with reason)      |
| PATCH  | /:id/suspend              | Suspend tradie profile                   |
| PATCH  | /:id/verify-license       | Mark license as verified                 |
| PATCH  | /:id/verify-insurance     | Mark insurance as verified               |
| PATCH  | /:id/simulated-visits     | Add simulated visit records (for initial months) |

---

## 16. Admin — Category Management (`/api/admin/categories`)

| Method | Endpoint                  | Description                              |
|--------|---------------------------|------------------------------------------|
| GET    | /                         | List all categories (including inactive) |
| POST   | /                         | Create a new category                    |
| PATCH  | /:id                      | Update category (name, icon, active)     |
| DELETE | /:id                      | Soft-delete category                     |

---

## 17. Admin — Region & Suburb Management (`/api/admin/locations`)

| Method | Endpoint                  | Description                              |
|--------|---------------------------|------------------------------------------|
| GET    | /regions                  | List all regions                         |
| POST   | /regions                  | Create a region                          |
| PATCH  | /regions/:id              | Update region                            |
| GET    | /suburbs                  | List all suburbs (filterable by region)  |
| POST   | /suburbs                  | Create a suburb                          |
| PATCH  | /suburbs/:id              | Update suburb                            |
| DELETE | /suburbs/:id              | Delete suburb                            |

---

## 18. Admin — Review Management (`/api/admin/reviews`)

| Method | Endpoint                  | Description                              |
|--------|---------------------------|------------------------------------------|
| GET    | /                         | List all reviews (filterable by status: pending/approved/rejected) |
| GET    | /:id                      | Get review details                       |
| PATCH  | /:id/approve              | Approve a review (makes it visible, recalculates tradie overall_rating) |
| PATCH  | /:id/reject               | Reject a review (with reason)            |

---

## 19. Admin — Report Management (`/api/admin/reports`)

| Method | Endpoint                  | Description                              |
|--------|---------------------------|------------------------------------------|
| GET    | /                         | List all reports (filterable by status/type) |
| GET    | /:id                      | Get report details                       |
| PATCH  | /:id/resolve              | Resolve a report                         |
| PATCH  | /:id/dismiss              | Dismiss a report                         |

---

## Background Jobs / Cron Tasks

These are not API endpoints but scheduled tasks:

| Job                          | Schedule        | Description                              |
|------------------------------|-----------------|------------------------------------------|
| Review reminder (24h)        | Every hour      | Send 24h review reminder notification to customers who contacted a tradie |
| Review reminder (48h)        | Every hour      | Send 48h review reminder                 |
| Review reminder (72h)        | Every hour      | Send 72h review reminder (final)         |
| Recalculate tradie ratings   | On review approval | Update users.overall_rating for the tradie |
| Cleanup expired OTPs         | Every hour      | Delete expired/used OTP records from otp_codes table |

---

## Module Summary

| #  | Module          | Files Location                    | Public APIs | Auth APIs | Admin APIs |
|----|-----------------|-----------------------------------|-------------|-----------|------------|
| 1  | Auth (User)     | src/modules/auth/                 | 3           | 2         | —          |
| 2  | Auth (Admin)    | src/modules/admin-auth/           | 1           | —         | 4          |
| 3  | User            | src/modules/user/                 | —           | 4         | —          |
| 4  | Category        | src/modules/category/             | 2           | —         | 4          |
| 5  | Location        | src/modules/location/             | 4           | —         | 7          |
| 6  | Tradie          | src/modules/tradie/               | 4           | 13        | 8          |
| 7  | Favourite       | src/modules/favourite/            | —           | 1         | —          |
| 8  | Review          | src/modules/review/               | —           | 3         | 4          |
| 9  | Chat            | src/modules/chat/                 | —           | 6         | —          |
| 10 | Notification    | src/modules/notification/         | —           | 4         | —          |
| 11 | Device          | src/modules/device/               | —           | 2         | —          |
| 12 | Report          | src/modules/report/               | —           | 1         | 4          |
| 13 | Admin Dashboard | src/modules/admin-dashboard/      | —           | —         | 2          |
| 14 | Admin Users     | src/modules/admin-users/          | —           | —         | 3          |
| 15 | Admin Tradies   | src/modules/admin-tradies/        | —           | —         | 8          |
| 16 | Admin Categories| src/modules/admin-categories/     | —           | —         | 4          |
| 17 | Admin Locations | src/modules/admin-locations/      | —           | —         | 7          |
| 18 | Admin Reviews   | src/modules/admin-reviews/        | —           | —         | 4          |
| 19 | Admin Reports   | src/modules/admin-reports/        | —           | —         | 4          |
