---
title: Discriminated Unions
impact: CRITICAL
impactDescription: Discriminated unions enable exhaustive type narrowing in switch statements, catching unhandled states at compile time
tags: pattern, discriminated-union, state-machine, narrowing, switch, exhaustive
---

# Discriminated Unions

Union types with a shared discriminant property that TypeScript narrows automatically.

## Async State

```typescript
type Success<T> = { status: "success"; data: T };
type Error = { status: "error"; error: string };
type Loading = { status: "loading" };

type AsyncState<T> = Success<T> | Error | Loading;

function handleState<T>(state: AsyncState<T>): void {
  switch (state.status) {
    case "success":
      console.log(state.data); // Type: T
      break;
    case "error":
      console.log(state.error); // Type: string
      break;
    case "loading":
      console.log("Loading...");
      break;
  }
}
```

## Type-Safe State Machine

```typescript
type State =
  | { type: "idle" }
  | { type: "fetching"; requestId: string }
  | { type: "success"; data: any }
  | { type: "error"; error: Error };

type Event =
  | { type: "FETCH"; requestId: string }
  | { type: "SUCCESS"; data: any }
  | { type: "ERROR"; error: Error }
  | { type: "RESET" };

function reducer(state: State, event: Event): State {
  switch (state.type) {
    case "idle":
      return event.type === "FETCH"
        ? { type: "fetching", requestId: event.requestId }
        : state;
    case "fetching":
      if (event.type === "SUCCESS") {
        return { type: "success", data: event.data };
      }
      if (event.type === "ERROR") {
        return { type: "error", error: event.error };
      }
      return state;
    case "success":
    case "error":
      return event.type === "RESET" ? { type: "idle" } : state;
  }
}
```
