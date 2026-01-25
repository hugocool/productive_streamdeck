#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT_FILE="${ROOT_DIR}/.streamdeck-port"

PORT="${PORT:-}"
if [ -z "${PORT}" ] && [ -f "${PORT_FILE}" ]; then
  PORT="$(cat "${PORT_FILE}")"
fi

PORT="${PORT:-3000}"

cd "${ROOT_DIR}"
export PORT
exec npm run dev:base
