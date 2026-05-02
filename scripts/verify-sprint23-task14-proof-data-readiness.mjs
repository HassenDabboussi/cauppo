import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDirectory, '..')

const ownerBootstrapFixturePath = resolve(
  repoRoot,
  'user-service/tests/fixtures/test-owner-bootstrap.json',
)
const roleGrantProofPath = resolve(repoRoot, 'tmp-sprint23-task1-role-grant-proof.json')
const managerMailpitProofPath = resolve(
  repoRoot,
  'tmp-sprint23-task1-mailpit-invitation-proof.json',
)
const staffMailpitProofPath = resolve(
  repoRoot,
  'tmp-sprint23-task4-mailpit-staff-invitation-proof.json',
)

const blockers = []

const readJson = (filePath, label) => {
  if (!existsSync(filePath)) {
    blockers.push({
      code: 'MISSING_REQUIRED_PROOF_ARTIFACT',
      message: `${label} is missing, so Sprint 23 proof-data alignment cannot be audited for subtask 14.2.`,
      filePath,
    })
    return null
  }

  return JSON.parse(readFileSync(filePath, 'utf8'))
}

const ownerBootstrapFixture = readJson(ownerBootstrapFixturePath, 'Owner bootstrap fixture')
const roleGrantProof = readJson(roleGrantProofPath, 'Task 1 role-grant proof record')
const managerMailpitProof = readJson(
  managerMailpitProofPath,
  'Task 1 manager Mailpit proof record',
)
const staffMailpitProof = readJson(
  staffMailpitProofPath,
  'Task 4 staff Mailpit proof record',
)

const canonicalRestaurantId = ownerBootstrapFixture?.restaurantId ?? null
const canonicalOwnerEmail = ownerBootstrapFixture?.email ?? null
const managerRoleGrantRestaurantId = roleGrantProof?.firstRestaurantId ?? null

if (
  canonicalRestaurantId &&
  managerRoleGrantRestaurantId &&
  canonicalRestaurantId !== managerRoleGrantRestaurantId
) {
  blockers.push({
    code: 'OWNER_FIXTURE_ROLE_GRANT_CONTEXT_MISMATCH',
    message:
      'The owner bootstrap fixture and the existing manager role-grant proof do not agree on the canonical restaurant context for Sprint 23 proof data.',
    expectedRestaurantId: canonicalRestaurantId,
    actualRestaurantId: managerRoleGrantRestaurantId,
    sources: [ownerBootstrapFixturePath, roleGrantProofPath],
  })
}

const hasEphemeralSprint23Email = (value) =>
  typeof value === 'string' &&
  /sprint23-[a-z0-9-]*\d{6,}[a-z0-9-]*@example\.com$/i.test(value)

if (
  canonicalRestaurantId &&
  managerMailpitProof?.validation?.contextId &&
  managerMailpitProof.validation.contextId !== canonicalRestaurantId
) {
  blockers.push({
    code: 'MANAGER_MAILPIT_CONTEXT_NOT_ALIGNED',
    message:
      'The existing owner-to-manager Mailpit proof still validates against a non-canonical restaurant context, so the Sprint 23 proof lane is not using one deterministic restaurant fixture.',
    expectedRestaurantId: canonicalRestaurantId,
    actualRestaurantId: managerMailpitProof.validation.contextId,
    source: managerMailpitProofPath,
  })
}

if (
  canonicalRestaurantId &&
  staffMailpitProof?.restaurantId &&
  staffMailpitProof.restaurantId !== canonicalRestaurantId
) {
  blockers.push({
    code: 'STAFF_MAILPIT_CONTEXT_NOT_ALIGNED',
    message:
      'The existing manager-to-staff Mailpit proof still targets a different restaurant context than the canonical Sprint 23 owner bootstrap fixture.',
    expectedRestaurantId: canonicalRestaurantId,
    actualRestaurantId: staffMailpitProof.restaurantId,
    source: staffMailpitProofPath,
  })
}

const staffValidationContexts = [
  staffMailpitProof?.cancel?.validationBefore?.contextId,
  staffMailpitProof?.decline?.validationBefore?.contextId,
].filter(Boolean)

for (const contextId of staffValidationContexts) {
  if (canonicalRestaurantId && contextId !== canonicalRestaurantId) {
    blockers.push({
      code: 'STAFF_MAILPIT_VALIDATION_CONTEXT_NOT_ALIGNED',
      message:
        'The staff invitation validation records do not point at the canonical Sprint 23 restaurant context.',
      expectedRestaurantId: canonicalRestaurantId,
      actualRestaurantId: contextId,
      source: staffMailpitProofPath,
    })
  }
}

const ephemeralEmails = [
  {
    label: 'manager invitation Mailpit recipient',
    value: managerMailpitProof?.inviteeEmail,
    source: managerMailpitProofPath,
  },
  {
    label: 'role-grant invitee',
    value: roleGrantProof?.inviteeEmail,
    source: roleGrantProofPath,
  },
  {
    label: 'staff cancel Mailpit recipient',
    value: staffMailpitProof?.cancel?.inviteeEmail,
    source: staffMailpitProofPath,
  },
  {
    label: 'staff decline Mailpit recipient',
    value: staffMailpitProof?.decline?.inviteeEmail,
    source: staffMailpitProofPath,
  },
  {
    label: 'staff resend Mailpit recipient',
    value: staffMailpitProof?.resend?.inviteeEmail,
    source: staffMailpitProofPath,
  },
].filter((entry) => entry.value)

for (const entry of ephemeralEmails) {
  if (hasEphemeralSprint23Email(entry.value)) {
    blockers.push({
      code: 'EPHEMERAL_MAILPIT_PROOF_IDENTITY',
      message:
        'Sprint 23 proof recipients still use timestamp-generated addresses, so Mailpit-safe expectations are not deterministic or repeatable for subtask 14.2.',
      label: entry.label,
      actualEmail: entry.value,
      canonicalOwnerEmail,
      source: entry.source,
    })
  }
}

const result = {
  check: 'Sprint 23 Task 14.2 deterministic proof-data readiness',
  canonicalRestaurantId,
  canonicalOwnerEmail,
  managerRoleGrantRestaurantId,
  blockerCount: blockers.length,
  blockers,
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)

if (blockers.length > 0) {
  process.exit(1)
}