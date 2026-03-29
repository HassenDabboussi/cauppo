---
title: Use Distroless or Alpine Runtime
impact: HIGH
impactDescription: 50-98% smaller final images; minimal CVE surface; no shell attack vector
tags: image, distroless, alpine, runtime, security, size
---

## Use Distroless or Alpine Runtime

Full OS base images ship shells, package managers, cron daemons, and hundreds of libraries your service never calls. Distroless images contain only the language runtime and essential certificates  nothing else.

**Incorrect (ships build toolchain to production):**

```dockerfile
FROM golang:1.24-alpine    # 350 MB including compiler
FROM node:18               # 900 MB including npm, yarn, build tools
```

**Correct (Go  distroless/static):**

```dockerfile
# gcr.io/distroless/static-debian12:nonroot
# Contains: libc, SSL certs, timezone data. No shell, no package manager.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=build /bin/server /server
USER nonroot:nonroot
ENTRYPOINT ["/server"]
# Final size: ~8 MB
```

**Correct (Bun service  oven/bun:distroless):**

```dockerfile
FROM oven/bun:1.2-distroless
WORKDIR /app
COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist         ./dist
ENTRYPOINT ["bun", "run", "dist/index.js"]
# Final size: ~90 MB
```

**Correct (Frontend  nginx:alpine):**

```dockerfile
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf              /etc/nginx/conf.d/default.conf
EXPOSE 80
# Final size: ~25 MB
```

**Decision guide:**
- Statically compiled Go binary  `distroless/static`
- Go binary with CGO  `distroless/base`
- Bun/Node.js  `oven/bun:distroless` or `node:alpine`
- Static website  `nginx:alpine`
- Needs shell for debugging  `alpine` (remove shell in prod, add in dev override)
