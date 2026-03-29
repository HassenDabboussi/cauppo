---
title: Use Docker Secrets for Sensitive Values
impact: HIGH
impactDescription: Secrets not visible in docker inspect, logs, or process environment listings
tags: compose, secrets, security, postgres, environment
---

## Use Docker Secrets for Sensitive Values

Plain `environment:` entries are visible in `docker inspect`, in process environment listings (`/proc/<pid>/environ`), and in Compose file diffs. Docker secrets mount values as files owned by the container user with `0400` permissions.

**Incorrect (secret in plain environment):**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: supersecretpassword   # Visible in `docker inspect`
```

**Correct (Docker secret  mounted as file):**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      # postgres image reads *_FILE vars and loads them from file
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_USER_FILE:     /run/secrets/db_user
      POSTGRES_DB_FILE:       /run/secrets/db_name
    secrets:
      - db_password
      - db_user
      - db_name

  expense-service:
    image: expense:latest
    secrets:
      - db_password
    environment:
      # Service reads the file path and opens it itself
      DB_PASSWORD_FILE: /run/secrets/db_password

secrets:
  db_password:
    external: true    # Created on host: echo "mypass" | docker secret create db_password -
  db_user:
    external: true
  db_name:
    external: true
```

**Development (file-based secrets  simpler):**

```yaml
secrets:
  db_password:
    file: ./secrets/db_password.txt   # Not committed; in .gitignore
```

**Go service reading a secret file:**

```go
func loadSecret(path string) (string, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return "", err
    }
    return strings.TrimSpace(string(data)), nil
}

func main() {
    dbPass, _ := loadSecret(os.Getenv("DB_PASSWORD_FILE"))
    dsn := fmt.Sprintf("postgres://user:%s@postgres:5432/mydb", dbPass)
}
```
