#!/bin/sh
# No set -e — tunnel failure must fall back gracefully, not kill the container.

echo "==========================================="
echo "🔍 PRE-FLIGHT"
echo "==========================================="
echo "📂 Working dir : $(pwd)"
echo "👤 User        : $(whoami)"
echo "🌐 API_URL     : ${API_URL:-NOT SET ⚠️}"
echo "📡 NGROK       : ${NGROK_AUTHTOKEN:+configured}"
echo "🔑 EXPO_TOKEN  : ${EXPO_TOKEN:+configured}"

# ── 1. Write API_URL into .env ────────────────────────────────────────────────
if [ -n "$API_URL" ]; then
  printf "API_URL=%s\nEXPO_PUBLIC_API_URL=%s\n" "$API_URL" "$API_URL" > .env
  echo "✅ .env written: API_URL=$API_URL"
else
  echo "⚠️  API_URL not set — app will log an error but still start"
fi

# ── 2. Nuke ALL caches (stale Metro cache = silent bundle failures) ────────────
echo ""
echo "--- 🗑️  Clearing all caches ---"
rm -rf .expo
rm -rf /tmp/metro-*
rm -rf /tmp/haste-*
echo "✅ Caches cleared"

# ── 3. Install dependencies ───────────────────────────────────────────────────
echo ""
echo "==========================================="
echo "📦 Installing dependencies (Expo SDK 54)"
echo "==========================================="
if npm install --legacy-peer-deps; then
  echo "✅ npm install complete"
else
  echo ""
  echo "❌ npm install FAILED — check 'npm ERR!' lines above"
  echo "   Container kept alive for debugging: docker exec -it food-ordering-mobile sh"
  tail -f /dev/null
fi

# ── 4. Verify critical packages installed ────────────────────────────────────
echo ""
echo "--- Verifying critical packages ---"
MISSING=""

for PKG in expo expo-router react-native i18next react-i18next; do
  if [ ! -f "node_modules/${PKG}/package.json" ]; then
    echo "❌ MISSING: ${PKG}"
    MISSING="${MISSING} ${PKG}"
  else
    VER=$(node -e "console.log(require('./node_modules/${PKG}/package.json').version)" 2>/dev/null)
    echo "  ✅ ${PKG}@${VER}"
  fi
done

if [ -n "$MISSING" ]; then
  echo ""
  echo "❌ Critical packages missing:${MISSING}"
  echo "   This will cause 'Welcome to Expo' or a blank screen."
  echo "   Container kept alive: docker exec -it food-ordering-mobile sh"
  tail -f /dev/null
fi

# ── 5. Verify i18n config has no broken imports ───────────────────────────────
echo ""
echo "--- Checking i18n config ---"
if grep -q "intl-pluralrules" i18n/index.ts 2>/dev/null; then
  echo "⚠️  WARNING: i18n/index.ts imports 'intl-pluralrules' but it is not"
  echo "   in package.json. This WILL crash the bundle. Remove that import."
else
  echo "  ✅ i18n/index.ts looks clean"
fi

# ── 6. Install tunnel helper (non-fatal) ─────────────────────────────────────
echo ""
echo "🌉 Installing @expo/ngrok (non-fatal)..."
npm install @expo/ngrok@4.1.0 --no-save --legacy-peer-deps 2>/dev/null \
  && echo "  ✅ @expo/ngrok ready" \
  || echo "  ⚠️  @expo/ngrok install failed — tunnel unavailable"

# ── 7. Configure ngrok (non-fatal) ────────────────────────────────────────────
if [ -n "$NGROK_AUTHTOKEN" ]; then
  echo ""
  echo "🔑 Configuring ngrok..."
  npx ngrok authtoken "$NGROK_AUTHTOKEN" 2>/dev/null \
    && echo "  ✅ ngrok configured" \
    || echo "  ⚠️  ngrok config failed — LAN fallback will be used"
fi

# ── 8. Expo login (non-fatal) ─────────────────────────────────────────────────
if [ -n "$EXPO_TOKEN" ]; then
  echo ""
  echo "🔐 Logging in to Expo..."
  EXPO_TOKEN="$EXPO_TOKEN" npx expo whoami 2>/dev/null \
    && echo "  ✅ Expo login OK" \
    || echo "  ⚠️  Expo login failed (non-fatal)"
fi

# ── 9. Start Expo ─────────────────────────────────────────────────────────────
echo ""
echo "==========================================="
echo "🚀 Starting Expo SDK 54"
echo "==========================================="

START_OK=1

if [ -n "$NGROK_AUTHTOKEN" ]; then
  echo "🌐 Trying tunnel mode..."
  npx expo start --tunnel --clear --non-interactive
  START_OK=$?
fi

if [ "$START_OK" -ne 0 ]; then
  echo ""
  echo "⚠️  Tunnel skipped or failed — starting in LAN mode"
  echo "   Device must be on same network as: ${REACT_NATIVE_PACKAGER_HOSTNAME:-this host}"
  echo ""
  npx expo start --non-interactive --clear
  START_OK=$?
fi

# ── 10. Fatal fallback ────────────────────────────────────────────────────────
if [ "$START_OK" -ne 0 ]; then
  echo ""
  echo "==========================================="
  echo "❌ EXPO FAILED TO START"
  echo "==========================================="
  echo "Debug: docker exec -it food-ordering-mobile sh"
  echo "Then:  npx expo doctor"
  tail -f /dev/null
fi
