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
  path.join(process.cwd(), 'tmp-sprint23-task4-mailpit-staff-invitation-proof.json')

const proofId = `sprint23-task4-${Date.now()}`
const restaurantId =
  process.env.CAUPPO_MANAGER_RESTAURANT_ID ??
  ownerBootstrapFixture.restaurantId ??
  '44444444-4444-4444-8444-444444444444'
const staffRole = process.env.CAUPPO_MANAGER_STAFF_ROLE ?? 'WAITER'

const cancelInviteeEmail =
  process.env.CAUPPO_MANAGER_STAFF_CANCEL_INVITEE_EMAIL ??
  'sprint23-staff-cancel@example.com'
const declineInviteeEmail =
  process.env.CAUPPO_MANAGER_STAFF_DECLINE_INVITEE_EMAIL ??
  'sprint23-staff-decline@example.com'
const resendInviteeEmail =
  process.env.CAUPPO_MANAGER_STAFF_RESEND_INVITEE_EMAIL ??
  'sprint23-staff-resend@example.com'

const managerSession = {
  userId: `manager-${proofId}`,
  email: `manager-${proofId}@example.com`,
  roleId: `role-manager-${proofId}`,
  role: 'MANAGER',
  contextId: restaurantId,
  contextType: 'RESTAURANT',
  contextName: 'Sprint 23 Staff Proof Restaurant',
}

const mailpitAuthorization = `Basic ${Buffer.from(
  `${mailpitUser}:${mailpitPassword}`,
).toString('base64')}`

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

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

const managerHeaders = () => ({
  'content-type': 'application/json',
  'x-test-auth': JSON.stringify(managerSession),
})

const inviteeHeaders = (email) => ({
  'content-type': 'application/json',
  'x-test-auth': JSON.stringify({
    userId: `invitee-${proofId}-${email.split('@')[0]}`,
    email,
    roleId: `role-customer-${proofId}`,
    role: 'CUSTOMER',
    contextId: null,
    contextType: null,
    contextName: null,
  }),
})

const createManagerStaffInvitation = async ({ email, name, role = staffRole }) =>
  fetchJson(`${apiBaseUrl}/v1/manager/staff`, {
    method: 'POST',
    headers: managerHeaders(),
    body: JSON.stringify({
      email,
      name,
      role,
    }),
  })

const createSharedManagerInvitation = async ({ email, name, role = staffRole }) =>
  fetchJson(`${apiBaseUrl}/v1/invitations`, {
    method: 'POST',
    headers: managerHeaders(),
    body: JSON.stringify({
      email,
      name,
      role,
      contextId: restaurantId,
    }),
  })

const listInvitations = async (query) =>
  fetchJson(`${apiBaseUrl}/v1/invitations${query}`, {
    headers: managerHeaders(),
  })

const cancelInvitation = async (invitationId) =>
  fetchJson(`${apiBaseUrl}/v1/invitations/${encodeURIComponent(invitationId)}`, {
    method: 'DELETE',
    headers: managerHeaders(),
  })

const validateInvitation = async (token) =>
  fetchJson(`${apiBaseUrl}/v1/invitations/${encodeURIComponent(token)}/validate`)

const declineInvitation = async (token, email) =>
  fetchJson(`${apiBaseUrl}/v1/invitations/${encodeURIComponent(token)}/decline`, {
    method: 'POST',
    headers: inviteeHeaders(email),
    body: JSON.stringify({
      reason: 'Sprint 23 staff Mailpit proof decline',
    }),
  })

const findMessageForInvitee = async (inviteeEmail) => {
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

const extractInvitationUrl = (message) => {
  const bodyText = [message.Text, message.HTML, message.Snippet]
    .filter((value) => typeof value === 'string')
    .join('\n')

  return bodyText.match(/https?:\/\/[^\s"'<>]+\/invitation\/[a-zA-Z0-9-]+/)?.[0] ?? null
}

const readCapturedInvitation = async (inviteeEmail) => {
  let matchingMessage = null
  for (let attempt = 0; attempt < 20; attempt += 1) {
    matchingMessage = await findMessageForInvitee(inviteeEmail)
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

  return {
    messageId: matchingMessage.ID,
    subject: matchingMessage.Subject,
    invitationUrl,
    token: invitationUrl.split('/invitation/')[1],
  }
}

const main = async () => {
  const cancelCreated = await createManagerStaffInvitation({
    email: cancelInviteeEmail,
    name: 'Sprint 23 Cancel Staff Proof',
  })
  assert(cancelCreated.email === cancelInviteeEmail, 'Cancel invitation email mismatch')
  assert(cancelCreated.role === staffRole, 'Cancel invitation role mismatch')

  const cancelCapture = await readCapturedInvitation(cancelInviteeEmail)
  const cancelValidationBefore = await validateInvitation(cancelCapture.token)
  assert(cancelValidationBefore.isValid === true, 'Cancel invitation was not initially valid')
  assert(cancelValidationBefore.email === cancelInviteeEmail, 'Cancel validation email mismatch')
  assert(cancelValidationBefore.role === staffRole, 'Cancel validation role mismatch')
  assert(cancelValidationBefore.contextId === restaurantId, 'Cancel validation context mismatch')

  const cancelledInvitation = await cancelInvitation(cancelCreated.invitationId)
  assert(cancelledInvitation.status === 'CANCELLED', 'Cancel did not return CANCELLED')
  const cancelValidationAfter = await validateInvitation(cancelCapture.token)
  assert(cancelValidationAfter.isValid === false, 'Cancelled token still validates as usable')
  assert(cancelValidationAfter.status === 'CANCELLED', 'Cancelled token status mismatch')

  const declineCreated = await createManagerStaffInvitation({
    email: declineInviteeEmail,
    name: 'Sprint 23 Decline Staff Proof',
  })
  assert(declineCreated.email === declineInviteeEmail, 'Decline invitation email mismatch')

  const declineCapture = await readCapturedInvitation(declineInviteeEmail)
  const declineValidationBefore = await validateInvitation(declineCapture.token)
  assert(declineValidationBefore.isValid === true, 'Decline invitation was not initially valid')
  assert(declineValidationBefore.email === declineInviteeEmail, 'Decline validation email mismatch')

  const declinedInvitation = await declineInvitation(
    declineCapture.token,
    declineInviteeEmail,
  )
  assert(declinedInvitation.status === 'DECLINED', 'Decline did not return DECLINED')
  const declineValidationAfter = await validateInvitation(declineCapture.token)
  assert(declineValidationAfter.isValid === false, 'Declined token still validates as usable')
  assert(declineValidationAfter.status === 'DECLINED', 'Declined token status mismatch')

  const firstResend = await createSharedManagerInvitation({
    email: resendInviteeEmail,
    name: 'Sprint 23 Resend Staff Proof',
  })
  const secondResend = await createSharedManagerInvitation({
    email: resendInviteeEmail,
    name: 'Sprint 23 Resend Staff Proof',
  })
  assert(secondResend.invitationId !== firstResend.invitationId, 'Resend did not create a fresh invitation')
  assert(
    Date.parse(secondResend.expiresAt) >= Date.parse(firstResend.expiresAt),
    'Resend did not refresh expiresAt',
  )

  const pendingList = await listInvitations('?status=PENDING&page=1&limit=100')
  const pendingMatches = pendingList.invitations.filter(
    (invitation) =>
      invitation.email === resendInviteeEmail &&
      invitation.contextId === restaurantId &&
      invitation.role === staffRole,
  )
  assert(pendingMatches.length === 1, 'Resend left more than one pending invitation')
  assert(
    pendingMatches[0]?.invitationId === secondResend.invitationId,
    'Resend pending row did not match the fresh invitation',
  )

  const cancelledList = await listInvitations('?status=CANCELLED&page=1&limit=100')
  assert(
    cancelledList.invitations.some(
      (invitation) => invitation.invitationId === firstResend.invitationId,
    ),
    'Resend did not preserve the cancelled historical invitation row',
  )

  const evidence = {
    proofId,
    apiBaseUrl,
    mailpitBaseUrl,
    restaurantId,
    staffRole,
    cancel: {
      inviteeEmail: cancelInviteeEmail,
      invitationId: cancelCreated.invitationId,
      mailpitMessageId: cancelCapture.messageId,
      mailpitSubject: cancelCapture.subject,
      invitationUrl: cancelCapture.invitationUrl,
      validationBefore: {
        isValid: cancelValidationBefore.isValid,
        status: cancelValidationBefore.status,
        role: cancelValidationBefore.role,
        contextId: cancelValidationBefore.contextId,
      },
      cancellation: cancelledInvitation,
      validationAfter: {
        isValid: cancelValidationAfter.isValid,
        status: cancelValidationAfter.status,
        recoveryAction: cancelValidationAfter.recoveryAction,
      },
    },
    decline: {
      inviteeEmail: declineInviteeEmail,
      invitationId: declineCreated.invitationId,
      mailpitMessageId: declineCapture.messageId,
      mailpitSubject: declineCapture.subject,
      invitationUrl: declineCapture.invitationUrl,
      validationBefore: {
        isValid: declineValidationBefore.isValid,
        status: declineValidationBefore.status,
        role: declineValidationBefore.role,
        contextId: declineValidationBefore.contextId,
      },
      decline: declinedInvitation,
      validationAfter: {
        isValid: declineValidationAfter.isValid,
        status: declineValidationAfter.status,
        recoveryAction: declineValidationAfter.recoveryAction,
      },
    },
    resend: {
      inviteeEmail: resendInviteeEmail,
      firstInvitationId: firstResend.invitationId,
      secondInvitationId: secondResend.invitationId,
      firstExpiresAt: firstResend.expiresAt,
      secondExpiresAt: secondResend.expiresAt,
      pendingCount: pendingMatches.length,
      cancelledHistoryPreserved: true,
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