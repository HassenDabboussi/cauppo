# Shared Operational Rules

> **Every agent in this workflow MUST adhere to these rules. They are NON-NEGOTIABLE.**
> Individual agent files reference this document via: `@import .github/instructions/shared-rules.md`

---

## 1. Anti-Freeze & Mandatory Output Rules

### You MUST Always Return a Response

Every invocation MUST end with a **structured output message** back to the Orchestrator. There are NO exceptions.

**After every task attempt, return one of these:**

1. **SUCCESS:** "[Task/Subtask] complete. [Summary of what was done]. Files created/modified: [list]. Ready for next step."
2. **APPROVED:** "Review of [artifact] — Approved. No issues found."
3. **REVISIONS REQUIRED:** "Review of [artifact] — [N] issues found: [numbered list]. Return to [agent] for fixes."
4. **PARTIAL:** "Completed [N of M] items. Findings so far: [summary]. Continuing..."
5. **BLOCKED:** "Cannot proceed with [task]. Reason: [specific reason]. Awaiting Orchestrator decision."
6. **FAILURE:** "[Task] FAILED after [N] attempts. Last error: [description]. Hypothesis: [best guess]. Escalating to Orchestrator."

**NEVER do any of these:**
- Exit silently without a message
- Get stuck in an infinite analysis/investigation loop without reporting back
- Spend more than your attempt budget without returning a FAILURE report
- Continue investigating unrelated topics after losing track of the task
- Read more than 5 files in sequence without outputting an interim finding

---

## 2. Forbidden Operations (Anti-Freeze)

These operations are **BANNED** across all agents. They cause indefinite hangs or corrupt project state.

1. **NEVER use `git diff`, `git status`, `git log`, or any git command** unless **explicitly** instructed by the Orchestrator (e.g., "commit changes" in Phase 4, or "git init" in Phase 0). The operation "Reading changed files in the active git repository" is BANNED — it causes indefinite hangs.
2. **NEVER use VS Code source control features** (the Source Control panel, git decorations, etc.).
3. **NEVER open or inspect files you don't need.** Stick to files relevant to your current task within your assigned scope.
4. **NEVER run open-ended search operations** across the entire workspace. Search within specific service directories or `project_management/` only.
5. **Set explicit timeouts on all terminal commands.** Default hard timeout: **120 seconds** for review/test agents, **60 seconds** for implementation agents. If a command doesn't complete within the timeout, **KILL it** and report BLOCKED.
6. **If any terminal command produces no output for 60 seconds, KILL it immediately** and report BLOCKED.
7. **NEVER run volume-destructive Docker commands** such as `docker compose down -v`, `docker compose down --volumes`, `docker compose rm -v`, or `docker volume rm` unless the Orchestrator or user has explicitly authorized deleting volumes for the current task. Preserving existing runtime state is the default.

---

## 3. Canonical Path Convention

All project management artifacts live under `/project_management/` (**underscore**, not hyphen). Every agent MUST use this exact path prefix:

| Artifact | Path |
|----------|------|
| Backlog | `/project_management/BACKLOG.md` |
| System Architecture | `/project_management/SYSTEM_ARCHITECTURE.md` |
| Project State | `/project_management/PROJECT_STATE.md` |
| Context Summary | `/project_management/CONTEXT_SUMMARY.md` |
| Workflow Log | `/project_management/WORKFLOW_LOG.md` |
| Sprint Plan | `/project_management/sprints/sprint_x/sprint_x.md` |
| Task File | `/project_management/sprints/sprint_x/sprint_x_task_y.md` |
| UI Canvas | `/project_management/sprints/sprint_x/UI_CANVAS_sprint_x.md` |
| Design Spec | `/project_management/sprints/sprint_x/DESIGN_SPEC_task_y.md` |

Per-service architecture files:
- `[service-name]/ARCHITECTURE.md` (inside each service directory at the workspace root)

**If any agent uses a different path convention, correct it immediately.**

---

## 4. Context7 MCP — Documentation Lookup Policy

> **STRONGLY RECOMMENDED. Not blocking.**

1. **Before writing code or specs**, use the **context7 MCP server** to fetch the latest documentation for ALL libraries and frameworks involved.
2. **Especially critical for:** Go standard library + third-party packages, TailwindCSS v4 class names, React/Vite APIs, shadcn/ui components, Playwright/Vitest APIs, Docker base images.
3. **Fallback policy:** If context7 is **unavailable after 2 attempts**, proceed using:
   - Project lock files (`go.mod`, `go.sum`, `package.json`, `bun.lockb`)
   - Existing import patterns in the codebase
   - Version numbers from `ARCHITECTURE.md` files
   - `.github/skills/` reference files
4. **Never let context7 unavailability block the entire pipeline.** Log the unavailability and proceed.

---

## 5. Status Tracking Enforcement

After completing EACH subtask or review step:

1. **Update the task file immediately.** Find your subtask row in `sprint_x_task_y.md` and mark it complete (✅).
2. **Do this after every single subtask** — not in a batch at the end.
3. **Report completion** to the Orchestrator with the structured output format from §1.

---

## 6. Working Directory Rules

> **Violating these causes build failures, broken installs, and test errors.**

1. **ALWAYS check your current working directory** (`$PWD` / `Get-Location`) before executing ANY terminal command.
2. **ALWAYS `cd` into the correct service directory** before running commands.
3. **NEVER create files outside your assigned service/scope directory** unless explicitly told by the Orchestrator.

**Stack-specific rules:**
- **Go agents:** `go build`, `go test`, `go vet`, `go mod tidy` → run from `[service-name]/`
- **TS agents:** `npm install`, `npm run build`, `npx vitest`, `npx playwright` → run from `frontend/` or `[ts-service-name]/`
- **Docker commands:** Run from `[service-name]/` (service-specific) or workspace root (docker-compose)

---

## 7. Attempt Budgets

| Agent Type | Max Attempts per Subtask | Max Time per Attempt |
|-----------|-------------------------|---------------------|
| Coder (Go/TS) | 5 fix attempts | 2 minutes |
| SDET (Go/TS) | 3 re-runs | 120s timeout per run |
| Architect | 5 revision cycles | 5 minutes per cycle |
| Reviewer | 5 revision cycles | 5 minutes per cycle |
| Designer | 3 revision cycles | 5 minutes per cycle |

After exhausting the attempt budget, you **MUST stop** and return a FAILURE report. No exceptions.

---

## 8. Review Checkpointing (For Review Agents)

After completing EACH discrete step in a review task, you MUST immediately output a checkpoint:

**After reading each file:**
- `[FILE READ] [filename] — confirmed: [what matched]. issues: [what didn't match].`

**After each check group:**
- `[CHECK GROUP: Name] — [N] issues found, [M] items clean.`

**After applying any fix:**
- `[FIX APPLIED] [filename] — changed: [what was corrected].`

**Do this IMMEDIATELY at each step. Never wait until the end to produce output.**

---

## 9. Conflict Resolution Hierarchy

When sources of truth conflict:

1. `SYSTEM_ARCHITECTURE.md` → cross-service contracts and shared standards
2. `[service-name]/ARCHITECTURE.md` → service-specific technical decisions
3. `DESIGN_SPEC_task_y.md` → visual decisions (UI tasks only)
4. The failing test → expected behavior (TDD modes only)
5. If these conflict, **HALT** and report to the Orchestrator.

---

## 10. Skills Awareness

Align implementation with relevant `.github/skills/` files:
- `golang-pro/SKILL.md` → Go services
- `vercel-react-best-practices/AGENTS.md` → Frontend React/Next.js
- `typescript-advanced-types/SKILL.md` → TypeScript type system
- `docker-expert/SKILL.md` → Docker/Compose/deployment
- `supabase-postgres-best-practices/SKILL.md` → PostgreSQL optimization
- `tdd/SKILL.md` → Test-driven development patterns

## 11. TypeScript Zero-Error Rule

> **For all TypeScript services, this rule is NON-NEGOTIABLE.**

1. `tsc --noEmit` MUST return **exit code 0** as part of every implementation verification step.
2. Passing `bun test` or Vitest alone is NOT sufficient — they do not type-check.
3. Type errors discovered during a review cycle are treated as regression bugs, not cosmetic issues.
4. The Reviewer agent MUST confirm `tsc --noEmit` passed before marking any TypeScript task as verified.
5. The Coder-TS agent MUST run `tsc --noEmit` as the FIRST self-verification step after every implementation.
6. The SDET-TS agent MUST run `tsc --noEmit` as part of every verification pass.
