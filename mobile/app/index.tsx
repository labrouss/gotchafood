import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator, Text } from 'react-native';

export default function Index() {
  const { user, token } = useAuthStore();

  console.log('🔍 Index route - User:', user?.email || 'none', 'Token:', token ? 'exists' : 'none');

  // If auth state is still loading from storage, show loading
  if (user === undefined && token === undefined) {
    console.log('⏳ Loading auth state...');
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#4F46E5' 
      }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: '#fff', marginTop: 16, fontSize: 16 }}>
          Loading...
        </Text>
      </View>
    );
  }

  // If authenticated, go to app
  if (user && token) {
    console.log('✅ User authenticated - Redirecting to /(app)');
    return <Redirect href="/(app)" />;
  }

  // Otherwise, go to login
  console.log('🔐 Not authenticated - Redirecting to /(auth)/login');
  return <Redirect href="/(auth)/login" />;
}
