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

runStep('node', ['scripts/generate-final-model-durability-evidence.mjs'], repoRoot)
runStep(
  'bun',
  ['test', 'tests/contract/rest/final-model-durability.consumer.contract.test.ts', '--timeout', '10000'],
  resolve(repoRoot, 'frontend'),
)
runStep(
  'bun',
  ['test', 'tests/contract/auth.final-model-durability.contract.test.ts', '--timeout', '10000'],
  resolve(repoRoot, 'user-service'),
)

if (failures.length > 0) {
  process.stdout.write(`${JSON.stringify({ failures }, null, 2)}\n`)
  process.exit(1)
}