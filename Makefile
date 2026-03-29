.PHONY: infra up down build logs ps db-init

ENV_FILE ?= envs/.env.development

COMPOSE = docker compose --env-file $(ENV_FILE)
INFRA_COMPOSE = docker compose --env-file $(ENV_FILE) -f docker-compose.infra.yml

# Start only infrastructure (postgres, redis, rabbitmq, zitadel)
infra:
	$(INFRA_COMPOSE) up -d

# Start all services
up:
	$(COMPOSE) up -d

# Stop all
down:
	$(COMPOSE) down

# Build all service images
build:
	$(COMPOSE) build

# View logs
logs:
	$(COMPOSE) logs -f

# Show status
ps:
	$(COMPOSE) ps

# Run database init
db-init:
	$(COMPOSE) exec postgres psql -U postgres -f /docker-entrypoint-initdb.d/init-db.sql