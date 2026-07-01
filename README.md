# Cauppo

QR-based restaurant ordering system — contactless dining from table scan to kitchen, real-time operations, and business analytics.

## Architecture

Cauppo is a **polyrepo** system. This repository is the **orchestration layer** — it owns Docker Compose topology, environment files, shared cross-service contracts, Traefik routing, and operational scripts. Each service lives in its own repository with independent history.

### Services

| Service | Language/Runtime | Port | Responsibility |
|---|---|---|---|
| `frontend` | React 19 + Vite + Bun | 8080 | Browser PWA, role-based workspaces |
| `user-service` | TypeScript + Hono + Bun | 3001 | Users, roles, organizations, restaurants, staff, subscriptions, auth orchestration |
| `feedback-service` | TypeScript + Hono + Bun | 3002 | Customer feedback, moderation, eligibility projection |
| `menu-service` | Go + Gin | 8081 | Menu catalog, categories, items, extras, tables, QR, promotions |
| `order-service` | Go + Gin | 8082 | Table sessions, shared cart, order lifecycle, payment state |
| `analytics-service` | Go + Gin | 8083 | Facts, rollups, live dashboards, owner reports |
| `notification-service` | Go + Gin + WebSocket | 8084 | Real-time operational fan-out via WebSocket and RabbitMQ |

### Infrastructure

| Component | Role |
|---|---|
| Traefik | Edge router for frontend, APIs, Zitadel, Mailpit, MinIO |
| PostgreSQL 18 | Single cluster, one database per service |
| Redis 8 | Cache, rate-limit, live analytics counters, WebSocket state |
| RabbitMQ 4 | Domain event bus |
| MinIO | Local S3-compatible storage |
| Mailpit | Local SMTP capture + browser mail UI |
| Zitadel | Identity authority (OIDC/OAuth2) |

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, TailwindCSS v4, shadcn/ui, Vitest, Playwright
- **TypeScript services:** Hono, Drizzle ORM, Biome
- **Go services:** Standard library HTTP + Gin, sql migrations
- **Auth:** Zitadel (OIDC), PAT-backed service-to-service
- **Formatting:** Biome (TS/JS), `go vet` (Go)

## Quick Start

The project supports exactly **two** local environments — never run them in parallel.

### Development

```bash
docker compose --env-file envs/.env.development up -d --wait --wait-timeout 60
```

### Isolated Test (regression lane)

```bash
docker compose --env-file envs/.env.test up -d --wait --wait-timeout 60
```

### Tear Down

```bash
docker compose --env-file envs/.env.development down
```

> **Important:** Never run `down -v`, `down --volumes`, or `docker volume rm` without explicit authorization — doing so destroys Zitadel auth state and requires manual console re-setup.

### Prerequisites

- Docker & Docker Compose
- For Go host-run tests: `docker compose --env-file envs/.env.test up -d postgres`
- Manual Zitadel console setup required after first bring-up of each environment

## Repository Structure

```
cauppo/
├── docker-compose.yml        # Full stack orchestration
├── traefik/                  # Edge router config
├── shared/                   # Cross-service schemas & event contracts
│   ├── contracts/
│   └── events/
├── scripts/                  # Utility & verification scripts
├── tests/                    # Cross-service contract tests
├── envs/                     # Environment config & auth state
├── envs_examples/            # Non-local reference templates
├── AGENTS.md                 # Developer operational guide
└── README.md
```

Each service directory (`user-service/`, `menu-service/`, `frontend/`, etc.) is an independent git repository with its own `ARCHITECTURE.md` and developer commands.

## Service-Level Development

```bash
# TypeScript services (user-service, feedback-service)
cd user-service && bun run dev     # hot reload
cd user-service && bun run type-check && bun run lint

# Go services (menu-service, order-service, analytics-service, notification-service)
cd menu-service && go run ./cmd/server
cd menu-service && go vet ./... && go test ./...

# Frontend
cd frontend && bun run dev
cd frontend && bun run type-check && bun run lint && bun run test
```

## Documentation

- `project_management/SYSTEM_ARCHITECTURE.md` — Cross-service architecture contract (authoritative)
- `docs/` — PRD, SRS, API contracts, data dictionary, diagrams, runbooks
- `[service]/ARCHITECTURE.md` — Per-service architecture authority
