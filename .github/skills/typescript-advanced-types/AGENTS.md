# TypeScript Advanced Types — Full Compiled Guide

Comprehensive reference for TypeScript's advanced type system. 13 rules across 3 categories covering core type features, advanced patterns, and best practices.

---

## Table of Contents

1. [When to Apply](#when-to-apply)
2. [Rule Categories by Priority](#rule-categories-by-priority)
3. [Core Type Features (CRITICAL)](#core-type-features-critical)
   - [Generics](#generics)
   - [Conditional Types](#conditional-types)
   - [Mapped Types](#mapped-types)
   - [Template Literal Types](#template-literal-types)
   - [Utility Types](#utility-types)
   - [Discriminated Unions](#discriminated-unions)
   - [Type Inference](#type-inference)
4. [Advanced Patterns (HIGH)](#advanced-patterns-high)
   - [Type-Safe Event Emitter](#type-safe-event-emitter)
   - [Type-Safe API Client](#type-safe-api-client)
   - [Deep Recursive Types](#deep-recursive-types)
   - [Type-Safe Form Validation](#type-safe-form-validation)
   - [Builder Pattern](#builder-pattern)
5. [Best Practices (MEDIUM)](#best-practices-medium)
   - [General Practices](#general-practices)
   - [Type Testing](#type-testing)
   - [Common Pitfalls](#common-pitfalls)
   - [Performance Considerations](#performance-considerations)

---

## When to Apply

Reference these guidelines when:
- Building type-safe libraries or frameworks
- Creating reusable generic components
- Implementing complex type inference logic
- Designing type-safe API clients or event emitters
- Building form validation or state management systems
- Migrating JavaScript codebases to TypeScript

## Rule Categories by Priority

| Priority | Category | Impact | Rules |
|----------|----------|--------|-------|
| 1 | Core Type Features | CRITICAL | generics, conditional-types, mapped-types, template-literal-types, utility-types, pattern-discriminated-unions, type-inference |
| 2 | Advanced Patterns | HIGH | pattern-event-emitter, pattern-api-client, pattern-deep-types, pattern-form-validation, pattern-builder |
| 3 | Best Practices | MEDIUM | best-practices |

---

## Core Type Features (CRITICAL)

### Generics

**Impact:** CRITICAL — Foundation for all reusable, type-safe components.

#### Basic Generic Function

```typescript
function identity<T>(value: T): T {
  return value;
}

const num = identity<number>(42);    // Type: number
const str = identity<string>("hello"); // Type: string
const auto = identity(true);          // Type inferred: boolean
```

#### Generic Constraints

Use `extends` to restrict what types a generic parameter accepts:

```typescript
interface HasLength {
  length: number;
}

function logLength<T extends HasLength>(item: T): T {
  console.log(item.length);
  return item;
}

logLength("hello");          // OK: string has length
logLength([1, 2, 3]);        // OK: array has length
logLength({ length: 10 });   // OK: object has length
// logLength(42);             // Error: number has no length
```

#### Multiple Type Parameters

```typescript
function merge<T, U>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}

const merged = merge({ name: "John" }, { age: 30 });
// Type: { name: string } & { age: number }
```

#### Generic Class

```typescript
class Container<T> {
  private items: T[] = [];

  add(item: T): void {
    this.items.push(item);
  }

  get(index: number): T {
    return this.items[index];
  }

  getAll(): T[] {
    return [...this.items];
  }
}

const strings = new Container<string>();
strings.add("hello");
const first = strings.get(0); // Type: string
```

#### keyof Constraint

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const person = { name: "Alice", age: 30 };
const name = getProperty(person, "name"); // Type: string
const age = getProperty(person, "age");   // Type: number
// getProperty(person, "missing");         // Error: not in keyof
```

---

### Conditional Types

**Impact:** CRITICAL — Enables type-level branching and complex inference.

#### Basic Conditional Type

```typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<string>;  // true
type B = IsString<number>;  // false
```

#### Extracting Return Types with `infer`

```typescript
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function getUser() {
  return { id: 1, name: "John" };
}

type User = MyReturnType<typeof getUser>;
// Type: { id: number; name: string }
```

#### Distributive Conditional Types

When a conditional type receives a union, it distributes over each member:

```typescript
type ToArray<T> = T extends any ? T[] : never;

type StrOrNumArray = ToArray<string | number>;
// Type: string[] | number[] (NOT (string | number)[])
```

Prevent distribution with tuple wrapping:

```typescript
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;

type Result = ToArrayNonDist<string | number>;
// Type: (string | number)[]
```

#### Nested Conditions

```typescript
type TypeName<T> =
  T extends string ? "string" :
  T extends number ? "number" :
  T extends boolean ? "boolean" :
  T extends undefined ? "undefined" :
  T extends Function ? "function" :
  "object";

type T1 = TypeName<string>;       // "string"
type T2 = TypeName<() => void>;   // "function"
type T3 = TypeName<{ a: 1 }>;     // "object"
```

#### Multiple `infer` Positions

```typescript
type FirstAndLast<T extends any[]> =
  T extends [infer F, ...any[], infer L] ? [F, L] :
  T extends [infer F] ? [F, F] :
  never;

type FL1 = FirstAndLast<[1, 2, 3]>;  // [1, 3]
type FL2 = FirstAndLast<["a"]>;       // ["a", "a"]
```

---

### Mapped Types

**Impact:** CRITICAL — Transform types by iterating over their properties.

#### Basic Mapped Type

```typescript
type MyReadonly<T> = {
  readonly [P in keyof T]: T[P];
};

interface User {
  id: number;
  name: string;
}

type ReadonlyUser = MyReadonly<User>;
// { readonly id: number; readonly name: string }
```

#### Optional Properties

```typescript
type MyPartial<T> = {
  [P in keyof T]?: T[P];
};

type PartialUser = MyPartial<User>;
// { id?: number; name?: string }
```

#### Key Remapping with `as`

Generate new property names from existing keys:

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }
```

#### Filtering Properties by Type

Use `as` + `never` to exclude keys:

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
// { id: number; age: number }
```

#### Adding Modifiers

```typescript
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];  // Remove readonly
};

type Required<T> = {
  [P in keyof T]-?: T[P];  // Remove optional
};
```

---

### Template Literal Types

**Impact:** HIGH — Create string-based types with pattern matching and transformation.

#### Basic Template Literal

```typescript
type EventName = "click" | "focus" | "blur";
type EventHandler = `on${Capitalize<EventName>}`;
// "onClick" | "onFocus" | "onBlur"
```

#### String Manipulation Utilities

```typescript
type Upper = Uppercase<"hello">;         // "HELLO"
type Lower = Lowercase<"HELLO">;         // "hello"
type Cap   = Capitalize<"john">;         // "John"
type Uncap = Uncapitalize<"John">;       // "john"
```

#### Recursive Path Building

Generate all valid paths for nested objects:

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

#### CSS Unit Types

```typescript
type CSSUnit = "px" | "rem" | "em" | "%" | "vh" | "vw";
type CSSValue = `${number}${CSSUnit}`;

function setWidth(value: CSSValue) { /* ... */ }

setWidth("100px");   // OK
setWidth("1.5rem");  // OK
// setWidth("100");  // Error: missing unit
```

---

### Utility Types

**Impact:** HIGH — Built-in types that cover ~80% of everyday transformation needs.

```typescript
// Partial<T> — Make all properties optional
type PartialUser = Partial<User>;

// Required<T> — Make all properties required
type RequiredUser = Required<PartialUser>;

// Readonly<T> — Make all properties readonly
type ReadonlyUser = Readonly<User>;

// Pick<T, K> — Select specific properties
type UserName = Pick<User, "name" | "email">;

// Omit<T, K> — Remove specific properties
type UserWithoutPassword = Omit<User, "password">;

// Exclude<T, U> — Exclude types from union
type T1 = Exclude<"a" | "b" | "c", "a">;  // "b" | "c"

// Extract<T, U> — Extract types from union
type T2 = Extract<"a" | "b" | "c", "a" | "b">;  // "a" | "b"

// NonNullable<T> — Exclude null and undefined
type T3 = NonNullable<string | null | undefined>;  // string

// Record<K, T> — Create object type with keys K and values T
type PageInfo = Record<"home" | "about", { title: string }>;

// ReturnType<T> — Extract return type of a function
type R = ReturnType<() => string>;  // string

// Parameters<T> — Extract parameter types of a function
function add(a: number, b: number): number { return a + b; }
type P = Parameters<typeof add>;  // [number, number]
```

---

### Discriminated Unions

**Impact:** CRITICAL — Exhaustive pattern matching with discriminant properties.

#### AsyncState Pattern

```typescript
type Success<T> = { status: "success"; data: T };
type ErrorState = { status: "error"; error: string };
type Loading    = { status: "loading" };

type AsyncState<T> = Success<T> | ErrorState | Loading;

function handleState<T>(state: AsyncState<T>): void {
  switch (state.status) {
    case "success":
      console.log(state.data);   // Type: T — narrowed
      break;
    case "error":
      console.log(state.error);  // Type: string — narrowed
      break;
    case "loading":
      console.log("Loading...");
      break;
  }
}
```

#### Exhaustiveness Check

Use `never` to ensure all cases are handled:

```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected: ${x}`);
}

function handleState<T>(state: AsyncState<T>): string {
  switch (state.status) {
    case "success": return "done";
    case "error":   return state.error;
    case "loading": return "wait";
    default:        return assertNever(state); // Compile error if a case is missing
  }
}
```

#### Type-Safe State Machine

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
      if (event.type === "SUCCESS") return { type: "success", data: event.data };
      if (event.type === "ERROR")   return { type: "error", error: event.error };
      return state;
    case "success":
    case "error":
      return event.type === "RESET" ? { type: "idle" } : state;
  }
}
```

---

### Type Inference

**Impact:** HIGH — Extract and narrow types at compile time.

#### `infer` Keyword

```typescript
// Extract array element type
type ElementType<T> = T extends (infer U)[] ? U : never;
type Num = ElementType<number[]>;  // number

// Extract promise type
type PromiseType<T> = T extends Promise<infer U> ? U : never;
type AsyncNum = PromiseType<Promise<number>>;  // number

// Extract function parameters
type Params<T> = T extends (...args: infer P) => any ? P : never;
function foo(a: string, b: number) {}
type FooParams = Params<typeof foo>;  // [string, number]
```

#### Type Guards

Narrow types at runtime with `is`:

```typescript
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T
): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

const data: unknown = ["a", "b", "c"];
if (isArrayOf(data, isString)) {
  data.forEach(s => s.toUpperCase());  // Type: string[]
}
```

#### Assertion Functions

Narrow types by throwing on mismatch:

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

#### `satisfies` Operator (TypeScript 5+)

Validate a value matches a type while preserving its narrow literal type:

```typescript
type Colors = Record<string, [number, number, number] | string>;

const palette = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255],
} satisfies Colors;

// palette.red is still [number, number, number] — NOT Colors[string]
const redChannel = palette.red[0]; // Type: number
```

---

## Advanced Patterns (HIGH)

### Type-Safe Event Emitter

**Impact:** HIGH — Compile-time event/payload validation.

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

  off<K extends keyof T>(event: K, callback: (data: T[K]) => void): void {
    const cbs = this.listeners[event];
    if (cbs) {
      this.listeners[event] = cbs.filter(cb => cb !== callback) as any;
    }
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const callbacks = this.listeners[event];
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

const emitter = new TypedEventEmitter<EventMap>();

emitter.on("user:created", (data) => {
  console.log(data.id, data.name);  // Type-safe!
});

emitter.emit("user:created", { id: "1", name: "John" });
// emitter.emit("user:created", { id: "1" });  // Error: missing 'name'
```

---

### Type-Safe API Client

**Impact:** HIGH — Endpoint config types with inferred params, body, and response.

```typescript
type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE";

type EndpointConfig = {
  "/users": {
    GET:  { response: User[] };
    POST: { body: { name: string; email: string }; response: User };
  };
  "/users/:id": {
    GET:    { params: { id: string }; response: User };
    PUT:    { params: { id: string }; body: Partial<User>; response: User };
    DELETE: { params: { id: string }; response: void };
  };
};

type ExtractParams<T>   = T extends { params: infer P }   ? P : never;
type ExtractBody<T>     = T extends { body: infer B }     ? B : never;
type ExtractResponse<T> = T extends { response: infer R } ? R : never;

class APIClient<Config extends Record<string, Record<HTTPMethod, any>>> {
  async request<
    Path extends keyof Config,
    Method extends keyof Config[Path]
  >(
    path: Path,
    method: Method,
    ...[options]: ExtractParams<Config[Path][Method]> extends never
      ? ExtractBody<Config[Path][Method]> extends never
        ? []
        : [{ body: ExtractBody<Config[Path][Method]> }]
      : [{
          params: ExtractParams<Config[Path][Method]>;
          body?: ExtractBody<Config[Path][Method]>;
        }]
  ): Promise<ExtractResponse<Config[Path][Method]>> {
    return {} as any; // implementation
  }
}

const api = new APIClient<EndpointConfig>();

// Type-safe API calls
const users   = await api.request("/users", "GET");           // User[]
const newUser = await api.request("/users", "POST", {
  body: { name: "John", email: "john@example.com" }
});                                                            // User
const user    = await api.request("/users/:id", "GET", {
  params: { id: "123" }
});                                                            // User
```

---

### Deep Recursive Types

**Impact:** HIGH — Recursive DeepReadonly and DeepPartial for nested object trees.

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? T[P] extends Function
      ? T[P]
      : DeepReadonly<T[P]>
    : T[P];
};

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? T[P] extends Array<infer U>
      ? Array<DeepPartial<U>>
      : DeepPartial<T[P]>
    : T[P];
};

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
    pool: { min: number; max: number };
  };
}

type ReadonlyConfig = DeepReadonly<Config>;
// All nested properties are readonly

type PartialConfig = DeepPartial<Config>;
// All nested properties are optional

// Usage
function updateConfig(partial: DeepPartial<Config>): Config {
  // Merge partial into defaults...
  return {} as Config;
}

updateConfig({
  server: { ssl: { enabled: true } }  // Only set what you need
});
```

---

### Type-Safe Form Validation

**Impact:** MEDIUM — Generic FormValidator with per-field typed rules.

```typescript
type ValidationRule<T> = {
  validate: (value: T) => boolean;
  message: string;
};

type FieldValidation<T> = {
  [K in keyof T]?: ValidationRule<T[K]>[];
};

type ValidationErrors<T> = {
  [K in keyof T]?: string[];
};

class FormValidator<T extends Record<string, any>> {
  constructor(private rules: FieldValidation<T>) {}

  validate(data: T): ValidationErrors<T> | null {
    const errors: ValidationErrors<T> = {};
    let hasErrors = false;

    for (const key in this.rules) {
      const fieldRules = this.rules[key];
      const value = data[key];

      if (fieldRules) {
        const fieldErrors: string[] = [];
        for (const rule of fieldRules) {
          if (!rule.validate(value)) {
            fieldErrors.push(rule.message);
          }
        }
        if (fieldErrors.length > 0) {
          errors[key] = fieldErrors;
          hasErrors = true;
        }
      }
    }

    return hasErrors ? errors : null;
  }
}

// Usage
interface LoginForm {
  email: string;
  password: string;
}

const validator = new FormValidator<LoginForm>({
  email: [
    { validate: v => v.includes("@"), message: "Must contain @" },
    { validate: v => v.length > 0, message: "Required" },
  ],
  password: [
    { validate: v => v.length >= 8, message: "Min 8 characters" },
  ],
});

const errors = validator.validate({ email: "bad", password: "short" });
// Type: { email?: string[]; password?: string[] } | null
```

---

### Builder Pattern

**Impact:** MEDIUM — Builder that tracks required field completion at the type level.

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

  set<K extends keyof T>(key: K, value: T[K]): Builder<T, S & Record<K, T[K]>> {
    (this.state as any)[key] = value;
    return this as any;
  }

  build(this: IsComplete<T, S> extends true ? this : never): T {
    return this.state as unknown as T;
  }
}

// Usage
interface UserConfig {
  id: string;
  name: string;
  email: string;
  age?: number;
}

const user = new Builder<UserConfig>()
  .set("id", "1")
  .set("name", "John")
  .set("email", "john@example.com")
  .build();  // OK: all required fields set

// new Builder<UserConfig>()
//   .set("id", "1")
//   .build();  // Error: missing required 'name' and 'email'
```

---

## Best Practices (MEDIUM)

### General Practices

1. **Use `unknown` over `any`** — Forces explicit type checking before use
2. **Prefer `interface` for object shapes** — Better error messages and declaration merging
3. **Use `type` for unions and computed types** — More flexible for complex type algebra
4. **Leverage type inference** — Let TypeScript infer when the inferred type is obvious
5. **Create helper types** — Build small, composable, reusable type utilities
6. **Use `const` assertions** — Preserve literal types with `as const`
7. **Avoid type assertions** — Use type guards and narrowing instead of `as`
8. **Document complex types** — Add JSDoc comments for non-obvious type utilities
9. **Enable strict mode** — All strict compiler options (`strict: true` in tsconfig)
10. **Test your types** — Verify type behavior with compile-time assertions

### Type Testing

```typescript
// Compile-time type assertion
type AssertEqual<T, U> =
  [T] extends [U] ? [U] extends [T] ? true : false : false;

// Usage
type Test1 = AssertEqual<string, string>;          // true
type Test2 = AssertEqual<string, number>;          // false
type Test3 = AssertEqual<string | number, string>; // false

// Expect-error helper
type ExpectError<T extends never> = T;
type ShouldError = ExpectError<AssertEqual<string, number>>;
```

### Common Pitfalls

| Pitfall | Problem | Solution |
|---------|---------|----------|
| Over-using `any` | Defeats TypeScript's purpose | Use `unknown` + type guards |
| Ignoring strict null checks | Runtime null errors | Enable `strictNullChecks` |
| Overly complex types | Slow compilation | Simplify; break into smaller types |
| Missing discriminated unions | Can't narrow in switch | Add a literal `type` or `kind` field |
| Forgetting `readonly` | Unintended mutations | Use `Readonly<T>` or `DeepReadonly<T>` |
| Circular type references | Compiler errors | Break cycles with interfaces |
| Not handling edge cases | Empty arrays, null values | Add `never` and `null` checks |

### Performance Considerations

- **Avoid deeply nested conditional types** — each level adds to compiler work
- **Use simple types when possible** — don't over-engineer generic utilities
- **Limit recursion depth** — recursive types can hit TypeScript's depth limit (~50 levels)
- **Skip type checking in production builds** — use `tsc --noEmit` separately from bundling
- **Use `@ts-expect-error` over `@ts-ignore`** — compiler removes it when the error is fixed

---

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Type Challenges](https://github.com/type-challenges/type-challenges)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- Vanderkam, D. *Effective TypeScript* — O'Reilly
