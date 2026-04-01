#!/usr/bin/env bash
set -euo pipefail

GRPC_CPP_PLUGIN_PATH="${GRPC_CPP_PLUGIN_PATH:-build/debug/vcpkg_installed/x64-linux/tools/grpc/grpc_cpp_plugin}"
PROTOC_PATH="${PROTOC_PATH:-build/debug/vcpkg_installed/x64-linux/tools/protobuf/protoc}"

mapfile -t PROTO_FILES < <(find protos -maxdepth 1 -name '*.proto' | sort)

"${PROTOC_PATH}" -I protos/ \
  --cpp_out Source/Grpc/ \
  --grpc_out Source/Grpc/ \
  --plugin=protoc-gen-grpc="${GRPC_CPP_PLUGIN_PATH}" \
  "${PROTO_FILES[@]}"
