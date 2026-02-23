import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator, Text } from 'react-native';

export default function Index() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    console.log('🔍 Index - Checking auth state');
    console.log('User:', user?.email || 'none');
    console.log('Token:', token ? 'exists' : 'none');

    // Small delay to ensure Zustand has hydrated from storage
    const timer = setTimeout(() => {
      if (user && token) {
        console.log('✅ User authenticated - Redirecting to /(app)');
        router.replace('/(app)');
      } else {
        console.log('🔐 Not authenticated - Redirecting to /(auth)/login');
        router.replace('/(auth)/login');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user, token, router]);

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#4F46E5' 
    }}>
      <ActivityIndicator size="large" color="#fff" />
      <Text style={{ 
        color: '#fff', 
        marginTop: 16, 
        fontSize: 16 
      }}>
        Loading...
      </Text>
    </View>
  );
}
