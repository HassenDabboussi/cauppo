---
title: Deep Readonly and Deep Partial
impact: HIGH
impactDescription: Recursive type utilities enforce immutability or optionality at every nesting level, preventing accidental mutation of nested config or state objects
tags: pattern, deep-readonly, deep-partial, recursive, nested, config
---

# Deep Readonly and Deep Partial

Recursive type utilities that apply `Readonly` or `Partial` at every nesting level.

## DeepReadonly

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? T[P] extends Function
      ? T[P]
      : DeepReadonly<T[P]>
    : T[P];
};
```

## DeepPartial

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? T[P] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : DeepPartial<T[P]>
    : T[P];
};
```

## Usage

```typescript
interface Config {
  server: {
    host: string;
    port: number;
    ssl: {
      enabled: boolean;
      cert: string;
    };
  };
  database: {
    url: string;
    pool: {
      min: number;
      max: number;
    };
  };
}

type ReadonlyConfig = DeepReadonly<Config>;
// All nested properties are readonly

type PartialConfig = DeepPartial<Config>;
// All nested properties are optional — useful for config overrides
```
