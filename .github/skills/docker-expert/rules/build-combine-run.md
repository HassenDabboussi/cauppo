---
title: Combine RUN Instructions
impact: CRITICAL
impactDescription: 20-40 MB smaller images; fewer layers to pull
tags: build, layers, run, optimization
---

## Combine RUN Instructions

Each `RUN` instruction creates a new image layer. Unnecessary layers bloat images because Docker records the full filesystem diff per layer  including files created and later deleted in separate steps. Chain related commands with `&&` and `\`.

**Incorrect (3 layers  cleanup too late):**

```dockerfile
RUN apt-get update
RUN apt-get install -y curl git
RUN apt-get clean
# apt cache still in layers 1 & 2 even after layer 3 cleans it
```

**Correct (1 layer  everything bundled, cleanup immediate):**

```dockerfile
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

**Alpine equivalent:**

```dockerfile
# --no-cache avoids writing any cache files at all
RUN apk add --no-cache git curl ca-certificates tzdata
```

Combining package installation and cleanup into one `RUN` typically saves 20-40 MB per image. Alpine's `--no-cache` flag is the simplest approach as it never writes cache in the first place.
