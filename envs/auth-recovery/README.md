# Auth Recovery Bundle Model

This directory defines the only approved backup and recovery model for Cauppo auth.

It is template-only. Do not store live PAT files, database dumps, or restored secrets here. The approved repo-root scripts write live bundles under ignored `envs/.local/auth-recovery/` paths and validate them before restore.

## Scope

Auth recovery stays strictly environment-scoped. A bundle is valid for exactly one repo-root environment identity only:

- `development`
- `isolated-test`

Each environment's bundle must contain these three items together:

1. A backup of that environment's Zitadel DB state
2. The matching `IAM_LOGIN_CLIENT` artifact mounted by Compose for that same environment
3. A filled-in metadata file based on `recovery-metadata.example.json`

Treat the Zitadel DB backup and `IAM_LOGIN_CLIENT` artifact as an inseparable pair. Restore both together or discard both.

## Approved Local Layout

`node scripts/backup-zitadel-state.mjs <environment>` creates this ignored local shape by default:

```text
envs/.local/auth-recovery/
  development/
    <timestamp>/
      recovery-metadata.json
      iam-login-client.development.pat
      zitadel.development.dump
  isolated-test/
    <timestamp>/
      recovery-metadata.json
      iam-login-client.isolated-test.pat
      zitadel.isolated-test.dump
```

Restore with `node scripts/restore-zitadel-state.mjs <environment> <bundle-dir> --confirm RESTORE-ZITADEL-<environment>`. The restore script validates the metadata, checksums, active env file, masterkey fingerprint, target database, target volume, and PAT path before touching the selected ZITADEL database. It never removes Docker volumes.

The database backup is a PostgreSQL custom-format dump. The bundle must preserve a one-to-one relationship between the backup file named in metadata and the PAT file named in metadata.

## Development Recovery Bundle

The development bundle is valid only for the `development` environment and must use this exact operator-owned shape:

```text
<operator-managed-root>/development/
  recovery-metadata.json
  iam-login-client.development.pat
  zitadel.development.dump
```

Development capture rules:

1. Capture from `envs/.env.development` only.
2. Capture the Zitadel DB backup from database `zitadel` backed by volume `cauppo-development-postgres-data` and the PAT at `envs/.local/development/iam-login-client.development.pat` from the same recovery event.
3. Compute SHA-256 for both the PAT and the DB backup immediately after capture and record those values in `recovery-metadata.json` as `iamLoginClientSha256` and `zitadelDatabaseSha256`.
4. Record `environment=development`, `envFile=envs/.env.development`, and `composeProjectName=cauppo-development` exactly.
5. Refresh the whole pair whenever development is manually reinitialized, restored, or the PAT is re-issued.

Development restore must stop immediately when any of these are true:

- metadata `environment` is not `development`
- metadata `envFile` is not `envs/.env.development`
- metadata `composeProjectName` is not `cauppo-development`
- metadata `zitadelDatabaseName` is not `zitadel`
- metadata `zitadelDatabaseVolume` is not `cauppo-development-postgres-data`
- metadata `iamLoginClientHostPath` is not `envs/.local/development/iam-login-client.development.pat`
- either SHA-256 value differs from the file that will be restored or mounted

## Isolated-Test Recovery Bundle

The isolated-test bundle is valid only for the `isolated-test` environment and must use this exact operator-owned shape:

```text
<operator-managed-root>/isolated-test/
  recovery-metadata.json
  iam-login-client.isolated-test.pat
  zitadel.isolated-test.dump
```

Isolated-test capture rules:

1. Capture from `envs/.env.test` only.
2. Capture the Zitadel DB backup from database `zitadel_test` backed by volume `cauppo-isolated-test-postgres-data` and the PAT at `envs/.local/isolated-test/iam-login-client.isolated-test.pat` from the same recovery event.
3. Compute SHA-256 for both the PAT and the DB backup immediately after capture and record those values in `recovery-metadata.json` as `iamLoginClientSha256` and `zitadelDatabaseSha256`.
4. Record `environment=isolated-test`, `envFile=envs/.env.test`, and `composeProjectName=cauppo-isolated-test` exactly.
5. Refresh the whole pair whenever isolated-test is manually reinitialized, restored, or the PAT is re-issued.

Isolated-test restore must stop immediately when any of these are true:

- metadata `environment` is not `isolated-test`
- metadata `envFile` is not `envs/.env.test`
- metadata `composeProjectName` is not `cauppo-isolated-test`
- metadata `zitadelDatabaseName` is not `zitadel_test`
- metadata `zitadelDatabaseVolume` is not `cauppo-isolated-test-postgres-data`
- metadata `iamLoginClientHostPath` is not `envs/.local/isolated-test/iam-login-client.isolated-test.pat`
- either SHA-256 value differs from the file that will be restored or mounted

No development fallback is allowed. If the isolated-test pair is missing or mismatched, stop and either restore the matching isolated-test bundle or manually reinitialize isolated-test only.

## Fail-Closed Rules

Do not restore a bundle when any of the following are true:

- The metadata `environment` does not match the target environment
- The PAT file checksum does not match `iamLoginClientSha256`
- The DB backup provenance is unknown or comes from another environment
- The PAT file came from another environment or another Zitadel initialization event
- The bundle is missing any required file

When a bundle fails any validation, stop recovery and redo manual Zitadel setup for that environment. Do not copy a PAT across environments and do not force a restore with mismatched metadata.

## Local Runtime Mapping

In the current local setup, the environment-scoped `IAM_LOGIN_CLIENT` artifact is mounted from the committed env files into both `zitadel-login` and `user-service`:

- `development` -> `./envs/.local/development/iam-login-client.development.pat`
- `isolated-test` -> `./envs/.local/isolated-test/iam-login-client.isolated-test.pat`

Any restored PAT must replace the file for the matching environment only.

## Current Local Pairing Record

The repo keeps templates only, but Sprint 12a Task 4.4 records the expected metadata pairing for the current local environments so the operator handoff stays explicit.

| Environment | Metadata `environment` | `issuer` | `projectId` and `audience` | `iamLoginClientFile` | Expected host PAT path | `zitadelDatabaseBackup` |
|---|---|---|---|---|---|---|
| `development` | `development` | `http://auth.cauppo.localhost` | `370447691437572111` | `iam-login-client.development.pat` | `./envs/.local/development/iam-login-client.development.pat` | `zitadel.development.dump` |
| `isolated-test` | `isolated-test` | `http://auth.cauppo.localhost` | `370399287223255055` | `iam-login-client.isolated-test.pat` | `./envs/.local/isolated-test/iam-login-client.isolated-test.pat` | `zitadel.isolated-test.dump` |

The operator must still fill `capturedAt`, `iamLoginClientSha256`, and `zitadelDatabaseSha256` at capture time outside the repo. Those fields are part of the handoff contract, but the repo does not store live bundle state.

Cross-environment reuse is explicitly invalid. A `development` metadata file must never be paired with the isolated-test PAT or DB backup, and an `isolated-test` metadata file must never be paired with development artifacts.

## When to Refresh the Bundle

Refresh the environment's recovery bundle whenever any of these occur:

- Initial manual setup finishes for a fresh environment
- Zitadel is restored from backup or re-initialized
- The `IAM_LOGIN_CLIENT` artifact is re-issued or replaced
- Project IDs, client IDs, client secrets, or the concrete audience value are re-recorded after auth recovery

Update the metadata file every time the bundle changes.