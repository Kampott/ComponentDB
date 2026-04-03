#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROTO_DIR="$ROOT_DIR/protos"
OUTPUT_DIR="$ROOT_DIR/backend/app/integrations/pg_backuper/generated"

"$ROOT_DIR/backend/.venv/bin/python" -m grpc_tools.protoc \
  -I "$PROTO_DIR" \
  --python_out="$OUTPUT_DIR" \
  --grpc_python_out="$OUTPUT_DIR" \
  "$PROTO_DIR/backup.proto" \
  "$PROTO_DIR/backup_active.proto" \
  "$PROTO_DIR/backup_common.proto" \
  "$PROTO_DIR/backup_database.proto" \
  "$PROTO_DIR/backup_history.proto" \
  "$PROTO_DIR/backup_schedule.proto" \
  "$PROTO_DIR/backup_template.proto"
