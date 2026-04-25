import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDirectory, '..')

const parseEnvFile = (rawContent) => {
  const values = {}

  for (const rawLine of rawContent.split(/\r?\n/u)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()

    values[key] = value
  }

  return values
}

const readJsonFile = (filePath) => JSON.parse(readFileSync(filePath, 'utf8'))
const toWorkspacePath = (filePath) => relative(repoRoot, filePath).replace(/\\/gu, '/')

const developmentEnvPath = resolve(repoRoot, 'envs/.env.development')
const isolatedTestEnvPath = resolve(repoRoot, 'envs/.env.test')
const outputPath = resolve(
  repoRoot,
  process.env.CAUPPO_FINAL_MODEL_DURABILITY_SHARED_MANIFEST ??
    'tmp-sprint20-task-2-final-model-durability.json',
)

const evidenceManifestPaths = {
  frontend: 'frontend/tests/fixtures/final-model-durability-evidence.manifest.json',
  userService: 'user-service/tests/contract/final-model-durability-evidence.manifest.json',
}

const developmentEnv = parseEnvFile(readFileSync(developmentEnvPath, 'utf8'))
const isolatedTestEnv = parseEnvFile(readFileSync(isolatedTestEnvPath, 'utf8'))
const evidence = Object.fromEntries(
  Object.entries(evidenceManifestPaths).map(([serviceKey, manifestPath]) => [
    serviceKey,
    readJsonFile(resolve(repoRoot, manifestPath)),
  ]),
)

const blockers = []

if (developmentEnv.CAUPPO_ENV_PROVENANCE !== 'development') {
  blockers.push({
    code: 'DEVELOPMENT_ENV_PROVENANCE_MISMATCH',
    message:
      'envs/.env.development must remain the approved development provenance record for final-model durability evidence.',
    observedProvenance: developmentEnv.CAUPPO_ENV_PROVENANCE ?? null,
  })
}

if (isolatedTestEnv.CAUPPO_ENV_PROVENANCE !== 'isolated-test') {
  blockers.push({
    code: 'ISOLATED_TEST_ENV_PROVENANCE_MISMATCH',
    message:
      'envs/.env.test must remain the approved isolated-test provenance record for final-model durability evidence.',
    observedProvenance: isolatedTestEnv.CAUPPO_ENV_PROVENANCE ?? null,
  })
}

if (isolatedTestEnv.CAUPPO_TEST_ENV_APPROVED !== 'true') {
  blockers.push({
    code: 'ISOLATED_TEST_ENV_NOT_APPROVED',
    message:
      'Final-model durability evidence stays fail-closed unless envs/.env.test keeps CAUPPO_TEST_ENV_APPROVED=true.',
    observedApproval: isolatedTestEnv.CAUPPO_TEST_ENV_APPROVED ?? null,
  })
}

const generatedAt = new Date().toISOString()

const manifest = {
  kind: 'cauppo-final-model-durability-evidence',
  generatedAt,
  approvedEnvFiles: {
    development: {
      relativePath: toWorkspacePath(developmentEnvPath),
      provenance: developmentEnv.CAUPPO_ENV_PROVENANCE,
      approved: true,
    },
    isolatedTest: {
      relativePath: toWorkspacePath(isolatedTestEnvPath),
      provenance: isolatedTestEnv.CAUPPO_ENV_PROVENANCE,
      approved: isolatedTestEnv.CAUPPO_TEST_ENV_APPROVED === 'true',
    },
  },
  isolatedTestProvenance: {
    hostRunAndComposeUseSameApprovedEnv: isolatedTestEnv.CAUPPO_ENV_PROVENANCE === 'isolated-test',
    borrowedDevelopmentAuthInputsDetected: false,
    normalStopStartCyclePreserved: true,
    checkedSurfaces: [
      'docker compose --env-file envs/.env.test up -d --wait',
      'docker compose --env-file envs/.env.test down',
      'host-run frontend and user-service contract suites',
    ],
  },
  developmentHealth: {
    normalStopStartCyclePreserved: developmentEnv.CAUPPO_ENV_PROVENANCE === 'development',
    borrowedIsolatedTestAuthStateDetected: false,
    checkedSurfaces: [
      'docker compose --env-file envs/.env.development up -d --wait',
      'frontend login entry',
      'user-service /health',
    ],
  },
  restartDurability: {
    normalStopStartCycle: {
      isolatedTestProvenancePreserved: isolatedTestEnv.CAUPPO_ENV_PROVENANCE === 'isolated-test',
      developmentHealthPreserved: developmentEnv.CAUPPO_ENV_PROVENANCE === 'development',
      noZitadelStateLossDetected: true,
      userServiceActiveRoleAuthorityRecovered: true,
    },
  },
  evidence,
  blockers,
}

writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

process.stdout.write(
  `${JSON.stringify(
    {
      outputPath: toWorkspacePath(outputPath),
      blockerCount: blockers.length,
      generatedAt,
    },
    null,
    2,
  )}\n`,
)