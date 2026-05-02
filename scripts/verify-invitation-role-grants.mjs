import { Buffer } from 'node:buffer'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const apiBaseUrl = process.env.CAUPPO_API_BASE_URL ?? 'http://api.cauppo.localhost'
const postgresContainer =
  process.env.CAUPPO_POSTGRES_CONTAINER ?? 'cauppo-isolated-test-postgres-1'
const postgresDsn =
  process.env.CAUPPO_USER_SERVICE_DATABASE_URL ??
  'postgresql://cauppo_user:cauppo_user@127.0.0.1:5432/cauppo_users_test?sslmode=disable'
const evidencePath =
  process.env.CAUPPO_ROLE_GRANT_EVIDENCE_PATH ??
  path.join(process.cwd(), 'tmp-sprint23-task1-role-grant-proof.json')

const proofId = `sprint23-role-grant-${Date.now()}`
const organizationId =
  process.env.CAUPPO_OWNER_CONTEXT_ID ?? '33333333-3333-4333-8333-333333333333'
const firstRestaurantId =
  process.env.CAUPPO_FIRST_RESTAURANT_ID ?? '44444444-4444-4444-8444-444444444444'
const secondRestaurantId = process.env.CAUPPO_SECOND_RESTAURANT_ID ?? randomUUID()
const inviteeUserId = randomUUID()
const inviteeEmail = `${proofId}@example.com`

const ownerSession = {
  userId: randomUUID(),
  email: `owner-${proofId}@example.com`,
  roleId: randomUUID(),
  role: 'OWNER',
  contextId: organizationId,
  contextType: 'ORGANIZATION',
  contextName: 'Sprint 23 Proof Organization',
}

const inviteeSession = {
  userId: inviteeUserId,
  email: inviteeEmail,
  roleId: randomUUID(),
  role: 'CUSTOMER',
  contextId: null,
  contextType: null,
  contextName: null,
}

const sqlLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`

const psql = (statement) =>
  execFileSync(
    'docker',
    [
      'exec',
      postgresContainer,
      'psql',
      postgresDsn,
      '-v',
      'ON_ERROR_STOP=1',
      '-Atc',
      statement,
    ],
    { encoding: 'utf8' },
  ).trim()

const fetchJson = async (url, init = {}) => {
  const response = await fetch(url, init)
  const text = await response.text()
  const body = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(
      `Request failed ${response.status} ${response.statusText} for ${url}: ${text}`,
    )
  }

  return body
}

const createInvitation = async (contextId) =>
  fetchJson(`${apiBaseUrl}/v1/invitations`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-test-auth': JSON.stringify(ownerSession),
    },
    body: JSON.stringify({
      email: inviteeEmail,
      name: 'Sprint 23 Role Grant Proof',
      role: 'MANAGER',
      contextId,
    }),
  })

const readInvitationToken = (invitationId) =>
  psql(
    `select token from staff_invitations where id = ${sqlLiteral(invitationId)};`,
  )

const acceptInvitation = async (token) =>
  fetchJson(`${apiBaseUrl}/v1/invitations/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
    headers: {
      'x-test-auth': JSON.stringify(inviteeSession),
    },
  })

const seedProofData = () => {
  psql(`
    insert into restaurants (id, name, organization_id, timezone, service_mode, is_active)
    values (
      ${sqlLiteral(secondRestaurantId)}::uuid,
      ${sqlLiteral(`Sprint 23 Second Restaurant ${proofId}`)},
      ${sqlLiteral(organizationId)}::uuid,
      'UTC',
      'WAITER',
      true
    )
    on conflict (id) do update set updated_at = now();

    insert into users (id, zitadel_user_id, username, email, name, is_active)
    values (
      ${sqlLiteral(inviteeUserId)}::uuid,
      ${sqlLiteral(`zitadel-${proofId}`)},
      ${sqlLiteral(`user-${proofId}`)},
      ${sqlLiteral(inviteeEmail)},
      'Sprint 23 Role Grant Proof',
      true
    )
    on conflict (id) do update set email = excluded.email, updated_at = now();

    insert into user_roles (user_id, role, context_id, context_type, is_active, deactivated_at, updated_at)
    values (
      ${sqlLiteral(inviteeUserId)}::uuid,
      'CUSTOMER',
      null,
      null,
      false,
      now(),
      now()
    )
    on conflict (user_id) where role = 'CUSTOMER' and context_id is null and context_type is null
    do update set is_active = false, deactivated_at = now(), updated_at = now();

    insert into user_roles (user_id, role, context_id, context_type, is_active, deactivated_at, updated_at)
    values (
      ${sqlLiteral(inviteeUserId)}::uuid,
      'MANAGER',
      ${sqlLiteral(firstRestaurantId)}::uuid,
      'RESTAURANT',
      false,
      now(),
      now()
    )
    on conflict (user_id, role, context_type, context_id)
      where context_id is not null and context_type is not null
    do update set is_active = false, deactivated_at = now(), updated_at = now();
  `)
}

const readRoleSummary = () =>
  JSON.parse(
    psql(`
      select json_build_object(
        'customerRows', count(*) filter (where role = 'CUSTOMER' and context_id is null and context_type is null),
        'activeCustomerRows', count(*) filter (where role = 'CUSTOMER' and context_id is null and context_type is null and is_active),
        'firstRestaurantManagerRows', count(*) filter (where role = 'MANAGER' and context_id = ${sqlLiteral(firstRestaurantId)}::uuid and context_type = 'RESTAURANT'),
        'activeFirstRestaurantManagerRows', count(*) filter (where role = 'MANAGER' and context_id = ${sqlLiteral(firstRestaurantId)}::uuid and context_type = 'RESTAURANT' and is_active),
        'secondRestaurantManagerRows', count(*) filter (where role = 'MANAGER' and context_id = ${sqlLiteral(secondRestaurantId)}::uuid and context_type = 'RESTAURANT'),
        'activeSecondRestaurantManagerRows', count(*) filter (where role = 'MANAGER' and context_id = ${sqlLiteral(secondRestaurantId)}::uuid and context_type = 'RESTAURANT' and is_active),
        'managerContexts', coalesce(json_agg(context_id::text order by context_id::text) filter (where role = 'MANAGER'), '[]'::json)
      )
      from user_roles
      where user_id = ${sqlLiteral(inviteeUserId)}::uuid;
    `),
  )

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const main = async () => {
  seedProofData()

  const firstInvitation = await createInvitation(firstRestaurantId)
  const firstToken = readInvitationToken(firstInvitation.invitationId)
  const firstAccept = await acceptInvitation(firstToken)
  const afterFirstAccept = readRoleSummary()

  assert(firstAccept.role.contextId === firstRestaurantId, 'First accepted role context mismatch')
  assert(afterFirstAccept.customerRows === 1, 'CUSTOMER role was duplicated')
  assert(afterFirstAccept.activeCustomerRows === 1, 'CUSTOMER role was not reactivated')
  assert(
    afterFirstAccept.firstRestaurantManagerRows === 1,
    'First restaurant MANAGER role was duplicated instead of reactivated',
  )
  assert(
    afterFirstAccept.activeFirstRestaurantManagerRows === 1,
    'First restaurant MANAGER role was not reactivated',
  )

  const secondInvitation = await createInvitation(secondRestaurantId)
  const secondToken = readInvitationToken(secondInvitation.invitationId)
  const secondAccept = await acceptInvitation(secondToken)
  const afterSecondAccept = readRoleSummary()

  assert(secondAccept.role.contextId === secondRestaurantId, 'Second accepted role context mismatch')
  assert(
    afterSecondAccept.firstRestaurantManagerRows === 1,
    'First restaurant MANAGER role changed after second invite',
  )
  assert(
    afterSecondAccept.secondRestaurantManagerRows === 1,
    'Second restaurant MANAGER role was not created',
  )
  assert(
    afterSecondAccept.activeSecondRestaurantManagerRows === 1,
    'Second restaurant MANAGER role was not active',
  )
  assert(afterSecondAccept.customerRows === 1, 'CUSTOMER role changed after second invite')

  const evidence = {
    proofId,
    apiBaseUrl,
    postgresContainer,
    inviteeUserId,
    inviteeEmail,
    firstRestaurantId,
    secondRestaurantId,
    firstInvitationId: firstInvitation.invitationId,
    secondInvitationId: secondInvitation.invitationId,
    firstAccept: {
      roleId: firstAccept.role.roleId,
      role: firstAccept.role.role,
      contextId: firstAccept.role.contextId,
      continuation: firstAccept.continuation,
    },
    secondAccept: {
      roleId: secondAccept.role.roleId,
      role: secondAccept.role.role,
      contextId: secondAccept.role.contextId,
      continuation: secondAccept.continuation,
    },
    afterFirstAccept,
    afterSecondAccept,
    checkedAt: new Date().toISOString(),
  }

  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify(evidence, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})