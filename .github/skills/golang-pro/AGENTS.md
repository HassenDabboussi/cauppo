# Golang Pro

## Structure

```
golang-pro/
  SKILL.md       # Main skill file - read this first
  AGENTS.md      # This navigation guide + full compiled rules
  references/    # Individual reference files (load on-demand)
```

## Usage

1. Read `SKILL.md` for the overview and quick reference
2. Read specific `references/` files for detailed patterns and code
3. This file contains the full compiled guide for agents

Comprehensive Go engineering guide covering concurrency, interfaces, generics, testing, and project structure for production-grade Go 1.21+ microservices.

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

---

## Table of Contents

1. [Concurrency Patterns](#1-concurrency-patterns) — **CRITICAL**
   - 1.1 [Worker Pool with Bounded Concurrency](#11-worker-pool-with-bounded-concurrency)
   - 1.2 [Channel Patterns: Generator, Fan-Out, Fan-In](#12-channel-patterns-generator-fan-out-fan-in)
   - 1.3 [Select Statement Patterns](#13-select-statement-patterns)
   - 1.4 [Sync Primitives](#14-sync-primitives)
   - 1.5 [Rate Limiting and Backpressure](#15-rate-limiting-and-backpressure)
   - 1.6 [Pipeline Pattern](#16-pipeline-pattern)
2. [Interface Design and Composition](#2-interface-design-and-composition) — **CRITICAL**
   - 2.1 [Small, Focused Interfaces](#21-small-focused-interfaces)
   - 2.2 [Accept Interfaces, Return Structs](#22-accept-interfaces-return-structs)
   - 2.3 [io.Reader and io.Writer Patterns](#23-ioreader-and-iowriter-patterns)
   - 2.4 [Embedding for Composition](#24-embedding-for-composition)
   - 2.5 [Compile-Time Interface Verification](#25-compile-time-interface-verification)
   - 2.6 [Functional Options Pattern](#26-functional-options-pattern)
   - 2.7 [Interface Segregation](#27-interface-segregation)
   - 2.8 [Dependency Injection via Interfaces](#28-dependency-injection-via-interfaces)
3. [Generics and Type Parameters](#3-generics-and-type-parameters) — **HIGH**
   - 3.1 [Basic Type Parameters](#31-basic-type-parameters)
   - 3.2 [Type Constraints](#32-type-constraints)
   - 3.3 [Generic Data Structures](#33-generic-data-structures)
   - 3.4 [Generic Map Operations](#34-generic-map-operations)
   - 3.5 [Generic Pairs and Result Type](#35-generic-pairs-and-result-type)
   - 3.6 [Comparable Constraint Utilities](#36-comparable-constraint-utilities)
   - 3.7 [Generic Channels and Pipelines](#37-generic-channels-and-pipelines)
   - 3.8 [Union Constraints](#38-union-constraints)
4. [Testing and Benchmarking](#4-testing-and-benchmarking) — **HIGH**
   - 4.1 [Table-Driven Tests](#41-table-driven-tests)
   - 4.2 [Subtests and Parallel Execution](#42-subtests-and-parallel-execution)
   - 4.3 [Test Helpers and Setup/Teardown](#43-test-helpers-and-setupteardown)
   - 4.4 [Mocking with Interfaces](#44-mocking-with-interfaces)
   - 4.5 [Benchmarking](#45-benchmarking)
   - 4.6 [Fuzzing](#46-fuzzing)
   - 4.7 [Race Detector and Coverage](#47-race-detector-and-coverage)
   - 4.8 [Golden Files and Integration Tests](#48-golden-files-and-integration-tests)
5. [Project Structure and Module Management](#5-project-structure-and-module-management) — **MEDIUM**
   - 5.1 [Standard Project Layout](#51-standard-project-layout)
   - 5.2 [go.mod and Module Commands](#52-gomod-and-module-commands)
   - 5.3 [Internal Packages](#53-internal-packages)
   - 5.4 [Multi-Module Monorepo with go.work](#54-multi-module-monorepo-with-gowork)
   - 5.5 [Build Tags and Constraints](#55-build-tags-and-constraints)
   - 5.6 [Makefile and Build Automation](#56-makefile-and-build-automation)
   - 5.7 [Configuration Management](#57-configuration-management)
   - 5.8 [Version Injection with ldflags](#58-version-injection-with-ldflags)

---

## Constraints

### MUST DO
- Use `gofmt` and `golangci-lint` on all code
- Add `context.Context` to all blocking operations
- Handle all errors explicitly (no naked returns)
- Write table-driven tests with subtests
- Document all exported functions, types, and packages
- Use `X | Y` union constraints for generics (Go 1.18+)
- Propagate errors with `fmt.Errorf("%w", err)`
- Run race detector on tests (`-race` flag)

### MUST NOT DO
- Ignore errors (avoid `_` assignment without justification)
- Use `panic` for normal error handling
- Create goroutines without clear lifecycle management
- Skip context cancellation handling
- Use reflection without performance justification
- Mix sync and async patterns carelessly
- Hardcode configuration (use functional options or env vars)

---

## 1. Concurrency Patterns

> **CRITICAL** — Correct goroutine lifecycle management prevents leaks, deadlocks, and race conditions.

---

### 1.1 Worker Pool with Bounded Concurrency

Limit the number of goroutines processing work to control resource usage and prevent overwhelming downstream systems.

```go
type WorkerPool struct {
    workers int
    tasks   chan func()
    wg      sync.WaitGroup
}

func NewWorkerPool(workers int) *WorkerPool {
    wp := &WorkerPool{
        workers: workers,
        tasks:   make(chan func(), workers*2),
    }
    wp.start()
    return wp
}

func (wp *WorkerPool) start() {
    for i := 0; i < wp.workers; i++ {
        wp.wg.Add(1)
        go func() {
            defer wp.wg.Done()
            for task := range wp.tasks {
                task()
            }
        }()
    }
}

func (wp *WorkerPool) Submit(task func()) {
    wp.tasks <- task
}

func (wp *WorkerPool) Shutdown() {
    close(wp.tasks)
    wp.wg.Wait()
}
```

### 1.2 Channel Patterns: Generator, Fan-Out, Fan-In

**Generator** — returns a read-only channel that produces values:

```go
func generateNumbers(ctx context.Context, max int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for i := 0; i < max; i++ {
            select {
            case out <- i:
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}
```

**Fan-out** — distribute work across multiple goroutines:

```go
func fanOut(ctx context.Context, input <-chan int, workers int) []<-chan int {
    channels := make([]<-chan int, workers)
    for i := 0; i < workers; i++ {
        channels[i] = process(ctx, input)
    }
    return channels
}
```

**Fan-in** — merge multiple channels into one:

```go
func fanIn(ctx context.Context, channels ...<-chan int) <-chan int {
    out := make(chan int)
    var wg sync.WaitGroup

    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan int) {
            defer wg.Done()
            for val := range c {
                select {
                case out <- val:
                case <-ctx.Done():
                    return
                }
            }
        }(ch)
    }

    go func() {
        wg.Wait()
        close(out)
    }()

    return out
}
```

### 1.3 Select Statement Patterns

**Timeout pattern:**

```go
func fetchWithTimeout(ctx context.Context, url string) (string, error) {
    result := make(chan string, 1)
    errCh := make(chan error, 1)

    go func() {
        time.Sleep(100 * time.Millisecond)
        result <- "data from " + url
    }()

    select {
    case res := <-result:
        return res, nil
    case err := <-errCh:
        return "", err
    case <-time.After(50 * time.Millisecond):
        return "", fmt.Errorf("timeout")
    case <-ctx.Done():
        return "", ctx.Err()
    }
}
```

**Done channel for graceful shutdown:**

```go
type Server struct {
    done chan struct{}
}

func (s *Server) Shutdown() {
    close(s.done)
}

func (s *Server) Run(ctx context.Context) {
    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            fmt.Println("tick")
        case <-s.done:
            fmt.Println("shutting down")
            return
        case <-ctx.Done():
            fmt.Println("context cancelled")
            return
        }
    }
}
```

### 1.4 Sync Primitives

**Mutex for protecting shared state:**

```go
type Counter struct {
    mu    sync.Mutex
    count int
}

func (c *Counter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
}
```

**RWMutex for read-heavy workloads:**

```go
type Cache struct {
    mu    sync.RWMutex
    items map[string]string
}

func (c *Cache) Get(key string) (string, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    val, ok := c.items[key]
    return val, ok
}

func (c *Cache) Set(key, value string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.items[key] = value
}
```

**sync.Once for initialization:**

```go
type Service struct {
    once   sync.Once
    config *Config
}

func (s *Service) getConfig() *Config {
    s.once.Do(func() {
        s.config = loadConfig()
    })
    return s.config
}
```

### 1.5 Rate Limiting and Backpressure

**Token bucket rate limiter:**

```go
type RateLimiter struct {
    limiter *rate.Limiter
}

func NewRateLimiter(rps int) *RateLimiter {
    return &RateLimiter{
        limiter: rate.NewLimiter(rate.Limit(rps), rps),
    }
}

func (rl *RateLimiter) Process(ctx context.Context, item string) error {
    if err := rl.limiter.Wait(ctx); err != nil {
        return err
    }
    return nil
}
```

**Semaphore for limiting concurrency:**

```go
type Semaphore struct {
    slots chan struct{}
}

func NewSemaphore(n int) *Semaphore {
    return &Semaphore{slots: make(chan struct{}, n)}
}

func (s *Semaphore) Do(fn func()) {
    s.slots <- struct{}{}
    defer func() { <-s.slots }()
    fn()
}
```

### 1.6 Pipeline Pattern

Stage-based processing with context cancellation:

```go
func pipeline(ctx context.Context, input <-chan int) <-chan int {
    stage1 := make(chan int)
    go func() {
        defer close(stage1)
        for num := range input {
            select {
            case stage1 <- num * num:
            case <-ctx.Done():
                return
            }
        }
    }()

    stage2 := make(chan int)
    go func() {
        defer close(stage2)
        for num := range stage1 {
            if num%2 == 0 {
                select {
                case stage2 <- num:
                case <-ctx.Done():
                    return
                }
            }
        }
    }()

    return stage2
}
```

---

## 2. Interface Design and Composition

> **CRITICAL** — Proper interface design enables testability, flexibility, and clean dependency injection.

---

### 2.1 Small, Focused Interfaces

Follow Go's convention of small, single-method interfaces. Compose them for richer contracts.

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type Closer interface {
    Close() error
}

// Composed interfaces
type ReadCloser interface {
    Reader
    Closer
}

type ReadWriteCloser interface {
    Reader
    Writer
    Closer
}
```

### 2.2 Accept Interfaces, Return Structs

Accept interfaces for flexibility and testability. Return concrete types for clarity.

```go
// NewStorage returns a concrete type
func NewStorage(baseDir string) *Storage {
    return &Storage{baseDir: baseDir}
}

// SaveFile accepts an interface — works with any Reader
func (s *Storage) SaveFile(filename string, data io.Reader) error {
    return nil
}

// Service depends on interface for testing
type Uploader interface {
    SaveFile(filename string, data io.Reader) error
}

type Service struct {
    uploader Uploader
}

func NewService(uploader Uploader) *Service {
    return &Service{uploader: uploader}
}
```

### 2.3 io.Reader and io.Writer Patterns

Leverage the standard library's composable I/O interfaces:

```go
// Chain readers
func combineReaders() io.Reader {
    r1 := strings.NewReader("Hello ")
    r2 := strings.NewReader("World")
    return io.MultiReader(r1, r2)
}

// Custom Reader
type UppercaseReader struct {
    src io.Reader
}

func (u *UppercaseReader) Read(p []byte) (n int, err error) {
    n, err = u.src.Read(p)
    for i := 0; i < n; i++ {
        if p[i] >= 'a' && p[i] <= 'z' {
            p[i] = p[i] - 32
        }
    }
    return n, err
}

// Custom Writer
type CountingWriter struct {
    w     io.Writer
    count int64
}

func (cw *CountingWriter) Write(p []byte) (n int, err error) {
    n, err = cw.w.Write(p)
    cw.count += int64(n)
    return n, err
}
```

### 2.4 Embedding for Composition

Embed interfaces or types to extend behavior without inheritance:

```go
type Logger interface {
    Log(msg string)
}

type NoOpLogger struct{}
func (NoOpLogger) Log(msg string) {}

type Service struct {
    Logger // Embedded — Service.Log() is available
}

func NewService(logger Logger) *Service {
    if logger == nil {
        logger = NoOpLogger{}
    }
    return &Service{Logger: logger}
}
```

### 2.5 Compile-Time Interface Verification

Use blank identifier assignments to verify interface satisfaction at compile time:

```go
var _ io.Reader = (*MyReader)(nil)
var _ io.Writer = (*MyWriter)(nil)
var _ io.Closer = (*MyCloser)(nil)
```

### 2.6 Functional Options Pattern

Flexible, extensible configuration without breaking changes:

```go
type Server struct {
    host     string
    port     int
    timeout  time.Duration
    maxConns int
}

type Option func(*Server)

func WithHost(host string) Option {
    return func(s *Server) { s.host = host }
}

func WithPort(port int) Option {
    return func(s *Server) { s.port = port }
}

func WithTimeout(timeout time.Duration) Option {
    return func(s *Server) { s.timeout = timeout }
}

func NewServer(opts ...Option) *Server {
    s := &Server{
        host:    "localhost",
        port:    8080,
        timeout: 30 * time.Second,
    }
    for _, opt := range opts {
        opt(s)
    }
    return s
}

// Usage:
// server := NewServer(WithHost("0.0.0.0"), WithPort(9000))
```

### 2.7 Interface Segregation

Split fat interfaces into focused ones. Compose only what you need.

```go
// Bad: Fat interface
type BadRepository interface {
    Create(item Item) error
    Read(id string) (Item, error)
    Update(item Item) error
    Delete(id string) error
    List() ([]Item, error)
    Search(query string) ([]Item, error)
    Count() (int, error)
}

// Good: Segregated interfaces
type Creator interface { Create(item Item) error }
type Reader interface  { Read(id string) (Item, error) }
type Updater interface { Update(item Item) error }
type Deleter interface { Delete(id string) error }

// Compose only what you need
type ReadWriter interface {
    Reader
    Creator
}
```

### 2.8 Dependency Injection via Interfaces

Define interfaces for dependencies. Easy to mock in tests.

```go
type UserRepository interface {
    GetUser(ctx context.Context, id string) (*User, error)
    SaveUser(ctx context.Context, user *User) error
}

type EmailSender interface {
    SendEmail(ctx context.Context, to, subject, body string) error
}

type UserService struct {
    repo   UserRepository
    mailer EmailSender
}

func NewUserService(repo UserRepository, mailer EmailSender) *UserService {
    return &UserService{repo: repo, mailer: mailer}
}

func (s *UserService) RegisterUser(ctx context.Context, email string) error {
    user := &User{Email: email}
    if err := s.repo.SaveUser(ctx, user); err != nil {
        return err
    }
    return s.mailer.SendEmail(ctx, email, "Welcome", "Thanks for registering!")
}
```

---

## 3. Generics and Type Parameters

> **HIGH** — Type-safe generic utilities reduce code duplication and eliminate runtime type assertion errors.

---

### 3.1 Basic Type Parameters

```go
func Max[T constraints.Ordered](a, b T) T {
    if a > b {
        return a
    }
    return b
}

func Map[T, U any](slice []T, fn func(T) U) []U {
    result := make([]U, len(slice))
    for i, v := range slice {
        result[i] = fn(v)
    }
    return result
}
```

### 3.2 Type Constraints

```go
// Built-in constraints
type Number interface {
    constraints.Integer | constraints.Float
}

func Sum[T Number](numbers []T) T {
    var total T
    for _, n := range numbers {
        total += n
    }
    return total
}

// Approximate constraint using ~
type Integer interface {
    ~int | ~int8 | ~int16 | ~int32 | ~int64
}

type MyInt int
// Double(MyInt(5)) works because of ~int
func Double[T Integer](n T) T { return n * 2 }
```

### 3.3 Generic Data Structures

```go
type Stack[T any] struct {
    items []T
}

func NewStack[T any]() *Stack[T] {
    return &Stack[T]{items: make([]T, 0)}
}

func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    item := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return item, true
}
```

### 3.4 Generic Map Operations

```go
func Filter[T any](slice []T, predicate func(T) bool) []T {
    result := make([]T, 0, len(slice))
    for _, v := range slice {
        if predicate(v) {
            result = append(result, v)
        }
    }
    return result
}

func Reduce[T, U any](slice []T, initial U, fn func(U, T) U) U {
    acc := initial
    for _, v := range slice {
        acc = fn(acc, v)
    }
    return acc
}

func Keys[K comparable, V any](m map[K]V) []K {
    keys := make([]K, 0, len(m))
    for k := range m {
        keys = append(keys, k)
    }
    return keys
}

func Values[K comparable, V any](m map[K]V) []V {
    values := make([]V, 0, len(m))
    for _, v := range m {
        values = append(values, v)
    }
    return values
}
```

### 3.5 Generic Pairs and Result Type

```go
type Pair[T, U any] struct {
    First  T
    Second U
}

func NewPair[T, U any](first T, second U) Pair[T, U] {
    return Pair[T, U]{First: first, Second: second}
}

// Result type (like Rust's Result<T, E>)
type Result[T any] struct {
    value T
    err   error
}

func Ok[T any](value T) Result[T] {
    return Result[T]{value: value}
}

func Err[T any](err error) Result[T] {
    return Result[T]{err: err}
}

func (r Result[T]) UnwrapOr(defaultValue T) T {
    if r.err != nil {
        return defaultValue
    }
    return r.value
}
```

### 3.6 Comparable Constraint Utilities

```go
func Find[T comparable](slice []T, target T) (int, bool) {
    for i, v := range slice {
        if v == target {
            return i, true
        }
    }
    return -1, false
}

func Contains[T comparable](slice []T, target T) bool {
    _, found := Find(slice, target)
    return found
}

func Unique[T comparable](slice []T) []T {
    seen := make(map[T]struct{})
    result := make([]T, 0, len(slice))
    for _, v := range slice {
        if _, exists := seen[v]; !exists {
            seen[v] = struct{}{}
            result = append(result, v)
        }
    }
    return result
}
```

### 3.7 Generic Channels and Pipelines

```go
func Merge[T any](channels ...<-chan T) <-chan T {
    out := make(chan T)
    var wg sync.WaitGroup

    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan T) {
            defer wg.Done()
            for v := range c {
                out <- v
            }
        }(ch)
    }

    go func() {
        wg.Wait()
        close(out)
    }()

    return out
}

func Stage[T, U any](in <-chan T, fn func(T) U) <-chan U {
    out := make(chan U)
    go func() {
        defer close(out)
        for v := range in {
            out <- fn(v)
        }
    }()
    return out
}
```

### 3.8 Union Constraints

```go
type Numeric interface {
    int | int8 | int16 | int32 | int64 |
    uint | uint8 | uint16 | uint32 | uint64 |
    float32 | float64
}

func Abs[T Numeric](n T) T {
    if n < 0 {
        return -n
    }
    return n
}
```

---

## 4. Testing and Benchmarking

> **HIGH** — Table-driven tests with race detection and fuzzing catch bugs early and prevent regressions.

---

### 4.1 Table-Driven Tests

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive numbers", 2, 3, 5},
        {"negative numbers", -2, -3, -5},
        {"mixed signs", -2, 3, 1},
        {"zeros", 0, 0, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := Add(tt.a, tt.b)
            if result != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d", tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

### 4.2 Subtests and Parallel Execution

```go
func TestParallel(t *testing.T) {
    tests := []struct {
        name  string
        input string
        want  string
    }{
        {"lowercase", "hello", "HELLO"},
        {"uppercase", "WORLD", "WORLD"},
    }

    for _, tt := range tests {
        tt := tt // Capture range variable
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            result := strings.ToUpper(tt.input)
            if result != tt.want {
                t.Errorf("got %q, want %q", result, tt.want)
            }
        })
    }
}
```

### 4.3 Test Helpers and Setup/Teardown

```go
func setupTestDB(t *testing.T) *DB {
    t.Helper()
    db, err := NewDB(":memory:")
    if err != nil {
        t.Fatalf("failed to create test DB: %v", err)
    }
    return db
}

func TestWithSetup(t *testing.T) {
    db := setupTestDB(t)
    defer db.Close()

    // test logic...
}
```

### 4.4 Mocking with Interfaces

```go
type EmailSender interface {
    Send(to, subject, body string) error
}

type MockEmailSender struct {
    SentEmails []Email
    ShouldFail bool
}

func (m *MockEmailSender) Send(to, subject, body string) error {
    if m.ShouldFail {
        return fmt.Errorf("failed to send email")
    }
    m.SentEmails = append(m.SentEmails, Email{to, subject, body})
    return nil
}

func TestUserService_Register(t *testing.T) {
    mockSender := &MockEmailSender{}
    service := NewUserService(mockSender)

    err := service.Register("user@example.com")
    if err != nil {
        t.Fatalf("Register failed: %v", err)
    }

    if len(mockSender.SentEmails) != 1 {
        t.Errorf("expected 1 email sent, got %d", len(mockSender.SentEmails))
    }
}
```

### 4.5 Benchmarking

```go
func BenchmarkAdd(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Add(100, 200)
    }
}

// With allocations reporting
func BenchmarkAllocation(b *testing.B) {
    b.ReportAllocs()
    for i := 0; i < b.N; i++ {
        s := make([]int, 1000)
        _ = s
    }
}

// Parallel benchmark
func BenchmarkConcurrentAccess(b *testing.B) {
    var counter int64
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            atomic.AddInt64(&counter, 1)
        }
    })
}
```

### 4.6 Fuzzing

```go
func FuzzReverse(f *testing.F) {
    testcases := []string{"hello", "world", "123", ""}
    for _, tc := range testcases {
        f.Add(tc)
    }

    f.Fuzz(func(t *testing.T, input string) {
        reversed := Reverse(input)
        doubleReversed := Reverse(reversed)
        if input != doubleReversed {
            t.Errorf("Reverse(Reverse(%q)) = %q", input, doubleReversed)
        }
    })
}
```

### 4.7 Race Detector and Coverage

```bash
# Run with race detector
go test -race ./...

# Coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

Race-safe counter:

```go
func TestConcurrentAccessSafe(t *testing.T) {
    var counter int
    var mu sync.Mutex
    var wg sync.WaitGroup

    for i := 0; i < 10; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            mu.Lock()
            counter++
            mu.Unlock()
        }()
    }

    wg.Wait()
    if counter != 10 {
        t.Errorf("expected 10, got %d", counter)
    }
}
```

### 4.8 Golden Files and Integration Tests

**Golden files:**

```go
func TestRenderHTML(t *testing.T) {
    result := RenderHTML(Data{Title: "Test"})
    goldenFile := filepath.Join("testdata", "expected.html")

    if *update {
        os.WriteFile(goldenFile, []byte(result), 0644)
    }

    expected, _ := os.ReadFile(goldenFile)
    if result != string(expected) {
        t.Errorf("output doesn't match golden file")
    }
}
```

**Integration tests with build tags:**

```go
//go:build integration

func TestIntegration(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping in short mode")
    }
    // Run: go test -tags=integration
}
```

**Test commands quick reference:**

| Command | Description |
|---------|-------------|
| `go test` | Run tests |
| `go test -v` | Verbose output |
| `go test -run TestName` | Run specific test |
| `go test -bench .` | Run benchmarks |
| `go test -cover` | Show coverage |
| `go test -race` | Run race detector |
| `go test -short` | Skip long tests |
| `go test -fuzz FuzzName` | Run fuzzing |

---

## 5. Project Structure and Module Management

> **MEDIUM** — Standard layouts ensures maintainability and cross-team consistency.

---

### 5.1 Standard Project Layout

```
myproject/
├── cmd/                    # Main applications
│   ├── server/
│   │   └── main.go
│   └── cli/
│       └── main.go
├── internal/              # Private application code
│   ├── api/
│   ├── service/
│   └── repository/
├── pkg/                   # Public library code
├── api/                   # API definitions (OpenAPI, proto)
├── configs/              # Configuration files
├── deployments/          # Docker, K8s configs
├── test/                 # Additional test data
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

### 5.2 go.mod and Module Commands

```go
module github.com/user/myproject

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    go.uber.org/zap v1.26.0
)

// Replace for local development
replace github.com/user/mylib => ../mylib
```

Key commands:

```bash
go mod init github.com/user/project
go mod tidy         # Add/remove dependencies
go mod download     # Download dependencies
go get package@v1.2 # Add/update specific version
go mod verify       # Verify checksums
```

### 5.3 Internal Packages

```
myproject/
├── internal/
│   ├── auth/       # Only importable by myproject code
│   └── database/
└── pkg/
    └── models/     # Importable by anyone
```

### 5.4 Multi-Module Monorepo with go.work

```
monorepo/
├── go.work
├── services/
│   ├── api/
│   │   └── go.mod
│   └── worker/
│       └── go.mod
└── shared/
    └── models/
        └── go.mod
```

```go
// go.work
go 1.21

use (
    ./services/api
    ./services/worker
    ./shared/models
)
```

### 5.5 Build Tags and Constraints

```go
//go:build linux && amd64

//go:build !windows

//go:build integration
```

### 5.6 Makefile and Build Automation

```makefile
.PHONY: build test lint clean run

build:
	go build -v -o bin/server ./cmd/server

test:
	go test -v -race -coverprofile=coverage.out ./...

lint:
	golangci-lint run ./...

run:
	go run ./cmd/server

build-all:
	GOOS=linux GOARCH=amd64 go build -o bin/server-linux-amd64 ./cmd/server
	GOOS=darwin GOARCH=amd64 go build -o bin/server-darwin-amd64 ./cmd/server
```

### 5.7 Configuration Management

```go
type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
}

type ServerConfig struct {
    Host    string        `envconfig:"SERVER_HOST" default:"0.0.0.0"`
    Port    int           `envconfig:"SERVER_PORT" default:"8080"`
    Timeout time.Duration `envconfig:"SERVER_TIMEOUT" default:"10s"`
}

type DatabaseConfig struct {
    URL          string `envconfig:"DATABASE_URL" required:"true"`
    MaxOpenConns int    `envconfig:"DB_MAX_OPEN_CONNS" default:"25"`
}

func Load() (*Config, error) {
    var cfg Config
    if err := envconfig.Process("", &cfg); err != nil {
        return nil, err
    }
    return &cfg, nil
}
```

### 5.8 Version Injection with ldflags

```go
var (
    Version   = "dev"
    GitCommit = "none"
    BuildTime = "unknown"
)
```

Build with version info:

```bash
go build -ldflags "-X main.Version=1.0.0 \
  -X main.GitCommit=$(git rev-parse HEAD) \
  -X main.BuildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -o server ./cmd/server
```
