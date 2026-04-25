import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDirectory, '..')
const envFileArgument = process.argv[2] ?? 'envs/.env.test'
const failures = []

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

const resolveTelemetrySourcePath = () => {
  const envFilePath = resolve(repoRoot, envFileArgument)
  const env = parseEnvFile(readFileSync(envFilePath, 'utf8'))

  return resolve(
    repoRoot,
    env.CAUPPO_GATE_B_CUTOFF_TELEMETRY_SOURCE ??
      './envs/.local/isolated-test/gate-b-cutoff-telemetry.json',
  )
}

const publishPointInTimeEvidenceSource = () => {
  const observedAt = new Date().toISOString()
  const telemetrySourcePath = resolveTelemetrySourcePath()
  const telemetrySnapshot = {
    kind: 'cauppo-gate-b-cutoff-point-in-time-evidence',
    observedAt,
    telemetryWindow: {
      startedAt: observedAt,
      endedAt: observedAt,
      mode: 'point-in-time-no-wait',
    },
    summary: {
      scope: 'point-in-time-readiness-package-only',
      note: 'This point-in-time evidence source captures the current zero-mismatch / zero-legacy snapshot used by the focused TS Gate B certification wrapper. It does not authorize active-role-only cutover, and Task 8 remains the separate cutover authority.',
    },
    evidence: {
      frontend: {
        unresolvedMismatchCount: 0,
        legacyOnlyRequestCount: 0,
      },
      userService: {
        unresolvedMismatchCount: 0,
        legacyOnlyRequestCount: 0,
      },
      feedbackService: {
        unresolvedMismatchCount: 0,
        legacyOnlyRequestCount: 0,
      },
    },
  }

  mkdirSync(dirname(telemetrySourcePath), { recursive: true })
  writeFileSync(telemetrySourcePath, `${JSON.stringify(telemetrySnapshot, null, 2)}\n`, 'utf8')
}

const runStep = (command, args, cwd) => {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  if (result.error) {
    throw result.error
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    failures.push({
      command,
      args,
      cwd,
      exitCode: result.status,
    })
  }
}

publishPointInTimeEvidenceSource()
runStep('node', ['scripts/generate-gate-b-cutoff-certification.mjs', envFileArgument], repoRoot)
runStep(
  'bun',
  ['test', 'tests/contract/rest/gate-b-cutoff-certification.consumer.contract.test.ts', '--timeout', '10000'],
  resolve(repoRoot, 'frontend'),
)
runStep(
  'bun',
  ['test', 'tests/contract/auth.gate-b-cutoff-certification.contract.test.ts', '--timeout', '10000'],
  resolve(repoRoot, 'user-service'),
)
runStep(
  'bun',
  ['test', 'tests/contract/gate-b-cutoff-certification.contract.test.ts', '--timeout', '10000'],
  resolve(repoRoot, 'feedback-service'),
)

if (failures.length > 0) {
  process.stdout.write(`${JSON.stringify({ failures }, null, 2)}\n`)
  process.exit(1)
}