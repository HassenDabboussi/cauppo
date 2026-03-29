---
name: docker-expert
description: Docker containerization expert with deep knowledge of multi-stage builds, image optimization, container security, Docker Compose orchestration, and production deployment patterns. Use PROACTIVELY for Dockerfile optimization, container issues, image size problems, security hardening, networking, and orchestration challenges.
license: MIT
metadata:
  author: docker-community
  version: "2.0.0"
  date: February 2026
  abstract: Comprehensive Docker containerization guide for developers and AI agents. Contains 29 rules across 8 categories, prioritized by impact from critical (build optimization, security hardening) to incremental (advanced patterns). Each rule includes detailed explanations, incorrect vs. correct Dockerfile/Compose examples, and concrete metrics to guide automated optimization and code generation. Covers Go and TypeScript/Bun stacks used in this project.
---

# Docker Expert

Comprehensive containerization guide covering Dockerfiles, Docker Compose, security hardening, and production deployment. Contains 29 rules across 8 categories, prioritized by impact to guide automated optimization and code generation.

## When to Apply

Reference these guidelines when:
- Writing or reviewing Dockerfiles for any service
- Configuring Docker Compose for development or production
- Hardening containers for security
- Optimizing image size or build times
- Setting up networking, health checks, or resource limits
- Configuring Traefik routing or deployment pipelines

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Build Optimization | CRITICAL | `build-` |
| 2 | Security Hardening | CRITICAL | `security-` |
| 3 | Compose & Orchestration | HIGH | `compose-` |
| 4 | Image Optimization | HIGH | `image-` |
| 5 | Runtime & Health | MEDIUM-HIGH | `runtime-` |
| 6 | Development Workflow | MEDIUM | `dev-` |
| 7 | Networking & Service Discovery | LOW-MEDIUM | `network-` |
| 8 | Advanced Patterns | LOW | `advanced-` |

## Quick Reference

### 1. Build Optimization (CRITICAL)

- `build-cache-order`  Copy dependency manifests before source code to maximize cache hits
- `build-combine-run`  Chain RUN commands with `&&` to reduce layer count
- `build-clean-layers`  Run package manager cleanup in the same RUN layer
- `build-multi-stage`  Separate build and runtime stages; copy only final artifacts
- `build-dockerignore`  Use a comprehensive `.dockerignore` to shrink build context
- `build-pin-versions`  Pin base image versions; never use `:latest`
- `build-minimal-base`  Use `alpine`, `distroless`, or `-slim` base images
- `build-cache-mounts`  Use `--mount=type=cache` for package manager directories

### 2. Security Hardening (CRITICAL)

- `security-non-root`  Create a dedicated non-root user (UID 1001) and switch with `USER`
- `security-no-env-secrets`  Never store secrets in `ENV`; use `ARG` or secret mounts
- `security-build-secrets`  Use BuildKit `--mount=type=secret` for build-time credentials
- `security-scan-images`  Integrate image vulnerability scanning in CI pipelines

### 3. Compose & Orchestration (HIGH)

- `compose-healthcheck-depends`  Use `condition: service_healthy` in `depends_on`
- `compose-resource-limits`  Define CPU and memory limits for every service
- `compose-env-separation`  Maintain separate Compose files for dev and production
- `compose-secrets`  Prefer Docker secrets over plain environment variables

### 4. Image Optimization (HIGH)

- `image-distroless`  Use `gcr.io/distroless` or `alpine` for minimal runtime images
- `image-copy-selective`  `COPY --from=build` only the binary or dist artifacts needed
- `image-layer-count`  Consolidate instructions to keep final layer count low

### 5. Runtime & Health (MEDIUM-HIGH)

- `runtime-healthcheck`  Add `HEALTHCHECK` so orchestrators can detect unhealthy containers
- `runtime-signal-handling`  Use exec form for `CMD`/`ENTRYPOINT` to receive OS signals
- `runtime-restart-policy`  Configure `restart: unless-stopped` or deploy restart policies

### 6. Development Workflow (MEDIUM)

- `dev-hot-reload`  Mount source with bind volume and run watch command in dev target
- `dev-debug-ports`  Expose debugger ports only in the development Compose override
- `dev-target-separation`  Use named build targets (`--target dev`) to isolate dev tooling

### 7. Networking (LOW-MEDIUM)

- `network-internal`  Mark backend networks as `internal: true` to block external access
- `network-service-discovery`  Rely on Docker DNS service names instead of IPs

### 8. Advanced Patterns (LOW)

- `advanced-cross-platform`  Use `docker buildx` for multi-architecture image builds
- `advanced-build-args`  Parameterize builds with `ARG` for reusable, configurable images

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/build-cache-order.md
rules/security-non-root.md
rules/compose-healthcheck-depends.md
```

Each rule file contains:
- Brief explanation of why it matters
- Incorrect Dockerfile / Compose example with annotation
- Correct Dockerfile / Compose example with annotation
- Additional context, metrics, and references

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`

## References

- https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
- https://docs.docker.com/compose/compose-file/
- https://github.com/GoogleContainerTools/distroless
- https://docs.docker.com/build/buildkit/
- https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html
- https://docs.docker.com/scout/
