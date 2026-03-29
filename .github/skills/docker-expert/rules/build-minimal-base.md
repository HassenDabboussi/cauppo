---
title: Use Minimal Base Images
impact: CRITICAL
impactDescription: 50-98% smaller images; fewer CVEs; faster registry pulls
tags: build, base-image, alpine, distroless, image-size, security
---

## Use Minimal Base Images

Full OS images include shells, package managers, cron daemons, and hundreds of binaries your service never uses. Each unnecessary package is a potential CVE vector and adds pull latency.

**Incorrect (full OS in production):**

```dockerfile
FROM node:18            # ~900 MB  full Debian + npm + yarn + build tools
FROM golang:1.24        # ~800 MB  ships entire compiler toolchain
FROM ubuntu:22.04       # ~77 MB base, but grows quickly with packages
```

**Correct (Go  distroless):**

```dockerfile
# Zero shell, zero package manager, minimal CVE surface
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /bin/server /server
ENTRYPOINT ["/server"]
# Size: ~8 MB
```

**Correct (Bun  alpine):**

```dockerfile
FROM oven/bun:1.2-alpine
# Size: ~85 MB vs ~500 MB for full node image
```

**Correct (frontend  nginx:alpine):**

```dockerfile
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Size: ~25 MB
```

**Size comparison for a Go HTTP service:**

| Base image | Final size | CVE count (approx) |
|-----------|-----------|---------------------|
| `golang:1.24` | 350 MB | 50+ |
| `alpine:3.21` | 15 MB | 5-10 |
| `distroless/static` | 8 MB | 0-2 |

Use `distroless` for statically compiled Go binaries. Use `alpine` when you need a shell for debugging or when running interpreted runtimes (Bun, Python).
