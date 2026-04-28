#!/usr/bin/env node
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  assertFileExists,
  composeStdoutToFile,
  copyFileEnsuringDirectory,
  ensureDirectory,
  ensurePostgresRunning,
  formatTimestampForPath,
  parseCliArgs,
  postgresExecArgs,
  psql,
  repoRoot,
  resolveEnvironmentConfig,
  sha256File,
  sha256Text,
  toWorkspacePath,
} from './zitadel-recovery-common.mjs'

const usage = `
Usage:
  node scripts/backup-zitadel-state.mjs <development|isolated-test> [--output-dir <dir>]

Creates an environment-scoped ZITADEL recovery bundle containing:
  - a custom-format PostgreSQL dump of the ZITADEL database
  - the matching IAM_LOGIN_CLIENT PAT file
  - recovery-metadata.json with checksums and non-secret identity ids

Default output:
  envs/.local/auth-recovery/<environment>/<timestamp>/
`

const requiredEnvKeys = [
  'CAUPPO_ENV_PROVENANCE',
  'COMPOSE_PROJECT_NAME',
  'CAUPPO_COMPOSE_POSTGRES_VOLUME',
  'ZITADEL_DATABASE_POSTGRES_DATABASE',
  'ZITADEL_MASTERKEY',
]

const fail = (message) => {
  console.error(message)
  process.exit(1)
}

const getOptionalEnvValue = (env, key) => {
  const value = env[key]
  return value && value.length > 0 ? value : undefined
}

const getEventStoreSnapshot = async (config) => {
  try {
    const eventTable = await psql(
      config,
      config.env.ZITADEL_DATABASE_POSTGRES_DATABASE,
      "select coalesce(to_regclass('eventstore.events2')::text, to_regclass('eventstore.events')::text, '')",
    )

    if (!eventTable) {
      return { tablePresent: false }
    }

    const creationColumn = eventTable === 'eventstore.events2' ? 'created_at' : 'creation_date'
    const value = await psql(
      config,
      config.env.ZITADEL_DATABASE_POSTGRES_DATABASE,
      `select count(*)::text || '|' || coalesce(max(${creationColumn})::text, '') from ${eventTable}`,
    )
    const [eventCount, latestCreationDate] = value.split('|')

    return {
      tablePresent: true,
      tableName: eventTable,
      eventCount,
      latestCreationDate: latestCreationDate || null,
    }
  } catch (error) {
    return {
      tablePresent: null,
      warning: error instanceof Error ? error.message : String(error),
    }
  }
}

const validateConfig = (config) => {
  const missing = requiredEnvKeys.filter((key) => !config.env[key])

  if (missing.length > 0) {
    throw new Error(`${config.envFile} is missing required keys: ${missing.join(', ')}`)
  }

  if (
    config.environment === 'isolated-test' &&
    config.env.CAUPPO_TEST_ENV_APPROVED !== 'true'
  ) {
    throw new Error('envs/.env.test must set CAUPPO_TEST_ENV_APPROVED=true')
  }

  if (config.env.ZITADEL_MASTERKEY.length !== 32) {
    throw new Error('ZITADEL_MASTERKEY must be exactly 32 bytes for ZITADEL secret decryption')
  }

  if (config.env.CAUPPO_COMPOSE_POSTGRES_VOLUME.length === 0) {
    throw new Error('CAUPPO_COMPOSE_POSTGRES_VOLUME must not be empty')
  }

  assertFileExists(config.patHostPathAbsolute, 'IAM_LOGIN_CLIENT PAT')
}

const getOutputDirectory = (config, flags, generatedAt) => {
  if (typeof flags['output-dir'] === 'string') {
    return resolve(repoRoot, flags['output-dir'])
  }

  return resolve(
    repoRoot,
    'envs/.local/auth-recovery',
    config.environment,
    formatTimestampForPath(generatedAt),
  )
}

const main = async () => {
  const { positional, flags } = parseCliArgs(process.argv.slice(2))

  if (flags.help || flags.h) {
    console.log(usage.trim())
    return
  }

  if (positional.length !== 1) {
    fail(usage.trim())
  }

  const config = resolveEnvironmentConfig(positional[0])
  validateConfig(config)

  const generatedAt = new Date()
  const outputDirectory = getOutputDirectory(config, flags, generatedAt)

  if (existsSync(outputDirectory) && readdirSync(outputDirectory).length > 0) {
    throw new Error(`Output directory already exists and is not empty: ${toWorkspacePath(outputDirectory)}`)
  }

  ensureDirectory(outputDirectory)

  const backupPath = resolve(outputDirectory, config.backupFileName)
  const patBundlePath = resolve(outputDirectory, config.patFileName)
  const metadataPath = resolve(outputDirectory, 'recovery-metadata.json')

  await ensurePostgresRunning(config)

  await composeStdoutToFile(
    config,
    postgresExecArgs(config, [
      'pg_dump',
      '-U',
      config.env.POSTGRES_USER ?? 'postgres',
      '-d',
      config.env.ZITADEL_DATABASE_POSTGRES_DATABASE,
      '-Fc',
      '--no-owner',
      '--no-acl',
    ]),
    backupPath,
  )

  copyFileEnsuringDirectory(config.patHostPathAbsolute, patBundlePath)

  const [backupSha256, patSha256, envFileSha256] = await Promise.all([
    sha256File(backupPath),
    sha256File(patBundlePath),
    sha256File(config.envFilePath),
  ])
  const eventStore = await getEventStoreSnapshot(config)

  const metadata = {
    kind: 'cauppo-zitadel-recovery-bundle',
    bundleVersion: 3,
    recoveryPairId: `${config.environment}-${generatedAt.toISOString()}`,
    environment: config.environment,
    envFile: config.envFile,
    envFileSha256,
    composeProjectName: config.env.COMPOSE_PROJECT_NAME,
    capturedAt: generatedAt.toISOString(),
    createdBy: 'scripts/backup-zitadel-state.mjs',
    officialModel: {
      sourceOfTruth: 'ZITADEL is event-sourced; persistent state is restored from the PostgreSQL event store and projections are recomputed.',
      statelessRuntime: 'The ZITADEL binary/container is stateless for this recovery purpose.',
      masterkeyRequired: 'Encrypted ZITADEL DB material requires the same 32-byte ZITADEL_MASTERKEY after restore.',
    },
    issuer: getOptionalEnvValue(config.env, 'USER_SERVICE_ZITADEL_ISSUER'),
    projectId: getOptionalEnvValue(config.env, 'ZITADEL_PROJECT_ID'),
    audience: getOptionalEnvValue(config.env, 'USER_SERVICE_ZITADEL_AUDIENCE') ?? getOptionalEnvValue(config.env, 'ZITADEL_PROJECT_ID'),
    frontendClientId: getOptionalEnvValue(config.env, 'FRONTEND_VITE_ZITADEL_CLIENT_ID'),
    userServiceOidcClientId: getOptionalEnvValue(config.env, 'USER_SERVICE_ZITADEL_OIDC_CLIENT_ID'),
    userServiceApiClientId: getOptionalEnvValue(config.env, 'USER_SERVICE_ZITADEL_CLIENT_ID'),
    userServiceManagementClientId: getOptionalEnvValue(config.env, 'USER_SERVICE_ZITADEL_MANAGEMENT_CLIENT_ID'),
    iamLoginClientFile: config.patFileName,
    iamLoginClientHostPath: config.patHostPath,
    iamLoginClientSha256: patSha256,
    iamLoginClientSizeBytes: statSync(patBundlePath).size,
    zitadelDatabaseBackup: config.backupFileName,
    zitadelDatabaseName: config.env.ZITADEL_DATABASE_POSTGRES_DATABASE,
    zitadelDatabaseVolume: config.env.CAUPPO_COMPOSE_POSTGRES_VOLUME,
    zitadelDatabaseSha256: backupSha256,
    zitadelDatabaseSizeBytes: statSync(backupPath).size,
    zitadelMasterkeySha256: sha256Text(config.env.ZITADEL_MASTERKEY),
    eventStore,
    restoreConfirmation: `RESTORE-ZITADEL-${config.environment}`,
    notes: `Restore only into ${config.environment} with ${config.envFile}. Do not mix this dump or PAT with any other environment.`,
  }

  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({
    status: 'created',
    environment: config.environment,
    bundle: toWorkspacePath(outputDirectory),
    metadata: toWorkspacePath(metadataPath),
    databaseBackup: toWorkspacePath(backupPath),
    patFile: toWorkspacePath(patBundlePath),
    restoreConfirmation: metadata.restoreConfirmation,
  }, null, 2))
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error))
})
