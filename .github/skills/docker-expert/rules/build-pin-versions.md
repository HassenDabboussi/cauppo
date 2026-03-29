---
title: Pin Base Image Versions
impact: CRITICAL
impactDescription: Reproducible builds; prevents surprise breakages from upstream updates
tags: build, versioning, reproducibility, security, cve
---

## Pin Base Image Versions

Using `:latest` or vague tags means your image may rebuild with a different base on different machines or days. This breaks reproducibility, makes CVE tracking impossible, and can introduce breaking API changes silently.

**Incorrect (non-deterministic):**

```dockerfile
FROM golang:latest          # Could be 1.23, 1.24, or 1.25 tomorrow
FROM node:alpine            # Alpine version unknown
FROM ubuntu                 # Major version unknown
```

**Correct (pinned to minor version):**

```dockerfile
FROM golang:1.24-alpine3.21     AS build
FROM oven/bun:1.2-alpine        AS build
FROM nginx:1.27-alpine          AS runtime
FROM gcr.io/distroless/static-debian12:nonroot   AS runtime
```

**Maximum reproducibility (digest pin):**

```dockerfile
# Pin to immutable SHA256 digest  unaffected by tag mutations
FROM golang:1.24-alpine3.21@sha256:b233cf987a0d3e0d2a8e7d29a5e1c4f8a12345...
```

**Tag strategy for this project:**

| Stage | Image | Tag |
|-------|-------|-----|
| Go build | `golang` | `1.24-alpine3.21` |
| Go runtime | `gcr.io/distroless/static-debian12` | `nonroot` |
| Bun build | `oven/bun` | `1.2-alpine` |
| Bun runtime | `oven/bun` | `1.2-distroless` |
| Frontend runtime | `nginx` | `1.27-alpine` |

Update pinned versions in a scheduled PR (e.g., monthly Dependabot or Renovate) rather than ad-hoc.
