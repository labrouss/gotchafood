#!/bin/sh

# Ensure the script stops on serious errors, but allows us to debug
set -e

echo "==========================================="
echo "🔍 PRE-FLIGHT DEBUG INFORMATION"
echo "==========================================="
echo "📂 Current Directory: $(pwd)"
echo "👤 Current User: $(whoami)"
echo "🌐 Environment API_URL: $API_URL"

echo "--- 📦 Checking node_modules ---"
if [ -d "node_modules" ]; then
    echo "✅ node_modules exists. Found $(ls -1 node_modules | wc -l) packages."
    # List a few critical ones to verify architecture
    ls -d node_modules/react-native-reanimated node_modules/react-native-worklets 2>/dev/null || echo "⚠️ Warning: Critical reanimated packages missing!"
else
    echo "❌ node_modules NOT found."
fi

echo "--- 📱 Checking Expo State ---"
if [ -d ".expo" ]; then
    echo "🗑️ Found existing .expo directory. Clearing cache..."
    rm -rf .expo
else
    echo "✨ No existing .expo directory found."
fi

echo "--- 🗺️ App Directory Structure ---"
ls -R app | grep -v "node_modules" || echo "⚠️ Warning: 'app' directory is empty or missing!"

echo "==========================================="
echo "🚀 STARTING INSTALLATION & EXPO"
echo "==========================================="

# Use a subshell for the main process so we can catch failure and stay alive
echo "Installing dependencies"
npm install --legacy-peer-deps 

echo "🌉 Ensuring tunnel dependencies are present..." 
npm install @expo/ngrok@4.1.0 --no-save --legacy-peer-deps 
    
echo "🔑 Configuring Ngrok..."
npx ngrok authtoken "$NGROK_AUTHTOKEN" || echo "⚠️ Ngrok token config failed, attempting to continue..."
    
# Start Expo
echo "✨ Starting Expo Bundler..." 
if npx expo start --tunnel --clear --non-interactive; then
    echo "✅ Expo started successfully with Tunnel."
else
    echo "⚠️ Tunnel failed to start. Falling back to LAN mode..."
    echo "💡 Note: You may need to use your local IP to connect."

    # Fallback command: LAN mode
    # We remove --tunnel and --clear (to avoid double-rebuilding cache)
    npx expo start --non-interactive
fi


if [ $? -ne 0 ]; then
    echo "==========================================="
    echo "❌ CRITICAL FAILURE DETECTED"
    echo "==========================================="
    echo "The main process exited. Keeping container alive for troubleshooting..."
    echo "You can now run: docker exec -it food-ordering-mobile bash"
    tail -f /dev/null
fi
