# Test-Driven Development

## Structure

```
tdd/
  SKILL.md       # Main skill file - read this first
  AGENTS.md      # This navigation guide + full compiled rules
  references/    # Individual reference files (load on-demand)
```

## Usage

1. Read `SKILL.md` for the overview, scope, and quick reference
2. Read specific `references/` files for detailed patterns
3. This file contains the full compiled guide for agents

Behavior-driven TDD guide with vertical tracer-bullet workflow. Covers test quality, mocking boundaries, deep module design, refactoring, and testable interface design.

## Scope of Application

> **This TDD workflow applies ONLY to tasks classified as BDD-TDD or CONTRACT-TDD by the Scrum Master.**

It does **NOT** apply to:
- **NO-TEST tasks** — scaffold, config, migrations, tooling. These have no testable behavior.
- **IMPLEMENT-FIRST tasks** — UI pages, components, styling. These are tested with E2E tests AFTER implementation, not before.

### When TDD Adds Value
- Business logic with clear pass/fail rules (BDD-TDD)
- API contracts with defined request→response shapes (CONTRACT-TDD)
- Complex validation, data transforms, algorithms
- Auth logic, permission checks, workflow engines

### When TDD Destroys Value
- Project scaffolding and configuration
- Database migrations and schema changes
- UI components and styling (subjective, iterative)
- Simple CRUD with no business rules
- Anything the type system already proves

## Reference Categories by Priority

| Priority | Category | Impact | Reference |
|----------|----------|--------|-----------|
| 1 | Test Quality | CRITICAL | `tests.md` |
| 2 | Mocking Boundaries | CRITICAL | `mocking.md` |
| 3 | Interface Design | HIGH | `interface-design.md` |
| 4 | Deep Modules | HIGH | `deep-modules.md` |
| 5 | Refactoring | MEDIUM | `refactoring.md` |

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [Anti-Pattern: Horizontal Slices](#2-anti-pattern-horizontal-slices)
3. [Workflow](#3-workflow)
4. [Good and Bad Tests](#4-good-and-bad-tests) — **CRITICAL**
5. [When to Mock](#5-when-to-mock) — **CRITICAL**
6. [Interface Design for Testability](#6-interface-design-for-testability) — **HIGH**
7. [Deep Modules](#7-deep-modules) — **HIGH**
8. [Refactoring Patterns](#8-refactoring-patterns) — **MEDIUM**

---

## 1. Philosophy

**Core principle**: Tests should verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't.

**Good tests** are integration-style: they exercise real code paths through public APIs. They describe _what_ the system does, not _how_ it does it. A good test reads like a specification — "user can checkout with valid cart" tells you exactly what capability exists. These tests survive refactors because they don't care about internal structure.

**Bad tests** are coupled to implementation. They mock internal collaborators, test private methods, or verify through external means (like querying a database directly instead of using the interface). The warning sign: your test breaks when you refactor, but behavior hasn't changed.

---

## 2. Anti-Pattern: Horizontal Slices

**DO NOT write all tests first, then all implementation.** This is "horizontal slicing" — treating RED as "write all tests" and GREEN as "write all code."

This produces **crap tests**:

- Tests written in bulk test _imagined_ behavior, not _actual_ behavior
- You end up testing the _shape_ of things (data structures, function signatures) rather than user-facing behavior
- Tests become insensitive to real changes — they pass when behavior breaks, fail when behavior is fine
- You outrun your headlights, committing to test structure before understanding the implementation

**Correct approach**: Vertical slices via tracer bullets. One test → one implementation → repeat.

```
WRONG (horizontal):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT (vertical):
  RED→GREEN: test1→impl1
  RED→GREEN: test2→impl2
  RED→GREEN: test3→impl3
```

---

## 3. Workflow

### 3.1 Planning

Before writing any code:

- [ ] Confirm with user what interface changes are needed
- [ ] Confirm with user which behaviors to test (prioritize)
- [ ] Identify opportunities for deep modules (small interface, deep implementation)
- [ ] Design interfaces for testability
- [ ] List the behaviors to test (not implementation steps)
- [ ] Get user approval on the plan

Ask: "What should the public interface look like? Which behaviors are most important to test?"

**You can't test everything.** Confirm with the user exactly which behaviors matter most.

### 3.2 Tracer Bullet

Write ONE test that confirms ONE thing about the system:

```
RED:   Write test for first behavior → test fails
GREEN: Write minimal code to pass → test passes
```

This is your tracer bullet — proves the path works end-to-end.

### 3.3 Incremental Loop

For each remaining behavior:

```
RED:   Write next test → fails
GREEN: Minimal code to pass → passes
```

Rules:

- One test at a time
- Only enough code to pass current test
- Don't anticipate future tests
- Keep tests focused on observable behavior

### 3.4 Refactor

After all tests pass:

- [ ] Extract duplication
- [ ] Deepen modules (move complexity behind simple interfaces)
- [ ] Apply SOLID principles where natural
- [ ] Consider what new code reveals about existing code
- [ ] Run tests after each refactor step

**Never refactor while RED.** Get to GREEN first.

### 3.5 Checklist Per Cycle

```
[ ] Test describes behavior, not implementation
[ ] Test uses public interface only
[ ] Test would survive internal refactor
[ ] Code is minimal for this test
[ ] No speculative features added
```

---

## 4. Good and Bad Tests

> **CRITICAL** — Integration-style tests through public APIs survive refactors and catch real regressions.

---

### Good Tests

**Integration-style**: Test through real interfaces, not mocks of internal parts.

```typescript
// GOOD: Tests observable behavior
test("user can checkout with valid cart", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});
```

Characteristics:

- Tests behavior users/callers care about
- Uses public API only
- Survives internal refactors
- Describes WHAT, not HOW
- One logical assertion per test

### Bad Tests

**Implementation-detail tests**: Coupled to internal structure.

```typescript
// BAD: Tests implementation details
test("checkout calls paymentService.process", async () => {
  const mockPayment = jest.mock(paymentService);
  await checkout(cart, payment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});
```

Red flags:

- Mocking internal collaborators
- Testing private methods
- Asserting on call counts/order
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
- Verifying through external means instead of interface

### Verify Through Interface

```typescript
// BAD: Bypasses interface to verify
test("createUser saves to database", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// GOOD: Verifies through interface
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```

---

## 5. When to Mock

> **CRITICAL** — Mocking only at system boundaries prevents brittle tests coupled to implementation.

---

Mock at **system boundaries** only:

- External APIs (payment, email, etc.)
- Databases (sometimes — prefer test DB)
- Time/randomness
- File system (sometimes)

**Don't mock:**

- Your own classes/modules
- Internal collaborators
- Anything you control

### Designing for Mockability

**1. Use dependency injection**

```typescript
// Easy to mock
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// Hard to mock
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

**2. Prefer SDK-style interfaces over generic fetchers**

```typescript
// GOOD: Each function is independently mockable
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch('/orders', { method: 'POST', body: data }),
};

// BAD: Mocking requires conditional logic inside the mock
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

The SDK approach means:
- Each mock returns one specific shape
- No conditional logic in test setup
- Easier to see which endpoints a test exercises
- Type safety per endpoint

---

## 6. Interface Design for Testability

> **HIGH** — Testable interfaces with dependency injection eliminate complex test setup.

---

Good interfaces make testing natural:

### 1. Accept Dependencies, Don't Create Them

```typescript
// Testable
function processOrder(order, paymentGateway) {}

// Hard to test
function processOrder(order) {
  const gateway = new StripeGateway();
}
```

### 2. Return Results, Don't Produce Side Effects

```typescript
// Testable
function calculateDiscount(cart): Discount {}

// Hard to test
function applyDiscount(cart): void {
  cart.total -= discount;
}
```

### 3. Small Surface Area

- Fewer methods = fewer tests needed
- Fewer params = simpler test setup

---

## 7. Deep Modules

> **HIGH** — Small interface + deep implementation reduces API surface area and hides complexity.

---

From "A Philosophy of Software Design":

**Deep module** = small interface + lots of implementation

```
┌─────────────────────┐
│   Small Interface   │  ← Few methods, simple params
├─────────────────────┤
│                     │
│  Deep Implementation│  ← Complex logic hidden
│                     │
└─────────────────────┘
```

**Shallow module** = large interface + little implementation (avoid)

```
┌─────────────────────────────────┐
│       Large Interface           │  ← Many methods, complex params
├─────────────────────────────────┤
│  Thin Implementation            │  ← Just passes through
└─────────────────────────────────┘
```

When designing interfaces, ask:

- Can I reduce the number of methods?
- Can I simplify the parameters?
- Can I hide more complexity inside?

---

## 8. Refactoring Patterns

> **MEDIUM** — Targeted refactoring after GREEN keeps code clean without breaking the TDD rhythm.

---

After TDD cycle, look for:

- **Duplication** → Extract function/class
- **Long methods** → Break into private helpers (keep tests on public interface)
- **Shallow modules** → Combine or deepen
- **Feature envy** → Move logic to where data lives
- **Primitive obsession** → Introduce value objects
- **Existing code** the new code reveals as problematic

**Never refactor while RED.** Get to GREEN first.
