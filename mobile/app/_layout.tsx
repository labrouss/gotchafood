import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuthStore } from '../store/authStore';
// Notifications are initialised in the dashboard screen, not here

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 1000,
    },
  },
});

function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();

  // Use hasHydrated from the store — set by Zustand's onRehydrateStorage callback.
  // This is more reliable than a blind timeout because it fires exactly when
  // AsyncStorage deserialization is complete.
  const { user, token, hasHydrated } = useAuthStore();

  // Guard: don't redirect until Zustand has rehydrated from AsyncStorage
  useEffect(() => {
    if (!hasHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup  = segments[0] === '(app)';

    console.log('🧭 Navigation check — user:', user?.email ?? 'none', '| hydrated:', hasHydrated);

    if (user && token) {
      if (!inAppGroup) {
        console.log('✅ Authenticated → /(app)');
        router.replace('/(app)');
      }
    } else {
      if (!inAuthGroup) {
        console.log('🔐 Not authenticated → /(auth)/login');
        router.replace('/(auth)/login');
      }
    }
  }, [user, token, segments, hasHydrated]);

  // Show branded loading screen while Zustand rehydrates
  if (!hasHydrated) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#4F46E5',
      }}>
        <Text style={{ fontSize: 48, marginBottom: 24 }}>🍽️</Text>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{
          color: '#fff',
          marginTop: 16,
          fontSize: 18,
          fontWeight: '700',
          letterSpacing: 0.5,
        }}>
          Waiter App
        </Text>
        <Text style={{
          color: 'rgba(255,255,255,0.7)',
          marginTop: 8,
          fontSize: 13,
        }}>
          Loading your session…
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)"  options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}
