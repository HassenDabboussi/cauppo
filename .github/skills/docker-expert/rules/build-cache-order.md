---
title: Optimize Layer Cache Order
impact: CRITICAL
impactDescription: 60-80% faster CI builds for unchanged services
tags: build, cache, layer-order, performance, go, typescript
---

## Optimize Layer Cache Order

Docker invalidates the cache for a layer and all subsequent layers when any file in a `COPY` instruction changes. Copy dependency manifest files before source code so the expensive install step is cached across most commits.

**Incorrect (source code before dependencies  cache busted on every change):**

```dockerfile
FROM golang:1.24-alpine AS build
WORKDIR /app
COPY . .                    # Any file change busts the entire cache
RUN go mod download         # Re-downloads every time
RUN go build -o /bin/server ./cmd/server
```

**Correct (dependency manifests first  install layer survives source edits):**

```dockerfile
FROM golang:1.24-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./       # Changes only when deps change
RUN go mod download         # Cached until go.mod/go.sum changes
COPY . .                    # Source code last
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /bin/server ./cmd/server
```

**TypeScript / Bun equivalent:**

```dockerfile
FROM oven/bun:1.2-alpine AS build
WORKDIR /app
COPY package.json bun.lockb ./   # Lock file first
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
```

In large monorepos this single rule reduces CI build time by 60-80% for unchanged services, since the `go mod download` / `bun install` step is cached.
