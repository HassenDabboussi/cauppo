---
name: golang-pro
description: Use when building Go applications requiring concurrent programming, microservices architecture, or high-performance systems. Invoke for goroutines, channels, Go generics, gRPC integration.
license: MIT
metadata:
  author: go-community
  version: "2.0.0"
  date: February 2026
  abstract: Comprehensive Go engineering guide for AI agents and developers. Contains 5 reference guides covering concurrency, interfaces, generics, testing, and project structure. Each reference includes idiomatic patterns, real-world examples, and best practices for building production-grade Go microservices.
---

# Golang Pro

Comprehensive Go engineering guide covering concurrency patterns, interface design, generics, testing, and project structure. Contains 5 reference guides with idiomatic patterns and production-ready examples for Go 1.21+ microservices.

## When to Apply

Reference these guidelines when:
- Writing or reviewing Go code for microservices
- Implementing concurrent patterns with goroutines and channels
- Designing interfaces and using generics
- Writing table-driven tests, benchmarks, or fuzz tests
- Structuring Go modules and monorepo workspaces
- Optimizing Go code for performance and memory efficiency

## Reference Categories by Priority

| Priority | Category | Impact | Reference |
|----------|----------|--------|-----------|
| 1 | Concurrency | CRITICAL | `concurrency.md` |
| 2 | Interfaces | CRITICAL | `interfaces.md` |
| 3 | Generics | HIGH | `generics.md` |
| 4 | Testing | HIGH | `testing.md` |
| 5 | Project Structure | MEDIUM | `project-structure.md` |

## Quick Reference

### 1. Concurrency Patterns (CRITICAL)

- `concurrency` — Worker pools, bounded concurrency, goroutine lifecycle management
- `concurrency` — Channel patterns: generator, fan-out/fan-in, pipeline
- `concurrency` — Select patterns: timeout, done channel, graceful shutdown
- `concurrency` — Sync primitives: Mutex, RWMutex, Once, WaitGroup
- `concurrency` — Rate limiting and semaphore-based backpressure

### 2. Interface Design (CRITICAL)

- `interfaces` — Small, single-method interfaces (io.Reader, io.Writer)
- `interfaces` — Accept interfaces, return structs
- `interfaces` — Composition over inheritance with embedding
- `interfaces` — Functional options pattern for flexible configuration
- `interfaces` — Interface segregation and dependency injection
- `interfaces` — Compile-time interface verification

### 3. Generics (HIGH)

- `generics` — Type parameters and constraints (Ordered, comparable, custom)
- `generics` — Generic data structures: Stack, Queue, Result type
- `generics` — Functional utilities: Map, Filter, Reduce, Keys, Values
- `generics` — Generic channels: Merge, Stage pipeline
- `generics` — Union constraints and approximate (~) types

### 4. Testing & Benchmarking (HIGH)

- `testing` — Table-driven tests with subtests and t.Parallel()
- `testing` — Interface-based mocking without frameworks
- `testing` — Benchmarking with b.ReportAllocs() and b.RunParallel()
- `testing` — Fuzzing (Go 1.18+) for property-based testing
- `testing` — Race detector, golden files, integration test tags

### 5. Project Structure (MEDIUM)

- `project-structure` — Standard layout: cmd/, internal/, pkg/, api/
- `project-structure` — go.mod, go.work for monorepo workspaces
- `project-structure` — Internal packages for encapsulation
- `project-structure` — Build tags, Makefile, configuration management
- `project-structure` — Version injection with ldflags

## How to Use

Read individual reference files for detailed patterns and code examples:

```
references/concurrency.md
references/interfaces.md
references/generics.md
references/testing.md
references/project-structure.md
```

Each reference file contains:
- Idiomatic Go code patterns with full implementations
- Quick reference table summarizing key patterns
- Production-ready examples for microservices

## Full Compiled Document

For the complete guide with all references expanded: `AGENTS.md`

## References

- https://go.dev/doc/effective_go
- https://go.dev/blog/
- https://github.com/golang-standards/project-layout
- https://go.dev/doc/modules/
- https://pkg.go.dev/testing
- https://go.dev/security/fuzz/
