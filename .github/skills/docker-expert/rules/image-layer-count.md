---
title: Minimize Final Layer Count
impact: MEDIUM
impactDescription: Faster image pulls; smaller manifest; simpler docker history output
tags: image, layers, optimization, consolidation
---

## Minimize Final Layer Count

Every Dockerfile instruction adds a layer. While Docker deduplicates identical layers across images, many thin layers increase the manifest size, slow down `docker pull` on first run (parallel layer downloads have overhead per layer), and clutter `docker history`.

**Incorrect (8 separate instructions that could be 3):**

```dockerfile
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y git
RUN apt-get clean
RUN rm -rf /var/lib/apt/lists/*
COPY config.yaml /etc/app/
COPY certs/ /etc/app/certs/
COPY migrations/ /etc/app/migrations/
```

**Correct (consolidated):**

```dockerfile
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY config.yaml certs/ migrations/ /etc/app/
```

**Target layer counts:**

| Stage | Target |
|-------|--------|
| Build stage |  15 (complexity is fine here) |
| Production runtime |  8 |

**Check with:**

```bash
docker history myimage:latest --format "table {{.Size}}\t{{.CreatedBy}}"
```

Layers are most valuable when they are *reusable across services* (e.g., a shared base with certs and timezone data). Layers that will never be reused are pure overhead.
