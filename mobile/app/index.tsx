import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

// Root index — the FIRST screen expo-router renders (at path "/").
// This replaces the "Welcome to Expo" default by giving expo-router
// an explicit route to show before auth state is known.
//
// Flow:
//   1. Show branded loading spinner while Zustand rehydrates from AsyncStorage
//   2. Once hydrated: redirect to (app) if logged in, (auth)/login if not
export default function Index() {
  const { user, token, hasHydrated } = useAuthStore();

  // Still loading from AsyncStorage — show branded splash
  if (!hasHydrated) {
    return (
      <View style={{
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#4F46E5',
      }}>
        <Text style={{ fontSize: 56, marginBottom: 24 }}>🍽️</Text>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{
          color: '#fff', marginTop: 16, fontSize: 20,
          fontWeight: '800', letterSpacing: 0.5,
        }}>
          Waiter App
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 8, fontSize: 13 }}>
          Loading your session…
        </Text>
      </View>
    );
  }

  // Hydrated — redirect based on auth state
  if (user && token) {
    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
