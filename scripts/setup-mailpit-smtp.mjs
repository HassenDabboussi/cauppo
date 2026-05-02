import { readFile } from 'node:fs/promises'

const requiredEnv = [
  'ZITADEL_BASE_URL',
  'SMTP_PROVIDER_DESCRIPTION',
  'SMTP_HOST',
  'SMTP_TLS',
  'SMTP_SENDER_ADDRESS',
  'SMTP_SENDER_NAME',
  'SMTP_REPLY_TO_ADDRESS',
]

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
}

const baseUrl = process.env.ZITADEL_BASE_URL
const providerDescription = process.env.SMTP_PROVIDER_DESCRIPTION
const smtpHost = process.env.SMTP_HOST
const smtpTls = process.env.SMTP_TLS === 'true'
const senderAddress = process.env.SMTP_SENDER_ADDRESS
const senderName = process.env.SMTP_SENDER_NAME
const replyToAddress = process.env.SMTP_REPLY_TO_ADDRESS
const managementClientId = process.env.ZITADEL_MANAGEMENT_CLIENT_ID
const managementClientSecret = process.env.ZITADEL_MANAGEMENT_CLIENT_SECRET
const managementAccessToken = process.env.ZITADEL_MANAGEMENT_ACCESS_TOKEN
const managementAccessTokenFile =
  process.env.ZITADEL_MANAGEMENT_ACCESS_TOKEN_FILE
const loginClientAccessToken = process.env.ZITADEL_LOGIN_CLIENT_ACCESS_TOKEN
const loginClientAccessTokenFile =
  process.env.ZITADEL_LOGIN_CLIENT_ACCESS_TOKEN_FILE
const adminLoginName = process.env.ZITADEL_ADMIN_LOGIN_NAME
const adminPassword = process.env.ZITADEL_ADMIN_PASSWORD
const requestHost = process.env.ZITADEL_REQUEST_HOST?.trim()
const requestProto = process.env.ZITADEL_REQUEST_PROTO?.trim()
const bootstrapRetryAttempts = 30
const bootstrapRetryDelayMs = 1000

if (
  !managementAccessToken &&
  !managementAccessTokenFile &&
  (!managementClientId || !managementClientSecret) &&
  !loginClientAccessToken &&
  !loginClientAccessTokenFile
) {
  throw new Error(
    'Missing Zitadel SMTP bootstrap auth. Set a management token, management client credentials, or a login-client token file for admin-session fallback.',
  )
}

const request = async (url, init = {}, expectedStatuses = [200]) => {
  const method = init.method ?? 'GET'

  for (let attempt = 1; attempt <= bootstrapRetryAttempts; attempt += 1) {
    try {
      const headers = new Headers(init.headers ?? {})

      if (requestHost) {
        headers.set('Host', requestHost)
      }

      if (requestProto) {
        headers.set('X-Forwarded-Proto', requestProto)
      }

      const response = await fetch(url, {
        redirect: 'manual',
        ...init,
        headers,
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
        const message =
          typeof body === 'object' && body !== null && 'message' in body
            ? String(body.message)
            : rawBody || 'no response body'

        const shouldRetry =
          attempt < bootstrapRetryAttempts &&
          (response.status === 404 || response.status === 502 || response.status === 503)

        if (shouldRetry) {
          console.warn(
            `Zitadel not ready for ${method} ${url} yet (HTTP ${response.status}). Retrying ${attempt}/${bootstrapRetryAttempts}...`,
          )
          await new Promise((resolve) => setTimeout(resolve, bootstrapRetryDelayMs))
          continue
        }

        throw new Error(
          `Zitadel request failed: ${method} ${url} (HTTP ${response.status}) - ${message}`,
        )
      }

      return {
        response,
        body,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const shouldRetry =
        attempt < bootstrapRetryAttempts &&
        /fetch failed|ECONNREFUSED|ENOTFOUND|EAI_AGAIN/i.test(message)

      if (shouldRetry) {
        console.warn(
          `Zitadel request transport failed for ${method} ${url}. Retrying ${attempt}/${bootstrapRetryAttempts}...`,
        )
        await new Promise((resolve) => setTimeout(resolve, bootstrapRetryDelayMs))
        continue
      }

      throw error
    }
  }

  throw new Error(`Zitadel request retry budget exhausted for ${method} ${url}`)
}

const createManagementAccessToken = async () => {
  const credentials = Buffer.from(
    `${managementClientId}:${managementClientSecret}`,
  ).toString('base64')

  const { body: tokenBody } = await request(
    `${baseUrl}/oauth/v2/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'urn:zitadel:iam:org:project:id:zitadel:aud',
      }).toString(),
    },
    [200],
  )

  const accessToken = tokenBody?.access_token

  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error('Zitadel token exchange did not return an access token')
  }

  return accessToken
}

const resolveManagementAccessToken = async () => {
  if (
    typeof managementAccessToken === 'string' &&
    managementAccessToken.trim().length > 0
  ) {
    return managementAccessToken.trim()
  }

  if (
    typeof managementAccessTokenFile === 'string' &&
    managementAccessTokenFile.trim().length > 0
  ) {
    const fileToken = await readFile(managementAccessTokenFile.trim(), 'utf8')
    const trimmedToken = fileToken.trim()

    if (trimmedToken.length === 0) {
      throw new Error(
        `Zitadel management access token file is empty: ${managementAccessTokenFile}`,
      )
    }

    return trimmedToken
  }

  return createManagementAccessToken()
}

const resolveLoginClientAccessToken = async () => {
  if (
    typeof loginClientAccessToken === 'string' &&
    loginClientAccessToken.trim().length > 0
  ) {
    return loginClientAccessToken.trim()
  }

  if (
    typeof loginClientAccessTokenFile === 'string' &&
    loginClientAccessTokenFile.trim().length > 0
  ) {
    const fileToken = await readFile(loginClientAccessTokenFile.trim(), 'utf8')
    const trimmedToken = fileToken.trim()

    if (trimmedToken.length === 0) {
      throw new Error(
        `Zitadel login-client access token file is empty: ${loginClientAccessTokenFile}`,
      )
    }

    return trimmedToken
  }

  throw new Error(
    'Zitadel login-client access token fallback is unavailable. Set ZITADEL_LOGIN_CLIENT_ACCESS_TOKEN or ZITADEL_LOGIN_CLIENT_ACCESS_TOKEN_FILE.',
  )
}

const resolveAdminSessionAccessToken = async () => {
  if (
    typeof adminLoginName !== 'string' ||
    adminLoginName.trim().length === 0 ||
    typeof adminPassword !== 'string' ||
    adminPassword.length === 0
  ) {
    throw new Error(
      'Zitadel admin-session fallback requires ZITADEL_ADMIN_LOGIN_NAME and ZITADEL_ADMIN_PASSWORD.',
    )
  }

  const loginClientToken = await resolveLoginClientAccessToken()
  const commonHeaders = {
    Authorization: `Bearer ${loginClientToken}`,
    'Content-Type': 'application/json',
  }

  const { body: sessionBody } = await request(
    `${baseUrl}/v2/sessions`,
    {
      method: 'POST',
      headers: commonHeaders,
      body: JSON.stringify({
        checks: {
          user: {
            loginName: adminLoginName.trim(),
          },
        },
      }),
    },
    [200, 201],
  )

  const sessionId = sessionBody?.sessionId
  const initialSessionToken = sessionBody?.sessionToken

  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new Error('Zitadel admin-session fallback did not return a session id')
  }

  if (
    typeof initialSessionToken !== 'string' ||
    initialSessionToken.length === 0
  ) {
    throw new Error(
      'Zitadel admin-session fallback did not return an initial session token',
    )
  }

  const { body: passwordBody } = await request(
    `${baseUrl}/v2/sessions/${sessionId}`,
    {
      method: 'PATCH',
      headers: commonHeaders,
      body: JSON.stringify({
        checks: {
          password: {
            password: adminPassword,
          },
        },
      }),
    },
    [200],
  )

  const authenticatedSessionToken = passwordBody?.sessionToken

  if (
    typeof authenticatedSessionToken !== 'string' ||
    authenticatedSessionToken.length === 0
  ) {
    throw new Error(
      'Zitadel admin-session fallback did not return an authenticated session token',
    )
  }

  console.log('Using admin-session fallback for Mailpit SMTP bootstrap.')

  return authenticatedSessionToken
}

const canUseAdminSessionFallback = () => {
  const hasLoginToken =
    (typeof loginClientAccessToken === 'string' &&
      loginClientAccessToken.trim().length > 0) ||
    (typeof loginClientAccessTokenFile === 'string' &&
      loginClientAccessTokenFile.trim().length > 0)

  return (
    hasLoginToken &&
    typeof adminLoginName === 'string' &&
    adminLoginName.trim().length > 0 &&
    typeof adminPassword === 'string' &&
    adminPassword.length > 0
  )
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
  let adminAccessToken = await resolveManagementAccessToken().catch(
    async (error) => {
      if (!canUseAdminSessionFallback()) {
        throw error
      }

      console.log(
        `Management credential bootstrap failed; falling back to admin session. ${error instanceof Error ? error.message : String(error)}`,
      )

      return resolveAdminSessionAccessToken()
    },
  )
  const payload = {
    senderAddress,
    senderName,
    replyToAddress,
    description: providerDescription,
    host: smtpHost,
    tls: smtpTls,
    none: {},
  }

  let providersBefore

  try {
    providersBefore = await listEmailProviders(adminAccessToken)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (!canUseAdminSessionFallback() || !message.includes('HTTP 403')) {
      throw error
    }

    adminAccessToken = await resolveAdminSessionAccessToken()
    providersBefore = await listEmailProviders(adminAccessToken)
  }
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
      throw new Error(
        'Zitadel did not return a provider id after creating the SMTP provider',
      )
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

  if (
    !activeProvider ||
    typeof activeProvider.state !== 'string' ||
    !activeProvider.state.includes('ACTIVE')
  ) {
    throw new Error(
      `SMTP provider activation could not be verified. Current state: ${activeProvider?.state ?? 'unknown'}`,
    )
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