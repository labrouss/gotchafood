import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as TaskManager from 'expo-task-manager';

// This name must be consistent
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

// 1. Define the task OUTSIDE of any components
// This runs when a notification is received while the app is closed/backgrounded
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error, executionInfo }) => {
    if (error) {
        console.error("Background notification error:", error);
        return;
    }
    console.log("Received a notification in the background!", data);
});

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
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    return finalStatus === 'granted';
};

/**
 * The function your _layout.tsx was missing!
 */
export const registerBackgroundTask = async () => {
    try {
        // This links the TaskManager task to the Notification system
        await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
        console.log("Notification background task registered.");
    } catch (err) {
        console.error("Failed to register background task:", err);
    }
};

export const sendLocalNotification = async (title: string, body: string) => {
    await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: null,
    });
};
