#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.bash"

EXTRA_ARGS=("$@")
compose down "${EXTRA_ARGS[@]}"
