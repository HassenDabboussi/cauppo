# Docker Expert

**Version 2.0.0**  
Docker Community  
February 2026

> **Note:**  
> This document is primarily for agents and LLMs to follow when writing, reviewing,  
> or refactoring Dockerfiles, Docker Compose configurations, and container infrastructure.  
> Guidance is optimized for automation and consistency by AI-assisted workflows.

---

## Abstract

Comprehensive Docker containerization guide designed for AI agents and developers. Contains 29 rules across 8 categories, prioritized by impact from critical (build optimization, security hardening) to incremental (advanced patterns). Each rule includes detailed explanations, real-world examples comparing incorrect vs. correct implementations, and specific impact metrics. Covers Go and TypeScript/Bun stacks as used in the spendsync microservices project.

---

## Table of Contents

1. [Build Optimization](#1-build-optimization)  **CRITICAL**
   - 1.1 [Optimize Layer Cache Order](#11-optimize-layer-cache-order)
   - 1.2 [Combine RUN Instructions](#12-combine-run-instructions)
   - 1.3 [Clean Package Cache in Same Layer](#13-clean-package-cache-in-same-layer)
   - 1.4 [Use Multi-Stage Builds](#14-use-multi-stage-builds)
   - 1.5 [Use a Comprehensive .dockerignore](#15-use-a-comprehensive-dockerignore)
   - 1.6 [Pin Base Image Versions](#16-pin-base-image-versions)
   - 1.7 [Use Minimal Base Images](#17-use-minimal-base-images)
   - 1.8 [Use BuildKit Cache Mounts](#18-use-buildkit-cache-mounts)
2. [Security Hardening](#2-security-hardening)  **CRITICAL**
   - 2.1 [Run as Non-Root User](#21-run-as-non-root-user)
   - 2.2 [Never Store Secrets in ENV](#22-never-store-secrets-in-env)
   - 2.3 [Use BuildKit Secret Mounts](#23-use-buildkit-secret-mounts)
   - 2.4 [Scan Images for Vulnerabilities](#24-scan-images-for-vulnerabilities)
3. [Compose & Orchestration](#3-compose--orchestration)  **HIGH**
   - 3.1 [Use service_healthy in depends_on](#31-use-service_healthy-in-depends_on)
   - 3.2 [Define Resource Limits](#32-define-resource-limits)
   - 3.3 [Separate Dev and Production Compose Files](#33-separate-dev-and-production-compose-files)
   - 3.4 [Use Docker Secrets for Sensitive Values](#34-use-docker-secrets-for-sensitive-values)
4. [Image Optimization](#4-image-optimization)  **HIGH**
   - 4.1 [Use Distroless or Alpine Runtime](#41-use-distroless-or-alpine-runtime)
   - 4.2 [Copy Only Required Artifacts](#42-copy-only-required-artifacts)
   - 4.3 [Minimize Final Layer Count](#43-minimize-final-layer-count)
5. [Runtime & Health](#5-runtime--health)  **MEDIUM-HIGH**
   - 5.1 [Add HEALTHCHECK Instruction](#51-add-healthcheck-instruction)
   - 5.2 [Use Exec Form for CMD and ENTRYPOINT](#52-use-exec-form-for-cmd-and-entrypoint)
   - 5.3 [Configure Restart Policies](#53-configure-restart-policies)
6. [Development Workflow](#6-development-workflow)  **MEDIUM**
   - 6.1 [Configure Hot Reload with Volume Mounts](#61-configure-hot-reload-with-volume-mounts)
   - 6.2 [Expose Debug Ports in Dev Only](#62-expose-debug-ports-in-dev-only)
   - 6.3 [Separate Build Targets for Dev and Prod](#63-separate-build-targets-for-dev-and-prod)
7. [Networking & Service Discovery](#7-networking--service-discovery)  **LOW-MEDIUM**
   - 7.1 [Use Internal Networks for Backend Services](#71-use-internal-networks-for-backend-services)
   - 7.2 [Use Docker DNS Service Names](#72-use-docker-dns-service-names)
8. [Advanced Patterns](#8-advanced-patterns)  **LOW**
   - 8.1 [Multi-Architecture Builds with buildx](#81-multi-architecture-builds-with-buildx)
   - 8.2 [Parameterize Builds with ARG](#82-parameterize-builds-with-arg)

---

## 1. Build Optimization

> **CRITICAL**  Directly affects build speed, cache efficiency, and image size in every CI/CD run.

---

### 1.1 Optimize Layer Cache Order

Copy dependency manifest files (`go.mod`, `package.json`, `bun.lockb`) before copying source code. Docker invalidates the cache for a layer and every subsequent layer when any file in the COPY glob changes. Since source code changes on every commit but dependency files change rarely, putting dependencies first means the expensive `go mod download` or `bun install` step is cached across most builds.

**Incorrect (cache busted on every source change):**

```dockerfile
FROM golang:1.24-alpine AS build
WORKDIR /app
# Copies everything  any file change invalidates the install cache
COPY . .
RUN go mod download
RUN go build -o /bin/server ./cmd/server
```

**Correct (install layer cached until go.mod changes):**

```dockerfile
FROM golang:1.24-alpine AS build
WORKDIR /app
# Only dependency manifests first
COPY go.mod go.sum ./
RUN go mod download
# Source code copied after  cache miss here doesn't re-run mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/server ./cmd/server
```

**TypeScript / Bun equivalent:**

```dockerfile
FROM oven/bun:1.2-alpine AS build
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
```

**Impact:** In large monorepos this optimization alone reduces CI build time by 60-80% for unchanged services.

---

### 1.2 Combine RUN Instructions

Each `RUN` instruction creates a new image layer. Unnecessary layers bloat final image size because Docker stores the filesystem diff for every layer, including files that were created and then deleted in separate steps. Chain related commands with `&&` and `\` for readability.

**Incorrect (3 layers, bloated image):**

```dockerfile
RUN apt-get update
RUN apt-get install -y curl git
RUN apt-get clean
```

**Correct (1 layer, cleanup included):**

```dockerfile
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

**Impact:** Combining all package installation into one layer typically saves 20-40 MB per image.

---

### 1.3 Clean Package Cache in Same Layer

Even when using multi-stage builds, cleaning the package cache inside the same `RUN` instruction is good hygiene. If you clean in a *separate* `RUN`, Docker commits the intermediate layer including the cache files before removing them; they remain in the image history and inflate registry storage.

**Incorrect (cache lives in a separate layer):**

```dockerfile
RUN apk add --no-cache git curl
RUN rm -rf /var/cache/apk/*  # Too late  previous layer already captured the cache
```

**Correct (clean in the same instruction):**

```dockerfile
# Alpine: --no-cache flag prevents writing cache at all
RUN apk add --no-cache git curl

# Debian/Ubuntu: update + install + clean in one RUN
RUN apt-get update && \
    apt-get install -y --no-install-recommends git curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

**Go service example:**

```dockerfile
FROM golang:1.24-alpine AS build
RUN apk add --no-cache gcc musl-dev
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download && go mod verify
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o /bin/server ./cmd/server
```

---

### 1.4 Use Multi-Stage Builds

Multi-stage builds allow you to use a full SDK image for compilation without shipping compilers, test frameworks, or build tools to production. The final image contains only the runtime artifact.

**Incorrect (ships entire Go SDK to production):**

```dockerfile
FROM golang:1.24-alpine
WORKDIR /app
COPY . .
RUN go build -o server ./cmd/server
EXPOSE 8080
CMD ["./server"]
# Image size: ~350 MB
```

**Correct (Go  build stage  distroless runtime):**

```dockerfile
#  Stage 1: Build 
FROM golang:1.24-alpine AS build
WORKDIR /app
RUN apk add --no-cache git ca-certificates tzdata
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o /bin/server ./cmd/server

#  Stage 2: Production runtime 
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /bin/server /server
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/server"]
# Image size: ~8 MB
```

**TypeScript / Bun example:**

```dockerfile
#  Stage 1: Install deps 
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

#  Stage 2: Build 
FROM oven/bun:1.2-alpine AS build
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

#  Stage 3: Production runtime 
FROM oven/bun:1.2-distroless AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
EXPOSE 3000
USER nonroot
ENTRYPOINT ["bun", "run", "dist/index.js"]
```

**Impact:** Typical reduction from 350-1000 MB to 8-80 MB.

---

### 1.5 Use a Comprehensive .dockerignore

The build context is tar-archived and sent to the Docker daemon before any `RUN` instruction executes. A missing `.dockerignore` can upload hundreds of megabytes (e.g., `node_modules`, `.git`, test fixtures) on every build, dramatically slowing CI.

**Incorrect (no .dockerignore  uploads everything):**

```
# No .dockerignore file  sends node_modules (500 MB), .git (50 MB), etc.
```

**Correct (.dockerignore for a full-stack TypeScript project):**

```dockerignore
# Version control
.git
.gitignore

# Dependencies (reinstalled inside Docker)
node_modules
.pnp
.pnp.js

# Build outputs (rebuilt inside Docker)
dist
build
.next
out

# Test artefacts
coverage
test-results
playwright-report
*.test.ts
*.spec.ts
e2e/

# Environment files with secrets
.env
.env.*
!.env.example

# Editor and OS artefacts
.vscode
.idea
*.DS_Store
Thumbs.db

# Docker files themselves
Dockerfile*
docker-compose*
.dockerignore

# Docs
*.md
docs/
```

**Go service .dockerignore:**

```dockerignore
.git
.gitignore
*_test.go
testdata/
coverage/
*.md
docs/
.vscode
.idea
bin/
```

**Impact:** Context upload time reduced from minutes to seconds; cache invalidation reduced.

---

### 1.6 Pin Base Image Versions

Using `:latest` or vague tags means your image may rebuild with a different base on different days, breaking reproducibility, introducing unexpected changes, and making CVE tracking impossible.

**Incorrect (non-deterministic builds):**

```dockerfile
FROM golang:latest
FROM node:alpine
FROM ubuntu
```

**Correct (pinned to minor + patch or digest):**

```dockerfile
# Pin to minor version at minimum
FROM golang:1.24-alpine3.21
FROM oven/bun:1.2-alpine
FROM nginx:1.27-alpine

# Or pin to immutable digest for maximum reproducibility
FROM golang:1.24-alpine3.21@sha256:abcd1234...
```

**Tag strategy for this project:**
- Go services: `golang:1.24-alpine` (build)  `gcr.io/distroless/static-debian12` (runtime)
- Bun services: `oven/bun:1.2-alpine` (build)  `oven/bun:1.2-distroless` (runtime)
- Frontend: `oven/bun:1.2-alpine` (build)  `nginx:1.27-alpine` (runtime)

---

### 1.7 Use Minimal Base Images

Full OS images (`ubuntu:22.04`, `debian:bookworm`) include package managers, shells, coreutils, and hundreds of libraries that most containers never use. Smaller base images mean faster pulls, smaller attack surface, and lower CVE count.

**Incorrect (bloated base):**

```dockerfile
FROM node:18          # ~900 MB, includes full Debian
FROM ubuntu:22.04     # ~77 MB, but adds many packages
FROM golang:1.24      # ~800 MB, ships whole SDK to production
```

**Correct (minimal base):**

```dockerfile
# Alpine  general purpose, ~5 MB
FROM alpine:3.21

# Distroless  no shell or package manager, ideal for Go/Java
FROM gcr.io/distroless/static-debian12:nonroot

# Slim  Debian without extras
FROM python:3.12-slim-bookworm
```

**Size comparison for a Go HTTP service:**

| Base image | Final size |
|-----------|-----------|
| `golang:1.24` | ~350 MB |
| `alpine:3.21` | ~15 MB |
| `distroless/static` | ~8 MB |
| `scratch` | ~6 MB |

---

### 1.8 Use BuildKit Cache Mounts

`--mount=type=cache` persists the package manager's download cache across builds on the same host. Unlike layer caching, this cache survives even when dependency files change, avoiding redundant network downloads.

**Incorrect (re-downloads all packages when go.sum changes):**

```dockerfile
RUN go mod download
```

**Correct (Go  cached module downloads):**

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.24-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/root/go/pkg/mod \
    go mod download
COPY . .
RUN --mount=type=cache,target=/root/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -o /bin/server ./cmd/server
```

**Bun / npm equivalent:**

```dockerfile
# syntax=docker/dockerfile:1
FROM oven/bun:1.2-alpine AS build
WORKDIR /app
COPY package.json bun.lockb ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
```

**Requirement:** Enable BuildKit with `DOCKER_BUILDKIT=1` or add `# syntax=docker/dockerfile:1` as the first line.

---

## 2. Security Hardening

> **CRITICAL**  Container security flaws can lead to privilege escalation, secret leakage, and full host compromise.

---

### 2.1 Run as Non-Root User

By default, Docker containers run as `root` (UID 0). If an attacker exploits a vulnerability in your process, running as root in the container maps to root on the host (absent user namespace remapping), enabling container escape or host filesystem access.

**Incorrect (runs as root):**

```dockerfile
FROM alpine:3.21
WORKDIR /app
COPY . .
CMD ["./server"]
# docker exec container whoami  root
```

**Correct (dedicated appuser, UID 1001):**

```dockerfile
FROM alpine:3.21 AS runtime
# Create group and user with explicit UID/GID
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app
COPY --chown=appuser:appgroup --from=build /bin/server ./server

USER 1001
EXPOSE 8080
ENTRYPOINT ["./server"]
```

**Distroless (nonroot built-in):**

```dockerfile
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /bin/server /server
USER nonroot:nonroot
ENTRYPOINT ["/server"]
```

Use numeric UID (`USER 1001`) rather than username so it works even without `/etc/passwd` in distroless images.

---

### 2.2 Never Store Secrets in ENV

`ENV` values are baked into the image metadata and visible to anyone who runs `docker inspect` or can access the registry. They also appear in `docker history` and CI logs.

**Incorrect (secret baked into image):**

```dockerfile
ENV DATABASE_URL=postgres://user:password@db:5432/mydb
ENV API_KEY=sk-prod-abc123...
```

**Correct  runtime secrets via environment injection:**

```yaml
# docker-compose.yml  inject at runtime, not build time
services:
  api:
    image: myapp:latest
    environment:
      - DATABASE_URL      # Value comes from host environment or .env file
    env_file:
      - .env.prod         # Never committed; lives on VPS only
```

**Correct  build-time values use ARG (not ENV):**

```dockerfile
# ARG is not persisted in the final image
ARG GO_VERSION=1.24
FROM golang:${GO_VERSION}-alpine AS build
```

**Key rule:** If a value needs to be secret, it must arrive at runtime via environment injection, Docker secrets, or a secrets manager  never baked into a layer.

---

### 2.3 Use BuildKit Secret Mounts

When a build step requires a secret (e.g., pulling a private Go module, authenticating to npm), use `--mount=type=secret`. The secret is mounted as a temporary file during that `RUN` step and never written into any image layer.

**Incorrect (secret baked into layer):**

```dockerfile
ARG GITHUB_TOKEN
RUN git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
RUN go mod download
# GITHUB_TOKEN visible in docker history and image metadata
```

**Correct (secret mount  never stored in image):**

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.24-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN --mount=type=secret,id=github_token \
    git config --global url."https://$(cat /run/secrets/github_token)@github.com/".insteadOf "https://github.com/" && \
    go mod download

# Build with the secret
COPY . .
RUN --mount=type=secret,id=github_token \
    git config --global url."https://$(cat /run/secrets/github_token)@github.com/".insteadOf "https://github.com/" && \
    CGO_ENABLED=0 go build -o /bin/server ./cmd/server
```

**Usage:**

```bash
docker build --secret id=github_token,env=GITHUB_TOKEN .
# In CI: set GITHUB_TOKEN as a CI secret variable
```

---

### 2.4 Scan Images for Vulnerabilities

Shipping unscanned images to production means unknown CVEs. Integrate scanning into CI so builds fail on high/critical vulnerabilities before reaching the registry.

**Incorrect (no scanning in pipeline):**

```yaml
# .github/workflows/deploy.yml
- uses: docker/build-push-action@v6
  with:
    push: true
    tags: myapp:latest
# Pushed with unknown CVEs
```

**Correct (scan before push with Docker Scout):**

```yaml
- uses: docker/build-push-action@v6
  with:
    push: false
    load: true
    tags: myapp:latest

- uses: docker/scout-action@v1
  with:
    command: cves
    image: myapp:latest
    only-severities: critical,high
    exit-code: true   # Fail CI on critical/high CVEs

- uses: docker/build-push-action@v6
  if: success()
  with:
    push: true
    tags: myapp:latest
```

**Trivy alternative (free, open-source):**

```yaml
- uses: aquasecurity/trivy-action@master
  with:
    image-ref: myapp:latest
    format: table
    exit-code: 1
    severity: CRITICAL,HIGH
```

---

## 3. Compose & Orchestration

> **HIGH**  Incorrect orchestration leads to race conditions, data loss, and silent partial failures.

---

### 3.1 Use service_healthy in depends_on

Without health-check conditions, Docker Compose starts dependent services as soon as the dependency container is *running*  not when it's *ready*. A service starting before the database accepts connections will crash and may not restart.

**Incorrect (depends only on container start):**

```yaml
services:
  api:
    image: myapp:latest
    depends_on:
      - postgres      # Starts when postgres container starts, not when it's ready
```

**Correct (wait for healthy status):**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: myapp:latest
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
```

---

### 3.2 Define Resource Limits

Without resource limits a single runaway container can starve the host, killing all other services. In production this causes cascading failures. In development it prevents accidental memory leaks from consuming all RAM.

**Incorrect (no limits  unbounded resource use):**

```yaml
services:
  expense-service:
    image: expense:latest
    # No resource limits
```

**Correct (CPU and memory limits + reservations):**

```yaml
services:
  expense-service:
    image: expense:latest
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 256M
        reservations:
          cpus: "0.10"
          memory: 64M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
```

**Development compose (relaxed limits):**

```yaml
services:
  expense-service:
    build:
      context: ../services/expense
      target: dev
    deploy:
      resources:
        limits:
          memory: 512M
```

---

### 3.3 Separate Dev and Production Compose Files

A single Compose file that tries to serve both development and production ends up with insecure debug ports exposed, missing resource limits, and environment-specific hacks that break one environment.

**Incorrect (one file for everything):**

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports:
      - "8080:8080"
      - "9229:9229"         # debug port always exposed
    volumes:
      - .:/app              # always mounted
    environment:
      - NODE_ENV=development
```

**Correct (base + overrides):**

```yaml
# docker-compose.yml (base  shared config)
services:
  api:
    image: "${IMAGE_PREFIX}/expense-service:${TAG:-latest}"
    networks:
      - spendsync-net
    environment:
      - SERVER_PORT=8081

# docker-compose.override.yml (dev  auto-merged by `docker compose up`)
services:
  api:
    build:
      context: ../services/expense
      target: dev
    volumes:
      - ../services/expense:/app
    ports:
      - "8081:8081"
      - "2345:2345"    # Delve debugger
    environment:
      - GO_ENV=development

# docker-compose.prod.yml (production  explicit: `docker compose -f ... -f ... up`)
services:
  api:
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 256M
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.expense.rule=PathPrefix(`/api/groups`)"
```

---

### 3.4 Use Docker Secrets for Sensitive Values

Plain `environment` keys in Compose expose values in `docker inspect` output and process environment listings. Docker secrets mount values as files with restricted permissions, invisible to inspect.

**Incorrect (secret in environment):**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: supersecretpassword   # Visible in `docker inspect`
```

**Correct (Docker secret):**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

secrets:
  db_password:
    external: true     # Created with: docker secret create db_password -
    # Or file-based for local dev:
    # file: ./secrets/db_password.txt
```

---

## 4. Image Optimization

> **HIGH**  Smaller images mean faster CI, faster deployments, and reduced registry costs.

---

### 4.1 Use Distroless or Alpine Runtime

Full OS base images include shells, package managers, cron, and hundreds of binaries that production services never need. Distroless images contain only the language runtime and essential certificates.

**Incorrect (full OS in production):**

```dockerfile
FROM node:18          # 900 MB  full Debian, npm, yarn, build tools
FROM golang:1.24      # 800 MB  ships build toolchain to production
```

**Correct (Go  distroless):**

```dockerfile
FROM gcr.io/distroless/static-debian12:nonroot
# Contains: glibc, SSL certs, timezone data. Nothing else.
# No shell, no package manager, no attack surface.
COPY --from=build /bin/server /server
ENTRYPOINT ["/server"]
# Final size: ~8 MB
```

**Correct (Bun  distroless):**

```dockerfile
FROM oven/bun:1.2-distroless
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
ENTRYPOINT ["bun", "run", "dist/index.js"]
# Final size: ~90 MB
```

**Correct (Frontend  nginx:alpine):**

```dockerfile
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
# Final size: ~25 MB
```

---

### 4.2 Copy Only Required Artifacts

`COPY . .` from a build stage copies everything, including source code, test files, and intermediate artefacts, into the runtime image. Be explicit about what the production stage needs.

**Incorrect (copies everything from build stage):**

```dockerfile
FROM alpine:3.21 AS runtime
COPY --from=build /app /app    # Copies source, tests, node_modules, tmp files
```

**Correct (Go  copy only the compiled binary):**

```dockerfile
FROM gcr.io/distroless/static-debian12:nonroot AS runtime
# Only the binary and required runtime data
COPY --from=build /bin/server /server
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
```

**Correct (Bun  copy only dist + prod node_modules):**

```dockerfile
FROM oven/bun:1.2-distroless AS runtime
WORKDIR /app
COPY --from=deps   /app/node_modules ./node_modules
COPY --from=build  /app/dist         ./dist
COPY --from=build  /app/package.json ./
# Source code, tests, dev deps never copied
```

**Correct (Frontend  only built assets):**

```dockerfile
FROM nginx:1.27-alpine AS runtime
# Only compiled HTML/JS/CSS
COPY --from=build /app/dist  /usr/share/nginx/html
COPY nginx.conf               /etc/nginx/conf.d/default.conf
```

---

### 4.3 Minimize Final Layer Count

Every instruction in a Dockerfile creates a layer. While Docker deduplicates identical layers across images, having hundreds of layers in a single image increases manifest size, slows pulls on first run, and complicates debugging with `docker history`.

**Incorrect (excessive separate instructions):**

```dockerfile
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y git
RUN apt-get clean
RUN rm -rf /var/lib/apt/lists/*
COPY config.yaml /etc/app/
COPY certs/ /etc/app/certs/
COPY migrations/ /etc/app/migrations/
```

**Correct (grouped instructions):**

```dockerfile
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY config.yaml certs/ migrations/ /etc/app/
```

**Target layer counts:**
- Build stage:  15 layers (complexity acceptable)
- Production runtime stage:  8 layers

---

## 5. Runtime & Health

> **MEDIUM-HIGH**  Unhealthy containers without proper signal handling cause silent failures and zombie processes.

---

### 5.1 Add HEALTHCHECK Instruction

Without a `HEALTHCHECK`, Docker (and orchestrators like Dokploy/Docker Swarm) report the container as `healthy` as long as the process is running, even if the HTTP server is deadlocked or the database connection pool is exhausted.

**Incorrect (no health check):**

```dockerfile
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /bin/server /server
ENTRYPOINT ["/server"]
# Container always "Up" even if server is deadlocked
```

**Correct (HTTP health check):**

```dockerfile
FROM alpine:3.21 AS runtime
RUN apk add --no-cache curl
# ...
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8081/health || exit 1
ENTRYPOINT ["/server"]
```

**Correct (distroless  use wget or custom binary):**

```dockerfile
# For distroless, include a health-check binary or use CMD-shell form with sh
# Alternative: use Compose-level healthcheck instead
```

**Compose-level health check (works with distroless):**

```yaml
services:
  expense-service:
    image: expense:latest
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8081/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
```

**Health endpoint contract (all services must implement):**

```go
// Go: GET /health
func healthHandler(w http.ResponseWriter, r *http.Request) {
    json.NewEncoder(w).Encode(map[string]string{
        "status":  "ok",
        "service": "expense-service",
    })
}
```

---

### 5.2 Use Exec Form for CMD and ENTRYPOINT

Shell form (`CMD ./server`) runs the command through `/bin/sh -c`, which becomes the container's PID 1. This intermediate shell does not forward OS signals (SIGTERM, SIGINT) to your process, causing unclean shutdowns and 10-second timeout kills.

**Incorrect (shell form  signals swallowed):**

```dockerfile
CMD ./server                # PID 1 is sh, not server
ENTRYPOINT "/bin/server"    # Also shell form
```

**Correct (exec form  process is PID 1):**

```dockerfile
# Exec form: JSON array  process receives signals directly
ENTRYPOINT ["/server"]
# or
CMD ["/server", "--port", "8081"]
```

**Go graceful shutdown example:**

```go
func main() {
    srv := &http.Server{Addr: ":8081", Handler: mux}
    
    // Channel to listen for OS signals
    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGTERM, syscall.SIGINT)
    
    go func() {
        if err := srv.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatal(err)
        }
    }()
    
    <-stop
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    srv.Shutdown(ctx)
}
```

---

### 5.3 Configure Restart Policies

Without restart policies, crashed containers stay down until manually restarted. In production this means downtime for transient errors (OOM, network hiccup, startup race).

**Incorrect (no restart policy):**

```yaml
services:
  expense-service:
    image: expense:latest
    # No restart  stays down after crash
```

**Correct (development  restart on failure only):**

```yaml
services:
  expense-service:
    restart: on-failure   # Restarts on non-zero exit, not manual stops
```

**Correct (production  unless manually stopped):**

```yaml
services:
  expense-service:
    restart: unless-stopped
    deploy:
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
```

**Restart policy values:**

| Policy | Behaviour |
|--------|-----------|
| `no` | Never restart (default) |
| `on-failure` | Restart only on non-zero exit |
| `always` | Always restart, including manual stops |
| `unless-stopped` | Restart unless explicitly stopped by operator |

---

## 6. Development Workflow

> **MEDIUM**  Good development containers dramatically shorten the feedback loop.

---

### 6.1 Configure Hot Reload with Volume Mounts

In development, rebuilding and restarting a container on every file change adds 10-30 seconds of latency. Bind-mounting the source directory and running a file watcher inside the container gives near-instant feedback.

**Incorrect (rebuild container on every change):**

```bash
# Developer workflow: edit file  docker build  docker run  test  repeat
docker build -t expense . && docker run expense
```

**Correct (Go  Air hot reload):**

```dockerfile
# Dockerfile  dev target
FROM golang:1.24-alpine AS dev
RUN go install github.com/air-verse/air@latest
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
# Source mounted from host; Air watches for changes
CMD ["air", "-c", ".air.toml"]
```

```yaml
# docker-compose.override.yml
services:
  expense-service:
    build:
      context: ../services/expense
      target: dev
    volumes:
      - ../services/expense:/app   # Bind mount source
      - /app/tmp                   # Named volume to prevent overlap
    ports:
      - "8081:8081"
    environment:
      - GO_ENV=development
```

**Correct (Bun  watch mode):**

```dockerfile
FROM oven/bun:1.2-alpine AS dev
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
CMD ["bun", "--watch", "src/index.ts"]
```

```yaml
services:
  notification-service:
    build:
      context: ../services/notification
      target: dev
    volumes:
      - ../services/notification:/app
      - /app/node_modules          # Prevent host overwrite
```

---

### 6.2 Expose Debug Ports in Dev Only

Debug ports should never be exposed in production images or compose files. They allow unauthenticated code execution on any machine that can reach the port.

**Incorrect (debug port in production compose):**

```yaml
# docker-compose.prod.yml
services:
  expense-service:
    ports:
      - "8081:8081"
      - "2345:2345"   # Delve debugger exposed to internet
```

**Correct (debug port in dev override only):**

```yaml
# docker-compose.override.yml (dev only)
services:
  expense-service:
    ports:
      - "8081:8081"
      - "2345:2345"   # Delve: only available in dev, never in prod

  notification-service:
    ports:
      - "3001:3001"
      - "9229:9229"   # Node/Bun inspector
```

**Go Delve setup:**

```dockerfile
FROM golang:1.24-alpine AS dev
RUN go install github.com/go-delve/delve/cmd/dlv@latest
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
CMD ["dlv", "debug", "--headless", "--listen=:2345", "--api-version=2", "./cmd/server"]
```

---

### 6.3 Separate Build Targets for Dev and Prod

Using a single stage for both development and production means shipping dev tools, debug symbols, and test frameworks to production, inflating image size and attack surface.

**Incorrect (single stage  ships dev tools):**

```dockerfile
FROM golang:1.24-alpine
RUN go install github.com/air-verse/air@latest   # Shipped to production
RUN go install github.com/go-delve/delve/cmd/dlv@latest
WORKDIR /app
COPY . .
RUN go build -o server ./cmd/server
CMD ["./server"]
```

**Correct (named targets):**

```dockerfile
# syntax=docker/dockerfile:1

#  Base: shared setup 
FROM golang:1.24-alpine AS base
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

#  Dev: includes hot-reload and debugger 
FROM base AS dev
RUN go install github.com/air-verse/air@latest && \
    go install github.com/go-delve/delve/cmd/dlv@latest
COPY . .
CMD ["air", "-c", ".air.toml"]

#  Build: compiles optimized binary 
FROM base AS build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /bin/server ./cmd/server

#  Production: minimal runtime 
FROM gcr.io/distroless/static-debian12:nonroot AS production
COPY --from=build /bin/server /server
USER nonroot:nonroot
ENTRYPOINT ["/server"]
```

**Usage:**

```bash
docker build --target dev -t expense:dev .
docker build --target production -t expense:prod .
```

---

## 7. Networking & Service Discovery

> **LOW-MEDIUM**  Correct networking prevents unintended external exposure and simplifies service communication.

---

### 7.1 Use Internal Networks for Backend Services

By default, Docker bridge networks are accessible from the host. Backend services (databases, message queues, internal APIs) should be on `internal: true` networks, blocking all external traffic even if a port is accidentally published.

**Incorrect (all services on same reachable network):**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"   # Database reachable from host network
    networks:
      - app-net

networks:
  app-net:
    driver: bridge
```

**Correct (backend on internal network):**

```yaml
services:
  expense-service:
    networks:
      - frontend-net   # Accepts traffic from Traefik
      - backend-net    # Talks to DB and RabbitMQ

  postgres:
    image: postgres:16-alpine
    networks:
      - backend-net    # Not reachable from outside
    # No ports: directive  never published to host

  rabbitmq:
    image: rabbitmq:3.13-alpine
    networks:
      - backend-net

  traefik:
    image: traefik:v3
    networks:
      - frontend-net
    ports:
      - "80:80"
      - "443:443"

networks:
  frontend-net:
    driver: bridge
  backend-net:
    driver: bridge
    internal: true    # Blocks external access completely
```

---

### 7.2 Use Docker DNS Service Names

Docker's embedded DNS resolves container names within the same network. Hard-coding IPs or using `localhost` breaks across restarts (containers get new IPs) and makes configs non-portable.

**Incorrect (hard-coded IP):**

```go
// Go service
db, err := sql.Open("postgres", "postgres://user:pass@172.18.0.3:5432/mydb")
```

**Incorrect (localhost  only works if same container):**

```yaml
environment:
  DATABASE_URL: postgres://user:pass@localhost:5432/mydb
```

**Correct (Docker service name as hostname):**

```yaml
# docker-compose.yml
services:
  expense-service:
    environment:
      DATABASE_URL: postgres://user:pass@postgres:5432/expense_db
      RABBITMQ_URL: amqp://user:pass@rabbitmq:5672/

  postgres:
    image: postgres:16-alpine
    # Service name "postgres" is the DNS hostname within the network
```

```go
// Go  reads from environment variable
dsn := os.Getenv("DATABASE_URL")  // postgres://user:pass@postgres:5432/expense_db
db, err := sql.Open("postgres", dsn)
```

---

## 8. Advanced Patterns

> **LOW**  Situational patterns for specific production needs.

---

### 8.1 Multi-Architecture Builds with buildx

On Apple Silicon (arm64) development machines, images built with `docker build` default to `linux/arm64`. Production servers (Hetzner) run `linux/amd64`. Mismatch causes `exec format error` at runtime.

**Incorrect (architecture mismatch):**

```bash
# Built on M2 Mac, produces arm64 image
docker build -t myapp:latest .
docker push myapp:latest
# Deployed to amd64 Hetzner VPS  crashes with "exec format error"
```

**Correct (multi-arch with buildx):**

```bash
# Create a multi-arch builder
docker buildx create --name multiarch --driver docker-container --use
docker buildx inspect --bootstrap

# Build and push manifest list for both architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag ghcr.io/myorg/expense-service:latest \
  --push \
  spendsync/services/expense/
```

**GitHub Actions (preferred  runs on amd64):**

```yaml
- uses: docker/setup-buildx-action@v3

- uses: docker/build-push-action@v6
  with:
    context: spendsync/services/expense
    platforms: linux/amd64,linux/arm64
    push: true
    tags: ${{ steps.meta.outputs.tags }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

---

### 8.2 Parameterize Builds with ARG

`ARG` allows passing build-time variables without baking them into the image. Useful for version pinning, feature flags, or varying configuration between environments without multiple Dockerfiles.

**Incorrect (hardcoded values, requires Dockerfile edit to change):**

```dockerfile
FROM golang:1.24-alpine
ENV SERVER_PORT=8081
```

**Correct (parameterized with defaults):**

```dockerfile
# syntax=docker/dockerfile:1

# App version injected by CI
ARG APP_VERSION=dev
ARG BUILD_DATE
ARG GIT_COMMIT=unknown

FROM golang:1.24-alpine AS build
ARG APP_VERSION
ARG GIT_COMMIT

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s -X main.version=${APP_VERSION} -X main.commit=${GIT_COMMIT}" \
    -o /bin/server ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
ARG APP_VERSION
ARG BUILD_DATE
# OCI standard labels
LABEL org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.source="https://github.com/myorg/spendsync"
COPY --from=build /bin/server /server
ENTRYPOINT ["/server"]
```

**CI usage:**

```bash
docker build \
  --build-arg APP_VERSION=$(git tag --points-at HEAD) \
  --build-arg BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --build-arg GIT_COMMIT=$(git rev-parse --short HEAD) \
  -t expense-service:latest \
  spendsync/services/expense/
```

---

## References

- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [BuildKit Documentation](https://docs.docker.com/build/buildkit/)
- [Distroless Images](https://github.com/GoogleContainerTools/distroless)
- [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [Docker Scout Vulnerability Scanning](https://docs.docker.com/scout/)
- [Multi-platform builds with buildx](https://docs.docker.com/build/building/multi-platform/)
