---
title: Type-Safe API Client
impact: HIGH
impactDescription: Endpoint configuration types catch mismatched request/response shapes at compile time, preventing runtime API errors
tags: pattern, api-client, endpoint, http, infer, params, body, response
---

# Type-Safe API Client

Generic API client where endpoint paths, methods, request bodies, and response types are all validated at compile time.

```typescript
type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE";

type EndpointConfig = {
  "/users": {
    GET: { response: User[] };
    POST: { body: { name: string; email: string }; response: User };
  };
  "/users/:id": {
    GET: { params: { id: string }; response: User };
    PUT: { params: { id: string }; body: Partial<User>; response: User };
    DELETE: { params: { id: string }; response: void };
  };
};

type ExtractParams<T> = T extends { params: infer P } ? P : never;
type ExtractBody<T> = T extends { body: infer B } ? B : never;
type ExtractResponse<T> = T extends { response: infer R } ? R : never;

class APIClient<Config extends Record<string, Record<HTTPMethod, any>>> {
  async request<
    Path extends keyof Config,
    Method extends keyof Config[Path],
  >(
    path: Path,
    method: Method,
    ...[options]: ExtractParams<Config[Path][Method]> extends never
      ? ExtractBody<Config[Path][Method]> extends never
        ? []
        : [{ body: ExtractBody<Config[Path][Method]> }]
      : [
          {
            params: ExtractParams<Config[Path][Method]>;
            body?: ExtractBody<Config[Path][Method]>;
          },
        ]
  ): Promise<ExtractResponse<Config[Path][Method]>> {
    return {} as any;
  }
}

const api = new APIClient<EndpointConfig>();

// Type-safe API calls
const users = await api.request("/users", "GET");
// Type: User[]

const newUser = await api.request("/users", "POST", {
  body: { name: "John", email: "john@example.com" },
});
// Type: User

const user = await api.request("/users/:id", "GET", {
  params: { id: "123" },
});
// Type: User
```
