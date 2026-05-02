import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, '..')
const ownerBootstrapFixture = JSON.parse(
  readFileSync(path.join(repoRoot, 'user-service/tests/fixtures/test-owner-bootstrap.json'), 'utf8'),
)

const apiBaseUrl = process.env.CAUPPO_API_BASE_URL ?? 'http://api.cauppo.localhost'
const mailpitBaseUrl = process.env.CAUPPO_MAILPIT_BASE_URL ?? 'http://127.0.0.1:8025'
const mailpitUser = process.env.CAUPPO_MAILPIT_USER ?? 'mailpit'
const mailpitPassword = process.env.CAUPPO_MAILPIT_PASSWORD ?? 'cauppo-mailpit'
const evidencePath =
  process.env.CAUPPO_MAILPIT_EVIDENCE_PATH ??
  path.join(process.cwd(), 'tmp-sprint23-task1-mailpit-invitation-proof.json')

const proofId = `sprint23-task1-${Date.now()}`
const inviteeEmail =
  process.env.CAUPPO_MANAGER_MAILPIT_INVITEE_EMAIL ?? 'sprint23-manager-proof@example.com'
const invitationContextId =
  process.env.CAUPPO_INVITATION_CONTEXT_ID ??
  ownerBootstrapFixture.restaurantId ??
  '44444444-4444-4444-8444-444444444444'

const ownerSession = {
  userId: `owner-${proofId}`,
  email: `owner-${proofId}@example.com`,
  roleId: `role-owner-${proofId}`,
  role: 'OWNER',
  contextId:
    process.env.CAUPPO_OWNER_CONTEXT_ID ??
    ownerBootstrapFixture.organizationId ??
    '33333333-3333-4333-8333-333333333333',
  contextType: 'ORGANIZATION',
  contextName: 'Sprint 23 Proof Organization',
}

const mailpitAuthorization = `Basic ${Buffer.from(
  `${mailpitUser}:${mailpitPassword}`,
).toString('base64')}`

const fetchJson = async (url, init = {}) => {
  const response = await fetch(url, init)
  const text = await response.text()

  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!response.ok) {
    throw new Error(
      `Request failed ${response.status} ${response.statusText} for ${url}: ${text}`,
    )
  }

  return body
}

const toMailpitTimestamp = (message) => {
  const value = message.Created ?? message.created ?? message.Date ?? message.date ?? null
  const parsed = typeof value === 'string' ? Date.parse(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : 0
}

const findMessageForInvitee = async () => {
  const messagesResponse = await fetchJson(`${mailpitBaseUrl}/api/v1/messages`, {
    headers: {
      Authorization: mailpitAuthorization,
    },
  })
  const messages = Array.isArray(messagesResponse.messages)
    ? messagesResponse.messages
    : []

  return (
    messages
      .filter((message) => {
        const recipients = Array.isArray(message.To) ? message.To : []
        return recipients.some((recipient) => recipient.Address === inviteeEmail)
      })
      .sort((left, right) => toMailpitTimestamp(right) - toMailpitTimestamp(left))[0] ?? null
  )
}

const readMessage = async (messageId) =>
  fetchJson(`${mailpitBaseUrl}/api/v1/message/${encodeURIComponent(messageId)}`, {
    headers: {
      Authorization: mailpitAuthorization,
    },
  })

const createInvitation = async () =>
  fetchJson(`${apiBaseUrl}/v1/invitations`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-test-auth': JSON.stringify(ownerSession),
    },
    body: JSON.stringify({
      email: inviteeEmail,
      name: 'Sprint 23 Mailpit Proof',
      role: 'MANAGER',
      contextId: invitationContextId,
    }),
  })

const declineInvitation = async (token) =>
  fetchJson(`${apiBaseUrl}/v1/invitations/${encodeURIComponent(token)}/decline`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-test-auth': JSON.stringify({
        userId: `invitee-${proofId}`,
        email: inviteeEmail,
        roleId: `role-customer-${proofId}`,
        role: 'CUSTOMER',
        contextId: null,
        contextType: null,
        contextName: null,
      }),
    },
    body: JSON.stringify({
      reason: 'Sprint 23 Mailpit proof decline',
    }),
  })

const extractInvitationUrl = (message) => {
  const bodyText = [message.Text, message.HTML, message.Snippet]
    .filter((value) => typeof value === 'string')
    .join('\n')

  return bodyText.match(/https?:\/\/[^\s"'<>]+\/invitation\/[a-zA-Z0-9-]+/)?.[0] ?? null
}

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const main = async () => {
  const createdInvitation = await createInvitation()
  assert(createdInvitation.email === inviteeEmail, 'Invitation email mismatch')
  assert(createdInvitation.status === 'PENDING', 'Invitation was not created as PENDING')

  let matchingMessage = null
  for (let attempt = 0; attempt < 20; attempt += 1) {
    matchingMessage = await findMessageForInvitee()
    if (matchingMessage) {
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  assert(matchingMessage, `Mailpit did not capture an email for ${inviteeEmail}`)

  const fullMessage = await readMessage(matchingMessage.ID)
  const invitationUrl = extractInvitationUrl(fullMessage)
  assert(invitationUrl, 'Captured Mailpit message did not contain an /invitation/ URL')
  assert(!invitationUrl.includes('/invite/'), 'Captured URL used legacy /invite/ path')
  assert(!JSON.stringify(fullMessage).includes('/select-role'), 'Captured email mentioned /select-role')

  const token = invitationUrl.split('/invitation/')[1]
  const validation = await fetchJson(
    `${apiBaseUrl}/v1/invitations/${encodeURIComponent(token)}/validate`,
  )

  assert(validation.email === inviteeEmail, 'Validation email did not match invitee')
  assert(validation.role === 'MANAGER', 'Validation role did not match invitation role')
  assert(
    validation.contextId === invitationContextId,
    'Validation context did not match invitation context',
  )

  const declinedInvitation = await declineInvitation(token)
  assert(
    declinedInvitation.status === 'DECLINED',
    'Invitation decline did not return DECLINED status',
  )

  const evidence = {
    proofId,
    apiBaseUrl,
    mailpitBaseUrl,
    inviteeEmail,
    invitationId: createdInvitation.invitationId,
    invitationStatus: createdInvitation.status,
    mailpitMessageId: matchingMessage.ID,
    mailpitSubject: matchingMessage.Subject,
    invitationUrl,
    token,
    validation: {
      email: validation.email,
      role: validation.role,
      contextId: validation.contextId,
      expiresAt: validation.expiresAt,
      userExists: validation.userExists,
    },
    decline: {
      invitationId: declinedInvitation.invitationId,
      status: declinedInvitation.status,
      message: declinedInvitation.message,
    },
    checkedAt: new Date().toISOString(),
  }

  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify(evidence, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})