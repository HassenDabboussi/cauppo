import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDirectory, '..')

const ownerBootstrapFixturePath = resolve(
  repoRoot,
  'user-service/tests/fixtures/test-owner-bootstrap.json',
)
const managerMailpitProofPath = resolve(
  repoRoot,
  'tmp-sprint23-task1-mailpit-invitation-proof.json',
)
const roleGrantProofPath = resolve(repoRoot, 'tmp-sprint23-task1-role-grant-proof.json')
const staffMailpitProofPath = resolve(
  repoRoot,
  'tmp-sprint23-task4-mailpit-staff-invitation-proof.json',
)

const consumerScopes = [
  {
    label: 'frontend',
    relativePath: 'frontend/e2e',
  },
  {
    label: 'user-service',
    relativePath: 'user-service/tests',
  },
  {
    label: 'analytics-service',
    relativePath: 'analytics-service/tests',
  },
  {
    label: 'feedback-service',
    relativePath: 'feedback-service/tests',
  },
  {
    label: 'menu-service',
    relativePath: 'menu-service/tests',
  },
  {
    label: 'order-service',
    relativePath: 'order-service/tests',
  },
  {
    label: 'notification-service',
    relativePath: 'notification-service/tests',
  },
]

const searchableExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.cjs',
  '.cts',
  '.json',
  '.md',
  '.sql',
  '.txt',
  '.yaml',
  '.yml',
])

const blockers = []

const readJson = (filePath, label) => {
  if (!existsSync(filePath)) {
    blockers.push({
      code: 'MISSING_REQUIRED_PROOF_ARTIFACT',
      message: `${label} is missing, so Sprint 23 Task 14.3 cannot resolve the canonical manager proof context.` ,
      filePath,
    })
    return null
  }

  return JSON.parse(readFileSync(filePath, 'utf8'))
}

const ownerBootstrapFixture = readJson(ownerBootstrapFixturePath, 'Owner bootstrap fixture')
const managerMailpitProof = readJson(
  managerMailpitProofPath,
  'Task 1 manager Mailpit proof record',
)
const roleGrantProof = readJson(roleGrantProofPath, 'Task 1 role-grant proof record')
const staffMailpitProof = readJson(
  staffMailpitProofPath,
  'Task 4 staff Mailpit proof record',
)

const canonicalRestaurantId = ownerBootstrapFixture?.restaurantId ?? null
const managerValidationContextId = managerMailpitProof?.validation?.contextId ?? null
const roleGrantPrimaryRestaurantId = roleGrantProof?.firstRestaurantId ?? null
const staffRestaurantId = staffMailpitProof?.restaurantId ?? null

if (
  canonicalRestaurantId &&
  managerValidationContextId &&
  canonicalRestaurantId !== managerValidationContextId
) {
  blockers.push({
    code: 'MANAGER_PROOF_CONTEXT_MISMATCH',
    message:
      'The manager Mailpit proof does not agree with the canonical owner bootstrap restaurant context, so Task 14.3 cannot evaluate consumer alignment yet.',
    expectedRestaurantId: canonicalRestaurantId,
    actualRestaurantId: managerValidationContextId,
    sources: [ownerBootstrapFixturePath, managerMailpitProofPath],
  })
}

if (
  canonicalRestaurantId &&
  roleGrantPrimaryRestaurantId &&
  canonicalRestaurantId !== roleGrantPrimaryRestaurantId
) {
  blockers.push({
    code: 'ROLE_GRANT_PROOF_CONTEXT_MISMATCH',
    message:
      'The role-grant proof does not agree with the canonical owner bootstrap restaurant context, so Task 14.3 cannot evaluate consumer alignment yet.',
    expectedRestaurantId: canonicalRestaurantId,
    actualRestaurantId: roleGrantPrimaryRestaurantId,
    sources: [ownerBootstrapFixturePath, roleGrantProofPath],
  })
}

if (canonicalRestaurantId && staffRestaurantId && canonicalRestaurantId !== staffRestaurantId) {
  blockers.push({
    code: 'STAFF_PROOF_CONTEXT_MISMATCH',
    message:
      'The staff Mailpit proof does not agree with the canonical owner bootstrap restaurant context, so Task 14.3 cannot evaluate consumer alignment yet.',
    expectedRestaurantId: canonicalRestaurantId,
    actualRestaurantId: staffRestaurantId,
    sources: [ownerBootstrapFixturePath, staffMailpitProofPath],
  })
}

const canonicalTokens = [
  canonicalRestaurantId,
  'tmp-sprint23-task1-mailpit-invitation-proof.json',
  'tmp-sprint23-task1-role-grant-proof.json',
  'tmp-sprint23-task4-mailpit-staff-invitation-proof.json',
].filter(Boolean)

function listSearchableFiles(directoryPath) {
  if (!existsSync(directoryPath)) {
    return []
  }

  const files = []

  for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = resolve(directoryPath, entry.name)

    if (entry.isDirectory()) {
      files.push(...listSearchableFiles(entryPath))
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    if (searchableExtensions.has(extname(entry.name).toLowerCase())) {
      files.push(entryPath)
    }
  }

  return files
}

function toRepoRelativePath(filePath) {
  return filePath.slice(repoRoot.length + 1).replaceAll('\\', '/')
}

function findCanonicalBindings(directoryPath) {
  const matches = []

  for (const filePath of listSearchableFiles(directoryPath)) {
    let fileContent

    try {
      fileContent = readFileSync(filePath, 'utf8')
    } catch {
      continue
    }

    const matchedTokens = canonicalTokens.filter((token) => fileContent.includes(token))

    if (matchedTokens.length > 0) {
      matches.push({
        filePath: toRepoRelativePath(filePath),
        matchedTokens,
      })
    }
  }

  return matches
}

const consumerResults = consumerScopes.map((scope) => {
  const directoryPath = resolve(repoRoot, scope.relativePath)
  const matches = findCanonicalBindings(directoryPath)

  return {
    ...scope,
    directoryPath,
    matches,
  }
})

for (const consumerResult of consumerResults) {
  if (consumerResult.matches.length === 0) {
    blockers.push({
      code: 'MISSING_CANONICAL_PROOF_BINDING',
      message:
        'This test-consumer surface does not explicitly bind to the canonical Sprint 23 manager proof record or restaurant context, so alignment drift remains unguarded for subtask 14.3.',
      consumer: consumerResult.label,
      directory: consumerResult.relativePath,
      expectedAnyOf: canonicalTokens,
    })
  }
}

const result = {
  check: 'Sprint 23 Task 14.3 consumer proof alignment',
  canonicalRestaurantId,
  managerValidationContextId,
  roleGrantPrimaryRestaurantId,
  staffRestaurantId,
  consumerResults: consumerResults.map((consumerResult) => ({
    consumer: consumerResult.label,
    directory: consumerResult.relativePath,
    matchCount: consumerResult.matches.length,
    matches: consumerResult.matches,
  })),
  blockerCount: blockers.length,
  blockers,
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)

if (blockers.length > 0) {
  process.exit(1)
}