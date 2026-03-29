---
title: Clean Package Cache in Same Layer
impact: CRITICAL
impactDescription: Prevents 10-100 MB of cached packages from persisting in image
tags: build, cache, layers, apt, apk, cleanup
---

## Clean Package Cache in Same Layer

Package managers write download caches to disk during installation. If you clean the cache in a *separate* `RUN` instruction, Docker has already committed the intermediate layer containing the cache files. Those bytes remain in the image history and inflate registry storage even though the data is logically deleted.

**Incorrect (cache committed in an earlier layer):**

```dockerfile
RUN apt-get update && apt-get install -y git
RUN rm -rf /var/lib/apt/lists/*   # Too late  previous layer captured cache
```

**Correct (cleanup in same instruction  never committed):**

```dockerfile
RUN apt-get update && \
    apt-get install -y --no-install-recommends git curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

**Alpine (cleanest approach  never creates cache):**

```dockerfile
RUN apk add --no-cache git curl tzdata
```

**Go build stage example:**

```dockerfile
FROM golang:1.24-alpine AS build
RUN apk add --no-cache gcc musl-dev ca-certificates tzdata
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download && go mod verify
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o /bin/server ./cmd/server
```
