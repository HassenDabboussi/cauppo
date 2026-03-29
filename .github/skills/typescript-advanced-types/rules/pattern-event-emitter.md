---
title: Type-Safe Event Emitter
impact: HIGH
impactDescription: Generic event emitter ensures compile-time validation of event names and payload shapes
tags: pattern, event-emitter, generic-class, record, keyof, callback
---

# Type-Safe Event Emitter

Generic event emitter that enforces correct event names and payload shapes at compile time.

```typescript
type EventMap = {
  "user:created": { id: string; name: string };
  "user:updated": { id: string };
  "user:deleted": { id: string };
};

class TypedEventEmitter<T extends Record<string, any>> {
  private listeners: {
    [K in keyof T]?: Array<(data: T[K]) => void>;
  } = {};

  on<K extends keyof T>(event: K, callback: (data: T[K]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback);
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const callbacks = this.listeners[event];
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }
}

const emitter = new TypedEventEmitter<EventMap>();

emitter.on("user:created", (data) => {
  console.log(data.id, data.name); // Type-safe!
});

emitter.emit("user:created", { id: "1", name: "John" }); // OK
// emitter.emit("user:created", { id: "1" }); // Error: missing 'name'
```
