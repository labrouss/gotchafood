# Waiter Mobile App

Dedicated React Native (Expo) mobile app for waiters. Runs alongside the existing web application — the web waiter view at `/waiter` remains unchanged.

## How It Works

The Expo dev server runs as a Docker container. Waiters install **Expo Go** on their phones and scan the QR code to load the app — no App Store publishing needed.

## Getting Started (Server-side)

### 1. Transfer files and restart Docker
```bash
# After copying the updated project to your server:
docker compose up -d expo-mobile

# View the QR code / logs:
docker logs food-ordering-mobile -f
```

### 2. Install Expo Go on the waiter's phone
- Android: [Play Store — Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)
- iOS: [App Store — Expo Go](https://apps.apple.com/app/expo-go/id982107779)

### 3. Scan QR code
The `docker logs food-ordering-mobile` output will show a QR code. Scan it with:
- **Android**: Open Expo Go → Scan QR
- **iOS**: Use the Camera app → tap the notification

> The Expo server runs in **tunnel mode** (via ngrok), so the waiter's phone does **not** need to be on the same Wi-Fi network.

---

## App Screens

| Screen | Route | Description |
|---|---|---|
| Login | `/(auth)/login` | Email + password authentication |
| Dashboard | `/(app)/` | Active tables, free tables, clock in/out, READY order alerts |
| Take Order | `/(app)/take-order/[tableId]` | Browse menu (cached), add items + notes, submit to kitchen |
| Order Detail | `/(app)/order-detail/[orderId]` | View items, mark as served |

## Key Features

- **Menu caching**: Menu is stored locally and reused for 30 minutes. Works offline after first load.
- **Push notifications**: When an order's status changes to READY, the app fires a local notification even when backgrounded.
- **Background polling**: App checks for READY orders every 30 seconds in the background.

## Environment

The API URL is configured in `.env`:
```
API_URL=http://dockerhost.hpehellas-demo.com:3000
```

Adjust if your server hostname changes.

## Ports Used

| Port | Purpose |
|---|---|
| `8081` | Metro bundler (React Native packager) |
| `19000` | Expo dev tools |
| `19001` | Expo inspector |
