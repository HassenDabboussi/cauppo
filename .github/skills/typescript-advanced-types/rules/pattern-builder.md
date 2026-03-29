---
title: Builder Pattern with Type Safety
impact: MEDIUM
impactDescription: Type-safe builders prevent building incomplete objects by tracking set fields at the type level
tags: pattern, builder, required-keys, optional-keys, state-tracking
---

# Builder Pattern with Type Safety

Builder that tracks which required fields have been set, preventing `.build()` on incomplete objects.

```typescript
type BuilderState<T> = {
  [K in keyof T]: T[K] | undefined;
};

type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

type IsComplete<T, S> =
  RequiredKeys<T> extends keyof S
    ? S[RequiredKeys<T>] extends undefined
      ? false
      : true
    : false;

class Builder<T, S extends BuilderState<T> = {}> {
  private state: S = {} as S;

  set<K extends keyof T>(
    key: K,
    value: T[K],
  ): Builder<T, S & Record<K, T[K]>> {
    this.state[key] = value;
    return this as any;
  }

  build(this: IsComplete<T, S> extends true ? this : never): T {
    return this.state as T;
  }
}

interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
}

const user = new Builder<User>()
  .set("id", "1")
  .set("name", "John")
  .set("email", "john@example.com")
  .build(); // OK: all required fields set

// const incomplete = new Builder<User>()
//   .set("id", "1")
//   .build(); // Error: missing required fields
```
