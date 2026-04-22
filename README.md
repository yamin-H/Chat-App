# 💬 ChatApp — Real-Time Messaging Backend

A production-grade, **WhatsApp-inspired** real-time chat backend built with modern technologies and scalable architecture. Supports direct messaging, group chats, media sharing, typing indicators, message receipts, and online presence — all delivered in real time via native WebSockets.

<br />

[![Node.js](https://img.shields.io/badge/Node.js-24-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://prisma.io)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

<br />

## 🔗 Links

| Resource | URL |
|---|---|
| **Live API** | `https://chat-backend.onrender.com` |
| **Health Check** | `https://chat-backend.onrender.com/health` |
| **Frontend** | `https://chat-app.vercel.app` |
| **API Docs** | [View Endpoints](#-api-reference) |

<br />

## ✨ Features

### Messaging
- 📨 Real-time messaging via **native WebSockets** (no Socket.IO)
- 💬 Direct (1-on-1) and group chats
- ↩️ Reply to specific messages (threaded replies)
- 😄 Message reactions with emoji
- 🗑️ Soft delete messages (tombstone pattern)
- 📎 Media sharing — images, videos, audio, documents

### Real-Time Events
- ⌨️ Typing indicators with auto-timeout (zero database queries)
- ✅ Message delivery and read receipts (Sent → Delivered → Read)
- 🟢 Online / offline presence with last seen timestamps
- 📡 Multi-device support — one user, multiple sockets

### Groups
- 👥 Create groups with up to 100 members
- 🔐 Role-based permissions (Owner → Admin → Member)
- 🔗 Join via shareable invite links
- 🔄 Reset invite codes at any time

### Infrastructure
- ⚡ **Redis Pub/Sub** for distributed real-time messaging across multiple server instances
- 🔄 Horizontal scaling — stateless servers, Redis coordinates everything
- 🗃️ Cursor-based pagination for chat history (no OFFSET degradation)
- 🔁 Message deduplication using Redis NX keys
- 🏓 WebSocket heartbeat to detect and terminate zombie connections
- 📦 Media uploads via **Cloudinary** with automatic thumbnail generation

### Security & Auth
- 🔑 JWT access tokens (short-lived) + refresh token rotation
- 🛡️ Dedicated short-lived WebSocket tokens
- 🚦 Redis-backed rate limiting per user and per endpoint
- 🧹 Input sanitization against XSS attacks
- 🔒 bcrypt password hashing (cost factor 12)

<br />

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│          Next.js (Vercel) — REST + Native WebSocket         │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────▼──────────────────────────────────┐
│              LOAD BALANCER (Nginx / Render)                 │
│              Sticky Sessions for WebSocket                  │
└──────┬───────────────────┬──────────────────┬──────────────┘
       │                   │                  │
┌──────▼──────┐   ┌────────▼──────┐  ┌────────▼──────┐
│  Node/WS    │   │   Node/WS     │  │   Node/WS     │
│ Instance 1  │   │  Instance 2   │  │  Instance 3   │
└──────┬──────┘   └───────┬───────┘  └───────┬───────┘
       │                  │                  │
       └──────────────────▼──────────────────┘
                 ┌─────────────────┐
                 │      Redis      │  ← Pub/Sub + Presence + Rate Limiting
                 │    Pub/Sub      │
                 └────────┬────────┘
                          │
                 ┌────────▼────────┐
                 │   PostgreSQL    │  ← Persistent storage (Neon)
                 │ Primary + Read  │
                 │    Replicas     │
                 └────────┬────────┘
                          │
                 ┌────────▼────────┐
                 │   Cloudinary    │  ← Media storage + transformations
                 └─────────────────┘
```

### How Redis Pub/Sub Solves Multi-Instance Messaging

When User A (connected to Instance 1) sends a message to User B (connected to Instance 3):

```
Instance 1  →  saves message to PostgreSQL
            →  publishes event to Redis channel: "user:{userB_id}"
            →  Instance 3 is subscribed to "user:{userB_id}"
            →  Instance 3 pushes message to User B's WebSocket
```

Every server instance subscribes to Redis channels for all users currently connected to it. This makes each server instance fully stateless and horizontally scalable.

<br />

## 🗂️ Project Structure

```
src/
├── config/
│   ├── database.ts          # Prisma client singleton
│   ├── redis.ts             # Redis publisher + subscriber + cache clients
│   ├── env.ts               # Zod-validated environment variables
│   ├── logger.ts            # Pino structured logger
│   └── cloudinary.ts        # Cloudinary SDK config
│
├── modules/
│   ├── auth/                # Register, login, refresh, logout, ws-token
│   ├── users/               # Profile, update, search, presence service
│   ├── chats/               # Direct chats, list, read tracking
│   ├── messages/            # Send, paginate, react, delete, receipts
│   ├── groups/              # Create, manage members, roles, invite codes
│   └── media/               # Cloudinary upload with type validation
│
├── websocket/
│   ├── ws.server.ts         # Native WebSocket server setup
│   ├── ws.auth.ts           # Token validation on HTTP Upgrade
│   ├── ws.registry.ts       # In-memory Map<userId, Set<WebSocket>>
│   ├── ws.router.ts         # Event routing + WS rate limiting
│   ├── ws.heartbeat.ts      # Ping/pong zombie connection cleanup
│   └── handlers/
│       ├── message.handler.ts   # Send message + mark read
│       ├── typing.handler.ts    # Typing indicators (Redis-cached members)
│       ├── presence.handler.ts  # Bulk presence queries
│       └── receipt.handler.ts   # Read receipt broadcasting
│
├── pubsub/
│   ├── publisher.ts         # Redis publish wrappers
│   ├── subscriber.ts        # Redis subscribe + dispatch to local sockets
│   └── events.ts            # Typed event definitions
│
├── middleware/
│   ├── authenticate.ts      # JWT verification + req.userId injection
│   ├── rateLimiter.ts       # Redis-backed sliding window rate limiter
│   ├── validate.ts          # Zod request validation
│   ├── errorHandler.ts      # Global error handler + AppError class
│   └── requestId.ts         # Unique request ID for log tracing
│
└── utils/
    ├── jwt.ts               # Sign/verify access, refresh, ws tokens
    ├── asyncHandler.ts      # Async Express wrapper
    ├── sanitize.ts          # XSS input sanitization
    └── pagination.ts        # Cursor pagination helpers
```

<br />

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js 24 + TypeScript 6 | Server runtime with full type safety |
| **Framework** | Express 4 | HTTP REST API |
| **Real-time** | Native WebSockets (`ws`) | No Socket.IO overhead |
| **Database** | PostgreSQL 16 via Neon | Persistent storage |
| **ORM** | Prisma 7 | Type-safe DB queries + migrations |
| **Cache/PubSub** | Redis 7 (ioredis) | Pub/Sub, presence, rate limiting, dedup |
| **Media** | Cloudinary | Upload, transform, CDN delivery |
| **Auth** | JWT + bcryptjs | Stateless auth with refresh rotation |
| **Validation** | Zod | Runtime schema validation |
| **Logging** | Pino + pino-pretty | Structured JSON logging |
| **Dev** | tsx + nodemon | Zero-config TypeScript hot reload |
| **Deployment** | Render + Vercel + Neon | Full cloud deployment |

<br />

## 🗄️ Database Schema

```
User ──────────────────────────────────────────────┐
 │ id, phone, username, displayName                │
 │ avatarUrl, bio, isOnline, lastSeen               │
 │                                                  │
 ├──< Session >── refreshToken, expiresAt, deviceInfo
 │                                                  │
 ├──< ChatMember >──< Chat >──< ChatMember          │
 │       lastReadAt       │       (other users)     │
 │       mutedUntil       │                         │
 │                        ├──< Message              │
 │                        │     content, type        │
 │                        │     mediaUrl, mediaMeta  │
 │                        │     isDeleted, replyToId │
 │                        │         │               │
 │                        │         ├──< MessageReceipt
 │                        │         │     SENT/DELIVERED/READ
 │                        │         │               │
 │                        │         └──< MessageReaction
 │                        │               emoji     │
 │                        │                         │
 │                        └──< Group                │
 │                              name, description   │
 │                              inviteCode          │
 │                              │                   │
 └──────────────────────────────┴──< GroupMember    │
                                      OWNER/ADMIN/MEMBER
```

<br />

## 📡 API Reference

### Authentication
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Create new account | — |
| `POST` | `/api/auth/login` | Login with phone + password | — |
| `POST` | `/api/auth/refresh` | Rotate refresh token | — |
| `POST` | `/api/auth/logout` | Invalidate session | — |
| `POST` | `/api/auth/ws-token` | Get short-lived WebSocket token | ✅ |

### Users
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/users/me` | Get my profile | ✅ |
| `PATCH` | `/api/users/me` | Update profile | ✅ |
| `GET` | `/api/users/search?q=` | Search users | ✅ |
| `GET` | `/api/users/:username` | Get public profile | ✅ |

### Chats
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/chats` | List my chats (paginated) | ✅ |
| `POST` | `/api/chats/direct` | Get or create direct chat | ✅ |
| `GET` | `/api/chats/:chatId` | Get chat details | ✅ |
| `POST` | `/api/chats/:chatId/read` | Mark chat as read | ✅ |

### Messages
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/chats/:chatId/messages` | Send a message | ✅ |
| `GET` | `/api/chats/:chatId/messages` | Get messages (cursor paginated) | ✅ |
| `DELETE` | `/api/chats/messages/:messageId` | Delete own message | ✅ |
| `POST` | `/api/chats/messages/:messageId/react` | Add/change reaction | ✅ |
| `DELETE` | `/api/chats/messages/:messageId/react` | Remove reaction | ✅ |
| `GET` | `/api/chats/messages/:messageId/receipts` | Get read receipts | ✅ |

### Groups
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/groups` | Create group | ✅ |
| `GET` | `/api/groups/:groupId` | Get group details | ✅ |
| `PATCH` | `/api/groups/:groupId` | Update group info | ✅ Admin |
| `POST` | `/api/groups/:groupId/members` | Add members | ✅ Admin |
| `DELETE` | `/api/groups/:groupId/members/:userId` | Remove member | ✅ Admin |
| `DELETE` | `/api/groups/:groupId/leave` | Leave group | ✅ |
| `PATCH` | `/api/groups/:groupId/members/:userId/role` | Update role | ✅ Owner |
| `GET` | `/api/groups/join/:inviteCode` | Join via invite link | ✅ |
| `POST` | `/api/groups/:groupId/invite/reset` | Reset invite code | ✅ Admin |

### Media
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/media/upload` | Upload file to Cloudinary | ✅ |

<br />

## 🔌 WebSocket Protocol

### Connection
```
wss://your-domain.com/ws?token=<ws_token>
```

Get a `ws_token` from `POST /api/auth/ws-token` using your access token. WS tokens are short-lived (2 min in production, 1 day in development).

### Client → Server Events

```typescript
// Send a message
{
  "type": "message:send",
  "payload": {
    "chatId": "uuid",
    "content": "Hello!",
    "type": "TEXT",              // TEXT | IMAGE | VIDEO | AUDIO | DOCUMENT
    "clientMessageId": "uuid",   // Your generated ID for deduplication
    "replyToId": "uuid"          // Optional
  }
}

// Mark chat as read
{
  "type": "message:read",
  "payload": { "chatId": "uuid" }
}

// Typing indicators
{ "type": "typing:start", "payload": { "chatId": "uuid" } }
{ "type": "typing:stop",  "payload": { "chatId": "uuid" } }

// Query online status of users
{
  "type": "presence:query",
  "payload": { "userIds": ["uuid", "uuid"] }
}
```

### Server → Client Events

```typescript
// Connection confirmed
{ "type": "connected", "payload": { "userId": "...", "socketId": "..." } }

// New message (sent to all chat members except sender)
{ "type": "message:new", "payload": { "message": { ... } } }

// Message acknowledged (sent back to sender)
{ "type": "message:ack", "payload": { "clientMessageId": "...", "message": { ... } } }

// Typing indicator
{ "type": "typing:indicator", "payload": { "chatId": "...", "userId": "...", "isTyping": true } }

// Receipt status update
{ "type": "receipt:update", "payload": { "chatId": "...", "userId": "...", "status": "READ", "at": "..." } }

// Presence change
{ "type": "presence:update", "payload": { "userId": "...", "isOnline": true, "lastSeen": null } }

// Bulk presence response
{ "type": "presence:bulk", "payload": { "userId1": true, "userId2": false } }

// Group events
{ "type": "group:created",        "payload": { "chatId": "...", "group": { ... } } }
{ "type": "group:updated",        "payload": { "groupId": "...", "group": { ... } } }
{ "type": "group:member:left",    "payload": { "groupId": "...", "userId": "..." } }
{ "type": "member:added",         "payload": { "chatId": "...", "groupId": "..." } }
{ "type": "member:removed",       "payload": { "chatId": "...", "groupId": "..." } }

// Error
{ "type": "error", "payload": { "message": "..." } }
```

<br />

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Docker (for Redis)
- PostgreSQL database — [Neon](https://neon.tech) (free tier works)
- Cloudinary account — [cloudinary.com](https://cloudinary.com) (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/chat-backend.git
cd chat-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
NODE_ENV=development
PORT=5000

# PostgreSQL — from Neon dashboard
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/chatdb?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.neon.tech/chatdb?sslmode=require"

# Redis — local Docker
REDIS_URL="redis://localhost:6379"

# Auth
JWT_SECRET="your-super-secret-min-32-characters-long"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_EXPIRES_IN="30d"

# Cloudinary — from Cloudinary dashboard
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Frontend
FRONTEND_URL="http://localhost:3001"
LOG_LEVEL="debug"
```

### 4. Start Redis via Docker

```bash
docker compose up -d
```

### 5. Push database schema

```bash
npm run db:push
npm run db:generate
```

### 6. Start development server

```bash
npm run dev
```

Server is running at `http://localhost:5000`

### 7. Verify everything is working

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ok",
  "services": {
    "database": { "status": "ok", "latencyMs": 12 },
    "redis":    { "status": "ok", "latencyMs": 1 }
  }
}
```

<br />

## 📦 Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled production build
npm run typecheck    # Type check without compiling
npm run db:push      # Push schema to database (dev)
npm run db:migrate   # Create and run migrations (production)
npm run db:generate  # Regenerate Prisma client
npm run db:studio    # Open Prisma Studio GUI
```

<br />

## 🐳 Docker

Start all services locally with Docker Compose:

```bash
# Start Redis only (recommended — use Neon for PostgreSQL)
docker compose up -d

# Check running containers
docker compose ps

# View Redis logs
docker compose logs redis

# Stop all services
docker compose down
```

<br />

## ☁️ Deployment

### Backend → Render

1. Push your code to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Connect your GitHub repository
4. Set the following:

```
Build Command:  npm install && npx prisma generate && npx prisma migrate deploy && npm run build
Start Command:  node dist/app.js
Health Check:   /health
```

5. Add all environment variables from `.env.example` in the Render dashboard
6. Use Render's managed Redis add-on or [Upstash](https://upstash.com)
7. Use [Neon](https://neon.tech) for PostgreSQL

### Frontend → Vercel

```bash
# From your Next.js frontend directory
vercel deploy
```

Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` environment variables in Vercel dashboard.

<br />

## 🔑 Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | ✅ | `development` or `production` |
| `PORT` | ✅ | Server port (Render sets this automatically) |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `DIRECT_URL` | ✅ | Direct PostgreSQL URL for Prisma migrations |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_SECRET` | ✅ | Min 32 character secret for JWT signing |
| `JWT_EXPIRES_IN` | ✅ | Access token expiry e.g. `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | ✅ | Refresh token expiry e.g. `30d` |
| `CLOUDINARY_CLOUD_NAME` | ✅ | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | ✅ | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | ✅ | From Cloudinary dashboard |
| `FRONTEND_URL` | ✅ | Your frontend URL for CORS |
| `LOG_LEVEL` | — | `debug` / `info` / `warn` / `error` |

<br />

## 🏛️ Key Design Decisions

**Why native WebSockets instead of Socket.IO?**
Socket.IO adds ~60KB of overhead, automatic fallback polling, and abstractions that hide what's actually happening. Native `ws` is lean, explicit, and forces you to understand the protocol deeply. For a production system, that understanding matters.

**Why Redis Pub/Sub instead of in-memory broadcasting?**
In-memory broadcasting only works when you have a single server instance. The moment you scale to multiple instances (which Render, AWS, etc. require for reliability), users on different instances can't communicate. Redis Pub/Sub makes every instance stateless and independently scalable.

**Why cursor-based pagination instead of OFFSET?**
`OFFSET 1000` in PostgreSQL means the database scans and discards 1000 rows before returning results. In a chat with 10,000 messages, fetching "page 50" becomes progressively slower. Cursor pagination (`WHERE createdAt < cursor`) uses the index directly and stays at constant speed regardless of how deep you paginate.

**Why Cloudinary instead of S3 for media?**
Cloudinary provides free on-the-fly image transformations (thumbnails, compression, format conversion) without needing Lambda functions or a separate media processing service. For a chat app where you never want to send a 4MB raw photo to a chat bubble, this is essential and S3 alone can't do it.

**Why short-lived WebSocket tokens?**
The WebSocket token is passed as a URL query parameter (`?token=...`), which means it appears in server access logs. Using the same long-lived access token here would be a security risk. Short-lived WS-specific tokens (2 minutes in production) limit the exposure window dramatically.

<br />

## 📁 .env.example

```env
NODE_ENV=development
PORT=5000

DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
DIRECT_URL="postgresql://user:pass@host/db?sslmode=require"

REDIS_URL="redis://localhost:6379"

JWT_SECRET="replace-with-32-plus-character-random-string"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="30d"

CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

FRONTEND_URL="http://localhost:3001"
LOG_LEVEL="debug"
```

<br />

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

<br />

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

<br />

## 👤 Author

**Yamin**
- GitHub: [@yamin-H](https://github.com/yamin-H)
- LinkedIn: [Yamin Hossain](https://www.linkedin.com/in/yamin-hossain-n/)

<br />

---

<p align="center">
  Built with ❤️ using Node.js, TypeScript, PostgreSQL, Redis, and WebSockets
</p>"# Chat-App" 
