#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  assertFileExists,
  assertSafePgIdentifier,
  composeFileToStdin,
  copyFileEnsuringDirectory,
  ensureDirectory,
  ensurePostgresRunning,
  getRunningServices,
  parseCliArgs,
  postgresExecArgs,
  psqlCommand,
  quotePgIdentifier,
  quotePgLiteral,
  repoRoot,
  resolveEnvironmentConfig,
  sha256File,
  sha256Text,
  toWorkspacePath,
} from './zitadel-recovery-common.mjs'

const usage = `
Usage:
  node scripts/restore-zitadel-state.mjs <development|isolated-test> <bundle-dir-or-metadata> --confirm RESTORE-ZITADEL-<environment>

Example:
  node scripts/restore-zitadel-state.mjs development envs/.local/auth-recovery/development/2026-04-14T00-00-00-000Z --confirm RESTORE-ZITADEL-development

Restore is intentionally destructive to the target ZITADEL database only. It does not remove Docker volumes.
The script refuses to run while compose services other than postgres are running for the selected environment.
`

const fail = (message) => {
  console.error(message)
  process.exit(1)
}

const getOptionalEnvValue = (env, key) => {
  const value = env[key]
  return value && value.length > 0 ? value : undefined
}

const resolveBundlePaths = (inputPath) => {
  const absoluteInput = resolve(repoRoot, inputPath)
  const metadataPath = absoluteInput.endsWith('.json')
    ? absoluteInput
    : resolve(absoluteInput, 'recovery-metadata.json')

  assertFileExists(metadataPath, 'recovery metadata')

  const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'))
  const bundleDirectory = dirname(metadataPath)

  return { metadata, metadataPath, bundleDirectory }
}

const expectEqual = (actual, expected, label) => {
  if (actual !== expected) {
    throw new Error(`${label} mismatch: expected ${expected}, got ${actual ?? '<missing>'}`)
  }
}

const compareOptionalMetadata = (metadata, config, metadataKey, envKey) => {
  const metadataValue = metadata[metadataKey]
  const envValue = getOptionalEnvValue(config.env, envKey)

  if (metadataValue || envValue) {
    expectEqual(envValue, metadataValue, `${envKey}/${metadataKey}`)
  }
}

const validateMetadata = async (metadata, config, backupPath, patBundlePath) => {
  expectEqual(metadata.kind, 'cauppo-zitadel-recovery-bundle', 'metadata kind')
  expectEqual(metadata.environment, config.environment, 'environment')
  expectEqual(metadata.envFile, config.envFile, 'env file')
  expectEqual(metadata.composeProjectName, config.env.COMPOSE_PROJECT_NAME, 'compose project')
  expectEqual(metadata.iamLoginClientFile, config.patFileName, 'PAT filename')
  expectEqual(metadata.iamLoginClientHostPath, config.patHostPath, 'PAT host path')
  expectEqual(metadata.zitadelDatabaseBackup, config.backupFileName, 'database backup filename')
  expectEqual(
    metadata.zitadelDatabaseName,
    config.env.ZITADEL_DATABASE_POSTGRES_DATABASE,
    'ZITADEL database name',
  )
  expectEqual(
    metadata.zitadelDatabaseVolume,
    config.env.CAUPPO_COMPOSE_POSTGRES_VOLUME,
    'ZITADEL database volume',
  )
  expectEqual(
    metadata.zitadelMasterkeySha256,
    sha256Text(config.env.ZITADEL_MASTERKEY),
    'ZITADEL_MASTERKEY fingerprint',
  )

  if (config.environment === 'isolated-test') {
    expectEqual(config.env.CAUPPO_TEST_ENV_APPROVED, 'true', 'isolated-test approval')
  }

  compareOptionalMetadata(metadata, config, 'issuer', 'USER_SERVICE_ZITADEL_ISSUER')
  compareOptionalMetadata(metadata, config, 'projectId', 'ZITADEL_PROJECT_ID')
  compareOptionalMetadata(metadata, config, 'frontendClientId', 'FRONTEND_VITE_ZITADEL_CLIENT_ID')
  compareOptionalMetadata(metadata, config, 'userServiceOidcClientId', 'USER_SERVICE_ZITADEL_OIDC_CLIENT_ID')
  compareOptionalMetadata(metadata, config, 'userServiceApiClientId', 'USER_SERVICE_ZITADEL_CLIENT_ID')
  compareOptionalMetadata(metadata, config, 'userServiceManagementClientId', 'USER_SERVICE_ZITADEL_MANAGEMENT_CLIENT_ID')

  const expectedAudience = getOptionalEnvValue(config.env, 'USER_SERVICE_ZITADEL_AUDIENCE') ?? getOptionalEnvValue(config.env, 'ZITADEL_PROJECT_ID')
  expectEqual(metadata.audience, expectedAudience, 'audience')

  const [backupSha256, patSha256] = await Promise.all([
    sha256File(backupPath),
    sha256File(patBundlePath),
  ])

  expectEqual(backupSha256, metadata.zitadelDatabaseSha256, 'database backup SHA-256')
  expectEqual(patSha256, metadata.iamLoginClientSha256, 'PAT SHA-256')

  if (metadata.zitadelDatabaseSizeBytes) {
    expectEqual(
      statSync(backupPath).size,
      metadata.zitadelDatabaseSizeBytes,
      'database backup size',
    )
  }

  if (metadata.iamLoginClientSizeBytes) {
    expectEqual(statSync(patBundlePath).size, metadata.iamLoginClientSizeBytes, 'PAT size')
  }
}

const assertOnlyPostgresMayRun = async (config) => {
  const runningServices = await getRunningServices(config)
  const blockers = runningServices.filter((service) => service !== 'postgres')

  if (blockers.length > 0) {
    throw new Error(
      `Stop ${config.environment} services before restore. Running blockers: ${blockers.join(', ')}`,
    )
  }
}

const restoreDatabase = async (config, backupPath) => {
  const databaseName = config.env.ZITADEL_DATABASE_POSTGRES_DATABASE
  assertSafePgIdentifier(databaseName, 'ZITADEL database name')

  await psqlCommand(
    config,
    'postgres',
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = ${quotePgLiteral(databaseName)} AND pid <> pg_backend_pid();`,
  )
  await psqlCommand(config, 'postgres', `DROP DATABASE IF EXISTS ${quotePgIdentifier(databaseName)};`)
  await psqlCommand(config, 'postgres', `CREATE DATABASE ${quotePgIdentifier(databaseName)};`)

  await composeFileToStdin(
    config,
    postgresExecArgs(config, [
      'pg_restore',
      '-U',
      config.env.POSTGRES_USER ?? 'postgres',
      '-d',
      databaseName,
      '--no-owner',
      '--no-acl',
      '--clean',
      '--if-exists',
    ]),
    backupPath,
  )
}

const restorePat = async (config, patBundlePath) => {
  const existingPatPath = config.patHostPathAbsolute

  if (existsSync(existingPatPath)) {
    const previousPatBackup = `${existingPatPath}.pre-restore-${Date.now()}`
    copyFileEnsuringDirectory(existingPatPath, previousPatBackup)
  }

  ensureDirectory(dirname(existingPatPath))
  copyFileEnsuringDirectory(patBundlePath, existingPatPath)
}

const main = async () => {
  const { positional, flags } = parseCliArgs(process.argv.slice(2))

  if (flags.help || flags.h) {
    console.log(usage.trim())
    return
  }

  if (positional.length !== 2) {
    fail(usage.trim())
  }

  const config = resolveEnvironmentConfig(positional[0])
  const expectedConfirmation = `RESTORE-ZITADEL-${config.environment}`

  if (flags.confirm !== expectedConfirmation) {
    throw new Error(`Restore requires --confirm ${expectedConfirmation}`)
  }

  const { metadata, metadataPath, bundleDirectory } = resolveBundlePaths(positional[1])
  const backupPath = resolve(bundleDirectory, config.backupFileName)
  const patBundlePath = resolve(bundleDirectory, config.patFileName)

  assertFileExists(backupPath, 'ZITADEL database backup')
  assertFileExists(patBundlePath, 'IAM_LOGIN_CLIENT PAT')

  await validateMetadata(metadata, config, backupPath, patBundlePath)
  await assertOnlyPostgresMayRun(config)
  await ensurePostgresRunning(config)
  await restoreDatabase(config, backupPath)
  await restorePat(config, patBundlePath)

  const restoredPatSha256 = await sha256File(config.patHostPathAbsolute)
  expectEqual(restoredPatSha256, metadata.iamLoginClientSha256, 'restored PAT SHA-256')

  console.log(JSON.stringify({
    status: 'restored',
    environment: config.environment,
    metadata: toWorkspacePath(metadataPath),
    databaseName: config.env.ZITADEL_DATABASE_POSTGRES_DATABASE,
    databaseBackup: toWorkspacePath(backupPath),
    patHostPath: config.patHostPath,
    nextStep: `docker compose --env-file ${config.envFile} up -d --wait --wait-timeout 60`,
  }, null, 2))
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error))
})
