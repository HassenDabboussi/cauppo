---
title: Mapped Types
impact: CRITICAL
impactDescription: Mapped types transform existing types systematically, enabling DRY type definitions and automatic type generation
tags: mapped, keyof, in, readonly, partial, key-remapping, as, filtering
---

# Mapped Types

Transform existing types by iterating over their properties.

## Basic Mapped Types

```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Partial<T> = {
  [P in keyof T]?: T[P];
};

interface User {
  id: number;
  name: string;
}

type ReadonlyUser = Readonly<User>;
// { readonly id: number; readonly name: string; }

type PartialUser = Partial<User>;
// { id?: number; name?: string; }
```

## Key Remapping (as clause)

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number; }
```

## Filtering Properties by Type

```typescript
type PickByType<T, U> = {
  [K in keyof T as T[K] extends U ? K : never]: T[K];
};

interface Mixed {
  id: number;
  name: string;
  age: number;
  active: boolean;
}

type OnlyNumbers = PickByType<Mixed, number>;
// { id: number; age: number; }
```
