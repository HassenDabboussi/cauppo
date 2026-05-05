import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  sprint25RemediationEvidenceMatrix,
  sprint25RemediationEvidenceTargets,
} from '../frontend/e2e/kitchen/sprint25-remediation-proof-lane.mjs'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDirectory, '..')
const evidenceFilePath = resolve(repoRoot, 'tmp-sprint25-remediation-proof-publication.json')

const blockers = []

function readUtf8File(relativePath, label) {
  const filePath = resolve(repoRoot, relativePath)

  if (!existsSync(filePath)) {
    blockers.push({
      code: 'MISSING_REQUIRED_PUBLICATION_SOURCE',
      message: `${label} is missing, so Sprint 25 remediation publication readiness cannot be audited.`,
      filePath: relativePath,
    })
    return null
  }

  return {
    relativePath,
    content: readFileSync(filePath, 'utf8'),
  }
}

const sprintOverview = readUtf8File(
  'project_management/sprints/sprint_25_remediation/sprint_25_remediation.md',
  'Sprint 25 remediation overview runbook',
)
const task6 = readUtf8File(
  'project_management/sprints/sprint_25_remediation/sprint_25_remediation_task_6.md',
  'Sprint 25 remediation Task 6 runbook',
)
const task7 = readUtf8File(
  'project_management/sprints/sprint_25_remediation/sprint_25_remediation_task_7.md',
  'Sprint 25 remediation Task 7 certification task',
)
const packageJsonSource = readUtf8File('frontend/package.json', 'Frontend package manifest')

const packageJson = packageJsonSource ? JSON.parse(packageJsonSource.content) : null
const packageScripts = packageJson?.scripts ?? {}
const runbookSources = [sprintOverview, task6, task7].filter(Boolean)
const runbookPublicationText = runbookSources.map((source) => source.content).join('\n')
const expectedRunnerPath = 'frontend/e2e/run-sprint25-remediation-certification.mjs'

const publishedPackageScriptEntries = Object.entries(packageScripts).filter(
  ([, command]) =>
    typeof command === 'string' &&
    command.includes('run-sprint25-remediation-certification.mjs') &&
    command.includes('compose-backed'),
)

if (publishedPackageScriptEntries.length === 0) {
  blockers.push({
    code: 'SPRINT25_REMEDIATION_CERTIFICATION_SCRIPT_NOT_PUBLISHED',
    message:
      'frontend/package.json does not publish a Sprint 25 remediation certification compose-backed entry command.',
    filePath: 'frontend/package.json',
    expectedCommandFragment: 'run-sprint25-remediation-certification.mjs compose-backed',
  })
}

if (!runbookPublicationText.includes(expectedRunnerPath)) {
  blockers.push({
    code: 'RUNBOOK_REMEDIATION_RUNNER_PATH_MISSING',
    message:
      'Sprint 25 remediation runbook files do not publish the expected final certification runner path.',
    expectedRunnerPath,
    inspectedFiles: runbookSources.map((source) => source.relativePath),
  })
}

const missingEvidenceTargets = sprint25RemediationEvidenceTargets.filter(
  (target) => !runbookPublicationText.includes(target),
)

if (missingEvidenceTargets.length > 0) {
  blockers.push({
    code: 'RUNBOOK_REMEDIATION_EVIDENCE_TARGETS_NOT_FULLY_PUBLISHED',
    message:
      'Sprint 25 remediation runbook files do not fully publish the evidence target files required to audit the proof lane.',
    missingEvidenceTargets,
    inspectedFiles: runbookSources.map((source) => source.relativePath),
  })
}

if (!runbookPublicationText.includes('RD-1 through RD-6')) {
  blockers.push({
    code: 'RUNBOOK_RD_MAPPING_SCOPE_NOT_PUBLISHED',
    message:
      'Sprint 25 remediation runbook files do not explicitly publish the RD-1 through RD-6 proof scope for the replacement certification lane.',
    inspectedFiles: runbookSources.map((source) => source.relativePath),
  })
}

if (!runbookPublicationText.includes('AD-KDS-3')) {
  blockers.push({
    code: 'RUNBOOK_AD_KDS_3_GOVERNANCE_NOT_PUBLISHED',
    message:
      'Sprint 25 remediation runbook files do not explicitly publish the AD-KDS-3 governance path for superseded certification handling.',
    inspectedFiles: runbookSources.map((source) => source.relativePath),
  })
}

const result = {
  check: 'Sprint 25 remediation proof publication readiness',
  evidenceFilePath,
  inspectedRunbookFiles: runbookSources.map((source) => source.relativePath),
  packageJsonPath: packageJsonSource?.relativePath ?? null,
  publishedPackageScriptEntries,
  requiredEvidenceTargets: sprint25RemediationEvidenceTargets,
  replacementCertificationAuthority:
    'Task 7 is the approved replacement certification authority for Sprint 25 kitchen defects when the compose-backed remediation lane is green.',
  evidenceMatrix: sprint25RemediationEvidenceMatrix,
  blockerCount: blockers.length,
  blockers,
}

mkdirSync(dirname(evidenceFilePath), { recursive: true })
writeFileSync(evidenceFilePath, `${JSON.stringify(result, null, 2)}\n`)
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)

if (blockers.length > 0) {
  process.exit(1)
}