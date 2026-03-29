---
title: Run as Non-Root User
impact: CRITICAL
impactDescription: Prevents privilege escalation and container escape if process is compromised
tags: security, non-root, user, uid, hardening
---

## Run as Non-Root User

By default, Docker containers run as `root` (UID 0). If an attacker exploits a vulnerability in your application process, running as root in the container can enable container escape, host filesystem access, and lateral movement to other containers.

**Incorrect (runs as root):**

```dockerfile
FROM alpine:3.21
WORKDIR /app
COPY . .
CMD ["./server"]
# docker exec container whoami  root
```

**Correct (Go service with dedicated user):**

```dockerfile
FROM alpine:3.21 AS runtime
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app
COPY --chown=appuser:appgroup --from=build /bin/server ./server

USER 1001          # Use numeric UID  works even without /etc/passwd
EXPOSE 8081
ENTRYPOINT ["./server"]
```

**Correct (distroless  nonroot built-in):**

```dockerfile
# distroless:nonroot tag ships with uid=65532 (nonroot) pre-configured
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /bin/server /server
USER nonroot:nonroot
ENTRYPOINT ["/server"]
```

**Correct (Bun service):**

```dockerfile
FROM oven/bun:1.2-alpine AS runtime
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup
WORKDIR /app
COPY --chown=appuser:appgroup --from=deps  /app/node_modules ./node_modules
COPY --chown=appuser:appgroup --from=build /app/dist         ./dist
USER 1001
ENTRYPOINT ["bun", "run", "dist/index.js"]
```

Use numeric UIDs rather than symbolic names in `USER` so the instruction works in distroless images where `/etc/passwd` does not exist.
