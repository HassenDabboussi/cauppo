import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDirectory, '..')

const defaultEnvFile = 'envs/.env.test'
const envFileArgument = process.argv[2] ?? defaultEnvFile
const envFilePath = resolve(repoRoot, envFileArgument)

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

const env = parseEnvFile(readFileSync(envFilePath, 'utf8'))

const outputPath = resolve(
  repoRoot,
  env.CAUPPO_GATE_B_CUTOFF_SHARED_MANIFEST ?? './tmp-gate-b-cutoff-certification.json',
)

const telemetrySourcePath = resolve(
  repoRoot,
  env.CAUPPO_GATE_B_CUTOFF_TELEMETRY_SOURCE ?? './envs/.local/isolated-test/gate-b-cutoff-telemetry.json',
)

const evidenceManifestPaths = {
  frontend: 'frontend/tests/fixtures/gate-b-cutoff-evidence.manifest.json',
  userService: 'user-service/tests/contract/gate-b-cutoff-evidence.manifest.json',
  feedbackService: 'feedback-service/tests/contract/gate-b-cutoff-evidence.manifest.json',
}

const evidenceSlices = Object.fromEntries(
  Object.entries(evidenceManifestPaths).map(([serviceKey, manifestPath]) => {
    const parsed = readJsonFile(resolve(repoRoot, manifestPath))

    return [serviceKey, parsed]
  }),
)

const telemetrySource = existsSync(telemetrySourcePath)
  ? readJsonFile(telemetrySourcePath)
  : null

const generatedAt = new Date().toISOString()

const readinessSummaryNote =
  'This manifest records a point-in-time Gate B readiness package only. It never authorizes active-role-only cutover by itself, and Task 8 remains the separate cutover authority.'

const pointInTimeEvidence = {
  observedAt:
    typeof telemetrySource?.observedAt === 'string'
      ? telemetrySource.observedAt
      : typeof telemetrySource?.telemetryWindow?.endedAt === 'string'
        ? telemetrySource.telemetryWindow.endedAt
        : generatedAt,
  sourcePath: relative(repoRoot, telemetrySourcePath),
  sourcePresent: telemetrySource !== null,
}

const normalizeCounter = (serviceKey, counterKey) => {
  const value = telemetrySource?.evidence?.[serviceKey]?.[counterKey]

  return typeof value === 'number' ? value : undefined
}

const evidence = Object.fromEntries(
  Object.entries(evidenceSlices).map(([serviceKey, slice]) => [
    serviceKey,
    {
      surfaceKeys: Array.isArray(slice.surfaceKeys) ? slice.surfaceKeys : [],
      unresolvedMismatchCount: normalizeCounter(serviceKey, 'unresolvedMismatchCount'),
      legacyOnlyRequestCount: normalizeCounter(serviceKey, 'legacyOnlyRequestCount'),
      notes: [
        ...(Array.isArray(slice.notes) ? slice.notes : []),
        ...(telemetrySource
          ? []
          : [
              'Point-in-time zero-mismatch / zero-legacy counters are intentionally omitted until a real Gate B evidence snapshot is recorded.',
            ]),
      ],
    },
  ]),
)

const blockers = []

if (!telemetrySource) {
  blockers.push({
    code: 'GATE_B_POINT_IN_TIME_EVIDENCE_MISSING',
    message:
      'The shared Gate B point-in-time evidence source file is missing, so the repo can publish only a packaging-only readiness manifest. Gate B remains blocked, and this package does not authorize active-role-only cutover or Task 8 start.',
    pointInTimeEvidenceSourcePath: relative(repoRoot, telemetrySourcePath),
  })
} else {
  for (const [serviceKey, slice] of Object.entries(evidence)) {
    if (
      typeof slice.unresolvedMismatchCount !== 'number' ||
      typeof slice.legacyOnlyRequestCount !== 'number'
    ) {
      blockers.push({
        code: 'GATE_B_POINT_IN_TIME_COUNTERS_MISSING',
        message:
          'The shared Gate B evidence source is present, but one or more migrated service slices do not publish the required point-in-time zero-mismatch / zero-legacy counters. Gate B remains blocked, and the package stays readiness-only.',
        serviceKey,
        pointInTimeEvidenceSourcePath: relative(repoRoot, telemetrySourcePath),
      })
      continue
    }

    if (slice.unresolvedMismatchCount !== 0 || slice.legacyOnlyRequestCount !== 0) {
      blockers.push({
        code: 'GATE_B_POINT_IN_TIME_EVIDENCE_NON_ZERO',
        message:
          'The shared Gate B evidence source is present, but the current point-in-time readiness snapshot still contains unresolved mismatches or legacy-only requests. Gate B remains blocked, and the package stays readiness-only.',
        serviceKey,
        unresolvedMismatchCount: slice.unresolvedMismatchCount,
        legacyOnlyRequestCount: slice.legacyOnlyRequestCount,
        pointInTimeEvidenceSourcePath: relative(repoRoot, telemetrySourcePath),
      })
    }
  }
}

const manifest = {
  kind: 'cauppo-gate-b-cutoff-certification',
  generatedAt,
  approvedEnvFile: relative(repoRoot, envFilePath),
  summary: {
    scope: 'point-in-time-readiness-package-only',
    note: readinessSummaryNote,
  },
  pointInTimeEvidence,
  evidence,
  gateB: {
    readinessRule: 'point-in-time-zero-mismatch-zero-legacy-evidence-plus-tests',
    entryVerdict:
      blockers.length === 0
        ? 'ready-for-gate-b-readiness-certification-review'
        : 'blocked-pending-point-in-time-readiness-evidence',
    readinessCertificationScope: 'task-7-readiness-verdict-only',
    cutoverAuthority: 'task-8-separate-explicit-cutover-step-required',
    nextAction:
      blockers.length === 0
        ? 'await-task-7-6-verification-readiness-verdict-before-task-8'
        : 'remain-blocked-until-point-in-time-evidence-and-tests-are-green',
    note: readinessSummaryNote,
    cutoverAuthorized: false,
  },
  blockers,
}

writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

process.stdout.write(
  `${JSON.stringify(
    {
      outputPath: relative(repoRoot, outputPath),
      pointInTimeEvidenceSourcePresent: telemetrySource !== null,
      blockerCount: blockers.length,
      pointInTimeEvidence,
    },
    null,
    2,
  )}\n`,
)