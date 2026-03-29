---
title: Use a Comprehensive .dockerignore
impact: CRITICAL
impactDescription: Context upload time reduced from minutes to seconds; prevents secret leakage
tags: build, dockerignore, context, secrets, performance
---

## Use a Comprehensive .dockerignore

The build context is tar-archived and sent to the Docker daemon before any instruction runs. Without `.dockerignore`, the daemon receives `node_modules` (500 MB+), `.git` history, test fixtures, and environment files on *every* build.

**Incorrect (no .dockerignore  uploads everything):**

```
# Missing .dockerignore  CI uploads 600 MB context on every push
```

**Correct (.dockerignore for TypeScript/Bun project):**

```dockerignore
# Version control
.git
.gitignore

# Dependencies  reinstalled inside Docker
node_modules
.pnp

# Build outputs  rebuilt inside Docker
dist
build
.next
out

# Test artefacts
coverage
test-results
playwright-report
*.test.ts
*.spec.ts
e2e/

# Secrets  never include in image
.env
.env.*
!.env.example

# Editor / OS
.vscode
.idea
*.DS_Store
Thumbs.db

# Docker files themselves
Dockerfile*
docker-compose*
.dockerignore

# Documentation
*.md
docs/
```

**Go service .dockerignore:**

```dockerignore
.git
.gitignore
*_test.go
testdata/
coverage/
*.md
docs/
.vscode
.idea
bin/
tmp/
```

Rule: every `.env*` file (except `.env.example`) must be in `.dockerignore`. Accidentally copying `.env.prod` into an image bakes production secrets into the registry layer history permanently.
