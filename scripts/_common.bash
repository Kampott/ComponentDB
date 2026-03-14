#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

export_local_user_env() {
  if command -v id >/dev/null 2>&1; then
    export LOCAL_UID="${LOCAL_UID:-$(id -u)}"
    export LOCAL_GID="${LOCAL_GID:-$(id -g)}"
  fi
}

compose() {
  export_local_user_env
  (cd "${ROOT_DIR}" && docker compose "$@")
}

require_revision_message() {
  if [[ $# -lt 1 ]] || [[ -z "${1}" ]]; then
    echo "Ошибка: нужно передать сообщение ревизии." >&2
    echo "Пример: ./scripts/create_revision.bash \"add_user_index\"" >&2
    exit 1
  fi
}

start_databases() {
  local extra_args=("$@")
  compose up -d --wait "${extra_args[@]}" db log_db
}

run_db_init() {
  local extra_args=("$@")
  compose up --build --abort-on-container-exit --exit-code-from db-init "${extra_args[@]}" db-init
}

run_db_revision() {
  local revision_message="$1"
  local service_name="${2:-db-revision}"
  local args=(
    --profile
    manual
    run
    --rm
    -e
    "REVISION_MESSAGE=${revision_message}"
  )

  if [[ -n "${DATABASE_URL:-}" ]]; then
    args+=(-e "DATABASE_URL=${DATABASE_URL}")
  fi

  if [[ -n "${LOG_DATABASE_URL:-}" ]]; then
    args+=(-e "LOG_DATABASE_URL=${LOG_DATABASE_URL}")
  fi

  args+=("${service_name}")
  compose "${args[@]}"
}
