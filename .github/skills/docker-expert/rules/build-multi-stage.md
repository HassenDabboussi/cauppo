---
title: Use Multi-Stage Builds
impact: CRITICAL
impactDescription: 90-98% smaller images (350 MB  8 MB for Go services)
tags: build, multi-stage, image-size, go, typescript, security
---

## Use Multi-Stage Builds

Multi-stage builds allow you to use a full SDK image for compilation without shipping compilers, test frameworks, or build tools to production. The final stage contains only the runtime artifact.

**Incorrect (ships entire Go SDK  350 MB):**

```dockerfile
FROM golang:1.24-alpine
WORKDIR /app
COPY . .
RUN go build -o server ./cmd/server
EXPOSE 8081
CMD ["./server"]
```

**Correct (Go  distroless runtime  ~8 MB):**

```dockerfile
FROM golang:1.24-alpine AS build
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o /bin/server ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /bin/server /server
EXPOSE 8081
USER nonroot:nonroot
ENTRYPOINT ["/server"]
```

**TypeScript / Bun (build deps  prod deps  runtime):**

```dockerfile
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.2-alpine AS build
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.2-distroless AS runtime
WORKDIR /app
COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist         ./dist
COPY --from=build /app/package.json ./
EXPOSE 3000
USER nonroot
ENTRYPOINT ["bun", "run", "dist/index.js"]
```

| Service | Without multi-stage | With multi-stage |
|---------|--------------------|--------------------|
| Go HTTP service | ~350 MB | ~8 MB |
| Bun/TypeScript service | ~900 MB | ~90 MB |
| React frontend (nginx) | ~900 MB | ~25 MB |
