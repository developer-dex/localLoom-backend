# LocalLoom Backend

Production-grade backend service built with Node.js, TypeScript, MongoDB, and Socket.IO.

## Architecture

```
src/
├── config/          # Environment, database, CORS, Swagger config
├── common/          # Shared utilities, constants, enums, interfaces, exceptions
├── middleware/       # Express middleware (auth, validation, rate-limit, upload)
├── models/          # Mongoose models & schemas
├── modules/         # Feature modules (auth, user, chat, admin)
│   └── <module>/
│       ├── <module>.interface.ts      # DTOs & types
│       ├── <module>.validation.ts     # Joi schemas
│       ├── <module>.controller.ts     # HTTP handlers
│       ├── <module>.service.ts        # Business logic
│       ├── <module>.repository.ts     # Database queries
│       ├── <module>.routes.ts         # Express routes
│       ├── <module>.swagger.ts        # API documentation
│       └── index.ts                   # Barrel export
├── socket/          # Socket.IO server, middleware, event handlers
├── routes/          # Route aggregators (v1, admin)
├── docs/            # Swagger component schemas
├── app.ts           # Express app setup
└── server.ts        # HTTP + Socket.IO server bootstrap
```

**Request flow:** `Route → Middleware → Controller → Service → Repository → Model`

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB 7+
- Docker & Docker Compose (optional)

### Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Docker

The Compose file maps MongoDB to host port **27018** by default (`MONGO_HOST_PORT`), so it does not conflict with a MongoDB already running on **27017** on your machine. The API container still connects to `mongo:27017` on the Docker network. Connect **MongoDB Compass** (or any client) from the host with `mongodb://localhost:27018` (and the database name you use, e.g. `localloom_dev`).

```bash
# Development (with hot-reload)
docker compose -f docker-compose.dev.yml up

# Production
docker compose up -d
```

To use another host port, set `MONGO_HOST_PORT` in `.env` or your shell before `docker compose up`.

After changing the Dockerfile, rebuild the API image: `docker compose -f docker-compose.dev.yml build --no-cache api`.

## API Endpoints

| Method | Endpoint                            | Auth | Description              |
|--------|-------------------------------------|------|--------------------------|
| POST   | /api/v1/auth/register               | No   | Register new user        |
| POST   | /api/v1/auth/login                  | No   | Login                    |
| POST   | /api/v1/auth/refresh-token          | No   | Refresh access token     |
| POST   | /api/v1/auth/logout                 | Yes  | Logout                   |
| GET    | /api/v1/auth/profile                | Yes  | Get current profile      |
| PATCH  | /api/v1/auth/change-password        | Yes  | Change password          |
| GET    | /api/v1/users/me                    | Yes  | Get my details           |
| PATCH  | /api/v1/users/me                    | Yes  | Update my profile        |
| GET    | /api/v1/users                       | Yes  | List users (paginated)   |
| GET    | /api/v1/users/search?q=             | Yes  | Search users             |
| GET    | /api/v1/users/:id                   | Yes  | Get user by ID           |
| POST   | /api/v1/chat/conversations          | Yes  | Create direct chat       |
| POST   | /api/v1/chat/conversations/group    | Yes  | Create group chat        |
| GET    | /api/v1/chat/conversations          | Yes  | List my conversations    |
| GET    | /api/v1/chat/conversations/:id      | Yes  | Get conversation         |
| POST   | /api/v1/chat/messages               | Yes  | Send message             |
| GET    | /api/v1/chat/conversations/:id/messages | Yes | Get messages         |
| PATCH  | /api/v1/chat/conversations/:id/read | Yes  | Mark messages read       |
| GET    | /api/admin/dashboard                | Admin| Dashboard statistics     |
| GET    | /api/admin/users                    | Admin| List all users           |
| PATCH  | /api/admin/users/:id/status         | Admin| Update user status       |
| PATCH  | /api/admin/users/:id/role           | Admin| Update user role         |

## Socket.IO Events

| Event                 | Direction       | Description                    |
|-----------------------|-----------------|--------------------------------|
| `chat:join`           | Client → Server | Join conversation room         |
| `chat:leave`          | Client → Server | Leave conversation room        |
| `chat:send-message`   | Client → Server | Send message (with ACK)        |
| `chat:message`        | Server → Client | New message broadcast          |
| `chat:typing`         | Bidirectional   | User typing indicator          |
| `chat:stop-typing`    | Bidirectional   | User stopped typing            |
| `chat:mark-read`      | Client → Server | Mark messages as read          |
| `chat:read`           | Server → Client | Read receipt broadcast         |
| `chat:online-status`  | Server → Client | User online/offline status     |
| `notification:new`    | Server → Client | Push notification              |

## Documentation

Swagger UI is available at: `http://localhost:5000/api-docs`

## Scripts

```bash
npm run dev          # Start with hot-reload
npm run build        # Compile TypeScript
npm start            # Run compiled JS
npm run lint         # ESLint (flat config: eslint.config.mjs)
npm run lint:fix     # ESLint with auto-fix
npm run lint:ci      # ESLint, fail on any warning (CI)
npm run format       # Format with Prettier
npm run typecheck    # Type-check without emitting
```
