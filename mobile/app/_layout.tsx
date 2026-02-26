import { Component, ReactNode } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

// ─────────────────────────────────────────────────────────────────────────────
// Error Boundary — replaces "Welcome to Expo" with a real error screen
// so crashes are visible and debuggable.
// ─────────────────────────────────────────────────────────────────────────────
interface EBState { hasError: boolean; error: Error | null; info: string }

class AppErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, error: null, info: '' };

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error, info: '' };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('🔴 AppErrorBoundary:', error.message);
    console.error('🔴 Stack:', info?.componentStack ?? '');
    this.setState({ info: info?.componentStack ?? '' });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={{
        flex: 1, backgroundColor: '#1a1a2e',
        justifyContent: 'center', alignItems: 'center', padding: 24,
      }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🔴</Text>
        <Text style={{ color: '#ff6b6b', fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>
          App crashed before mounting
        </Text>
        <Text style={{ color: '#ffd93d', fontSize: 13, marginBottom: 20, textAlign: 'center', fontWeight: '600' }}>
          {this.state.error?.message ?? 'Unknown error'}
        </Text>
        <ScrollView style={{ backgroundColor: '#0d0d1a', borderRadius: 10, padding: 16, maxHeight: 300, width: '100%' }}>
          <Text style={{ color: '#a8dadc', fontSize: 11, fontFamily: 'monospace' }}>
            {this.state.error?.stack ?? ''}
            {'\n\n--- Component Stack ---\n'}
            {this.state.info}
          </Text>
        </ScrollView>
        <TouchableOpacity
          onPress={() => this.setState({ hasError: false, error: null, info: '' })}
          style={{ marginTop: 20, backgroundColor: '#4F46E5', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, retryDelay: 1000 } },
});

// Root layout — just provides context providers and the navigator.
// Auth redirect logic lives in app/index.tsx (Redirect) and in each
// group layout. useEffect redirects in a root layout race against
// expo-router's initial render and can lose, showing "Welcome to Expo".
export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
          </Stack>
        </QueryClientProvider>
      </I18nextProvider>
    </AppErrorBoundary>
  );
}
