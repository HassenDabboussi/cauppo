---
title: Use BuildKit Secret Mounts
impact: CRITICAL
impactDescription: Secrets never written to any layer; zero leakage risk in registry
tags: security, secrets, buildkit, build-time, github-token, hardening
---

## Use BuildKit Secret Mounts

When a build step requires a credential (e.g., pulling a private Go module or authenticating to npm), use `--mount=type=secret`. The secret is mounted as a temporary in-memory file during that `RUN` step and **never written into any image layer or history**.

**Incorrect (secret baked into layer history):**

```dockerfile
ARG GITHUB_TOKEN
RUN git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf \
    "https://github.com/"
RUN go mod download
# Token visible via: docker history myimage --no-trunc
```

**Correct (BuildKit secret mount):**

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.24-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./

RUN --mount=type=secret,id=github_token \
    git config --global \
      url."https://$(cat /run/secrets/github_token)@github.com/".insteadOf \
      "https://github.com/" && \
    go mod download

COPY . .
RUN --mount=type=secret,id=github_token \
    git config --global \
      url."https://$(cat /run/secrets/github_token)@github.com/".insteadOf \
      "https://github.com/" && \
    CGO_ENABLED=0 go build -ldflags="-w -s" -o /bin/server ./cmd/server
```

**Build command:**

```bash
# Pass secret from environment variable
docker build --secret id=github_token,env=GITHUB_TOKEN .
```

**GitHub Actions:**

```yaml
- name: Build image
  uses: docker/build-push-action@v6
  with:
    context: .
    secrets: |
      github_token=${{ secrets.GITHUB_TOKEN }}
```

The secret file at `/run/secrets/<id>` is only available during the `RUN` step. It does not appear in `docker inspect`, `docker history`, or the final image filesystem.
