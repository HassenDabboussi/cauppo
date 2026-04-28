#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-${ROOT_DIR}/docker-compose.yml}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-${ROOT_DIR}/envs/.env.development}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

if [[ ! -f "$COMPOSE_ENV_FILE" ]]; then
  echo "Compose env file not found: $COMPOSE_ENV_FILE" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$COMPOSE_ENV_FILE"
set +a

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

require_command docker
require_command node

ZITADEL_BASE_URL="${ZITADEL_BASE_URL:-http://auth.cauppo.localhost}"
SMTP_PROVIDER_DESCRIPTION="${SMTP_PROVIDER_DESCRIPTION:-cauppo-local-mailpit}"
SMTP_HOST="${SMTP_HOST:-mailpit:1025}"
SMTP_TLS="${SMTP_TLS:-false}"
SMTP_SENDER_ADDRESS="${SMTP_SENDER_ADDRESS:-${USER_SERVICE_RESEND_FROM_EMAIL:-noreply@cauppo.local}}"
SMTP_SENDER_NAME="${SMTP_SENDER_NAME:-Cauppo}"
SMTP_REPLY_TO_ADDRESS="${SMTP_REPLY_TO_ADDRESS:-${SMTP_SENDER_ADDRESS}}"
ZITADEL_ADMIN_LOGIN_NAME="${ZITADEL_ADMIN_LOGIN_NAME:-admin@cauppo.auth.cauppo.localhost}"
ZITADEL_ADMIN_PASSWORD="${ZITADEL_ADMIN_PASSWORD:-Admin1234!}"
ZITADEL_MANAGEMENT_CLIENT_ID="${ZITADEL_MANAGEMENT_CLIENT_ID:-${USER_SERVICE_ZITADEL_MANAGEMENT_CLIENT_ID:-}}"
ZITADEL_MANAGEMENT_CLIENT_SECRET="${ZITADEL_MANAGEMENT_CLIENT_SECRET:-${USER_SERVICE_ZITADEL_MANAGEMENT_CLIENT_SECRET:-}}"

if [[ "$SMTP_TLS" != "true" && "$SMTP_TLS" != "false" ]]; then
  echo "SMTP_TLS must be 'true' or 'false'. Received: $SMTP_TLS" >&2
  exit 1
fi

ensure_running_service zitadel

if [[ -z "${ZITADEL_LOGIN_CLIENT_ACCESS_TOKEN:-}" && -z "${ZITADEL_LOGIN_CLIENT_ACCESS_TOKEN_FILE:-}" ]]; then
  env_provenance="${CAUPPO_ENV_PROVENANCE:-development}"
  host_pat_file="${ZITADEL_LOGIN_CLIENT_PAT_FILE:-${ROOT_DIR}/envs/.local/${env_provenance}/iam-login-client.${env_provenance}.pat}"

  if [[ -f "$host_pat_file" ]]; then
    ZITADEL_LOGIN_CLIENT_ACCESS_TOKEN_FILE="$host_pat_file"
  elif compose ps --status running --services | grep -qx 'zitadel-login'; then
    ensure_running_service zitadel-login
    ZITADEL_LOGIN_CLIENT_ACCESS_TOKEN="$(compose exec -T zitadel-login sh -lc "cat '/current-dir/login-client.${env_provenance}.pat'" | tr -d '\r\n')"
  else
    echo "Zitadel login-client PAT was not found at: $host_pat_file" >&2
    exit 1
  fi
fi

export ZITADEL_BASE_URL
export SMTP_PROVIDER_DESCRIPTION
export SMTP_HOST
export SMTP_TLS
export SMTP_SENDER_ADDRESS
export SMTP_SENDER_NAME
export SMTP_REPLY_TO_ADDRESS
export ZITADEL_ADMIN_LOGIN_NAME
export ZITADEL_ADMIN_PASSWORD
export ZITADEL_MANAGEMENT_CLIENT_ID
export ZITADEL_MANAGEMENT_CLIENT_SECRET
export ZITADEL_LOGIN_CLIENT_ACCESS_TOKEN
export ZITADEL_LOGIN_CLIENT_ACCESS_TOKEN_FILE

node "$ROOT_DIR/scripts/setup-mailpit-smtp.mjs"