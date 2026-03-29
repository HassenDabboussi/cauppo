---
name: typescript-advanced-types
description: Master TypeScript's advanced type system including generics, conditional types, mapped types, template literals, and utility types for building type-safe applications. Use when implementing complex type logic, creating reusable type utilities, or ensuring compile-time type safety in TypeScript projects.
license: MIT
metadata:
  author: typescript-community
  version: "2.0.0"
  date: February 2026
  abstract: Comprehensive TypeScript advanced type system guide for AI agents and developers. Contains 13 rules across 3 categories covering core type features, advanced patterns, and best practices. Each rule includes idiomatic TypeScript examples demonstrating type-safe designs for event systems, API clients, form validation, and state machines.
---

# TypeScript Advanced Types

Comprehensive guide to TypeScript's advanced type system. Contains 13 rules across 3 categories covering core type features, real-world patterns, and best practices for building robust, type-safe applications.

## When to Apply

Reference these guidelines when:
- Building type-safe libraries or frameworks
- Creating reusable generic components
- Implementing complex type inference logic
- Designing type-safe API clients or event emitters
- Building form validation or state management systems
- Migrating JavaScript codebases to TypeScript

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Core Type Features | CRITICAL | (none) |
| 2 | Advanced Patterns | HIGH | `pattern-` |
| 3 | Best Practices | MEDIUM | (none) |

## Quick Reference

### 1. Core Type Features (CRITICAL)

- `generics` — Type parameters, constraints, multiple params for reusable type-safe components
- `conditional-types` — Type-level branching with extends, infer, distributive behavior
- `mapped-types` — Transform types by iterating properties; key remapping with `as`
- `template-literal-types` — String pattern types for events, routes, config paths
- `utility-types` — Built-in Partial, Pick, Omit, Record, Exclude, Extract, NonNullable
- `pattern-discriminated-unions` — Exhaustive switch narrowing with discriminant properties
- `type-inference` — infer keyword, type guards (`is`), assertion functions (`asserts`)

### 2. Advanced Patterns (HIGH)

- `pattern-event-emitter` — Generic TypedEventEmitter with compile-time event/payload validation
- `pattern-api-client` — Endpoint config types with inferred params, body, and response
- `pattern-deep-types` — Recursive DeepReadonly and DeepPartial for nested objects
- `pattern-form-validation` — Generic FormValidator with per-field typed rules
- `pattern-builder` — Builder that tracks required field completion at the type level

### 3. Best Practices (MEDIUM)

- `best-practices` — unknown over any, strict mode, const assertions, type testing, pitfalls

## How to Use

Read individual rule files for detailed TypeScript examples:

```
rules/generics.md
rules/conditional-types.md
rules/mapped-types.md
rules/template-literal-types.md
rules/utility-types.md
rules/pattern-discriminated-unions.md
rules/type-inference.md
rules/pattern-event-emitter.md
rules/pattern-api-client.md
rules/pattern-deep-types.md
rules/pattern-form-validation.md
rules/pattern-builder.md
rules/best-practices.md
```

Each rule file contains:
- Brief explanation of the type concept
- Complete TypeScript code examples
- Usage patterns and type-level tests

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`

## References

- https://www.typescriptlang.org/docs/handbook/
- https://github.com/type-challenges/type-challenges
- https://basarat.gitbook.io/typescript/
- Vanderkam, D. "Effective TypeScript"
