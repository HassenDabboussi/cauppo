# AGENTS.md — Cauppo

Compact operational guide for OpenCode sessions.

## Project Model

Polyrepo: each service directory is an independent git repository with its own history. The workspace root is an orchestration layer, not a unified monorepo.

## Repository Layout

- **TypeScript/Bun services**: `user-service/`, `feedback-service/` — Hono, Drizzle ORM, Biome.
- **Go services**: `menu-service/`, `order-service/`, `analytics-service/`, `notification-service/` — standard library HTTP, sql migrations.
- **Frontend**: `frontend/` — Vite + React 19, TailwindCSS v4, Biome, Vitest, Playwright.
- **Shared**: `shared/events/`, `shared/contracts/` — cross-service schemas.
- **Docs**: `docs/` — PRD, SRS, API contracts, data dictionary, UI canvases, diagrams. These are living references; implementation reality takes precedence when they diverge.
- **Project management**: `project_management/` — `SYSTEM_ARCHITECTURE.md` is the cross-service contract authority.
- **Per-service docs**: `[service]/ARCHITECTURE.md` is the service-specific authority.
- **Orchestration**: Root `docker-compose.yml`, `envs/`.

## Environment Identities

Exactly **two** local environments. Never run them in parallel.

| Identity | Env file | Volume namespace |
|---|---|---|
| `development` | `envs/.env.development` | `cauppo-development` |
| `isolated-test` | `envs/.env.test` | `cauppo-isolated-test` |

- `isolated-test` is the canonical regression/test lane (`CAUPPO_ENV=test`, `NODE_ENV=test`, `_test` DB suffixes).
- `development` is the active runtime lane.
- Switching lanes: tear down the active lane first (`docker compose --env-file envs/.env.development down`).

## Red Line — Volume Destruction

**Never** run `docker compose down -v`, `docker compose down --volumes`, `docker volume rm`, or any volume-destructive teardown unless the user has explicitly authorized it in the current conversation. Preserving existing runtime and auth state is the default.

## Orchestration Commands

Makefile is **deprecated**. Use direct docker compose.

```bash
# Development lane
docker compose --env-file envs/.env.development up -d --wait --wait-timeout 60
docker compose --env-file envs/.env.development down

# Isolated-test lane
docker compose --env-file envs/.env.test up -d --wait --wait-timeout 60
docker compose --env-file envs/.env.test down
```

Isolated-test postgres-only prerequisite (for Go host-run tests):
```bash
docker compose --env-file envs/.env.test up -d postgres
```

## Service-Level Developer Commands

### TypeScript services (user-service, feedback-service)

Run from the service directory.

```bash
bun run dev                 # hot reload
bun run build               # bundle to ./dist
bun run type-check          # tsc --noEmit (MUST pass first)
bun run lint                # biome check
bun run format              # biome format --write
bun run db:generate         # drizzle-kit generate
bun run db:migrate          # drizzle-kit migrate
bun run verify:isolated-test:host-run   # type-check + host-run tests
```

### Go services (menu, order, analytics, notification)

Run from the service directory.

```bash
go run ./cmd/server         # dev server
go build -o ./bin/server ./cmd/server   # build
go test ./...               # host-run tests (requires ../envs/.env.test)
go vet ./...                # lint
```

Host-run tests normalize Docker hostnames to `127.0.0.1` via the service Makefile (still used internally by `go test` env setup, not for orchestration) and require the isolated-test postgres service to be running.

### Frontend

Run from `frontend/`.

```bash
bun run dev                 # Vite dev server
bun run build               # production build
bun run type-check          # tsc --noEmit for both tsconfig.app + tsconfig.node
bun run lint                # biome lint
bun run format              # biome format --write
bun run test                # vitest run (both default + compose-backed projects)
bun run test:e2e            # Playwright host-run against envs/.env.test
```

Playwright has **dedicated proof lanes** gated by env vars (e.g. `CAUPPO_PLAYWRIGHT_PHASE3_PROOF=true`). See `playwright.config.ts`.

## Verification Order

1. **TypeScript zero-error rule**: `tsc --noEmit` must pass before tests or review approval.
2. **Go**: `go vet ./...` before tests.
3. **Tests**: host-run suites load `envs/.env.test` and require isolated-test infra to be up.

## Auth & State Preservation

- Zitadel (IAM) requires **manual console setup** after the first bring-up of each environment.
- The Zitadel DB and its PAT file (`envs/.local/<env>/iam-login-client.<env>.pat`) are a **required pair** per environment.
- Normal restarts must preserve existing DB state and PATs.

## Lint & Format

- **TypeScript/Frontend**: Biome (`@biomejs/biome`). Single quotes, semicolons `asNeeded`, spaces, trailing commas `all`.
- **Go**: `go vet ./...`. `.golangci.yml` enables `govet` only.

## Important Constraints

- Only `envs/.env.development` and `envs/.env.test` are approved for repo-root orchestration. Do not invent new local env identities.
- `envs_examples/` files are non-local reference templates only.
- When adding a new env variable, add it to both committed local env files, map it in `docker-compose.yml`, and update the service's config validation layer.
- Project management artifacts live under `project_management/`. Per-service architecture docs live at `[service]/ARCHITECTURE.md`.
- Documentation hierarchy: `SYSTEM_ARCHITECTURE.md` > `[service]/ARCHITECTURE.md` > `DESIGN_SPEC_task_y.md` > failing test.
- Implementation reality takes precedence over docs when they conflict; flag discrepancies but follow the code.
