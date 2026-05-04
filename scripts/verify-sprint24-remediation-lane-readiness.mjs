import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDirectory, '..')
const envFilePath = resolve(repoRoot, 'envs', '.env.test')
const evidenceFilePath = resolve(repoRoot, 'tmp-sprint24-remediation-lane-readiness.json')
const mailpitBaseUrl = process.env.CAUPPO_MAILPIT_BASE_URL ?? 'http://127.0.0.1:8025'
const mailpitUser = process.env.CAUPPO_MAILPIT_USER ?? 'mailpit'
const mailpitPassword = process.env.CAUPPO_MAILPIT_PASSWORD ?? 'cauppo-mailpit'

function parseDotEnv(filePath) {
  const entries = {}
  const content = execFileSync(process.platform === 'win32' ? 'cmd.exe' : 'cat', process.platform === 'win32' ? ['/d', '/s', '/c', 'type', filePath] : [filePath], { encoding: 'utf8' })

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line.length === 0 || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    entries[line.slice(0, separatorIndex).trim()] = line.slice(separatorIndex + 1).trim()
  }

  return entries
}

function runDocker(args) {
  return execFileSync('docker', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

function readComposeExec(service, script) {
  return runDocker(['compose', '--env-file', 'envs/.env.test', 'exec', '-T', service, 'sh', '-lc', script])
}

function readComposeHttpWithAuth(service, url, authorization) {
  return readComposeExec(
    service,
    `wget --header='Authorization: ${authorization}' -qO- '${url}'`,
  )
}

function readJsonFromServiceHealth(service) {
  const raw = readComposeExec(service, 'wget -qO- "http://127.0.0.1:${PORT}/health"')
  return JSON.parse(raw)
}

const env = parseDotEnv(envFilePath)
const blockers = []

if (env.CAUPPO_ENV !== 'test' || env.CAUPPO_ENV_PROVENANCE !== 'isolated-test') {
  blockers.push({
    code: 'ISOLATED_TEST_ENV_NOT_APPROVED',
    message: 'envs/.env.test must remain the approved isolated-test lane for Task 6.',
  })
}

let composePs = []
try {
  const composePsRaw = runDocker(['compose', '--env-file', 'envs/.env.test', 'ps', '--format', 'json'])
  composePs = composePsRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line))
} catch (error) {
  blockers.push({
    code: 'COMPOSE_PS_FAILED',
    message: error instanceof Error ? error.message : String(error),
  })
}

const requiredServices = ['frontend', 'user-service', 'order-service', 'menu-service', 'notification-service', 'mailpit']
const composeStates = Object.fromEntries(composePs.map((service) => [service.Service, service]))

for (const service of requiredServices) {
  const state = composeStates[service]
  if (!state || state.State !== 'running') {
    blockers.push({
      code: 'REQUIRED_SERVICE_NOT_RUNNING',
      service,
      message: `${service} must be running on the isolated-test compose lane before certification readiness can be declared.`,
    })
  }
}

let notificationHealth = null
try {
  notificationHealth = readJsonFromServiceHealth('notification-service')
  if (notificationHealth.status === 'degraded') {
    blockers.push({
      code: 'NOTIFICATION_SERVICE_DEGRADED',
      message: 'notification-service health is degraded; Task 7 must not start from a degraded replay lane.',
      health: notificationHealth,
    })
  }
  if (notificationHealth.checks?.replaySafe !== 'ok') {
    blockers.push({
      code: 'NOTIFICATION_REPLAY_NOT_SAFE',
      message: 'notification-service replaySafe readiness is not ok.',
      replaySafe: notificationHealth.checks?.replaySafe ?? null,
    })
  }
  if (notificationHealth.checks?.rabbitmq !== 'ok') {
    blockers.push({
      code: 'NOTIFICATION_RABBITMQ_NOT_READY',
      message: 'notification-service RabbitMQ readiness is not ok.',
      rabbitmq: notificationHealth.checks?.rabbitmq ?? null,
    })
  }
} catch (error) {
  blockers.push({
    code: 'NOTIFICATION_HEALTH_CHECK_FAILED',
    message: error instanceof Error ? error.message : String(error),
  })
}

let orderHealth = null
let menuHealth = null
try {
  orderHealth = readJsonFromServiceHealth('order-service')
} catch (error) {
  blockers.push({
    code: 'ORDER_SERVICE_HEALTH_CHECK_FAILED',
    message: error instanceof Error ? error.message : String(error),
  })
}

try {
  menuHealth = readJsonFromServiceHealth('menu-service')
} catch (error) {
  blockers.push({
    code: 'MENU_SERVICE_HEALTH_CHECK_FAILED',
    message: error instanceof Error ? error.message : String(error),
  })
}

let mailpitReady = false
try {
  const mailpitAuthorization = `Basic ${Buffer.from(`${mailpitUser}:${mailpitPassword}`).toString('base64')}`
  const mailpitResponse = readComposeHttpWithAuth(
    'mailpit',
    `${mailpitBaseUrl}/api/v1/info`,
    mailpitAuthorization,
  )
  mailpitReady = JSON.parse(mailpitResponse) != null
} catch (error) {
  blockers.push({
    code: 'MAILPIT_NOT_READY',
    message: error instanceof Error ? error.message : String(error),
  })
}

const ownerBootstrapRecordPath = resolve(
  repoRoot,
  'user-service',
  'tests',
  'fixtures',
  'test-owner-bootstrap.json',
)

if (!existsSync(ownerBootstrapRecordPath)) {
  blockers.push({
    code: 'OWNER_BOOTSTRAP_RECORD_MISSING',
    message: 'The owner bootstrap record required by the approved Playwright harness is missing.',
  })
}

mkdirSync(dirname(evidenceFilePath), { recursive: true })

const result = {
  check: 'Sprint 24 remediation lane readiness',
  envFilePath,
  evidenceFilePath,
  requiredServices,
  composeStates,
  notificationHealth,
  orderHealth,
  menuHealth,
  mailpitReady,
  ownerBootstrapRecordPath,
  blockerCount: blockers.length,
  blockers,
}

writeFileSync(evidenceFilePath, `${JSON.stringify(result, null, 2)}\n`)
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)

if (blockers.length > 0) {
  process.exit(1)
}