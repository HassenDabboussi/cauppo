---
title: Copy Only Required Artifacts
impact: HIGH
impactDescription: Prevents source code, dev deps, and test files from reaching production
tags: image, copy, artifacts, multi-stage, size
---

## Copy Only Required Artifacts

`COPY --from=build /app /app` copies everything including source code, test files, dev dependencies, and intermediate artefacts. Be explicit about which files the production stage needs.

**Incorrect (copies everything from build stage):**

```dockerfile
FROM alpine:3.21 AS runtime
COPY --from=build /app /app    # Copies source, tests, node_modules (all 500 MB)
WORKDIR /app
CMD ["./server"]
```

**Correct (Go  only the compiled binary):**

```dockerfile
FROM gcr.io/distroless/static-debian12:nonroot AS runtime
# Only binary + runtime requirements
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /usr/share/zoneinfo                 /usr/share/zoneinfo
COPY --from=build /bin/server                         /server
# Source code, test files, go toolchain: none of it copied
```

**Correct (Bun service  dist + prod node_modules only):**

```dockerfile
FROM oven/bun:1.2-distroless AS runtime
WORKDIR /app
# Only production dependencies (from deps stage)
COPY --from=deps  /app/node_modules ./node_modules
# Only compiled output (from build stage)
COPY --from=build /app/dist         ./dist
COPY --from=build /app/package.json ./
# TypeScript source, test files, dev devDependencies: excluded
```

**Correct (React frontend  only Vite output):**

```dockerfile
FROM nginx:1.27-alpine AS runtime
# Only the compiled HTML/JS/CSS bundle
COPY --from=build /app/dist /usr/share/nginx/html
# nginx.conf is the only other file needed
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

Use explicit `COPY --from=<stage> <src> <dst>` paths rather than globbing entire directories. When in doubt, `docker run <image> ls /` to audit what made it into the final image.
