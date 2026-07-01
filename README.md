# Cauppo

QR-based restaurant ordering system — contactless dining from table scan to kitchen, real-time operations, and business analytics.

## Architecture

Cauppo is a **polyrepo** system. This repository is the **orchestration layer** — it owns Docker Compose topology, environment configuration, Traefik routing, and operational scripts. Each service lives in its own independent repository and must be cloned into the corresponding subdirectory before the stack can run.

```
cauppo-root/          # this repo — orchestration layer
├── user-service/     # cloned from <user-service-repo-url>
├── feedback-service/ # cloned from <feedback-service-repo-url>
├── menu-service/     # cloned from https://github.com/HassenDabboussi/cauppo-menu-service
├── order-service/    # cloned from https://github.com/HassenDabboussi/cauppo-order-service
├── analytics-service/# cloned from https://github.com/HassenDabboussi/cauppo-analytics-service
├── notification-service/ # cloned from <notification-service-repo-url>
├── frontend/         # cloned from https://github.com/HassenDabboussi/cauppo-frontend
└── docker-compose.yml
```

### Services

| Service | Language | Runtime | Port | Repo |
|---|---|---|---|---|
| `frontend` | TypeScript / React 19 | Bun | 8080 | [cauppo-frontend](https://github.com/HassenDabboussi/cauppo-frontend) |
| `user-service` | TypeScript / Hono | Bun | 3001 | `<user-service-repo-url>` |
| `feedback-service` | TypeScript / Hono | Bun | 3002 | `<feedback-service-repo-url>` |
| `menu-service` | Go / Gin | Go | 8081 | [cauppo-menu-service](https://github.com/HassenDabboussi/cauppo-menu-service) |
| `order-service` | Go / Gin | Go | 8082 | [cauppo-order-service](https://github.com/HassenDabboussi/cauppo-order-service) |
| `analytics-service` | Go / Gin | Go | 8083 | [cauppo-analytics-service](https://github.com/HassenDabboussi/cauppo-analytics-service) |
| `notification-service` | Go / Gin + WebSocket | Go | 8084 | `<notification-service-repo-url>` |

### Infrastructure

| Component | Role |
|---|---|
| Traefik | Edge router for frontend, APIs, Zitadel, Mailpit, MinIO |
| PostgreSQL 18 | Single cluster, one database per service |
| Redis 8 | Cache, rate-limit, live analytics counters, WebSocket state |
| RabbitMQ 4 | Domain event bus |
| MinIO | Local S3-compatible storage for media and QR assets |
| Mailpit | Local SMTP capture and browser mail UI |
| Zitadel | Identity authority (OIDC / OAuth2) |

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, TailwindCSS v4, shadcn/ui, Vitest, Playwright
- **TypeScript services:** Hono, Drizzle ORM, Biome
- **Go services:** Gin, standard library HTTP, sql migrations
- **Auth:** Zitadel OIDC, PAT-backed service-to-service, multi-role account model
- **Events:** RabbitMQ domain event bus with per-exchange routing
- **Infrastructure:** Docker Compose, PostgreSQL 18, Redis 8, Traefik

## Repository Structure

```
cauppo/
├── docker-compose.yml        # Full stack orchestration
├── traefik/                  # Edge router configuration
├── envs/                     # Environment config & auth state (gitignored)
├── envs_examples/            # Sanitized env templates (safe to commit)
├── shared/                   # Cross-service schemas & event contracts
├── scripts/                  # Utility & verification scripts
├── tests/                    # Cross-service contract tests
├── AGENTS.md                 # Developer operational guide
└── README.md
```

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/engine/install/) with Compose plugin
- [Git](https://git-scm.com/)
- 8 GB+ RAM recommended

### Step 1 — Clone the root repo

```bash
git clone https://github.com/HassenDabboussi/cauppo.git
cd cauppo
```

### Step 2 — Clone all service repos

Each service directory must contain its corresponding repository. Clone them all into the root:

```bash
git clone https://github.com/HassenDabboussi/cauppo-frontend.git frontend
git clone <user-service-repo-url> user-service
git clone <feedback-service-repo-url> feedback-service
git clone https://github.com/HassenDabboussi/cauppo-menu-service.git menu-service
git clone https://github.com/HassenDabboussi/cauppo-order-service.git order-service
git clone https://github.com/HassenDabboussi/cauppo-analytics-service.git analytics-service
git clone <notification-service-repo-url> notification-service
```

### Step 3 — Configure environment

Copy the example env files and fill in your local Zitadel credentials:

```bash
cp envs_examples/.env.development envs/.env.development
cp envs_examples/.env.test envs/.env.test
```

The example files contain placeholder values (e.g. `dev-project-id`, `dev-api-client-secret`). You must replace these with the actual values from your Zitadel console after the first bring-up.

### Step 4 — First-time Zitadel setup

1. Start the stack:
   ```bash
   docker compose --env-file envs/.env.development up -d --wait --wait-timeout 60
   ```
2. Open Zitadel console at `http://auth.cauppo.localhost` and log in with the admin credentials from `envs/.env.development` (`admin@cauppo.auth.cauppo.localhost` / `Admin1234!`).
3. Create a project, register OIDC application clients for each service, and obtain the project ID, client IDs, and client secrets.
4. Update `envs/.env.development` with the Zitadel values.
5. Restart the stack:
   ```bash
   docker compose --env-file envs/.env.development down
   docker compose --env-file envs/.env.development up -d --wait --wait-timeout 60
   ```

### Step 5 — Development run

```bash
docker compose --env-file envs/.env.development up -d --wait --wait-timeout 60
```

Access the app at `http://app.cauppo.localhost`.

### Isolated test lane

```bash
docker compose --env-file envs/.env.test up -d --wait --wait-timeout 60
```

### Tear down

```bash
docker compose --env-file envs/.env.development down
```

> **Important:** Never run `down -v`, `down --volumes`, or `docker volume rm` — this destroys Zitadel auth state and requires a full manual console re-setup.

## Environment Identities

The project supports exactly **two** local environments. Never run them in parallel.

| Identity | Env file | Volume namespace | Use case |
|---|---|---|---|
| `development` | `envs/.env.development` | `cauppo-development` | Active runtime for local development |
| `isolated-test` | `envs/.env.test` | `cauppo-isolated-test` | Regression and verification lane |

## Service-Level Development Commands

### TypeScript services (user-service, feedback-service, frontend)

```bash
cd user-service
bun run dev              # hot reload dev server
bun run type-check       # tsc --noEmit
bun run lint             # biome check
bun run db:generate      # drizzle-kit generate
bun run db:migrate       # drizzle-kit migrate
```

### Go services (menu-service, order-service, analytics-service, notification-service)

```bash
cd menu-service
go run ./cmd/server      # dev server
go vet ./...             # lint
go test ./...            # host-run tests (requires isolated-test postgres)
```

### Frontend

```bash
cd frontend
bun run dev              # Vite dev server
bun run type-check       # tsc --noEmit
bun run lint             # biome lint
bun run test             # vitest
bun run test:e2e         # Playwright
```

## Documentation

- `project_management/SYSTEM_ARCHITECTURE.md` — Cross-service architecture contract (authoritative)
- `docs/` — PRD, SRS, API contracts, data dictionary, diagrams, runbooks
- `[service]/ARCHITECTURE.md` — Per-service architecture detail
