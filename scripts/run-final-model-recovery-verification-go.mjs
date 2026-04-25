import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDirectory, '..')

const failures = []

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

runStep('bun', ['scripts/generate-final-model-recovery-evidence.mjs'], repoRoot)
runStep(
  'go',
  [
    'test',
    './tests/contract',
    '-run',
    'TestSprint20Task2MenuRecoveryRed_RequiresExplicitPostRecoveryProtectedIngressReadinessEvidence',
    '-timeout',
    '60s',
    '-v',
  ],
  resolve(repoRoot, 'menu-service'),
)
runStep(
  'go',
  [
    'test',
    './tests/contract',
    '-run',
    'TestSprint20Task2OrderRecoveryRed_RequiresExplicitPostRecoveryProtectedIngressReadinessEvidence',
    '-timeout',
    '60s',
    '-v',
  ],
  resolve(repoRoot, 'order-service'),
)
runStep(
  'go',
  [
    'test',
    './tests/contract',
    '-run',
    'TestSprint20Task2AnalyticsRecoveryRed_RequiresExplicitPostRecoveryRestAndManagerLiveReadinessEvidence',
    '-timeout',
    '60s',
    '-v',
  ],
  resolve(repoRoot, 'analytics-service'),
)
runStep(
  'go',
  [
    'test',
    './tests/contract',
    '-run',
    'TestSprint20Task2NotificationRecoveryRed_RequiresExplicitPostRecoveryRealtimeReadinessEvidence',
    '-timeout',
    '60s',
    '-v',
  ],
  resolve(repoRoot, 'notification-service'),
)

if (failures.length > 0) {
  process.stdout.write(`${JSON.stringify({ failures }, null, 2)}\n`)
  process.exit(1)
}