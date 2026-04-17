#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-${ROOT_DIR}/docker-compose.yml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-${ROOT_DIR}/envs/.env.development}"
ZITADEL_BASE_URL="${ZITADEL_BASE_URL:-http://auth.cauppo.localhost}"
ZITADEL_LOGIN_CLIENT_PAT_FILE="${ZITADEL_LOGIN_CLIENT_PAT_FILE:-}"
SMTP_PROVIDER_DESCRIPTION="${SMTP_PROVIDER_DESCRIPTION:-cauppo-local-mailpit}"
SMTP_HOST="${SMTP_HOST:-mailpit:1025}"
SMTP_TLS="${SMTP_TLS:-false}"
SMTP_SENDER_ADDRESS="${SMTP_SENDER_ADDRESS:-noreply@cauppo.local}"
SMTP_SENDER_NAME="${SMTP_SENDER_NAME:-Cauppo}"
SMTP_REPLY_TO_ADDRESS="${SMTP_REPLY_TO_ADDRESS:-${SMTP_SENDER_ADDRESS}}"
ZITADEL_ADMIN_LOGIN_NAME="${ZITADEL_ADMIN_LOGIN_NAME:-admin@cauppo.auth.cauppo.localhost}"
ZITADEL_ADMIN_PASSWORD="${ZITADEL_ADMIN_PASSWORD:-Admin1234!}"
ZITADEL_PROJECT_ID="${ZITADEL_PROJECT_ID:-366835593776201736}"
ZITADEL_SHARED_PROJECT_AUDIENCE_SCOPE="${ZITADEL_SHARED_PROJECT_AUDIENCE_SCOPE:-urn:zitadel:iam:org:project:id:${ZITADEL_PROJECT_ID}:aud}"
ZITADEL_OIDC_CLIENT_ID="${ZITADEL_OIDC_CLIENT_ID:-366838122941579272}"
ZITADEL_OIDC_REDIRECT_URI="${ZITADEL_OIDC_REDIRECT_URI:-http://app.cauppo.localhost/auth/callback}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

compose() {
  docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

ensure_running_service() {
  local service="$1"

  if ! compose ps --status running --services | grep -qx "$service"; then
    echo "Required service is not running: $service" >&2
    exit 1
  fi
}

read_login_client_pat() {
  if compose ps --status running --services | grep -qx 'zitadel-login'; then
    compose exec -T zitadel-login sh -lc "cat '$ZITADEL_LOGIN_CLIENT_PAT_FILE'"
    return
  fi

  compose exec -T zitadel sh -lc "cat '$ZITADEL_LOGIN_CLIENT_PAT_FILE'"
}

require_command docker
require_command node

if [[ ! -f "$COMPOSE_ENV_FILE" ]]; then
  echo "Compose env file not found: $COMPOSE_ENV_FILE" >&2
  exit 1
fi

if [[ -z "$ZITADEL_LOGIN_CLIENT_PAT_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$COMPOSE_ENV_FILE"
  set +a
fi

ZITADEL_LOGIN_CLIENT_PAT_FILE="${ZITADEL_LOGIN_CLIENT_PAT_FILE:-/current-dir/login-client.development.pat}"

if [[ "$SMTP_TLS" != "true" && "$SMTP_TLS" != "false" ]]; then
  echo "SMTP_TLS must be 'true' or 'false'. Received: $SMTP_TLS" >&2
  exit 1
fi

ensure_running_service zitadel
ensure_running_service zitadel-login

LOGIN_CLIENT_PAT="$(read_login_client_pat | tr -d '\r\n')"

if [[ -z "$LOGIN_CLIENT_PAT" ]]; then
  echo "login-client PAT is empty" >&2
  exit 1
fi

export LOGIN_CLIENT_PAT
export ZITADEL_BASE_URL
export SMTP_PROVIDER_DESCRIPTION
export SMTP_HOST
export SMTP_TLS
export SMTP_SENDER_ADDRESS
export SMTP_SENDER_NAME
export SMTP_REPLY_TO_ADDRESS
export ZITADEL_ADMIN_LOGIN_NAME
export ZITADEL_ADMIN_PASSWORD
export ZITADEL_SHARED_PROJECT_AUDIENCE_SCOPE
export ZITADEL_OIDC_CLIENT_ID
export ZITADEL_OIDC_REDIRECT_URI

node <<'NODE'
const requiredEnv = [
  'LOGIN_CLIENT_PAT',
  'ZITADEL_BASE_URL',
  'SMTP_PROVIDER_DESCRIPTION',
  'SMTP_HOST',
  'SMTP_TLS',
  'SMTP_SENDER_ADDRESS',
  'SMTP_SENDER_NAME',
  'SMTP_REPLY_TO_ADDRESS',
  'ZITADEL_ADMIN_LOGIN_NAME',
  'ZITADEL_ADMIN_PASSWORD',
  'ZITADEL_SHARED_PROJECT_AUDIENCE_SCOPE',
  'ZITADEL_OIDC_CLIENT_ID',
  'ZITADEL_OIDC_REDIRECT_URI',
]

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
}

const loginClientPat = process.env.LOGIN_CLIENT_PAT
const baseUrl = process.env.ZITADEL_BASE_URL
const providerDescription = process.env.SMTP_PROVIDER_DESCRIPTION
const smtpHost = process.env.SMTP_HOST
const smtpTls = process.env.SMTP_TLS === 'true'
const senderAddress = process.env.SMTP_SENDER_ADDRESS
const senderName = process.env.SMTP_SENDER_NAME
const replyToAddress = process.env.SMTP_REPLY_TO_ADDRESS
const adminLoginName = process.env.ZITADEL_ADMIN_LOGIN_NAME
const adminPassword = process.env.ZITADEL_ADMIN_PASSWORD
const sharedProjectAudienceScope = process.env.ZITADEL_SHARED_PROJECT_AUDIENCE_SCOPE
const oidcClientId = process.env.ZITADEL_OIDC_CLIENT_ID
const oidcRedirectUri = process.env.ZITADEL_OIDC_REDIRECT_URI

const request = async (url, init = {}, expectedStatuses = [200]) => {
  const response = await fetch(url, {
    redirect: 'manual',
    ...init,
  })
  const rawBody = await response.text()
  let body = null

  if (rawBody.length > 0) {
    try {
      body = JSON.parse(rawBody)
    } catch {
      body = rawBody
    }
  }

  if (!expectedStatuses.includes(response.status)) {
    const message = typeof body === 'object' && body !== null && 'message' in body
      ? String(body.message)
      : rawBody || 'no response body'

    throw new Error(
      `Zitadel request failed: ${init.method ?? 'GET'} ${url} (HTTP ${response.status}) - ${message}`,
    )
  }

  return {
    response,
    body,
  }
}

const createAdminAccessToken = async () => {
  const { body: sessionBody } = await request(
    `${baseUrl}/v2/sessions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${loginClientPat}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checks: {
          user: {
            loginName: adminLoginName,
          },
          password: {
            password: adminPassword,
          },
        },
      }),
    },
    [200, 201],
  )

  const sessionId = sessionBody?.sessionId ?? sessionBody?.session?.id ?? sessionBody?.session?.sessionId
  const sessionToken = sessionBody?.sessionToken ?? sessionBody?.session?.sessionToken

  if (!sessionId || !sessionToken) {
    throw new Error('Zitadel session creation response did not include session credentials')
  }

  const authorizeUrl = new URL('/oauth/v2/authorize', baseUrl)
  authorizeUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: oidcClientId,
    redirect_uri: oidcRedirectUri,
    scope: `openid profile email offline_access ${sharedProjectAudienceScope}`,
    state: `mailpit-${Date.now()}`,
  }).toString()

  const authorizeResponse = await fetch(authorizeUrl, {
    method: 'GET',
    redirect: 'manual',
  })

  if (authorizeResponse.status < 300 || authorizeResponse.status >= 400) {
    throw new Error(`Zitadel authorize request failed: ${authorizeResponse.status}`)
  }

  const location = authorizeResponse.headers.get('location')

  if (!location) {
    throw new Error('Zitadel authorize response did not include a redirect location')
  }

  const authRequestId = new URL(location, baseUrl).searchParams.get('authRequest')

  if (!authRequestId) {
    throw new Error('Zitadel authorize redirect did not include an auth request id')
  }

  const { body: authRequestBody } = await request(
    `${baseUrl}/v2/oidc/auth_requests/${authRequestId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${loginClientPat}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          sessionId,
          sessionToken,
        },
      }),
    },
    [200],
  )

  const callbackUrl = authRequestBody?.callbackUrl

  if (typeof callbackUrl !== 'string' || callbackUrl.length === 0) {
    throw new Error('Zitadel auth request finalization response did not include a callback URL')
  }

  const code = new URL(callbackUrl).searchParams.get('code')

  if (!code) {
    throw new Error('Zitadel callback URL did not include an authorization code')
  }

  const formBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: oidcRedirectUri,
    client_id: oidcClientId,
  })

  const { body: tokenBody } = await request(
    `${baseUrl}/oauth/v2/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    },
    [200],
  )

  const accessToken = tokenBody?.access_token

  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error('Zitadel token exchange did not return an access token')
  }

  return accessToken
}

const listEmailProviders = async (accessToken) => {
  const { body } = await request(
    `${baseUrl}/admin/v1/email/_search`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    },
    [200],
  )

  return Array.isArray(body?.result) ? body.result : []
}

const configureMailpitProvider = async () => {
  const adminAccessToken = await createAdminAccessToken()
  const payload = {
    senderAddress,
    senderName,
    replyToAddress,
    description: providerDescription,
    host: smtpHost,
    tls: smtpTls,
    none: {},
  }

  const providersBefore = await listEmailProviders(adminAccessToken)
  const existingProvider = providersBefore.find(
    (provider) => provider && provider.description === providerDescription,
  )
  let providerId = existingProvider?.id

  if (!providerId) {
    const { body } = await request(
      `${baseUrl}/admin/v1/email/smtp`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      [200, 201],
    )

    providerId = body?.id

    if (typeof providerId !== 'string' || providerId.length === 0) {
      throw new Error('Zitadel did not return a provider id after creating the SMTP provider')
    }

    console.log(`Created Mailpit SMTP provider: ${providerId}`)
  } else {
    await request(
      `${baseUrl}/admin/v1/email/smtp/${providerId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      [200],
    )

    console.log(`Updated Mailpit SMTP provider: ${providerId}`)
  }

  try {
    await request(
      `${baseUrl}/admin/v1/email/${providerId}/_activate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      },
      [200],
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (!message.includes('Errors.SMTPConfig.AlreadyActive')) {
      throw error
    }
  }

  const providersAfter = await listEmailProviders(adminAccessToken)
  const activeProvider = providersAfter.find(
    (provider) => provider && provider.description === providerDescription,
  )

  if (!activeProvider || typeof activeProvider.state !== 'string' || !activeProvider.state.includes('ACTIVE')) {
    throw new Error(`SMTP provider activation could not be verified. Current state: ${activeProvider?.state ?? 'unknown'}`)
  }

  console.log('Mailpit SMTP provider is active.')
  console.log(`Provider ID: ${activeProvider.id}`)
  console.log(`Description: ${providerDescription}`)
  console.log(`Host: ${smtpHost}`)
  console.log(`TLS: ${String(smtpTls)}`)
  console.log(`Sender: ${senderName} <${senderAddress}>`)
}

configureMailpitProvider().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
NODE