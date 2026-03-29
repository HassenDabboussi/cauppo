---
title: Utility Types
impact: HIGH
impactDescription: Built-in utility types standardize common type transformations and reduce boilerplate across the codebase
tags: partial, required, readonly, pick, omit, exclude, extract, record, nonnullable, returntype, parameters
---

# Utility Types

TypeScript's built-in utility types for common type transformations.

## Property Modifiers

```typescript
// Make all properties optional
type PartialUser = Partial<User>;

// Make all properties required
type RequiredUser = Required<PartialUser>;

// Make all properties readonly
type ReadonlyUser = Readonly<User>;
```

## Property Selection

```typescript
// Select specific properties
type UserName = Pick<User, "name" | "email">;

// Remove specific properties
type UserWithoutPassword = Omit<User, "password">;
```

## Union Manipulation

```typescript
// Exclude types from union
type T1 = Exclude<"a" | "b" | "c", "a">; // "b" | "c"

// Extract types from union
type T2 = Extract<"a" | "b" | "c", "a" | "b">; // "a" | "b"

// Exclude null and undefined
type T3 = NonNullable<string | null | undefined>; // string
```

## Record Type

```typescript
// Create object type with keys K and values T
type PageInfo = Record<"home" | "about", { title: string }>;
// { home: { title: string }; about: { title: string } }
```

## Function Type Utilities

```typescript
// Extract return type
type R = ReturnType<typeof getUser>; // User

// Extract parameters
type P = Parameters<typeof createUser>; // [name: string, email: string]
```
