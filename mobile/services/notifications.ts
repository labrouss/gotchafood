import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// expo-task-manager is only available on native. Guard it so the
// module-level defineTask() call never crashes Metro startup on
// web / simulator / environments where the native module isn't linked.
let TaskManager: typeof import('expo-task-manager') | null = null;
try {
  TaskManager = require('expo-task-manager');
} catch {
  console.warn('⚠️ expo-task-manager not available in this environment');
}

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

if (TaskManager) {
  TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error }: any) => {
    if (error) {
      console.error('Background notification error:', error);
      return;
    }
    console.log('Received a notification in the background!', data);
  });
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return false;
  }
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (err) {
    console.warn('⚠️ Could not request notification permissions:', err);
    return false;
  }
};

export const registerBackgroundTask = async () => {
  if (!TaskManager) {
    console.warn('⚠️ Skipping background task registration — TaskManager unavailable');
    return;
  }
  try {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    console.log('Notification background task registered.');
  } catch (err) {
    // Non-fatal — app works fine without background notifications
    console.warn('⚠️ Failed to register background task (non-fatal):', err);
  }
};

export const sendLocalNotification = async (title: string, body: string) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch (err) {
    console.warn('⚠️ Could not send local notification:', err);
  }
};
