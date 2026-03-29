---
title: Configure Restart Policies
impact: MEDIUM
impactDescription: Automatic recovery from transient crashes without operator intervention
tags: runtime, restart, resilience, production, compose
---

## Configure Restart Policies

Without a restart policy, a crashed container stays down until someone manually restarts it. Production services must self-recover from transient errors (OOM kills, network hiccups, startup races).

**Incorrect (no restart  requires manual intervention):**

```yaml
services:
  expense-service:
    image: expense:latest
    # No restart policy  stays down after any crash
```

**Correct (development  restart on failures, not manual stops):**

```yaml
services:
  expense-service:
    restart: on-failure      # Restarts on non-zero exit; respects docker stop
```

**Correct (production with retry limit):**

```yaml
services:
  expense-service:
    restart: unless-stopped
    deploy:
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3      # Give up after 3 failures; prevents crash loops
        window: 120s         # Evaluate restarts within this window
```

**Policy reference:**

| Policy | Behaviour |
|--------|-----------|
| `no` | Never restart (default) |
| `on-failure[:n]` | Restart on non-zero exit, up to n times |
| `always` | Always restart, including after `docker stop` |
| `unless-stopped` | Restart unless manually stopped by operator |

Use `unless-stopped` for all production services. Pair it with `max_attempts: 3` in `deploy.restart_policy` so crash-looping containers do not thrash the host indefinitely.
