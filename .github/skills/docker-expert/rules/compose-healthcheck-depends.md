---
title: Use service_healthy in depends_on
impact: HIGH
impactDescription: Prevents startup race conditions and connection refused crashes
tags: compose, healthcheck, depends-on, orchestration, startup
---

## Use service_healthy in depends_on

Without health-check conditions, Compose starts a dependent service as soon as the dependency *container* starts  not when the service *inside* is ready. A Go HTTP service that connects to Postgres before Postgres has finished initialization will crash with `connection refused`.

**Incorrect (starts when container process starts, not when service is ready):**

```yaml
services:
  expense-service:
    depends_on:
      - postgres      # Only waits for container to start, not for PG to accept connections
```

**Correct (health-check conditions on all dependencies):**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    secrets:
      - db_password

  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

  expense-service:
    image: expense:latest
    depends_on:
      postgres:
        condition: service_healthy   # Waits for pg_isready to pass
      rabbitmq:
        condition: service_healthy   # Waits for rabbitmq-diagnostics ping
```

Every service that has dependents must define a `healthcheck`. The `start_period` gives the service time to initialize before health checks begin counting retries.
