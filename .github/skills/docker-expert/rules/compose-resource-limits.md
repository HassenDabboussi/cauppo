---
title: Define Resource Limits
impact: HIGH
impactDescription: Prevents runaway containers from starving the host; enables fair scheduling
tags: compose, resources, limits, memory, cpu, production
---

## Define Resource Limits

Without resource limits, a single memory-leaking or CPU-spinning container exhausts the host, killing all other services. In production on a shared Hetzner VPS this causes cascading outages.

**Incorrect (unbounded  one container can consume all RAM):**

```yaml
services:
  expense-service:
    image: expense:latest
    # No resource limits
```

**Correct (production resource budget):**

```yaml
services:
  expense-service:
    image: expense:latest
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 256M
        reservations:        # Guaranteed minimum; used for scheduling
          cpus: "0.10"
          memory: 64M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s

  budget-service:
    image: budget:latest
    deploy:
      resources:
        limits:
          cpus: "0.50"
          memory: 256M
        reservations:
          cpus: "0.10"
          memory: 64M

  notification-service:
    image: notification:latest
    deploy:
      resources:
        limits:
          cpus: "0.25"
          memory: 128M
        reservations:
          cpus: "0.05"
          memory: 32M

  frontend:
    image: spendsync-frontend:latest
    deploy:
      resources:
        limits:
          cpus: "0.25"
          memory: 64M
```

**Budget example for a CX22 Hetzner VPS (2 vCPUs, 4 GB RAM):**

| Service | CPU limit | Memory limit |
|---------|-----------|-------------|
| expense-service | 0.50 | 256 MB |
| budget-service | 0.50 | 256 MB |
| notification-service | 0.25 | 128 MB |
| postgres | 0.75 | 512 MB |
| rabbitmq | 0.50 | 256 MB |
| frontend + traefik | 0.25 | 128 MB |

Set memory limits to 2 the p95 observed memory use to allow headroom without risk of runaway consumption.
