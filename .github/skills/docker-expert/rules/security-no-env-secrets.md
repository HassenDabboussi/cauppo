---
title: Never Store Secrets in ENV
impact: CRITICAL
impactDescription: Prevents secret leakage via docker inspect, image layers, and CI logs
tags: security, secrets, env, environment-variables, hardening
---

## Never Store Secrets in ENV

`ENV` instructions are baked into the image metadata, visible to anyone with `docker inspect`, readable from `docker history`, and printed in CI build logs. Every person who pulls the image gains access to the secret.

**Incorrect (secret in image layer):**

```dockerfile
ENV DATABASE_URL=postgres://user:password@db:5432/mydb
ENV JWT_SECRET=super-secret-signing-key
ENV API_KEY=sk-prod-abc123...
```

**Correct  inject secrets at runtime via Compose env_file:**

```yaml
# docker-compose.yml
services:
  expense-service:
    image: expense:latest
    env_file:
      - .env.prod      # Lives on VPS only; never committed to git
```

**Correct  reference from host environment (CI/CD):**

```yaml
services:
  expense-service:
    environment:
      JWT_SECRET:          # Value comes from host env or GitHub Actions secret
      DATABASE_URL:        # Not defined here  must exist in environment
```

**Correct  build-time non-secret config uses ARG (not ENV):**

```dockerfile
# ARG is scoped to the build step; not persisted in final image
ARG GO_VERSION=1.24
FROM golang:${GO_VERSION}-alpine AS build
# ...

# If you need a ENV-derived value at runtime, pass it at container start:
# docker run -e SERVER_PORT=8081 expense:latest
```

**Key distinction:**
- `ARG`  build-time variable, not in final image metadata
- `ENV`  runtime variable baked into image, visible in `docker inspect`
- `env_file` / `-e` / `environment:`  runtime injection, not in image

Add `.env` and `.env.*` (except `.env.example`) to both `.gitignore` and `.dockerignore`.
