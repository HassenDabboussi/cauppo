Shared RabbitMQ event schemas and projection contract notes for cross-service verification.

Sprint 32 introduces an analytics contract freeze:

- `order-service/contracts/events/*.schema.json` define the analytics-complete order envelope.
- `shared/events/analytics_projection_contracts.md` defines the required projection contracts for analytics ingestion across users, restaurants, menu, and feedback domains.
- Service-local consumers may keep additional private fields, but they must not weaken the required analytics fields documented here.
