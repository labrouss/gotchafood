import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configure how notifications appear when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const requestNotificationPermissions = async (): Promise<boolean> => {
  // Local notifications work on both physical devices and simulators
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('⚠️ Could not request notification permissions:', err);
    return false;
  }
};

/**
 * Fire an immediate local notification. Works in Expo Go on SDK 54.
 * No push token, no remote server, no background task needed.
 */
export const sendLocalNotification = async (title: string, body: string): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null, // null = fire immediately
    });
  } catch (err) {
    console.warn('⚠️ Could not send local notification:', err);
  }
};

// ── Order-ready tracker ───────────────────────────────────────────────────────
// Keeps a Set of order IDs we have already notified about so we don't
// spam the waiter on every poll cycle.
const notifiedOrders = new Set<string>();

/**
 * Call this on every dashboard poll with the current sessions array.
 * Fires a local notification for any order that just became READY.
 */
export const notifyReadyOrders = async (sessions: any[]): Promise<void> => {
  for (const session of sessions) {
    for (const order of session.orders ?? []) {
      if (order.status === 'READY' && !notifiedOrders.has(order.id)) {
        notifiedOrders.add(order.id);
        await sendLocalNotification(
          '🍽️ Order Ready!',
          `Table ${session.table?.tableNumber ?? ''} — Order ${order.orderNumber} is ready to serve`
        );
      }
    }
  }
};

/**
 * Clear the notified-orders set when the waiter logs out,
 * so notifications fire fresh on the next login.
 */
export const clearNotificationCache = (): void => {
  notifiedOrders.clear();
};
