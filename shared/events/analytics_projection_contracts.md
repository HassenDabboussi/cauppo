# Analytics Projection Contracts

**Date:** 2026-05-17
**Status:** Frozen for Sprint 32
**Scope:** analytics-service consumers for users, restaurants, menu, feedback, and repair flows

## Purpose

These contracts define the minimum cross-service projection payloads needed for analytics-service to build correct manager and owner dashboards without directly reading source-of-truth business tables.

## Restaurant Projection Events

analytics-service must be able to project `analytics_restaurants` from restaurant lifecycle events with these required fields:

- `eventType`: `restaurant.created`, `restaurant.updated`, `restaurant.deleted`, `restaurant.mode_changed`
- `organizationId`
- `restaurantId`
- `name`
- `timezone`
- `serviceMode`
- `isActive`
- `occurredAt`

Repair path requirement:

- user-service must expose or publish a full restaurant snapshot shape with the same fields so analytics-service can rebuild `analytics_restaurants` after replay gaps.

## Staff Projection Events

analytics-service must be able to project `analytics_staff_members` and owner active staff counts from staff lifecycle events with these required fields:

- `eventType`: `staff.created`, `staff.updated`, `staff.deactivated`, `staff.reactivated`, `staff.deleted`
- `organizationId`
- `restaurantId`
- `staffAssignmentId`
- `userId`
- `fullName`
- `role`
- `employmentStatus`
- `isActive`
- `occurredAt`

Repair path requirement:

- user-service must provide a restaurant-scoped staff roster snapshot with `restaurantId`, `staffAssignmentId`, `userId`, `role`, `employmentStatus`, and `isActive`.
- analytics-service computes `activeStaffCount` from active roster rows. Source services must not emit pre-aggregated counts as the source of truth.

## Menu Projection Events

analytics-service must be able to project restaurant catalog dimensions from menu lifecycle events with these required fields:

- `eventType`: `menu_item.created`, `menu_item.updated`, `menu_item.deleted`
- `restaurantId`
- `menuItemId`
- `name`
- `categoryId`
- `categoryName`
- `isActive`
- `occurredAt`

- `eventType`: `category.created`, `category.updated`, `category.deleted`
- `restaurantId`
- `categoryId`
- `name`
- `isActive`
- `occurredAt`

- `eventType`: `extra.created`, `extra.updated`, `extra.deleted`
- `restaurantId`
- `extraId`
- `name`
- `isActive`
- `occurredAt`

Repair path requirement:

- menu-service must support full snapshot replay for items, categories, and extras by restaurant.

## Feedback Projection Events

analytics-service must be able to project owner overview ratings and recent activity from feedback events with these required fields:

- `eventType`: `feedback.submitted`
- `organizationId`
- `restaurantId`
- `feedbackId`
- `rating`
- `commentPresent`
- `submittedAt`

Recent activity requirement:

- feedback events must be projectable into `analytics_recent_activity` with type `feedback_received`.

## Order Projection Events

Order events are the source of truth for revenue, item, category, extra, recent-order, and live dashboard projections.

Required order event schemas:

- `order.created` with immutable item, category, and extra snapshots
- `order.status_changed` with settlement-adjacent timestamps and status transitions
- `order.paid` with final payment totals and item snapshot continuity
- `order.cancelled` with cancellation timestamp and reason

Shared-table rule:

- participant arrays may exist, but a shared table order always projects as exactly one order fact row.

## Recent Activity Feed Contract

analytics-service must normalize cross-domain activity into this read model shape:

- `activityId`
- `organizationId`
- `restaurantId`
- `restaurantName`
- `type`: `order_created` | `order_paid` | `feedback_received` | `staff_changed`
- `description`
- `occurredAt`

The recent activity feed is an analytics-owned read model, not a direct passthrough of source events.
