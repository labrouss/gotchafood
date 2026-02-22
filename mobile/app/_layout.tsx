import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { registerBackgroundTask, requestNotificationPermissions } from '../services/notifications';

const queryClient = new QueryClient();

export default function RootLayout() {
  // 1. Remove loadFromStorage from this destructuring
  const { user, token } = useAuthStore();

  useEffect(() => {
    // 2. Handle notifications only
    requestNotificationPermissions().then((granted) => {
      if (granted) registerBackgroundTask();
    });
  }, []);
// app/_layout.tsx
return (
  <QueryClientProvider client={queryClient}>
    <Stack screenOptions={{ headerShown: false }}>
      {/* Change "(auth)" to match exactly what is in your app folder */}
      <Stack.Screen name="(auth)/login" options={{ title: 'Login' }} /> 
      
      {/* If your main app is inside a folder called (app) */}
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
    </Stack>
  </QueryClientProvider>
);
}
