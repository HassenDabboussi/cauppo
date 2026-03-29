---
title: Template Literal Types
impact: HIGH
impactDescription: Template literal types enable pattern-matching on string types for type-safe event names, routes, and config paths
tags: template-literal, capitalize, uppercase, lowercase, string-manipulation, path
---

# Template Literal Types

Create string-based types with pattern matching and transformation.

## Basic Template Literal

```typescript
type EventName = "click" | "focus" | "blur";
type EventHandler = `on${Capitalize<EventName>}`;
// Type: "onClick" | "onFocus" | "onBlur"
```

## String Manipulation Utilities

```typescript
type UppercaseGreeting = Uppercase<"hello">; // "HELLO"
type LowercaseGreeting = Lowercase<"HELLO">; // "hello"
type CapitalizedName = Capitalize<"john">; // "John"
type UncapitalizedName = Uncapitalize<"John">; // "john"
```

## Recursive Path Building

Build dot-notation paths from nested object types:

```typescript
type Path<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? `${K}` | `${K}.${Path<T[K]>}`
        : never;
    }[keyof T]
  : never;

interface Config {
  server: {
    host: string;
    port: number;
  };
  database: {
    url: string;
  };
}

type ConfigPath = Path<Config>;
// "server" | "database" | "server.host" | "server.port" | "database.url"
```
