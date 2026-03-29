---
title: Use BuildKit Cache Mounts
impact: HIGH
impactDescription: Eliminates redundant network downloads; 30-70% faster rebuilds when deps change
tags: build, buildkit, cache, performance, go, bun
---

## Use BuildKit Cache Mounts

`--mount=type=cache` persists the package manager download cache across builds *on the same host*, even when dependency files change. Unlike layer caching, this avoids re-downloading packages from the internet on every cache miss.

**Incorrect (re-downloads all packages when go.sum changes):**

```dockerfile
COPY go.mod go.sum ./
RUN go mod download    # Full network download every time go.sum changes
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
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /bin/server ./cmd/server
```

**Bun equivalent:**

```dockerfile
# syntax=docker/dockerfile:1
FROM oven/bun:1.2-alpine AS build
WORKDIR /app
COPY package.json bun.lockb ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

COPY . .
RUN bun run build
```

**Activation:**

```bash
# Option 1: environment variable
DOCKER_BUILDKIT=1 docker build .

# Option 2: first-line directive in Dockerfile (recommended)
# syntax=docker/dockerfile:1
```

Cache mounts are particularly impactful in CI where the Go module cache can be hundreds of MB. Combined with GitHub Actions `cache-from: type=gha`, they make dependency downloads near-instant on repeat builds.
