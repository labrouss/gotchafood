import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔴 ERROR BOUNDARY:', error);
    console.error('🔴 STACK:', error.stack);
    this.setState({ error });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.errorBox}>
            <Text style={styles.title}>🔴 APP CRASHED</Text>
            <ScrollView style={styles.scroll}>
              <Text style={styles.error}>{this.state.error?.toString()}</Text>
              <Text style={styles.stack}>{this.state.error?.stack}</Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.btn}
              onPress={() => this.setState({ hasError: false, error: null })}
            >
              <Text style={styles.btnText}>🔄 Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#DC2626', padding: 20, justifyContent: 'center' },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 16, padding: 20, maxHeight: '90%' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#991B1B', marginBottom: 16 },
  scroll: { maxHeight: 400, backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 16 },
  error: { fontSize: 14, fontWeight: 'bold', color: '#DC2626', marginBottom: 8 },
  stack: { fontSize: 11, color: '#374151', fontFamily: 'monospace' },
  btn: { backgroundColor: '#DC2626', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
