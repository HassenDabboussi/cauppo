import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDirectory, '..')

const blockers = []

function toRepoRelativePath(filePath) {
  return filePath.slice(repoRoot.length + 1).replaceAll('\\', '/')
}

function readUtf8File(relativePath, label) {
  const filePath = resolve(repoRoot, relativePath)

  if (!existsSync(filePath)) {
    blockers.push({
      code: 'MISSING_REQUIRED_PUBLICATION_SOURCE',
      message: `${label} is missing, so Sprint 23 Task 14.5 publication readiness cannot be audited.`,
      filePath: relativePath,
    })
    return null
  }

  return {
    filePath,
    relativePath,
    content: readFileSync(filePath, 'utf8'),
  }
}

const sprintOverview = readUtf8File(
  'project_management/sprints/sprint_23/sprint_23.md',
  'Sprint 23 overview runbook',
)
const task14 = readUtf8File(
  'project_management/sprints/sprint_23/sprint_23_task_14.md',
  'Sprint 23 Task 14 runbook',
)
const task15 = readUtf8File(
  'project_management/sprints/sprint_23/sprint_23_task_15.md',
  'Sprint 23 Task 15 certification task',
)
const packageJsonSource = readUtf8File('frontend/package.json', 'Frontend package manifest')
const proofBinding = readUtf8File(
  'frontend/e2e/sprint23-manager-proof-binding.md',
  'Sprint 23 proof binding note',
)

const packageJson = packageJsonSource ? JSON.parse(packageJsonSource.content) : null
const packageScripts = packageJson?.scripts ?? {}

const requiredEvidenceTargets = [
  'tmp-sprint23-task1-mailpit-invitation-proof.json',
  'tmp-sprint23-task1-role-grant-proof.json',
  'tmp-sprint23-task4-mailpit-staff-invitation-proof.json',
  'frontend/test-results/',
]

const runbookSources = [sprintOverview, task14, task15].filter(Boolean)
const runbookPublicationText = runbookSources.map((source) => source.content).join('\n')
const expectedRunnerPath = 'frontend/e2e/run-sprint23-manager-certification.mjs'

const publishedPackageScriptEntries = Object.entries(packageScripts).filter(
  ([, command]) =>
    typeof command === 'string' &&
    command.includes('run-sprint23-manager-certification.mjs') &&
    command.includes('compose-backed'),
)

if (publishedPackageScriptEntries.length === 0) {
  blockers.push({
    code: 'FRONTEND_MANAGER_CERTIFICATION_SCRIPT_NOT_PUBLISHED',
    message:
      'frontend/package.json does not publish a Sprint 23 manager certification compose-backed entry command, so the final proof lane is not auditable from the approved package surface.',
    filePath: 'frontend/package.json',
    expectedCommandFragment: 'run-sprint23-manager-certification.mjs compose-backed',
  })
}

const publishedCommandFragments = [
  'run-sprint23-manager-certification.mjs compose-backed',
  'bun run',
]

const runbookHasPublishedCommand = publishedCommandFragments.every((fragment) =>
  runbookPublicationText.includes(fragment),
)

if (!runbookHasPublishedCommand) {
  blockers.push({
    code: 'RUNBOOK_MANAGER_CERTIFICATION_COMMAND_MISSING',
    message:
      'Sprint 23 runbook files do not publish an approved final manager certification command for the compose-backed lane.',
    requiredAnyApprovedCommand: [
      'bun run <frontend package alias> compose-backed',
      'node frontend/e2e/run-sprint23-manager-certification.mjs compose-backed',
    ],
    inspectedFiles: runbookSources.map((source) => source.relativePath),
  })
}

const missingEvidenceTargets = requiredEvidenceTargets.filter(
  (target) => !runbookPublicationText.includes(target),
)

if (missingEvidenceTargets.length > 0) {
  blockers.push({
    code: 'RUNBOOK_EVIDENCE_TARGETS_NOT_FULLY_PUBLISHED',
    message:
      'Sprint 23 runbook files do not fully publish the evidence target files required to audit the final manager certification lane.',
    missingEvidenceTargets,
    inspectedFiles: runbookSources.map((source) => source.relativePath),
  })
}

if (task15 && !task15.content.includes(expectedRunnerPath)) {
  blockers.push({
    code: 'TASK15_RUNNER_PATH_MISSING',
    message:
      'Task 15 does not name the expected Sprint 23 manager certification runner path, so the proof-entry surface remains ambiguous.',
    expectedRunnerPath,
    filePath: task15.relativePath,
  })
}

if (proofBinding) {
  const unpublishedBoundArtifacts = requiredEvidenceTargets
    .filter((target) => target.startsWith('tmp-sprint23'))
    .filter((target) => proofBinding.content.includes(target) && !runbookPublicationText.includes(target))

  if (unpublishedBoundArtifacts.length > 0) {
    blockers.push({
      code: 'BOUND_PROOF_ARTIFACTS_NOT_PROMOTED_TO_RUNBOOK',
      message:
        'The canonical Sprint 23 proof binding notes define prerequisite evidence artifacts, but the runbook has not promoted those artifacts into the published final-proof instructions.',
      unpublishedBoundArtifacts,
      bindingSource: proofBinding.relativePath,
    })
  }
}

const result = {
  check: 'Sprint 23 Task 14.5 proof publication readiness',
  inspectedRunbookFiles: runbookSources.map((source) => source.relativePath),
  packageJsonPath: packageJsonSource?.relativePath ?? null,
  bindingSource: proofBinding?.relativePath ?? null,
  publishedPackageScriptEntries,
  requiredEvidenceTargets,
  blockerCount: blockers.length,
  blockers,
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)

if (blockers.length > 0) {
  process.exit(1)
}