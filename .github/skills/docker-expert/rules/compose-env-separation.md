---
title: Separate Dev and Production Compose Files
impact: HIGH
impactDescription: Prevents debug ports and dev volumes from reaching production
tags: compose, env, dev, production, separation, override
---

## Separate Dev and Production Compose Files

A single Compose file that serves both environments accumulates hacks: debug ports that must be commented out for prod, volumes that break production, and environment-specific flags that silently break one environment.

**Incorrect (one file with environment hacks):**

```yaml
# docker-compose.yml
services:
  expense-service:
    build: ../services/expense
    volumes:
      - ../services/expense:/app   # Dev volume  breaks production
    ports:
      - "8081:8081"
      - "2345:2345"                # Debug port  dangerous in production
    environment:
      - GO_ENV=development         # Hardcoded dev environment
```

**Correct (base + dev override + prod file):**

```yaml
# docker-compose.yml (base  shared, minimal)
services:
  expense-service:
    image: "${IMAGE_PREFIX:-ghcr.io/myorg/spendsync}/expense-service:${TAG:-latest}"
    networks:
      - spendsync-net
    environment:
      SERVER_PORT: "8081"
      POSTGRES_HOST: postgres
      RABBITMQ_HOST: rabbitmq

networks:
  spendsync-net:
    driver: bridge
```

```yaml
# docker-compose.override.yml (auto-merged in dev with `docker compose up`)
services:
  expense-service:
    build:
      context: ../services/expense
      target: dev
    volumes:
      - ../services/expense:/app
      - /app/tmp
    ports:
      - "8081:8081"
      - "2345:2345"
    environment:
      GO_ENV: development
```

```yaml
# docker-compose.prod.yml (explicit: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up`)
services:
  expense-service:
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 256M
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.expense.rule=PathPrefix(`/api/groups`)"
      - "traefik.http.routers.expense.entrypoints=websecure"
      - "traefik.http.services.expense.loadbalancer.server.port=8081"
```

**Dev workflow:** `docker compose up`   (auto-merges override)
**Prod workflow:** `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
