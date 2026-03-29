---
title: Use Exec Form for CMD and ENTRYPOINT
impact: MEDIUM-HIGH
impactDescription: Enables graceful shutdown; prevents 10-second SIGKILL delays
tags: runtime, signals, cmd, entrypoint, exec-form, sigterm
---

## Use Exec Form for CMD and ENTRYPOINT

Shell form (`CMD ./server`) wraps the command in `/bin/sh -c`, making the shell PID 1. The shell does *not* forward `SIGTERM` or `SIGINT` to your process, causing unclean shutdowns. With exec form the process itself is PID 1 and receives signals directly.

**Incorrect (shell form  signals swallowed by sh):**

```dockerfile
CMD ./server                    # PID 1 is sh, not server
ENTRYPOINT "/server"            # Also shell form  quotes do not matter
CMD npm start                   # Still shell form
```

**Correct (exec form  JSON array):**

```dockerfile
# Process receives SIGTERM and can shut down gracefully
ENTRYPOINT ["/server"]
CMD ["/server", "--port", "8081"]

# Bun
ENTRYPOINT ["bun", "run", "dist/index.js"]
```

**Go graceful shutdown:**

```go
func main() {
    srv := &http.Server{Addr: ":8081", Handler: mux}

    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGTERM, syscall.SIGINT)

    go func() {
        log.Println("server starting on :8081")
        if err := srv.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("listen: %v", err)
        }
    }()

    <-stop
    log.Println("shutdown signal received")
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    if err := srv.Shutdown(ctx); err != nil {
        log.Fatalf("shutdown: %v", err)
    }
    log.Println("server stopped cleanly")
}
```

**Bun graceful shutdown:**

```typescript
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down...");
  server.stop(true);   // Bun: stop accepting new connections
  process.exit(0);
});
```

Without exec form, `docker stop` sends `SIGTERM`, waits 10 seconds, then sends `SIGKILL`  killing in-flight requests and leaving database transactions open.
