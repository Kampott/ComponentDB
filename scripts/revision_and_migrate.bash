#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.bash"

require_revision_message "${@:-}"
REVISION_MESSAGE="$1"
shift
EXTRA_ARGS=("$@")

start_databases "${EXTRA_ARGS[@]}"
run_db_revision "${REVISION_MESSAGE}"
run_db_revision "${REVISION_MESSAGE}" "db-revision-logs"
run_db_init "${EXTRA_ARGS[@]}"
