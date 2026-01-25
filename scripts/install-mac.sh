#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="Productive Stream Deck"
BUILD_DIR="${ROOT_DIR}/build"
APP_DIR="${BUILD_DIR}/${APP_NAME}.app"
APP_CONTENTS="${APP_DIR}/Contents"
APP_MACOS="${APP_CONTENTS}/MacOS"
APP_RESOURCES="${APP_CONTENTS}/Resources"
APP_PAYLOAD="${APP_RESOURCES}/app"
APP_SUPPORT="${HOME}/Library/Application Support/ProductiveStreamDeck"
PORT_FILE="${APP_SUPPORT}/port.txt"
PORT_BASE="${PORT_BASE:-3000}"
PORT_MAX_ATTEMPTS="${PORT_MAX_ATTEMPTS:-20}"

find_available_port() {
  local port="$1"
  local attempts="$2"
  local idx=0

  while [ "$idx" -lt "$attempts" ]; do
    if ! lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "${port}"
      return 0
    fi
    port=$((port + 1))
    idx=$((idx + 1))
  done

  return 1
}

echo "== Productive Stream Deck installer =="
echo "Root: ${ROOT_DIR}"

cd "${ROOT_DIR}"
echo "Installing dependencies..."
npm install

echo "Building native helper..."
npm run native:build

echo "Building TypeScript..."
npm run build

echo "Selecting an available port..."
PORT="$(find_available_port "${PORT_BASE}" "${PORT_MAX_ATTEMPTS}")"
if [ -z "${PORT}" ]; then
  echo "Failed to find a free port starting at ${PORT_BASE}." >&2
  exit 1
fi

mkdir -p "${APP_SUPPORT}"
echo "${PORT}" > "${PORT_FILE}"

mkdir -p "${BUILD_DIR}"
sed "s/127.0.0.1:3000/127.0.0.1:${PORT}/" "${ROOT_DIR}/config/aerospace.toml" \
  > "${BUILD_DIR}/aerospace.toml"

echo "Creating app bundle..."
rm -rf "${APP_DIR}"
mkdir -p "${APP_MACOS}" "${APP_PAYLOAD}" "${APP_RESOURCES}"

cp -R "${ROOT_DIR}/dist" "${APP_PAYLOAD}/"
cp -R "${ROOT_DIR}/node_modules" "${APP_PAYLOAD}/"
cp "${ROOT_DIR}/package.json" "${APP_PAYLOAD}/"

mkdir -p "${APP_PAYLOAD}/native/keysender/.build/release"
cp "${ROOT_DIR}/native/keysender/.build/release/keysender" \
  "${APP_PAYLOAD}/native/keysender/.build/release/keysender"

cat > "${APP_MACOS}/ProductiveStreamDeck" <<'APP_EOF'
#!/usr/bin/env bash
set -euo pipefail

PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH}"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_PAYLOAD="${APP_DIR}/Resources/app"
APP_SUPPORT="${HOME}/Library/Application Support/ProductiveStreamDeck"
PORT_FILE="${APP_SUPPORT}/port.txt"

NODE_BIN="${NODE_BIN:-}"
if [ -z "${NODE_BIN}" ]; then
  if command -v node >/dev/null 2>&1; then
    NODE_BIN="$(command -v node)"
  else
    for candidate in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
      if [ -x "${candidate}" ]; then
        NODE_BIN="${candidate}"
        break
      fi
    done
  fi
fi

if [ -z "${NODE_BIN}" ]; then
  echo "Node.js not found. Install Node.js and try again." >&2
  exit 1
fi

PORT="3000"
if [ -f "${PORT_FILE}" ]; then
  PORT="$(cat "${PORT_FILE}")"
fi

cd "${APP_PAYLOAD}"
export PORT
exec "${NODE_BIN}" "${APP_PAYLOAD}/dist/index.js"
APP_EOF

chmod +x "${APP_MACOS}/ProductiveStreamDeck"

cat > "${APP_CONTENTS}/Info.plist" <<'PLIST_EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>CFBundleExecutable</key>
    <string>ProductiveStreamDeck</string>
    <key>CFBundleIdentifier</key>
    <string>com.productive.streamdeck</string>
    <key>CFBundleName</key>
    <string>Productive Stream Deck</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
  </dict>
</plist>
PLIST_EOF

echo "App bundle created at: ${APP_DIR}"
echo "AeroSpace template written to: ${BUILD_DIR}/aerospace.toml"
echo "Port locked to: ${PORT}"
