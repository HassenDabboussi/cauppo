---
title: Add HEALTHCHECK Instruction
impact: MEDIUM-HIGH
impactDescription: Enables automatic restart of deadlocked containers; required by Dokploy
tags: runtime, healthcheck, orchestration, dokploy, monitoring
---

## Add HEALTHCHECK Instruction

Without a `HEALTHCHECK`, Docker reports a container as `healthy` as long as the *process* is running. An HTTP server can be deadlocked, the database connection pool exhausted, or the service in a restart loop  and Docker will not know. Orchestrators like Dokploy require health checks to manage container restarts.

**Incorrect (no health check  process alive does not mean service is ready):**

```dockerfile
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /bin/server /server
ENTRYPOINT ["/server"]
```

**Correct (alpine-based  use curl):**

```dockerfile
FROM alpine:3.21 AS runtime
RUN apk add --no-cache curl
COPY --from=build /bin/server ./server
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8081/health || exit 1
USER 1001
ENTRYPOINT ["./server"]
```

**Compose-level healthcheck (works with distroless):**

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

**Health endpoint all services must implement:**

```go
// GET /health  200 OK
func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{
        "status":  "ok",
        "service": "expense-service",
    })
}
```

**Parameters explained:**

| Parameter | Meaning | Recommended |
|-----------|---------|-------------|
| `interval` | Time between checks | 30s |
| `timeout` | Max time for check | 10s |
| `start_period` | Grace period before retries count | 15-30s |
| `retries` | Failures before marked unhealthy | 3 |
