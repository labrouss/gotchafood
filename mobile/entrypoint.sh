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

# ── 1. Write API_URL into .env so Metro bakes it into the bundle ──────────────
# react-native-dotenv reads .env at Metro startup. Writing it here guarantees
# the container env var reaches the JS bundle via the @env import in api.ts.
if [ -n "$API_URL" ]; then
  printf "API_URL=%s\nEXPO_PUBLIC_API_URL=%s\n" "$API_URL" "$API_URL" > .env
  echo "✅ .env written: API_URL=$API_URL"
else
  echo "⚠️  API_URL not set. App will log an error but still start."
fi

# ── 2. Clear stale Expo cache ─────────────────────────────────────────────────
echo ""
echo "--- 🗑️  Clearing Expo cache ---"
rm -rf .expo
echo "✅ .expo cache cleared"

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
  echo "   Container kept alive: docker exec -it food-ordering-mobile sh"
  tail -f /dev/null
fi

# Canary: verify expo-router actually installed — if this is missing the app
# shows "Welcome to Expo" with no useful error message
if [ ! -f "node_modules/expo-router/package.json" ]; then
  echo ""
  echo "❌ expo-router did not install. Check npm output above for errors."
  echo "   Container kept alive: docker exec -it food-ordering-mobile sh"
  tail -f /dev/null
fi

INSTALLED_ROUTER=$(node -e "console.log(require('./node_modules/expo-router/package.json').version)")
INSTALLED_EXPO=$(node -e "console.log(require('./node_modules/expo/package.json').version)")
echo "✅ expo@${INSTALLED_EXPO} + expo-router@${INSTALLED_ROUTER} ready"

# ── 4. Install tunnel helper (non-fatal) ─────────────────────────────────────
echo ""
echo "🌉 Installing @expo/ngrok..."
npm install @expo/ngrok@4.1.0 --no-save --legacy-peer-deps 2>/dev/null \
  || echo "⚠️  @expo/ngrok install failed — tunnel unavailable"

# ── 5. Configure ngrok (non-fatal) ───────────────────────────────────────────
if [ -n "$NGROK_AUTHTOKEN" ]; then
  echo ""
  echo "🔑 Configuring ngrok..."
  npx ngrok authtoken "$NGROK_AUTHTOKEN" 2>/dev/null \
    || echo "⚠️  ngrok authtoken config failed — will use LAN fallback"
fi

# ── 6. Expo login (non-fatal, improves tunnel reliability) ───────────────────
if [ -n "$EXPO_TOKEN" ]; then
  echo ""
  echo "🔐 Logging in to Expo..."
  EXPO_TOKEN="$EXPO_TOKEN" npx expo whoami 2>/dev/null \
    && echo "✅ Expo login OK" \
    || echo "⚠️  Expo login failed (non-fatal)"
fi

# ── 7. Start Expo ─────────────────────────────────────────────────────────────
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
  echo "⚠️  Tunnel failed or skipped — falling back to LAN mode"
  echo "   Device must be on the same network as: ${REACT_NATIVE_PACKAGER_HOSTNAME:-this host}"
  echo ""
  npx expo start --non-interactive --clear
  START_OK=$?
fi

# ── 8. Fatal fallback ────────────────────────────────────────────────────────
if [ "$START_OK" -ne 0 ]; then
  echo ""
  echo "==========================================="
  echo "❌ EXPO FAILED TO START"
  echo "==========================================="
  echo "Try: docker exec -it food-ordering-mobile sh"
  echo "Then: npx expo doctor"
  tail -f /dev/null
fi
