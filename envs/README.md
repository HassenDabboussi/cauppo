# Environment Configuration

This directory is the single centralized source of truth for repo-root orchestration-layer environment variables in the `cauppo-infra` repository. Cauppo is a polyrepo system, so each service also keeps its own local `.env.example` for standalone development. The files in `envs/` use prefixed variable names so one infra-repo working copy can safely drive the full stack without collisions.

Manual auth setup is canonical, and the runtime ownership order is fixed:

1. Repo-root Compose brings up `development` or `isolated-test` and proves stack health only.
2. After the target environment is healthy, the operator completes the manual Zitadel console setup for that same environment.
3. The operator records only the environment-scoped auth values and artifacts that the live consumers need for that environment: issuer host, project ID, client IDs and secrets, and the concrete audience value.
4. `user-service` owns the active-role runtime contract above Zitadel identity. Repo-root orchestration does not own any legacy selected-role or complement-token behavior.
5. Backup and recovery remain the only extra auth mechanism outside normal startup, and they stay environment-scoped through the guarded recovery scripts or an equivalent same-environment operator bundle.

**Sprint 19 final runtime authority (2026-04-25):** Normal human runtime is `active-role-only`. Browser REST uses `Authorization: Bearer` plus `X-Cauppo-Active-Role`, and migrated WebSocket handshakes use the shared active-role subprotocol carrier. Legacy selected-role bearer enrichment, complement-token browser wiring, proof-only websocket lanes, and PAT-backed browser-login-path dependencies are retired from the active model. The passing contract, consumer, integration, and cutoff-certification tests are the assurance package for that retirement.

## Restart And Empty-State Contract

Normal repo-root restart is preservation-only for both supported environments:

- `development` normal `docker compose --env-file envs/.env.development down` then `up` must preserve the existing development Zitadel database state and the matching development `IAM_LOGIN_CLIENT` artifact.
- `isolated-test` normal `docker compose --env-file envs/.env.test down` then `up` must preserve the existing isolated-test Zitadel database state and the matching isolated-test `IAM_LOGIN_CLIENT` artifact.
- The current defaults enforce that rule explicitly: `CAUPPO_DEVELOPMENT_ZITADEL_STATE_MODE=preserve-only` in `envs/.env.development` and `CAUPPO_ISOLATED_TEST_ZITADEL_STATE_MODE=preserve-only` in `envs/.env.test`.
- The only approved empty-state rebuild path is an operator-owned, environment-scoped override to `allow-empty-init` for the target environment when that environment's Zitadel DB state and `IAM_LOGIN_CLIENT` artifact are both absent together.
- Immediately after an intentional rebuild creates a new environment-local auth record, revert that environment's mode to `preserve-only` before normal use resumes.

The Zitadel DB and PAT are a required environment-local pair:

- `development` owns `cauppo-development-postgres-data` plus `zitadel` and `./envs/.local/development/iam-login-client.development.pat` as one recovery and restart pair.
- `isolated-test` owns `cauppo-isolated-test-postgres-data` plus `zitadel_test` and `./envs/.local/isolated-test/iam-login-client.isolated-test.pat` as one recovery and restart pair.
- The repo-root `postgres-data` named volume is mounted at PostgreSQL 18's live cluster path, `/var/lib/postgresql/18/docker`, so the env-scoped volume names back the actual running DB state instead of an unused legacy path.
- If one side exists without the other, fail closed. Do not assume Docker Compose should wipe, rebootstrap, or silently mint replacement auth state during a normal restart.
- Do not copy a DB backup, PAT, project id, audience value, client id, or recovery artifact from one environment into the other as a shortcut.

These restart rules do not change the current auth contract. The canonical public identity credential remains a Zitadel-issued bearer for the active environment, and the normal human runtime pairs it with a user-service-owned active-role session reference rather than selected-role bearer enrichment or complement-token browser wiring.

The repo-root local env contract supports exactly two environment identities only:

- `development`
- `isolated-test`

Those identities are sourced by exactly two committed repo-root env files only: `envs/.env.development` and `envs/.env.test`. Repo-root auth manifests, runtime-auth directories, compose-test env files, `.env.ci`, and committed staging or production env templates are not part of the supported local-orchestration model.

If `envs_examples/.env.staging.example` or `envs_examples/.env.production.example` are retained, they survive only as non-local deployment reference templates. They are not approved repo-root `docker compose --env-file` inputs and must not be treated as additional local runtime identities.

Host-run and compose-backed are execution modes, not separate environment identities. Any repo-root or service-local consumer that needs isolated-test provenance must source it from `envs/.env.test`, then select execution mode at runtime instead of switching env files.

Sprint 12b preserves the serialized repo-root proof order without changing that env inventory:

1. Task 1 proves development parity on `envs/.env.development`.
2. Before Task 3 starts, release development occupancy with `docker compose --env-file envs/.env.development down` or `make release-development-occupancy`.
3. Task 3 then runs the isolated-test regression lane on `envs/.env.test` or thin isolated-test wrappers.
4. Task 4 restores `development` only after the isolated-test regression lane finishes cleanly.
5. Do not run `development` and `isolated-test` in parallel. Single-lane runtime discipline stays intact even though the proof contract spans both environments over time.

Repo-root orchestration is not the authority for runtime role selection behavior. The live runtime contract is the user-service-owned active-role surface above Zitadel identity.

Sprint 12b Task 2.2 adds explicit isolated-test auth drift guards for frontend and suite consumers:

- `frontend/e2e/test-env.js` now accepts only `envs/.env.test`; deleted `.env.ci` references are invalid.
- `envs/.env.test` must carry the environment-local `OWNER_E2E_*` record that matches `user-service/tests/fixtures/test-owner-bootstrap.json` exactly.
- Persisted frontend auth artifacts under `frontend/e2e/.auth/` are reusable only when they still match that recorded owner identity; otherwise suite entry fails closed and the stale files must be cleared manually.
- `USER_SERVICE_ZITADEL_MANAGEMENT_CLIENT_ID` must carry the isolated-test management OAuth client id recorded for that environment. The current repo-side verification harness treats `user-service-management` as the active isolated-test recorded client id and fails closed only when the value is missing, replaced with an explicit placeholder sentinel, or drifted from the rest of the isolated-test auth record.

## Sprint 13 Task 3.2 Provenance Guard

Before any auth-dependent verification starts, prove the active environment record is fully local to the selected env file. Fail closed and stop immediately if any one of these surfaces points at the other environment or cannot be proven from the same environment record:

- env file and compose namespace: `envs/.env.development` with `cauppo-development`, or `envs/.env.test` with `cauppo-isolated-test`
- DB target and PAT path: development may use only `zitadel`, `cauppo-development-postgres-data`, and `./envs/.local/development/iam-login-client.development.pat`; isolated-test may use only `zitadel_test`, `cauppo-isolated-test-postgres-data`, and `./envs/.local/isolated-test/iam-login-client.isolated-test.pat`
- project and audience record: the project ID, audience value, frontend client ID, and user-service API or management client values must come from the same environment record and must not mix development and isolated-test identifiers
- identity and browser-harness provenance: development verification may use only development identities and browser artifacts; isolated-test verification may use only the `OWNER_E2E_*` record, the matching isolated-test owner fixture or identity, and `frontend/e2e/.auth/` state created from that same isolated-test record

If provenance does not match exactly, stop before login, selected-role, browser, or suite verification. Do not borrow the other environment's DB state, identities, PAT, project or audience record, or browser-harness state as a workaround.

## Sprint 13 Task 4 Evidence Contract

Interpret Sprint 13 Task 4 artifacts by payload, not filename alone. The authoritative fields are `kind`, `status`, `approvedEnvFile`, `checks.authoritativeRecord.filePath`, and the `stages` map. Historical rehearsal copies may retain an earlier filename even when the payload now describes a compose-backed or temporary restored-workspace proof.

Current Task 4 evidence rules:

- `tmp-sprint13-task-4-2-proof.json` is the development restart-durability artifact. Green evidence there means preserved development PAT pairing, healthy D1-D4 prerequisites, and the current-contract authorize redirect only. It must not be used to claim D5 role-picker readiness.
- `tmp-sprint13-task-4-4-proof.json` is the isolated-test restart-durability artifact. A `blocked` status is valid Task 4 evidence when the proof stops before browser entry because the isolated-test management client or owner-handoff record drifted.
- `tmp-sprint13-task-4-4-compose-proof.json` is the compose-backed preflight artifact. It inherits the same isolated-test provenance, development-reuse rejection, and shared-occupancy rejection gates before Playwright may claim browser entry.
- `tmp-sprint13-task-4-5-red-proof.json` is a historical routing label only. If that file's payload points at a temporary restored workspace or carries a non-red proof status, the payload wins and the file must be treated as rehearsal evidence rather than as the live operator handoff record.
- Recovery-drill or rehearsal artifacts may legitimately contain bundle-local file paths or synthetic identifiers while the harness proves fail-closed behavior. Those values do not overwrite the live environment record in this file unless the operator explicitly re-records that environment after restore.

## File Inventory

| File | Purpose |
|------|---------|
| `envs/.env.development` | Local Docker Compose development using Docker service hostnames and non-secret local defaults |
| `envs/.env.test` | Canonical isolated-test env source for repo-root direct-compose verification and host-run consumers; uses isolated-test endpoints and `_test` databases |

## Approved Repo-Root Environment Identities

Repo-root orchestration may describe or invoke only these two identities:

| Identity | Committed env file | Allowed repo-root use |
|------|---------|---------|
| `development` | `envs/.env.development` | Normal local Docker Compose startup, rebuilds, logs, and manual Zitadel configuration |
| `isolated-test` | `envs/.env.test` | Direct-compose readiness proof plus service-owned host-run or compose-backed verification flows |

No third repo-root local identity is supported. `test-host` and `test-compose` are retired as environment names and may survive only as execution-mode descriptions inside the `isolated-test` identity.

## Current Active Lane

Sprint 12b Task 4 restores `development` as the only active repo-root runtime lane. `isolated-test` is now down and remains a separate handoff record only inside the serialized proof order `development parity -> isolated-test regression -> development restore`.

Use the repo root in this order only:

1. Keep `isolated-test` down. Do not bring it back up in parallel with `development`.
2. Bring up the active lane with `docker compose --env-file envs/.env.development up -d --wait --wait-timeout 60`.
3. Prove the active lane with `docker compose --env-file envs/.env.development ps`.
4. Begin manual browser validation only against the restored development URLs listed in the Development Browser-Handoff Checklist below.

Repo-root wrappers remain subordinate to the direct env-file commands above. The current operator handoff is development-only and must use `envs/.env.development` explicitly.

Each service repository keeps its own `service-dir/.env.example` as the canonical onboarding file for running that service in isolation.

## Authoritative Repo-Root Verification Contract

Sprint 12a Task 1 retired `scripts/verify-all-suites.mjs` and the old repo-root verification authority. Sprint 12b keeps the same direct-compose authority while preserving the serialized proof order `development parity -> isolated-test regression -> development restore`:

1. Task 1 development parity proof runs on `envs/.env.development`.
2. Release development occupancy:
	`docker compose --env-file envs/.env.development down`
3. Active isolated-test readiness proof:
	`docker compose --env-file envs/.env.test up -d --wait --wait-timeout 60`
4. Active isolated-test status proof:
	`docker compose --env-file envs/.env.test ps`
5. Task 4 restores `development` only after the isolated-test gate is complete.

Repo-root `Makefile` and `.vscode/tasks.json` may exist only as thin wrappers around those commands. No replacement all-suites script chain or multi-step repo-root meta-runner is allowed.

The current repo-root operator surface is intentionally small:

- Development release only: `make release-development-occupancy`
- Active isolated-test lane: `make infra`, `make up`, `make down`, `make build`, `make ps`, `make logs`
- Backward-compatible isolated-test aliases: `make up-test`, `make down-test`, `make ps-test`, `make logs-test`, `make build-test`, `make infra-test`
- Focused isolated-test prerequisite: `make isolated-test-postgres`
- VS Code tasks: `compose:release:development` plus direct isolated-test compose wrappers only

The full repo-root proof inventory is the same for both local identities:

- Infrastructure and auth surfaces: `postgres`, `redis`, `rabbitmq`, `traefik`, `zitadel`, `zitadel-login`, `zitadel-complement-token-target`, `minio`, `mailpit`
- Application services: `user-service`, `feedback-service`, `menu-service`, `order-service`, `analytics-service`, `notification-service`, `frontend`

The contract enforced by this file is:

- `envs/.env.development` remains the development compose selector.
- `envs/.env.test` is the sole isolated-test env source for both compose-backed and host-run verification.
- The repo-root local env inventory is exactly those two committed files only.
- Host-run and compose-backed remain execution modes inside `isolated-test`, not new environment identities.
- Repo-root orchestration authority ends at direct-compose health for those two env files.
- Manual Zitadel console setup, environment-scoped auth values, complement-token action wiring, and backup artifacts are not repo-root startup responsibilities.
- The compose graph may still include `zitadel-complement-token-target`, but that does not make repo-root the owner of selected-role auth logic.
- No deleted compose-test, CI, staging, or production env file participates in development or isolated-test bring-up.

## Sprint 12b Task 4 Development Handoff State

The current self-verified repo-root handoff state after Sprint 12b Task 4.5 is:

1. `development` is the only active repo-root runtime lane.
2. `isolated-test` is down and must stay out of the restored development browser-validation runway.
3. The explicit development browser-handoff checklist is fixed and does not require runtime discovery.
4. The overall development manual-auth handoff status is currently `PARTIAL`, not `READY`.
5. Development management-auth is already validated for the runtime `client_credentials` path; the remaining blocker is development-only browser identity readiness plus any still-required complement-token wiring before post-login role-picker verification can proceed.

### Development Browser-Handoff Checklist

| Check ID | Exact development URL or route | Expected outcome | Current recorded result |
|---|---|---|---|
| D1 | `http://127.0.0.1:3001/health` | HTTP `200` from `user-service` | Passed: HTTP `200` |
| D2 | `http://auth.cauppo.localhost/ui/v2/login/healthy` | HTTP `200` from the Zitadel login health surface | Passed: HTTP `200` |
| D3 | `http://app.cauppo.localhost/health` | HTTP `200` from the frontend health surface | Passed: HTTP `200` |
| D4 | `http://app.cauppo.localhost/login` | The Cauppo login screen renders with email and password entry controls and no blank shell, startup exception, or fatal auth-config failure | Passed: Cauppo login UI rendered without blank shell or startup fatal auth-config failure |
| D5 | `http://app.cauppo.localhost/role-picker` | Post-login role-picker validation only after a valid development login succeeds | Blocked - FAIL-CLOSED before post-login role-picker validation |

### Single Valid Manual-Auth Entry Condition

`READY` is valid only when the restored `development` environment has current development-only auth values recorded for issuer, project ID, client IDs, and audience; any still-required development complement-token wiring is in place; and at least one development-only browser-validation identity exists in development Zitadel and the Cauppo projection with an active role.

### Exact PARTIAL Wording

Use this wording whenever development browser validation is still incomplete even though management-auth is already validated:

`PARTIAL: Development management-auth is validated, but manual browser validation still stops before post-login role-picker verification until development-only browser identities and any required complement-token wiring are ready. Do not use isolated-test identities, PATs, project IDs, audience values, or recovery artifacts as a workaround.`

## Active Operator Checklist

Use one active runtime lane only. The approved repo-root suite authority remains serialized: recorded development parity, release development occupancy, run the isolated-test compose graph, then restore development after Task 3 is green.

| Phase | Required command or proof |
|------|---------|
| Keep inactive lane down | Confirm `isolated-test` stays down while `development` is the active handoff lane |
| Start active lane | `docker compose --env-file envs/.env.development up -d --wait --wait-timeout 60` |
| Prove active lane health | `docker compose --env-file envs/.env.development ps` plus direct proof that `postgres`, `redis`, `rabbitmq`, `traefik`, `zitadel`, `zitadel-login`, `zitadel-complement-token-target`, `minio`, `mailpit`, `user-service`, `feedback-service`, `menu-service`, `order-service`, `analytics-service`, `notification-service`, and `frontend` are healthy |
| Browser handoff proof | Record D1-D5 exactly as listed in the Development Browser-Handoff Checklist |
| Manual Zitadel console setup | Required after development health and before any auth-dependent development browser validation can be marked `READY` |
| Environment-scoped value capture | Record only development issuer, project ID, client IDs and secrets, audience value, and the development `IAM_LOGIN_CLIENT` path |
| Task 4 closeout | After any isolated-test restart or recovery drill, run `docker compose --env-file envs/.env.test down`, then `docker compose --env-file envs/.env.development up -d --wait --wait-timeout 60`, then `docker compose --env-file envs/.env.development ps`, and finally re-record D1-D5 so `development` ends as the only active lane |

Direct proof remains intentionally small:

1. Keep `isolated-test` down.
2. Start `development` with the direct compose command or a thin wrapper that forwards to it.
3. Prove health on that same development graph with `docker compose --env-file envs/.env.development ps`.
4. Record the exact outcomes for D1-D5: D1-D4 passed, D5 `Blocked - FAIL-CLOSED before post-login role-picker validation`.
5. Do not switch to another env file and do not copy isolated-test identities, PATs, project IDs, audience values, recovery artifacts, or recovered Zitadel state into development.
6. If Task 4 reopened `isolated-test` for restart or recovery proof, tear it back down and restore `development` again before handing the repo root back to an operator.

## Current Local Auth Handoff Record

These are the current non-secret values captured for Sprint 12a Task 4.4. They are the operator handoff record for the two supported repo-root environments and must be refreshed whenever either environment is rebuilt or restored.

| Environment | Public issuer | Project ID and audience | Frontend client ID | user-service API client ID | PAT host path | Recovery pair |
|---|---|---|---|---|---|---|
| `development` | `http://auth.cauppo.localhost` | `370447691437572111` | `370447892680343567` | `370447993175867407` | `./envs/.local/development/iam-login-client.development.pat` | `development` + `iam-login-client.development.pat` + `zitadel.development.dump` |
| `isolated-test` | `http://auth.cauppo.localhost` | `370399287223255055` | `370399446757801999` | `370399501820690447` | `./envs/.local/isolated-test/iam-login-client.isolated-test.pat` | `isolated-test` + `iam-login-client.isolated-test.pat` + `zitadel.isolated-test.dump` |

The current development browser-handoff status is `PARTIAL`, not `READY`.

The current development results are fixed as follows:

- D1 passed: `http://127.0.0.1:3001/health` returned HTTP `200`.
- D2 passed: `http://auth.cauppo.localhost/ui/v2/login/healthy` returned HTTP `200`.
- D3 passed: `http://app.cauppo.localhost/health` returned HTTP `200`.
- D4 passed: `http://app.cauppo.localhost/login` rendered the Cauppo login UI without blank shell or startup fatal auth-config failure.
- D5 must remain recorded exactly as `Blocked - FAIL-CLOSED before post-login role-picker validation`.

Development management-auth is already validated for the runtime `client_credentials` exchange and `POST /management/v1/users/_search`. The remaining development caveat is endpoint compatibility on `GET /management/v1/idps` plus development-only browser identity and complement-token readiness before post-login role-picker verification can be marked ready.

Do not use isolated-test identities, PATs, project IDs, audience values, or recovery artifacts as a workaround for the restored development lane.

Sprint 12b Task 2.5 re-proved the compose-backed runway on the active isolated-test graph. `frontend/e2e/run-playwright.mjs compose-backed` rewrote `tmp-compose-e2e-sequencing-proof.json` with `ready-for-playwright` after the full shared graph, Traefik entry routes, documented health endpoints, and real owner login preflight all passed against `envs/.env.test`.

Sprint 12b Task 3 regression evidence now consolidates around the same authority boundary instead of a repo-root meta-runner. The active evidence set is:

- `tmp-compose-e2e-sequencing-proof.json` at `ready-for-playwright`, with direct-compose isolated-test provenance plus green stack-health, Traefik-route, login, and selected-role checks against the live shared graph
- service-owned TypeScript, frontend, and Go suite entrypoints as the only automated suite authorities for subtasks 3.6 and 3.8
- `tmp-owner-dashboard-proof.json` as the real-stack owner browser proof, with the isolated-test owner dashboard spec passing cleanly through Traefik after the selected-role repair

Task 4 now owns the restored development handoff record. `development` is back up as the only active lane, and repo-root authority remains limited to direct compose plus the documented operator handoff surfaces.

The isolated-test auth handoff is still deliberately fail-closed if operator-owned auth details drift. In particular, auth-dependent suite entry now expects:

- the recorded isolated-test management OAuth client id in `USER_SERVICE_ZITADEL_MANAGEMENT_CLIENT_ID` (the current repo-side accepted value is `user-service-management` when it stays aligned with the same isolated-test auth record)
- `OWNER_E2E_*` values in `envs/.env.test` that match `user-service/tests/fixtures/test-owner-bootstrap.json`
- a real isolated-test Zitadel user that matches that recorded owner identity

If any of those surfaces drift, Cauppo leaves the mismatch visible and does not synthesize replacement env files, seed users, or refresh `frontend/e2e/.auth/` automatically.

Treat that owner handoff as one fail-closed record across `envs/.env.test` `OWNER_E2E_*`, `user-service/tests/fixtures/test-owner-bootstrap.json`, and the live isolated-test Zitadel plus projection state. Persisted frontend auth under `frontend/e2e/.auth/` is reusable cache only when it still matches that same record exactly.

Development now carries the refreshed environment-local project and client ids captured on 2026-04-14. The operator-provided `USER_SERVICE_ZITADEL_MANAGEMENT_CLIENT_ID=user-service-management` is now treated as the validated runtime `client_id` for the `client_credentials` flow and `POST /management/v1/users/_search`. The remaining development blocker is not a fallback auth authority question; it is the outstanding browser-handoff gap around development-only identities, any required complement-token wiring, and the still-non-authoritative `GET /management/v1/idps` surface.

The same repo-side reconciliation now applies to isolated-test: `USER_SERVICE_ZITADEL_MANAGEMENT_CLIENT_ID=user-service-management` is no longer treated as a placeholder by the active frontend proof harness or compose runway gate. The remaining isolated-test blockers are real-stack auth drift, owner-record drift, or live login failures, not the literal value shape by itself.

Sprint 12b Task 4.5 rechecked the repo-root verifier surface and confirmed that no current `scripts/verify-all-suites.mjs` authority exists. Historical all-suites references may remain in temporary proof logs, but they are not an approved runtime, release, or handoff surface.

Do not reuse any part of one row to restore or run the other environment. The project IDs, PAT paths, and recovery filenames are deliberately different so the operator can detect cross-environment drift immediately.

## Auth Recovery Bundle Workflow

The committed `envs/auth-recovery/` directory is documentation and templates only. The approved repo-root recovery helpers are `scripts/backup-zitadel-state.mjs` and `scripts/restore-zitadel-state.mjs`; by default they create and consume live local bundles under ignored `envs/.local/auth-recovery/<environment>/<timestamp>/` paths.

For each supported repo-root identity, keep exactly one matching recovery bundle:

- `development`
- `isolated-test`

Each bundle must contain:

- one backup of that environment's Zitadel DB state
- the matching `IAM_LOGIN_CLIENT` artifact mounted for that same environment
- one filled-in metadata file based on `envs/auth-recovery/recovery-metadata.example.json`

The DB backup and PAT are a required pair. Restoring only one of them is unsupported.

Current local PAT host paths remain environment-scoped:

- `development` -> `./envs/.local/development/iam-login-client.development.pat`
- `isolated-test` -> `./envs/.local/isolated-test/iam-login-client.isolated-test.pat`

Fail closed:

- if the metadata `environment` does not match the target env file, do not restore
- if the recorded PAT checksum does not match the PAT file you plan to mount, do not start `zitadel-login` or `user-service`
- if the DB backup provenance is unknown or copied from another environment, do not reuse the PAT
- if no valid bundle exists, redo manual Zitadel console setup for that environment instead of forcing a restore

### Development recovery bundle

Development recovery is operator-run only and is valid only for this tuple:

- env file: `envs/.env.development`
- Compose namespace: `cauppo-development`
- Zitadel database: `zitadel`
- volume: `cauppo-development-postgres-data`
- PAT host path: `envs/.local/development/iam-login-client.development.pat`
- expected bundle files: `recovery-metadata.json`, `iam-login-client.development.pat`, `zitadel.development.dump`

Capture rules:

1. Capture the DB backup and PAT from the same development auth state.
2. Record both SHA-256 values in metadata before the bundle is considered usable.
3. Do not mix a freshly captured DB backup with an older PAT, or vice versa.

Wrong-environment stop conditions:

1. Stop if metadata names any environment other than `development`.
2. Stop if metadata points at a different env file, Compose namespace, DB target, or PAT host path.
3. Stop if the computed PAT or DB backup SHA-256 does not match metadata.

### Isolated-test recovery bundle

Isolated-test recovery is operator-run only and is valid only for this tuple:

- env file: `envs/.env.test`
- Compose namespace: `cauppo-isolated-test`
- Zitadel database: `zitadel_test`
- volume: `cauppo-isolated-test-postgres-data`
- PAT host path: `envs/.local/isolated-test/iam-login-client.isolated-test.pat`
- expected bundle files: `recovery-metadata.json`, `iam-login-client.isolated-test.pat`, `zitadel.isolated-test.dump`

Capture rules:

1. Capture the DB backup and PAT from the same isolated-test auth state.
2. Record both SHA-256 values in metadata before the bundle is considered usable.
3. Do not mix a freshly captured DB backup with an older PAT, or vice versa.

Wrong-environment stop conditions:

1. Stop if metadata names any environment other than `isolated-test`.
2. Stop if metadata points at a different env file, Compose namespace, DB target, or PAT host path.
3. Stop if the computed PAT or DB backup SHA-256 does not match metadata.
4. Do not borrow development backups, PATs, project ids, audience values, or client records as an isolated-test shortcut.

### Operator recovery runbook

Run recovery only against one selected environment at a time.

#### Development runbook

Capture:

1. Select `envs/.env.development` and confirm the target pair is development only.
2. Capture a PostgreSQL custom-format backup of Zitadel database `zitadel` from the `cauppo-development-postgres-data` state you intend to preserve.
3. Copy `envs/.local/development/iam-login-client.development.pat` from the same development state.
4. Compute SHA-256 for both files and record the values plus `environment`, `envFile`, `composeProjectName`, DB target, PAT path, issuer, project ID, and audience in `recovery-metadata.json`.

Restore:

1. Stop if metadata or either checksum does not match development.
2. Restore the recorded development DB backup to the development Zitadel target only.
3. Replace only `envs/.local/development/iam-login-client.development.pat` with the matching development PAT.

Verification:

1. Recompute both SHA-256 values after staging the files and confirm they still match metadata.
2. Bring up development with `docker compose --env-file envs/.env.development up -d --wait --wait-timeout 60`.
3. Re-check development health surfaces and keep the lane fail-closed if the restored pair does not behave like the recorded development state.

Rollback:

1. If verification fails, stop development use immediately.
2. Reapply the previous known-good development pair only if its metadata and checksums still validate.
3. If no known-good development pair exists, go to the manual reinitialization fallback below.

Manual reinitialization fallback:

1. Use it only when no valid development pair exists.
2. Keep the action scoped to `development`; do not borrow isolated-test artifacts.
3. Ensure the old development DB state and PAT are absent together, switch development temporarily to `allow-empty-init`, let development mint a fresh PAT, redo manual Zitadel console setup, capture a new development recovery pair, then return development to `preserve-only`.

#### Isolated-test runbook

Capture:

1. Select `envs/.env.test` and confirm the target pair is isolated-test only.
2. Capture a PostgreSQL custom-format backup of Zitadel database `zitadel_test` from the `cauppo-isolated-test-postgres-data` state you intend to preserve.
3. Copy `envs/.local/isolated-test/iam-login-client.isolated-test.pat` from the same isolated-test state.
4. Compute SHA-256 for both files and record the values plus `environment`, `envFile`, `composeProjectName`, DB target, PAT path, issuer, project ID, and audience in `recovery-metadata.json`.

Restore:

1. Stop if metadata or either checksum does not match isolated-test.
2. Restore the recorded isolated-test DB backup to the isolated-test Zitadel target only.
3. Replace only `envs/.local/isolated-test/iam-login-client.isolated-test.pat` with the matching isolated-test PAT.

Verification:

1. Recompute both SHA-256 values after staging the files and confirm they still match metadata.
2. Bring up isolated-test with `docker compose --env-file envs/.env.test up -d --wait --wait-timeout 60`.
3. Re-check isolated-test health surfaces and keep the lane fail-closed if the restored pair does not behave like the recorded isolated-test state.

Rollback:

1. If verification fails, stop isolated-test use immediately.
2. Reapply the previous known-good isolated-test pair only if its metadata and checksums still validate.
3. If no known-good isolated-test pair exists, go to the manual reinitialization fallback below.

Manual reinitialization fallback:

1. Use it only when no valid isolated-test pair exists.
2. Keep the action scoped to `isolated-test`; do not borrow development artifacts.
3. Ensure the old isolated-test DB state and PAT are absent together, switch isolated-test temporarily to `allow-empty-init`, let isolated-test mint a fresh PAT, redo manual Zitadel console setup, capture a new isolated-test recovery pair, then return isolated-test to `preserve-only`.

## Compose-Backed Browser Sequence

Compose-backed repo-root verification must remain a direct-compose sequence on the approved env file:

1. Select either `envs/.env.development` or `envs/.env.test`.
2. Start the target graph with `docker compose --env-file ... up -d`.
3. Prove dependent service readiness on that same graph.
4. Run the browser or other service-owned verifier against that environment.

For the isolated-test browser lane, `frontend/e2e/run-playwright.mjs compose-backed` is the approved readiness gate before Playwright launches. It writes `tmp-compose-e2e-sequencing-proof.json` only after proving isolated-test env provenance, the login and app entry URLs, the documented health endpoints, the Traefik-facing auth route, and the real owner login request. If `USER_SERVICE_ZITADEL_MANAGEMENT_CLIENT_ID` is still a console-recording placeholder or the recorded owner identity is missing in isolated-test Zitadel, the runner stops there and reports the blocker explicitly.

The compose-backed sequence may not introduce a third repo-root environment identity or a replacement repo-root verifier script.

## Host-Run Verification Prerequisites

Host-run verification remains service-owned, but repo-root provenance is fixed:

1. Host-run verification that targets isolated test must load `envs/.env.test`.
2. Host-run verification must not source repo-root development values and then override them piecemeal.
3. Repo-root docs and wrappers may describe host-run as an execution mode only, never as a distinct `test-host` environment.
4. Repo-root Go host verification prerequisites now live on the direct-compose surface itself: bring up the required isolated-test dependency with `docker compose --env-file envs/.env.test up -d postgres` or `make isolated-test-postgres` before invoking a service-owned Go host suite.
5. Service-local guards and validators must normalize on the same isolated-test provenance: `user-service/src/config/env.ts` fails closed unless approved test boot uses explicit env values from `envs/.env.test`, and `menu-service/Makefile` host-run entrypoints require `CAUPPO_ENV_PROVENANCE=isolated-test` instead of retired `test-host` or `test-compose` aliases.

## Provenance and Release Metadata Rules

When repo-root docs, tasks, or wrappers reference environment provenance, they must use the committed env file path rather than a retired alias or helper surface:

- `development` means `envs/.env.development`.
- `isolated-test` means `envs/.env.test`.
- Staging and production remain deployment-time concerns outside the committed repo-root local env inventory. Any retained `envs_examples/.env.staging.example` or `envs_examples/.env.production.example` file is a non-local reference template only.
- Historical references to `.env.ci`, compose-test env files, auth manifests, or bootstrap bundles are non-authoritative and must not be used for startup or verification.

## Variable Naming

Variables in this directory are prefixed for the `cauppo-infra` orchestration layer, for example `USER_SERVICE_DATABASE_URL` or `ORDER_SERVICE_MENU_SERVICE_INTERNAL_URL`.

Docker Compose maps those prefixed infra-repo variables to the unprefixed runtime variables each service actually reads, for example:

```yaml
environment:
	DATABASE_URL: ${USER_SERVICE_DATABASE_URL}
	PORT: ${USER_SERVICE_PORT}
```

Frontend build-time variables follow the same centralized approach with a `FRONTEND_` prefix, then map to Vite's unprefixed `VITE_*` names through Compose build args.

## Secrets Policy

Repo-root staging and production env templates are retired. If staging or production examples are retained under `envs_examples/`, they are documentation-only references for non-local deployment wiring. Deployment-time staging and production values are injected outside this directory by GitHub Actions, Dokploy, or the target platform's secret store.

Never commit a real secret. A root `.env` file remains gitignored for local experimentation only, but the committed files in `envs/` are the canonical templates and inventory.

## Adding a New Variable

1. Add the prefixed variable to both committed local env files in `envs/`.
2. If staging or production needs the same value, add it through deployment-time secret or environment injection instead of recreating committed repo-root env templates.
3. Add the Compose mapping in `docker-compose.yml` for the owning service.
4. Add the unprefixed runtime variable to that service's own `.env.example`.
5. Update the service config validation layer in `src/config/env.ts` or `internal/config/config.go`.

## `CAUPPO_ENV` vs `NODE_ENV`

`CAUPPO_ENV` is the deployment and business environment carried into runtime configuration, for example `development`, `test`, `staging`, or `production`.

At the repo-root orchestration layer, the only supported local identities are still `development` and `isolated-test`. `isolated-test` may map to runtime `test`, but repo-root docs and wrappers must use the two approved repo-root identity names.

`NODE_ENV` is the JavaScript runtime mode used by Bun, Node-compatible tooling, and frontend builds. In practice it is usually `development`, `test`, or `production`.
