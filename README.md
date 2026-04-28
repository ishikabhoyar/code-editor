# Real-Time Collaborative Code Editor

A full-stack platform for writing, running, and collaborating on code in real time. Multiple users can edit the same document simultaneously, with changes broadcast instantly via WebSocket. Code can be executed in a sandboxed backend environment (Java) or routed to an external sandbox API for other languages.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                 │
│   Next.js 16 (React 19) · Monaco Editor · STOMP over SockJS    │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP + WebSocket
┌───────────────────────────────▼─────────────────────────────────┐
│                   Spring Boot 3.4 Backend                       │
│   REST API · JWT Auth · WebSocket (STOMP) · Java Sandbox        │
└───────────────────────────────┬─────────────────────────────────┘
                                │ JDBC
┌───────────────────────────────▼─────────────────────────────────┐
│                    PostgreSQL (void_db)                         │
│   Schema: void_app · Tables: app_users, documents, sessions     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Features

- **Authentication** — Register / login with JWT; tokens stored in `sessionStorage`.
- **Document management** — Create, list, load, save, and delete documents per user.
- **Supported languages** — Java, JavaScript, Python, C, C++, HTML (syntax highlighting via Monaco).
- **Real-time collaboration** — STOMP over SockJS WebSocket; edits are broadcast to all connected clients for a document. Active-collaborator presence tracked via heartbeat sessions.
- **Code execution**
  - *Java (backend sandbox)*: source written to a temp dir, compiled with `javac`, and run with a configurable timeout.
  - *Other languages*: routed to an external sandbox API (`NEXT_PUBLIC_SANDBOX_URL`).
  - Per-document execution history stored in the database.
- **Security** — Stateless JWT filter, BCrypt password hashing, configurable CORS.
- **Deployment** — Docker Compose for local/VM, Kubernetes manifests for cluster deployment.

---

## Repository Structure

```
code-editor/
├── backend/                         # Spring Boot application
│   ├── src/main/java/com/realtimeeditor/
│   │   ├── config/                  # SecurityConfig, WebSocketConfig
│   │   ├── controller/              # AuthController, DocumentController, CollabController
│   │   ├── dto/                     # Request/response DTOs
│   │   ├── entity/                  # JPA entities (AppUser, Document, Session)
│   │   ├── exception/               # GlobalExceptionHandler + custom exceptions
│   │   ├── repository/              # Spring Data JPA repositories
│   │   ├── security/                # JwtAuthenticationFilter, JwtService
│   │   └── service/                 # AuthService, DocumentService, ExecutionService, SessionService
│   ├── src/main/resources/
│   │   └── application.yml          # All config; overridable via environment variables
│   ├── scripts/
│   │   ├── migrate.sql              # DDL for void_app schema
│   │   └── migrate.sh               # Shell helper to run migrate.sql
│   ├── Dockerfile                   # Multi-stage build (Maven → JRE 21)
│   ├── docker-compose.yml           # Backend container (expects external Postgres)
│   └── k8s/backend-deployment.yaml  # Kubernetes Deployment + Service
│
└── frontend/                        # Next.js application
    ├── app/
    │   ├── page.tsx                 # Redirects to /login or /documents
    │   ├── login/page.tsx           # Login / Register form
    │   ├── documents/page.tsx       # Document list + create / delete
    │   └── editor/[id]/page.tsx     # Monaco editor + WebSocket collab + execution
    ├── lib/
    │   ├── api.ts                   # All fetch wrappers (auth, documents, execution, sandbox)
    │   ├── auth.ts                  # sessionStorage helpers
    │   └── types.ts                 # Shared TypeScript types
    └── next.config.ts
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Java | 21 |
| Maven | 3.9+ |
| Node.js | 20+ |
| PostgreSQL | 14+ |
| Docker (optional) | 24+ |

---

## Local Development

### 1. PostgreSQL

Start a local Postgres instance on port **5433** (or adjust the env vars below):

```bash
# Example with Docker
docker run -d \
  --name pg \
  -e POSTGRES_USER=void_user \
  -e POSTGRES_PASSWORD=change_me \
  -e POSTGRES_DB=void_db \
  -p 5433:5432 \
  postgres:16
```

Create the schema and tables:

```bash
cd backend
./scripts/migrate.sh
```

### 2. Backend

```bash
cd backend

# Copy env and adjust values
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/void_db?currentSchema=void_app
export SPRING_DATASOURCE_USERNAME=void_user
export SPRING_DATASOURCE_PASSWORD=change_me
export APP_JWT_SECRET=change-this-secret-to-a-long-random-value-at-least-32-characters
export APP_CORS_ALLOWED_ORIGINS=http://localhost:3000

mvn spring-boot:run
```

The API will be available at `http://localhost:17808`.

### 3. Frontend

```bash
cd frontend

# Set the backend URL
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:17808" > .env.local

npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Environment Variables

### Backend (`application.yml` / environment)

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_PORT` | `17808` | HTTP port |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5433/void_db?currentSchema=void_app` | JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | `void_user` | DB username |
| `SPRING_DATASOURCE_PASSWORD` | `change_me` | DB password |
| `APP_JWT_SECRET` | *(insecure default)* | JWT signing secret — **change in production** |
| `APP_JWT_EXPIRATION_MINUTES` | `120` | Token lifetime |
| `APP_EXECUTION_TIMEOUT_SECONDS` | `5` | Max time for sandboxed Java execution |
| `APP_CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |

### Frontend (`.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:17808` | Backend base URL |
| `NEXT_PUBLIC_SANDBOX_URL` | `https://monacoapi.swdc.somaiya.edu` | External sandbox for non-Java languages |

---

## Docker Deployment

```bash
cd backend

# Build and start (expects Postgres accessible at host.docker.internal:5433)
docker compose up --build
```

The `docker-compose.yml` exposes the backend on port **17808** and uses `host.docker.internal` to reach the database on the host machine.

---

## Kubernetes Deployment

```bash
cd backend/k8s

# Apply the deployment and ClusterIP service
kubectl apply -f backend-deployment.yaml
```

The manifest deploys one replica of the backend and exposes it internally on port 17808. Configure a Secret or ConfigMap for production credentials — the current manifest uses placeholder values.

---

## API Reference

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/register` | — | Create a new account |
| `POST` | `/login` | — | Sign in, returns a JWT |
| `GET` | `/validate` | Bearer | Validate a token |
| `GET` | `/health` | — | Liveness check |

### Documents — `/api/documents`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/` | Bearer | List the authenticated user's documents |
| `POST` | `/` | Bearer | Create a document |
| `GET` | `/{id}` | Bearer | Load a document |
| `PUT` | `/{id}` | Bearer | Save (overwrite) a document |
| `DELETE` | `/{id}` | Bearer | Delete a document |

### Sessions — `/api/documents/{id}/sessions`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/join` | Bearer | Join a collaborative session |
| `POST` | `/leave` | Bearer | Leave a session |
| `POST` | `/ping` | Bearer | Heartbeat to stay active |
| `GET` | `/active` | — | List active collaborators |

### Execution — `/api/documents/{id}/execute`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/execute` | Bearer | Compile and run Java code in the backend sandbox |

### WebSocket

Connect to `ws://localhost:17808/ws` using STOMP over SockJS.

| Direction | Destination | Description |
|-----------|-------------|-------------|
| Client → Server | `/app/document/{id}/edit` | Send an edit event |
| Server → Client | `/topic/document/{id}` | Receive broadcast edits |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| WebSocket client | STOMP.js + SockJS |
| Backend | Spring Boot 3.4, Java 21, Spring Security, Spring WebSocket |
| Auth | JWT (JJWT 0.12), BCrypt |
| Persistence | Spring Data JPA, Hibernate, PostgreSQL |
| Build | Maven (backend), npm (frontend) |
| Container | Docker (multi-stage), Docker Compose, Kubernetes |
