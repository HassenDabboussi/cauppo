import { execFileSync } from 'node:child_process'
import { Buffer } from 'node:buffer'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDirectory, '..')

const envFilePath = resolve(repoRoot, 'envs/.env.test')
const managerMailpitProofPath = resolve(
  repoRoot,
  'tmp-sprint23-task1-mailpit-invitation-proof.json',
)
const staffMailpitProofPath = resolve(
  repoRoot,
  'tmp-sprint23-task4-mailpit-staff-invitation-proof.json',
)

const env = parseEnv(readFileSync(envFilePath, 'utf8'))
const requiredProfile = 'sprint23-manager-proof'
const apiBaseUrl = process.env.CAUPPO_API_BASE_URL ?? 'http://api.cauppo.localhost'
const appBaseUrl = process.env.CAUPPO_APP_BASE_URL ?? 'http://app.cauppo.localhost'
const mailpitBaseUrl =
  process.env.CAUPPO_MAILPIT_BASE_URL ??
  `http://127.0.0.1:${env.CAUPPO_HOST_PORT_MAILPIT_WEB ?? '8025'}`
const mailpitUser = process.env.CAUPPO_MAILPIT_USER ?? 'mailpit'
const mailpitPassword = process.env.CAUPPO_MAILPIT_PASSWORD ?? 'cauppo-mailpit'

const blockers = []
const probeResults = []

const dependencyCoverage = {
  mailpit: ['mailpit'],
  invitationHandling: ['traefik', 'user-service'],
  analytics: ['analytics-service'],
  menu: ['menu-service'],
  tables: ['menu-service'],
  settingsServiceMode: ['user-service', 'order-service'],
  promotions: ['menu-service'],
  feedback: ['feedback-service'],
  realtime: ['notification-service', 'analytics-service', 'redis', 'rabbitmq'],
}

const requiredComposeServices = [
  { service: 'traefik', dependency: 'Traefik ingress for real HTTP probes' },
  { service: 'frontend', dependency: 'manager proof frontend entry' },
  { service: 'user-service', dependency: 'invitation handling and settings read/write authority' },
  { service: 'menu-service', dependency: 'menu, tables, and promotions surfaces' },
  { service: 'order-service', dependency: 'service-mode propagation consumers' },
  { service: 'analytics-service', dependency: 'analytics and manager realtime lane' },
  { service: 'feedback-service', dependency: 'manager feedback lane' },
  { service: 'notification-service', dependency: 'notification websocket gateway' },
  { service: 'mailpit', dependency: 'Mailpit capture lane' },
  { service: 'redis', dependency: 'realtime session and websocket dependency' },
  { service: 'rabbitmq', dependency: 'cross-service event and realtime dependency' },
]

const httpHealthSurfaces = [
  {
    label: 'user-service health',
    dependency: 'invitation handling and settings authority',
    url: `http://127.0.0.1:${env.CAUPPO_HOST_PORT_USER_SERVICE ?? '3001'}/health`,
    service: 'user-service',
  },
  {
    label: 'menu-service health',
    dependency: 'menu, tables, and promotions authority',
    url: `http://127.0.0.1:${env.CAUPPO_HOST_PORT_MENU_SERVICE ?? '8081'}/health`,
    service: 'menu-service',
  },
  {
    label: 'order-service health',
    dependency: 'service-mode propagation consumer',
    url: `http://127.0.0.1:${env.CAUPPO_HOST_PORT_ORDER_SERVICE ?? '8082'}/health`,
    service: 'order-service',
  },
  {
    label: 'analytics-service health',
    dependency: 'analytics and manager realtime authority',
    url: `http://127.0.0.1:${env.CAUPPO_HOST_PORT_ANALYTICS_SERVICE ?? '8083'}/health`,
    service: 'analytics-service',
  },
  {
    label: 'feedback-service health',
    dependency: 'manager feedback authority',
    url: `http://127.0.0.1:${env.CAUPPO_HOST_PORT_FEEDBACK_SERVICE ?? '3002'}/health`,
    service: 'feedback-service',
  },
  {
    label: 'notification-service health',
    dependency: 'notification websocket gateway',
    url: `http://127.0.0.1:${env.CAUPPO_HOST_PORT_NOTIFICATION_SERVICE ?? '8084'}/health`,
    service: 'notification-service',
  },
]

function parseEnv(fileContent) {
  return Object.fromEntries(
    fileContent
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separatorIndex = line.indexOf('=')
        if (separatorIndex === -1) {
          return [line, '']
        }

        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)]
      }),
  )
}

function readJson(filePath, label) {
  if (!existsSync(filePath)) {
    blockers.push({
      code: 'MISSING_REQUIRED_PROOF_ARTIFACT',
      message: `${label} is missing, so Sprint 23 Task 14.4 cannot probe the approved invitation lane against the compose-backed stack.`,
      filePath,
    })
    return null
  }

  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function parseComposePsOutput(output) {
  const trimmed = output.trim()

  if (!trimmed) {
    return []
  }

  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return trimmed
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  }
}

function getComposeRows() {
  try {
    const output = execFileSync(
      'docker',
      [
        'compose',
        '--env-file',
        envFilePath,
        '--profile',
        requiredProfile,
        'ps',
        '--format',
        'json',
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    return parseComposePsOutput(output)
  } catch (error) {
    blockers.push({
      code: 'COMPOSE_STATE_QUERY_FAILED',
      message:
        'The Sprint 23 manager-proof smoke could not read compose-backed runtime state from the approved isolated-test profile.',
      command: `docker compose --env-file ${toRepoRelativePath(envFilePath)} --profile ${requiredProfile} ps --format json`,
      stderr: error.stderr?.toString().trim() || null,
    })
    return []
  }
}

function toServiceName(row) {
  return row.Service ?? row.service ?? row.Name ?? row.name ?? null
}

function toServiceState(row) {
  return `${row.State ?? row.state ?? row.Status ?? row.status ?? ''}`.toLowerCase()
}

function toServiceHealth(row) {
  const health = row.Health ?? row.health ?? ''
  return `${health}`.toLowerCase()
}

function toRepoRelativePath(filePath) {
  return filePath.slice(repoRoot.length + 1).replaceAll('\\', '/')
}

function registerComposeBlockers(composeRows) {
  const serviceRows = new Map(
    composeRows
      .map((row) => [toServiceName(row), row])
      .filter(([serviceName]) => Boolean(serviceName)),
  )

  const composeResults = requiredComposeServices.map((entry) => {
    const row = serviceRows.get(entry.service)
    const state = row ? toServiceState(row) : 'missing'
    const health = row ? toServiceHealth(row) : 'unknown'

    if (!row) {
      blockers.push({
        code: 'COMPOSE_SERVICE_NOT_PRESENT',
        message:
          'The approved Sprint 23 manager-proof compose profile is not currently running a required readiness dependency.',
        service: entry.service,
        dependency: entry.dependency,
      })
    } else if (!state.includes('running')) {
      blockers.push({
        code: 'COMPOSE_SERVICE_NOT_RUNNING',
        message:
          'A required Sprint 23 manager-proof dependency is not in a running state, so real-stack readiness is not yet proven.',
        service: entry.service,
        dependency: entry.dependency,
        state,
        health,
      })
    } else if (health && health !== 'healthy') {
      blockers.push({
        code: 'COMPOSE_SERVICE_NOT_HEALTHY',
        message:
          'A required Sprint 23 manager-proof dependency is running without a healthy status, so the stack is not yet ready for proof.',
        service: entry.service,
        dependency: entry.dependency,
        state,
        health,
      })
    }

    return {
      service: entry.service,
      dependency: entry.dependency,
      state,
      health,
    }
  })

  return {
    serviceRows,
    composeResults,
  }
}

async function probeHttpSurface({
  label,
  dependency,
  url,
  expectedStatuses,
  headers,
  verify,
}) {
  try {
    const response = await fetch(url, {
      headers,
      redirect: 'manual',
    })
    const text = await response.text()

    const result = {
      label,
      dependency,
      url,
      status: response.status,
      ok: expectedStatuses.includes(response.status),
    }

    probeResults.push(result)

    if (!result.ok) {
      blockers.push({
        code: 'HTTP_SURFACE_NOT_READY',
        message:
          'A required Sprint 23 manager-proof HTTP surface did not respond with the readiness status expected for the approved real stack.',
        label,
        dependency,
        url,
        expectedStatuses,
        actualStatus: response.status,
        responseBody: text.slice(0, 400),
      })
      return
    }

    if (verify) {
      let body = null
      if (text) {
        try {
          body = JSON.parse(text)
        } catch {
          body = text
        }
      }

      verify(body, response)
    }
  } catch (error) {
    probeResults.push({
      label,
      dependency,
      url,
      ok: false,
      error: error.message,
    })
    blockers.push({
      code: 'HTTP_SURFACE_UNREACHABLE',
      message:
        'A required Sprint 23 manager-proof HTTP surface could not be reached from the repo-root orchestration lane.',
      label,
      dependency,
      url,
      error: error.message,
    })
  }
}

function assert(condition, details) {
  if (!condition) {
    blockers.push(details)
  }
}

const managerMailpitProof = readJson(
  managerMailpitProofPath,
  'Task 1 manager Mailpit proof record',
)
const staffMailpitProof = readJson(
  staffMailpitProofPath,
  'Task 4 staff Mailpit proof record',
)

const composeRows = getComposeRows()
const { serviceRows, composeResults } = registerComposeBlockers(composeRows)

const isServiceRunning = (serviceName) => {
  const row = serviceRows.get(serviceName)

  if (!row) {
    return false
  }

  return toServiceState(row).includes('running') && toServiceHealth(row) === 'healthy'
}

const managerInvitationToken = managerMailpitProof?.token ?? null
const managerInvitationContextId = managerMailpitProof?.validation?.contextId ?? null
const staffInvitationContextId =
  staffMailpitProof?.cancel?.validationBefore?.contextId ??
  staffMailpitProof?.restaurantId ??
  null

assert(Boolean(managerInvitationToken), {
  code: 'MISSING_MANAGER_INVITATION_TOKEN',
  message:
    'The existing Sprint 23 owner-to-manager Mailpit proof does not expose a token for real-stack invitation validation.',
  source: toRepoRelativePath(managerMailpitProofPath),
})

if (managerInvitationContextId && staffInvitationContextId) {
  assert(managerInvitationContextId === staffInvitationContextId, {
    code: 'INVITATION_CONTEXT_ALIGNMENT_DRIFT',
    message:
      'The manager and staff Mailpit proof records do not agree on the manager restaurant context, so Task 14.4 readiness cannot rely on a single approved proof record.',
    managerInvitationContextId,
    staffInvitationContextId,
  })
}

if (isServiceRunning('traefik') && isServiceRunning('frontend')) {
  await probeHttpSurface({
    label: 'frontend health through Traefik host',
    dependency: 'manager proof web entry',
    url: `${appBaseUrl}/health`,
    expectedStatuses: [200],
  })
}

if (isServiceRunning('mailpit')) {
  await probeHttpSurface({
    label: 'Mailpit API capture lane',
    dependency: 'Mailpit capture readiness',
    url: `${mailpitBaseUrl}/api/v1/messages`,
    expectedStatuses: [200],
    headers: {
      Authorization: `Basic ${Buffer.from(`${mailpitUser}:${mailpitPassword}`).toString('base64')}`,
    },
    verify: (body) => {
      assert(Array.isArray(body?.messages), {
        code: 'MAILPIT_RESPONSE_SHAPE_MISMATCH',
        message:
          'Mailpit responded, but the Sprint 23 readiness smoke did not receive the expected messages array from the capture API.',
        label: 'Mailpit API capture lane',
      })
    },
  })
}

if (isServiceRunning('traefik') && isServiceRunning('user-service') && managerInvitationToken) {
  await probeHttpSurface({
    label: 'owner-to-manager invitation validation through Traefik',
    dependency: 'real invitation validation lane',
    url: `${apiBaseUrl}/v1/invitations/${encodeURIComponent(managerInvitationToken)}/validate`,
    expectedStatuses: [200],
    verify: (body) => {
      assert(body?.role === 'MANAGER', {
        code: 'INVITATION_VALIDATE_ROLE_MISMATCH',
        message:
          'The invitation validation response did not preserve the expected MANAGER role for the approved Sprint 23 proof record.',
        actualRole: body?.role ?? null,
      })
      assert(body?.contextId === managerInvitationContextId, {
        code: 'INVITATION_VALIDATE_CONTEXT_MISMATCH',
        message:
          'The invitation validation response did not preserve the canonical manager restaurant context needed for Sprint 23 proof readiness.',
        expectedContextId: managerInvitationContextId,
        actualContextId: body?.contextId ?? null,
      })
    },
  })
}

for (const surface of httpHealthSurfaces) {
  if (!isServiceRunning(surface.service)) {
    continue
  }

  await probeHttpSurface({
    label: surface.label,
    dependency: surface.dependency,
    url: surface.url,
    expectedStatuses: [200],
  })
}

const result = {
  check: 'Sprint 23 Task 14.4 compose-backed manager proof readiness smoke',
  requiredProfile,
  dependencyCoverage,
  composeResults,
  probeResults,
  blockerCount: blockers.length,
  blockers,
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)

if (blockers.length > 0) {
  process.exit(1)
}