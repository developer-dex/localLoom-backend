# LocalLoom — Database Models (PostgreSQL + Sequelize)

All tables use UUID primary keys, `created_at` / `updated_at` timestamps, and snake_case column names.
No ENUM types in the database — all status/type fields are stored as VARCHAR strings.

---

## 1. `users`

The base user table for customers and tradies. Auth via phone+OTP or email+password. Email is optional.

| Column              | Type          | Constraints                        |
|---------------------|---------------|------------------------------------|
| id                  | UUID (PK)     | DEFAULT uuid_generate_v4()         |
| name                | VARCHAR(100)  | NOT NULL, DEFAULT ''               |
| email               | VARCHAR(255)  | NULL, UNIQUE                       |
| phone               | VARCHAR(20)   | NOT NULL, UNIQUE                   |
| password            | VARCHAR(255)  | NULL (only set if user registers via email+password) |
| avatar              | VARCHAR(500)  | NULL                               |
| role                | VARCHAR(20)   | NOT NULL, DEFAULT 'customer' (customer, tradie) |
| status              | VARCHAR(20)   | NOT NULL, DEFAULT 'active' (active, inactive, suspended, deleted) |
| is_phone_verified   | BOOLEAN       | NOT NULL, DEFAULT false            |
| overall_rating      | DECIMAL(3,2)  | NOT NULL, DEFAULT 0.00             |
| last_login          | TIMESTAMP     | NULL                               |
| refresh_token       | TEXT          | NULL                               |
| created_at          | TIMESTAMP     | NOT NULL                           |
| updated_at          | TIMESTAMP     | NOT NULL                           |

Indexes: `phone` (unique), `email` (unique, partial — WHERE email IS NOT NULL), `role`, `status`

Notes:
- `overall_rating` is denormalized here and updated whenever a new review is approved for this user (tradie)
- Only customer and tradie roles live in this table. Admins are in a separate `admins` table.
- `phone` is the primary login identifier. `email` is optional profile info.
- No `password` field — auth is OTP-based via the `otp_codes` table.

---

## 2. `admins`

Separate table for admin users. Admins use email + password auth (not OTP).

| Column              | Type          | Constraints                        |
|---------------------|---------------|------------------------------------|
| id                  | UUID (PK)     | DEFAULT uuid_generate_v4()         |
| name                | VARCHAR(100)  | NOT NULL                           |
| email               | VARCHAR(255)  | NOT NULL, UNIQUE                   |
| password            | VARCHAR(255)  | NOT NULL                           |
| avatar              | VARCHAR(500)  | NULL                               |
| role                | VARCHAR(20)   | NOT NULL, DEFAULT 'admin' (admin, super_admin) |
| status              | VARCHAR(20)   | NOT NULL, DEFAULT 'active' (active, inactive, suspended) |
| last_login          | TIMESTAMP     | NULL                               |
| refresh_token       | TEXT          | NULL                               |
| created_at          | TIMESTAMP     | NOT NULL                           |
| updated_at          | TIMESTAMP     | NOT NULL                           |

Indexes: `email` (unique), `role`, `status`

---

## 3. `otp_codes`

Stores OTP codes for phone-based authentication. Short-lived records.

| Column              | Type          | Constraints                        |
|---------------------|---------------|------------------------------------|
| id                  | UUID (PK)     | DEFAULT uuid_generate_v4()         |
| phone               | VARCHAR(20)   | NOT NULL                           |
| code                | VARCHAR(6)    | NOT NULL                           |
| purpose             | VARCHAR(20)   | NOT NULL, DEFAULT 'login' (login, verify_phone) |
| attempts            | INTEGER       | NOT NULL, DEFAULT 0                |
| max_attempts        | INTEGER       | NOT NULL, DEFAULT 3                |
| is_used             | BOOLEAN       | NOT NULL, DEFAULT false            |
| expires_at          | TIMESTAMP     | NOT NULL                           |
| created_at          | TIMESTAMP     | NOT NULL                           |

Indexes: `phone`, `(phone, code)`, `expires_at`

Notes:
- OTP expires after a configurable duration (e.g., 5 minutes)
- `attempts` tracks failed verification attempts; locked after `max_attempts`
- Old/expired OTPs can be cleaned up by a cron job

---

## 4. `categories`

Service categories managed by admin (e.g., Plumber, Electrician, Carpenter).

| Column      | Type          | Constraints                |
|-------------|---------------|----------------------------|
| id          | UUID (PK)     | DEFAULT uuid_generate_v4() |
| name        | VARCHAR(100)  | NOT NULL, UNIQUE           |
| slug        | VARCHAR(100)  | NOT NULL, UNIQUE           |
| icon        | VARCHAR(500)  | NULL (logo/image URL)      |
| description | TEXT          | NULL                       |
| is_active   | BOOLEAN       | NOT NULL, DEFAULT true     |
| sort_order  | INTEGER       | NOT NULL, DEFAULT 0        |
| created_at  | TIMESTAMP     | NOT NULL                   |
| updated_at  | TIMESTAMP     | NOT NULL                   |

Indexes: `slug` (unique), `is_active`

---

## 5. `regions`

Melbourne divided into 4 regions initially. Admin-managed.

| Column      | Type          | Constraints                |
|-------------|---------------|----------------------------|
| id          | UUID (PK)     | DEFAULT uuid_generate_v4() |
| name        | VARCHAR(100)  | NOT NULL, UNIQUE           |
| slug        | VARCHAR(100)  | NOT NULL, UNIQUE           |
| is_active   | BOOLEAN       | NOT NULL, DEFAULT true     |
| created_at  | TIMESTAMP     | NOT NULL                   |
| updated_at  | TIMESTAMP     | NOT NULL                   |

---

## 6. `suburbs`

Suburbs belonging to regions. Used for tradie service area and customer search.

| Column      | Type          | Constraints                          |
|-------------|---------------|--------------------------------------|
| id          | UUID (PK)     | DEFAULT uuid_generate_v4()           |
| name        | VARCHAR(100)  | NOT NULL                             |
| slug        | VARCHAR(100)  | NOT NULL, UNIQUE                     |
| region_id   | UUID (FK)     | NOT NULL → regions.id                |
| postcode    | VARCHAR(10)   | NULL                                 |
| latitude    | DECIMAL(10,7) | NULL                                 |
| longitude   | DECIMAL(10,7) | NULL                                 |
| is_active   | BOOLEAN       | NOT NULL, DEFAULT true               |
| created_at  | TIMESTAMP     | NOT NULL                             |
| updated_at  | TIMESTAMP     | NOT NULL                             |

Indexes: `region_id`, `slug` (unique), `postcode`, `(latitude, longitude)`

---

## 7. `tradie_profiles`

Extended profile for users with role='tradie'. One-to-one with users.

| Column                    | Type           | Constraints                          |
|---------------------------|----------------|--------------------------------------|
| id                        | UUID (PK)      | DEFAULT uuid_generate_v4()           |
| user_id                   | UUID (FK)      | NOT NULL, UNIQUE → users.id          |
| business_name             | VARCHAR(200)   | NOT NULL                             |
| abn                       | VARCHAR(20)    | NOT NULL (validated via ABN Lookup API) |
| abn_verified              | BOOLEAN        | NOT NULL, DEFAULT false              |
| years_of_experience       | INTEGER        | NOT NULL                             |
| intro_video_url           | VARCHAR(500)   | NULL                                 |
| service_radius_km         | INTEGER        | NULL (max 10)                        |
| region_id                 | UUID (FK)      | NULL → regions.id (Northern Melbourne only for now) |
| profile_status            | VARCHAR(20)    | NOT NULL, DEFAULT 'pending' (pending, approved, rejected, suspended) |
| rejection_reason          | TEXT           | NULL                                 |
| has_license               | BOOLEAN        | NOT NULL, DEFAULT false              |
| license_number            | VARCHAR(50)    | NULL (only if has_license = true)    |
| license_expiry_date       | DATE           | NULL (only if has_license = true)    |
| insurance_url             | VARCHAR(500)   | NULL                                 |
| insurance_verified        | BOOLEAN        | NOT NULL, DEFAULT false              |
| is_available              | BOOLEAN        | NOT NULL, DEFAULT true               |
| is_emergency_available    | BOOLEAN        | NOT NULL, DEFAULT false              |
| created_at                | TIMESTAMP      | NOT NULL                             |
| updated_at                | TIMESTAMP      | NOT NULL                             |

Indexes: `user_id` (unique), `profile_status`, `is_available`, `is_emergency_available`, `region_id`, `abn`

Notes:
- ABN is mandatory and validated via ABN Lookup API (https://abr.business.gov.au)
- Licence is optional: if `has_license` = true, then `license_number` and `license_expiry_date` are provided
- `region_id` links to the region the tradie operates in (only Northern Melbourne selectable initially)
- `is_emergency_available` = true means tradie is available for emergency calls
- Visit counts and ratings are computed from `profile_visits` and `reviews` tables at query time

---

## 8. `tradie_services` (join table)

Many-to-many: tradie ↔ category. A tradie can offer 5–6 services.

| Column              | Type      | Constraints                          |
|---------------------|-----------|--------------------------------------|
| id                  | UUID (PK) | DEFAULT uuid_generate_v4()           |
| tradie_profile_id   | UUID (FK) | NOT NULL → tradie_profiles.id        |
| category_id         | UUID (FK) | NOT NULL → categories.id             |
| created_at          | TIMESTAMP | NOT NULL                             |

Indexes: `(tradie_profile_id, category_id)` UNIQUE

---

## 9. `tradie_suburbs` (join table)

Many-to-many: tradie ↔ suburb. A tradie can serve up to 10 suburbs.

| Column              | Type      | Constraints                          |
|---------------------|-----------|--------------------------------------|
| id                  | UUID (PK) | DEFAULT uuid_generate_v4()           |
| tradie_profile_id   | UUID (FK) | NOT NULL → tradie_profiles.id        |
| suburb_id           | UUID (FK) | NOT NULL → suburbs.id               |
| created_at          | TIMESTAMP | NOT NULL                             |

Indexes: `(tradie_profile_id, suburb_id)` UNIQUE

---

## 10. `tradie_work_photos`

Up to 20 previous work photos per tradie.

| Column              | Type          | Constraints                          |
|---------------------|---------------|--------------------------------------|
| id                  | UUID (PK)     | DEFAULT uuid_generate_v4()           |
| tradie_profile_id   | UUID (FK)     | NOT NULL → tradie_profiles.id        |
| image_url           | VARCHAR(500)  | NOT NULL                             |
| caption             | VARCHAR(200)  | NULL                                 |
| sort_order          | INTEGER       | NOT NULL, DEFAULT 0                  |
| created_at          | TIMESTAMP     | NOT NULL                             |
| updated_at          | TIMESTAMP     | NOT NULL                             |

Indexes: `tradie_profile_id`

---

## 11. `contact_logs`

Tracks when a customer views a tradie's contact details. Required for review eligibility (7-hour rule) and review reminder notifications.

| Column              | Type      | Constraints                          |
|---------------------|-----------|--------------------------------------|
| id                  | UUID (PK) | DEFAULT uuid_generate_v4()           |
| customer_id         | UUID (FK) | NOT NULL → users.id                  |
| tradie_profile_id   | UUID (FK) | NOT NULL → tradie_profiles.id        |
| contacted_at        | TIMESTAMP | NOT NULL, DEFAULT NOW()              |
| review_eligible_at  | TIMESTAMP | NOT NULL (contacted_at + 7 hours)    |
| reminder_24h_sent   | BOOLEAN   | NOT NULL, DEFAULT false              |
| reminder_48h_sent   | BOOLEAN   | NOT NULL, DEFAULT false              |
| reminder_72h_sent   | BOOLEAN   | NOT NULL, DEFAULT false              |

Indexes: `(customer_id, tradie_profile_id)`, `review_eligible_at`, `contacted_at`

---

## 12. `reviews`

Customer reviews of tradies. Goes to admin for approval before being visible.

| Column              | Type          | Constraints                          |
|---------------------|---------------|--------------------------------------|
| id                  | UUID (PK)     | DEFAULT uuid_generate_v4()           |
| customer_id         | UUID (FK)     | NOT NULL → users.id                  |
| tradie_profile_id   | UUID (FK)     | NOT NULL → tradie_profiles.id        |
| rating              | SMALLINT      | NOT NULL (1–5)                       |
| comment             | TEXT          | NULL                                 |
| status              | VARCHAR(20)   | NOT NULL, DEFAULT 'pending' (pending, approved, rejected) |
| rejection_reason    | TEXT          | NULL                                 |
| reviewed_by_admin   | UUID (FK)     | NULL → admins.id                     |
| reviewed_at         | TIMESTAMP     | NULL                                 |
| created_at          | TIMESTAMP     | NOT NULL                             |
| updated_at          | TIMESTAMP     | NOT NULL                             |

Indexes: `tradie_profile_id`, `customer_id`, `status`, `(customer_id, tradie_profile_id)` UNIQUE

Notes:
- One review per customer per tradie (enforced by unique constraint)
- Single `rating` field (1–5 stars)
- Eligibility is checked at API level by querying `contact_logs` table
- When a review is approved, `users.overall_rating` is recalculated for the tradie user

---

## 13. `favourites`

Customers can save favourite tradies.

| Column              | Type      | Constraints                          |
|---------------------|-----------|--------------------------------------|
| id                  | UUID (PK) | DEFAULT uuid_generate_v4()           |
| customer_id         | UUID (FK) | NOT NULL → users.id                  |
| tradie_profile_id   | UUID (FK) | NOT NULL → tradie_profiles.id        |
| created_at          | TIMESTAMP | NOT NULL                             |

Indexes: `(customer_id, tradie_profile_id)` UNIQUE, `customer_id`

---

## 14. `profile_visits`

Tracks individual profile visits for analytics. Each click = one separate record for date-wise analysis.

| Column              | Type         | Constraints                          |
|---------------------|--------------|--------------------------------------|
| id                  | UUID (PK)    | DEFAULT uuid_generate_v4()           |
| tradie_profile_id   | UUID (FK)    | NOT NULL → tradie_profiles.id        |
| visitor_id          | UUID (FK)    | NULL → users.id (NULL if anonymous)  |
| ip_address          | VARCHAR(45)  | NULL                                 |
| is_simulated        | BOOLEAN      | NOT NULL, DEFAULT false              |
| visited_at          | TIMESTAMP    | NOT NULL, DEFAULT NOW()              |

Indexes: `tradie_profile_id`, `visited_at`, `(tradie_profile_id, visited_at)`

Notes:
- Each visit is a separate row — enables date-wise analysis (daily/weekly/monthly counts)
- `is_simulated` = true for admin-inflated visits (for initial months strategy)
- Visitor identity is NOT shown to the tradie
- Total visit count = COUNT(*) from this table WHERE tradie_profile_id = X
- Real visits = COUNT(*) WHERE is_simulated = false
- To get date-wise breakdown: GROUP BY DATE(visited_at)

---

## 15. `notifications`

Push notifications and in-app notifications.

| Column              | Type          | Constraints                          |
|---------------------|---------------|--------------------------------------|
| id                  | UUID (PK)     | DEFAULT uuid_generate_v4()           |
| user_id             | UUID (FK)     | NOT NULL → users.id                  |
| type                | VARCHAR(50)   | NOT NULL (e.g., 'review_reminder', 'profile_approved', 'new_review') |
| title               | VARCHAR(200)  | NOT NULL                             |
| body                | TEXT          | NOT NULL                             |
| data                | JSONB         | NULL (extra payload)                 |
| is_read             | BOOLEAN       | NOT NULL, DEFAULT false              |
| sent_at             | TIMESTAMP     | NOT NULL, DEFAULT NOW()              |
| read_at             | TIMESTAMP     | NULL                                 |

Indexes: `user_id`, `(user_id, is_read)`, `type`

---

## 16. `device_tokens`

For push notification delivery (FCM/APNs).

| Column      | Type          | Constraints                          |
|-------------|---------------|--------------------------------------|
| id          | UUID (PK)     | DEFAULT uuid_generate_v4()           |
| user_id     | UUID (FK)     | NOT NULL → users.id                  |
| token       | TEXT          | NOT NULL                             |
| platform    | VARCHAR(10)   | NOT NULL (ios, android, web)         |
| is_active   | BOOLEAN       | NOT NULL, DEFAULT true               |
| created_at  | TIMESTAMP     | NOT NULL                             |
| updated_at  | TIMESTAMP     | NOT NULL                             |

Indexes: `user_id`, `token` (unique)

---

## 17. `conversations`

Chat conversations between customer and tradie.

| Column          | Type          | Constraints                          |
|-----------------|---------------|--------------------------------------|
| id              | UUID (PK)     | DEFAULT uuid_generate_v4()           |
| customer_id     | UUID (FK)     | NOT NULL → users.id                  |
| tradie_id       | UUID (FK)     | NOT NULL → users.id                  |
| status          | VARCHAR(20)   | NOT NULL, DEFAULT 'active' (active, archived, deleted) |
| last_message_id | UUID (FK)     | NULL → messages.id                   |
| created_at      | TIMESTAMP     | NOT NULL                             |
| updated_at      | TIMESTAMP     | NOT NULL                             |

Indexes: `(customer_id, tradie_id)` UNIQUE, `customer_id`, `tradie_id`, `updated_at`

Notes:
- Conversations in LocalLoom are always 1:1 (customer ↔ tradie), no group chats needed

---

## 18. `messages`

| Column          | Type          | Constraints                          |
|-----------------|---------------|--------------------------------------|
| id              | UUID (PK)     | DEFAULT uuid_generate_v4()           |
| conversation_id | UUID (FK)     | NOT NULL → conversations.id          |
| sender_id       | UUID (FK)     | NOT NULL → users.id                  |
| content         | TEXT          | NOT NULL                             |
| type            | VARCHAR(10)   | NOT NULL, DEFAULT 'text' (text, image, file, system) |
| status          | VARCHAR(10)   | NOT NULL, DEFAULT 'sent' (sent, delivered, read) |
| attachments     | JSONB         | NULL                                 |
| is_deleted      | BOOLEAN       | NOT NULL, DEFAULT false              |
| created_at      | TIMESTAMP     | NOT NULL                             |
| updated_at      | TIMESTAMP     | NOT NULL                             |

Indexes: `(conversation_id, created_at)`, `sender_id`

---

## 19. `reports`

Users can report inappropriate content/profiles.

| Column          | Type          | Constraints                          |
|-----------------|---------------|--------------------------------------|
| id              | UUID (PK)     | DEFAULT uuid_generate_v4()           |
| reporter_id     | UUID (FK)     | NOT NULL → users.id                  |
| target_type     | VARCHAR(20)   | NOT NULL (user, review, tradie_profile) |
| target_id       | UUID          | NOT NULL                             |
| reason          | VARCHAR(500)  | NOT NULL                             |
| description     | TEXT          | NULL                                 |
| status          | VARCHAR(20)   | NOT NULL, DEFAULT 'pending' (pending, reviewed, resolved, dismissed) |
| resolved_by     | UUID (FK)     | NULL → admins.id                     |
| resolved_at     | TIMESTAMP     | NULL                                 |
| created_at      | TIMESTAMP     | NOT NULL                             |
| updated_at      | TIMESTAMP     | NOT NULL                             |

Indexes: `reporter_id`, `(target_type, target_id)`, `status`

---

## Entity Relationship Summary

```
users (1) ──── (1) tradie_profiles
users (1) ──── (N) contact_logs
users (1) ──── (N) reviews (as customer)
users (1) ──── (N) favourites
users (1) ──── (N) notifications
users (1) ──── (N) device_tokens
users (1) ──── (N) conversations (as customer or tradie)
users (1) ──── (N) messages (as sender)
users (1) ──── (N) reports (as reporter)

admins — separate table, no FK to users

otp_codes — linked by phone number (no FK, phone is the lookup key)

tradie_profiles (M) ──── (N) categories       (via tradie_services)
tradie_profiles (M) ──── (N) suburbs           (via tradie_suburbs)
tradie_profiles (1) ──── (N) tradie_work_photos
tradie_profiles (1) ──── (N) contact_logs
tradie_profiles (1) ──── (N) reviews
tradie_profiles (1) ──── (N) favourites
tradie_profiles (1) ──── (N) profile_visits

regions (1) ──── (N) suburbs

conversations (1) ──── (N) messages
```
