.PHONY: release-development-occupancy infra up down build logs ps db-init infra-test up-test down-test build-test logs-test ps-test isolated-test-postgres test-guard guard-development-env guard-isolated-test-env isolated-test-env frontend-e2e-debug user-service-verify-host feedback-service-verify-host

# Sprint 12b Task 2.1 releases development occupancy and keeps isolated-test as
# the only active repo-root runtime and suite lane.
DEVELOPMENT_ENV_FILE ?= envs/.env.development
ISOLATED_TEST_ENV_FILE ?= envs/.env.test
PLAYWRIGHT_ARGS ?=
COMPOSE_WAIT_TIMEOUT ?= 60

DEVELOPMENT_COMPOSE = docker compose --env-file $(DEVELOPMENT_ENV_FILE)
ISOLATED_TEST_COMPOSE = docker compose --env-file $(ISOLATED_TEST_ENV_FILE)
ISOLATED_TEST_INFRA_COMPOSE = docker compose --env-file $(ISOLATED_TEST_ENV_FILE) -f docker-compose.infra.yml

guard-development-env:
	@node -e "const rawFile=process.argv[1] ?? ''; const normalizedFile=rawFile.replace(/\\/g,'/'); const expected='envs/.env.development'; if (normalizedFile !== expected) { console.error('ERROR: development occupancy may only be released with envs/.env.development.'); process.exit(1); }" "$(DEVELOPMENT_ENV_FILE)"

# Fail closed if isolated-test consumers drift away from the approved repo-root
# test env file or reintroduce host/compose as separate environment identities.
guard-isolated-test-env:
	@node -e "const fs=require('node:fs'); const rawFile=process.argv[1] ?? ''; const normalizedFile=rawFile.replace(/\\/g,'/'); const expected='envs/.env.test'; if (normalizedFile !== expected) { console.error('ERROR: isolated-test consumers must use envs/.env.test.'); process.exit(1); } const content=fs.readFileSync(rawFile,'utf8'); const checks=[[ /^CAUPPO_ENV=test$$/m, 'ERROR: envs/.env.test must declare CAUPPO_ENV=test.' ], [ /^NODE_ENV=test$$/m, 'ERROR: envs/.env.test must declare NODE_ENV=test.' ], [ /^CAUPPO_ENV_PROVENANCE=isolated-test$$/m, 'ERROR: envs/.env.test must declare CAUPPO_ENV_PROVENANCE=isolated-test.' ], [ /^CAUPPO_TEST_ENV_APPROVED=true$$/m, 'ERROR: envs/.env.test must declare CAUPPO_TEST_ENV_APPROVED=true.' ], [ /^USER_SERVICE_DATABASE_URL=.*_test([?].*)?$$/m, 'ERROR: USER_SERVICE_DATABASE_URL must target a _test database.' ], [ /^FEEDBACK_SERVICE_DATABASE_URL=.*_test([?].*)?$$/m, 'ERROR: FEEDBACK_SERVICE_DATABASE_URL must target a _test database.' ], [ /^MENU_SERVICE_DATABASE_URL=.*_test([?].*)?$$/m, 'ERROR: MENU_SERVICE_DATABASE_URL must target a _test database.' ], [ /^ORDER_SERVICE_DATABASE_URL=.*_test([?].*)?$$/m, 'ERROR: ORDER_SERVICE_DATABASE_URL must target a _test database.' ], [ /^ANALYTICS_SERVICE_DATABASE_URL=.*_test([?].*)?$$/m, 'ERROR: ANALYTICS_SERVICE_DATABASE_URL must target a _test database.' ], [ /^ANALYTICS_SERVICE_ANALYTICS_READ_REPLICA_URL=.*_test([?].*)?$$/m, 'ERROR: ANALYTICS_SERVICE_ANALYTICS_READ_REPLICA_URL must target a _test database.' ], [ /^FRONTEND_VITE_APP_ENV=test$$/m, 'ERROR: FRONTEND_VITE_APP_ENV must stay on test for browser entrypoints.' ]]; for (const [pattern, message] of checks) { if (!pattern.test(content)) { console.error(message); process.exit(1); } }" "$(ISOLATED_TEST_ENV_FILE)"

# Release the previously proved development lane before switching the active
# runtime and suite surface to isolated-test.
release-development-occupancy: guard-development-env
	$(DEVELOPMENT_COMPOSE) down

# Start only infrastructure on the isolated-test lane.
infra: guard-isolated-test-env
	$(ISOLATED_TEST_INFRA_COMPOSE) up -d

# Start the full shared graph for the active isolated-test lane and wait on
# container health.
up: guard-isolated-test-env
	$(ISOLATED_TEST_COMPOSE) up -d --wait --wait-timeout $(COMPOSE_WAIT_TIMEOUT)

# Stop the active isolated-test lane.
down: guard-isolated-test-env
	$(ISOLATED_TEST_COMPOSE) down

# Build all service images for the active isolated-test lane.
build: guard-isolated-test-env
	$(ISOLATED_TEST_COMPOSE) build

# View logs for the active isolated-test lane.
logs: guard-isolated-test-env
	$(ISOLATED_TEST_COMPOSE) logs -f

# Show status for the active isolated-test lane.
ps: guard-isolated-test-env
	$(ISOLATED_TEST_COMPOSE) ps

# Run database init for the active isolated-test lane.
db-init: guard-isolated-test-env
	$(ISOLATED_TEST_COMPOSE) exec postgres psql -U postgres -f /docker-entrypoint-initdb.d/init-db.sql

# Thin aliases around the approved isolated-test direct-compose authority.
infra-test: infra

up-test: up

down-test: down

build-test: build

logs-test: logs

ps-test: ps

# Repo-root Go host verification no longer uses a dedicated helper script. The
# approved prerequisite is just the isolated-test postgres service on the same
# direct-compose graph owned by envs/.env.test.
isolated-test-postgres: guard-isolated-test-env
	$(ISOLATED_TEST_COMPOSE) up -d postgres

test-guard: guard-isolated-test-env

isolated-test-env: guard-isolated-test-env
	@echo $(ISOLATED_TEST_ENV_FILE)

# Run the frontend host Playwright wrapper against the approved repo-root
# isolated-test env. Targeted debug entrypoint only.
frontend-e2e-debug: guard-isolated-test-env
	@set -a; . "$(ISOLATED_TEST_ENV_FILE)"; set +a; cd frontend && node ./e2e/run-playwright.mjs host-debug $(PLAYWRIGHT_ARGS)

# Run the user-service host verification wrapper against the approved repo-root
# isolated-test env. Focused service check only.
user-service-verify-host: guard-isolated-test-env
	cd user-service && bun run verify:host

# Run the feedback-service host verification wrapper against the approved
# repo-root isolated-test env. Focused service check only.
feedback-service-verify-host: guard-isolated-test-env
	cd feedback-service && bun run verify:host
