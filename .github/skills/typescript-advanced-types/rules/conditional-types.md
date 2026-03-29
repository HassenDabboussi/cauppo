---
title: Conditional Types
impact: CRITICAL
impactDescription: Conditional types enable sophisticated type logic, narrowing, and type-level branching for safe API design
tags: conditional, extends, infer, distributive, nested-conditions, never
---

# Conditional Types

Create types that depend on conditions, enabling sophisticated type logic.

## Basic Conditional Type

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false
```

## Extracting Return Types

```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function getUser() {
  return { id: 1, name: "John" };
}

type User = ReturnType<typeof getUser>;
// Type: { id: number; name: string; }
```

## Distributive Conditional Types

When a union type is passed to a conditional type, it distributes across each member:

```typescript
type ToArray<T> = T extends any ? T[] : never;

type StrOrNumArray = ToArray<string | number>;
// Type: string[] | number[]  (not (string | number)[])
```

## Nested Conditions

```typescript
type TypeName<T> = T extends string
  ? "string"
  : T extends number
    ? "number"
    : T extends boolean
      ? "boolean"
      : T extends undefined
        ? "undefined"
        : T extends Function
          ? "function"
          : "object";

type T1 = TypeName<string>; // "string"
type T2 = TypeName<() => void>; // "function"
```
