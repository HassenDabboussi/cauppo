# Project Documentation Reference — Critical Consumption Protocol

> **This file defines how ALL agents interact with the `docs/` folder.** It establishes the documentation hierarchy, authority levels, and the critical-thinking rules that prevent blind adherence to potentially stale or imperfect specifications.

---

## Documentation Hierarchy

The `docs/` folder contains **pre-built project specifications** created before development begins. These documents represent extensive upfront analysis and are the strongest available starting point for all project work. However, they are **living references, not immutable contracts** — agents must consume them critically.

### Document Inventory

| Document | Authority Level | Purpose | Primary Consumers |
|----------|----------------|---------|-------------------|
| `docs/PRD.md` | **Business Source of Truth** | Business requirements, stakeholder goals, personas, feature specs, MoSCoW priorities | Product Owner, Orchestrator |
| `docs/SRS.md` | **Technical Source of Truth** | Use cases (UC1–UC96), system architecture, microservice catalog, state machines, deployment topology | Architect, Scrum Master, Reviewer, Triage, DevOps |
| `docs/api-contracts.md` | **API Baseline** | 143 REST endpoints across 6 services — request/response schemas, error codes, auth requirements | Architect, Coder-Go, Coder-TS, SDET-Go, SDET-TS, Reviewer |
| `docs/data-dictionary.md` | **Single Source of Truth for Data** | All enums, status values, DB schema (24+ tables), status transition rules, common data types | ALL agents that touch data |
| `docs/diagrams.md` | **Visual Reference** | Mermaid diagrams — system architecture, navigation flows per role, class diagrams | Architect, DevOps, Designer |
| `docs/ui-canvas.md` | **Design System Authority** | Global brand (Olive Green #6B7B3C + Gold #C9A227), component library, accessibility, animations, device specs | Designer, Coder-TS, SDET-TS |
| `docs/shared-ui-canvas.md` | **Auth & Global UI Spec** | Screens S1–S16: login, register, password flows, role picker, staff onboarding | Designer, Coder-TS, SDET-TS |
| `docs/customer-ui-canvas.md` | **Customer Role UI Spec** | Screens C1–C13: QR scan, menu, cart, order tracking, feedback, profile | Designer, Coder-TS, SDET-TS |
| `docs/waiter-ui-canvas.md` | **Waiter Role UI Spec** | Screens W1–W8: dashboard, active/completed orders, assisted ordering | Designer, Coder-TS, SDET-TS |
| `docs/kitchen-ui-canvas.md` | **Kitchen Role UI Spec** | Screens K1–K6: 4-column Kanban KDS, order detail | Designer, Coder-TS, SDET-TS |
| `docs/cashier-ui-canvas.md` | **Cashier Role UI Spec** | Screens CA1–CA4: payment dashboard, order tickets | Designer, Coder-TS, SDET-TS |
| `docs/manager-ui-canvas.md` | **Manager Role UI Spec** | Screens M1–M16: analytics, menu/staff/table/promo management | Designer, Coder-TS, SDET-TS |
| `docs/owner-ui-canvas.md` | **Owner Role UI Spec** | Screens O1–O19: multi-restaurant oversight, subscription, ownership transfer | Designer, Coder-TS, SDET-TS |

---

## Authority Precedence Rules

When documents conflict, follow this precedence:

1. **`data-dictionary.md`** is the single source of truth for all enum values, status transitions, and table schemas. If any other document uses a different enum value or status name, `data-dictionary.md` wins — and the discrepancy MUST be flagged.
2. **`ARCHITECTURE.md` (Architect-generated)** takes precedence over `docs/` for implementation details. The Architect's validated, adapted specifications are the implementation contract. However, discrepancies between `ARCHITECTURE.md` and `docs/` MUST be reported to the Orchestrator.
3. **`DESIGN_SPEC_task_y.md` (Designer-generated)** takes precedence over `docs/ui-canvas.md` and role-specific canvases for task-level UI implementation. The Designer adapts canvas specs to shadcn/ui + TailwindCSS realities.
4. **`docs/PRD.md`** is the business authority — it defines WHAT and WHY. If `docs/SRS.md` contradicts the PRD's business intent, flag it.
5. **`docs/SRS.md`** is the technical authority — it defines HOW at the specification level. It seeds the Architect's work but doesn't override the Architect's implementation decisions.

---

## Critical Consumption Protocol

> **These rules apply to EVERY agent that reads a `docs/` file.**

### 1. Read With Purpose, Not Exhaustively

- **Read only the sections relevant to your current task.** `docs/api-contracts.md` has 143 endpoints — read only the service section matching your task's Service column.
- **Read only the role-specific canvas matching your task scope.** If working on customer ordering, read `docs/customer-ui-canvas.md` — not all 7 canvases.
- Use section headers, table of contents, and search to navigate large documents efficiently.

### 2. Verify, Don't Trust Blindly

- **Cross-reference between docs.** If `api-contracts.md` says an endpoint returns `status: "ACTIVE"` but `data-dictionary.md` defines the enum as `"active"` (lowercase), flag the inconsistency.
- **Validate against implementation reality.** If you're in Sprint 3+ and implementation has diverged from a `docs/` specification (with Architect/Designer approval), follow the implementation — not the stale doc.
- **Question missing elements.** If `api-contracts.md` defines an endpoint but `docs/SRS.md` has no matching use case, flag the gap. If a UI canvas screen references data that no API endpoint provides, flag it.

### 3. Flag Discrepancies, Don't Guess

When you find a conflict between docs, or between a doc and implementation:

**Report format (include in your output to the Orchestrator):**

```
⚠️ DOC DISCREPANCY:
- Source A: [doc name, section] says [X]
- Source B: [doc name, section] says [Y]
- Impact: [what breaks if we follow A vs B]
- Recommendation: [which to follow and why]
```

**Do NOT silently pick one side.** The Orchestrator routes discrepancies to the appropriate agent (Architect for technical, Product Owner for business, Designer for UI).

### 4. Propose Improvements

If a `docs/` specification is technically correct but suboptimal:
- **Agents SHOULD propose improvements** with justification (performance, accessibility, security, UX, maintainability).
- Include the improvement proposal in your output. The Orchestrator decides whether to approve the deviation.
- Example: "The customer-ui-canvas.md specifies a full-page reload after order submission (C5), but a client-side navigation with optimistic UI update would be faster and more modern. Recommend: use Next.js router push with SWR revalidation."

### 5. Track Document Versions

Each `docs/` file has a version number. When reading a doc, note the version. If you notice the version hasn't changed across multiple sprints while implementation has diverged, flag it as potentially stale:

```
⚠️ DOC STALENESS WARNING:
- Document: docs/api-contracts.md v0.3.0
- Last known update: Pre-Sprint 1
- Implementation divergence: 3+ approved deviations in Sprints 2-4
- Recommendation: Schedule docs refresh task
```

---

## Role-Specific Canvas Selection

For agents that consume UI specifications, select the canvas matching your current task's user role scope:

| Task Involves | Read These Canvases |
|---------------|-------------------|
| Authentication, onboarding, global UI | `docs/shared-ui-canvas.md` |
| Customer ordering, menu, cart, feedback | `docs/customer-ui-canvas.md` |
| Waiter operations, assisted ordering | `docs/waiter-ui-canvas.md` |
| Kitchen display, order queue | `docs/kitchen-ui-canvas.md` |
| Cashier/payment operations | `docs/cashier-ui-canvas.md` |
| Restaurant management, analytics | `docs/manager-ui-canvas.md` |
| Multi-restaurant ownership, subscriptions | `docs/owner-ui-canvas.md` |
| Cross-role or design system work | `docs/ui-canvas.md` (design system hub) |

**Always** also read `docs/ui-canvas.md` for the global design system tokens (colors, typography, animations) when working on any UI task.
