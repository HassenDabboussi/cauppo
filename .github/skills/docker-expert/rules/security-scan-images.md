---
title: Scan Images for Vulnerabilities
impact: HIGH
impactDescription: Catch CVEs before they reach production; enforce security policy in CI
tags: security, cve, scanning, docker-scout, trivy, ci
---

## Scan Images for Vulnerabilities

Shipping unscanned images means unknown CVEs run in production. Integrate scanning into CI so builds fail on critical or high vulnerabilities *before* the image is pushed to the registry.

**Incorrect (no scanning  unknown CVEs shipped):**

```yaml
# .github/workflows/deploy.yml
- uses: docker/build-push-action@v6
  with:
    push: true
    tags: myapp:latest
# No vulnerability gate
```

**Correct (Docker Scout  scan before push):**

```yaml
- uses: docker/build-push-action@v6
  with:
    load: true       # Load locally first, don't push yet
    push: false
    tags: myapp:latest

- uses: docker/scout-action@v1
  with:
    command: cves
    image: myapp:latest
    only-severities: critical,high
    exit-code: true  # Fail CI job on findings

- uses: docker/build-push-action@v6
  if: success()      # Only push if scan passed
  with:
    push: true
    tags: myapp:latest
```

**Trivy (open-source alternative):**

```yaml
- uses: aquasecurity/trivy-action@master
  with:
    image-ref: myapp:latest
    format: sarif
    output: trivy-results.sarif
    severity: CRITICAL,HIGH
    exit-code: 1

- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: trivy-results.sarif
```

**Alpine vs Debian CVE counts (typical Go service):**

| Runtime base | Typical CVE count |
|-------------|-------------------|
| `debian:bookworm` | 80-200 |
| `alpine:3.21` | 5-15 |
| `distroless/static` | 0-5 |

Reducing base image size (see `build-minimal-base`) is the most effective CVE reduction strategy.
