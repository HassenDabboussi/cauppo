---
name: tdd
description: Test-driven development with red-green-refactor loop. Use when user wants to build features or fix bugs using TDD, mentions "red-green-refactor", wants integration tests, or asks for test-first development.
license: MIT
metadata:
  author: tdd-community
  version: "2.0.0"
  date: February 2026
  abstract: Test-driven development guide for AI agents and developers. Contains 5 references covering test quality, mocking boundaries, deep module design, refactoring patterns, and interface testability. Focuses on behavior-driven vertical slices with the red-green-refactor loop. Applies only to BDD-TDD and CONTRACT-TDD tasks.
---

# Test-Driven Development

Behavior-driven TDD guide with vertical tracer-bullet workflow. Contains 5 references covering test quality, mocking at system boundaries, deep module design, refactoring patterns, and testable interface design.

## Scope of Application

> **This TDD workflow applies ONLY to tasks classified as BDD-TDD or CONTRACT-TDD by the Scrum Master.**

It does **NOT** apply to:
- **NO-TEST tasks** — scaffold, config, migrations, tooling
- **IMPLEMENT-FIRST tasks** — UI pages, components, styling

**Before applying the Red-Green-Refactor cycle, verify the task's mode in `sprint_x_task_y.md`.**

## When to Apply

Reference these guidelines when:
- Implementing business logic with clear pass/fail rules (BDD-TDD)
- Building API contracts with defined request/response shapes (CONTRACT-TDD)
- Writing complex validation, data transforms, or algorithms
- Implementing auth logic, permission checks, or workflow engines

## Reference Categories by Priority

| Priority | Category | Impact | Reference |
|----------|----------|--------|-----------|
| 1 | Test Quality | CRITICAL | `tests.md` |
| 2 | Mocking Boundaries | CRITICAL | `mocking.md` |
| 3 | Interface Design | HIGH | `interface-design.md` |
| 4 | Deep Modules | HIGH | `deep-modules.md` |
| 5 | Refactoring | MEDIUM | `refactoring.md` |

## Quick Reference

### 1. Test Quality (CRITICAL)

- `tests` — Integration-style tests through real interfaces, not mocked internals
- `tests` — Test behavior users care about (WHAT), not implementation (HOW)
- `tests` — Verify through public API, not by querying DB directly
- `tests` — One logical assertion per test

### 2. Mocking Boundaries (CRITICAL)

- `mocking` — Mock only at system boundaries: external APIs, databases, time/randomness
- `mocking` — Never mock your own classes or internal collaborators
- `mocking` — Use dependency injection for mockability
- `mocking` — Prefer SDK-style interfaces over generic fetchers

### 3. Interface Design for Testability (HIGH)

- `interface-design` — Accept dependencies, don't create them
- `interface-design` — Return results, don't produce side effects
- `interface-design` — Small surface area: fewer methods = fewer tests

### 4. Deep Modules (HIGH)

- `deep-modules` — Small interface + deep implementation (from APOSD)
- `deep-modules` — Reduce method count, simplify parameters, hide complexity

### 5. Refactoring Patterns (MEDIUM)

- `refactoring` — Extract duplication, break long methods, deepen shallow modules
- `refactoring` — Never refactor while RED — get to GREEN first

## Workflow Summary

### Anti-Pattern: Horizontal Slices

**DO NOT write all tests first, then all implementation.** Use vertical slices:

```
WRONG (horizontal):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT (vertical):
  RED→GREEN: test1→impl1
  RED→GREEN: test2→impl2
  RED→GREEN: test3→impl3
```

### Red-Green-Refactor Loop

1. **RED** — Write ONE test for ONE behavior → test fails
2. **GREEN** — Write minimal code to pass → test passes
3. **REFACTOR** — Clean up while all tests still pass
4. Repeat

## How to Use

Read individual reference files for detailed patterns and code examples:

```
references/tests.md
references/mocking.md
references/interface-design.md
references/deep-modules.md
references/refactoring.md
```

Each reference file contains:
- Explanation of the principle
- Good vs. bad code examples (TypeScript/Go)
- Red flags and quick reference tables

## Full Compiled Document

For the complete guide with all references expanded: `AGENTS.md`

## References

- Beck, K. "Test-Driven Development: By Example"
- Ousterhout, J. "A Philosophy of Software Design"
- Fowler, M. "Refactoring: Improving the Design of Existing Code"
