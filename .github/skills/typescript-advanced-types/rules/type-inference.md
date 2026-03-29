---
title: Type Inference Techniques
impact: HIGH
impactDescription: Proper use of infer, type guards, and assertion functions enables safe narrowing without type assertions
tags: infer, type-guard, assertion-function, narrowing, unknown, is
---

# Type Inference Techniques

## The infer Keyword

Extract types from complex structures at the type level:

```typescript
// Extract array element type
type ElementType<T> = T extends (infer U)[] ? U : never;
type Num = ElementType<number[]>; // number

// Extract promise type
type PromiseType<T> = T extends Promise<infer U> ? U : never;
type AsyncNum = PromiseType<Promise<number>>; // number

// Extract function parameters
type Parameters<T> = T extends (...args: infer P) => any ? P : never;

function foo(a: string, b: number) {}
type FooParams = Parameters<typeof foo>; // [string, number]
```

## Type Guards

Narrow types safely at runtime:

```typescript
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

const data: unknown = ["a", "b", "c"];

if (isArrayOf(data, isString)) {
  data.forEach((s) => s.toUpperCase()); // Type: string[]
}
```

## Assertion Functions

Assert type at runtime and narrow for subsequent code:

```typescript
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error("Not a string");
  }
}

function processValue(value: unknown) {
  assertIsString(value);
  // value is now typed as string
  console.log(value.toUpperCase());
}
```
