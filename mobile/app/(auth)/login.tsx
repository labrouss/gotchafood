import { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';  // ← ADD THIS
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import { useLanguageStore, LANGUAGES } from '../../store/languageStore';

export default function LoginScreen() {
    const { login } = useAuthStore();
    const { t } = useTranslation();
    const { language, setLanguage } = useLanguageStore();
    const router = useRouter();  // ← ADD THIS
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert(t('auth.error'), t('auth.emptyFields'));
            return;
        }
        setLoading(true);
        try {
            await login(email.trim().toLowerCase(), password);
            console.log('✅ Login successful - Navigating to app');
            
            // ✅ Navigate after successful login
            router.replace('/(app)');
            
        } catch (err: any) {
            console.error('❌ Login failed:', err);
            
            let message = 'Invalid credentials';
            
            if (err.response) {
                message = err.response.data?.message || `Error ${err.response.status}`;
            } else if (err.request) {
                message = 'Cannot connect to server. Check your network connection.';
            } else {
                message = err.message || 'Unknown error';
            }
            
            Alert.alert(t('auth.loginFailed'), message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.card}>
                <Text style={styles.logo}>🍽️</Text>
                <Text style={styles.title}>{t('auth.title')}</Text>
                <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>

                <TextInput
                    style={styles.input}
                    placeholder={t('auth.email')}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />
                <TextInput
                    style={styles.input}
                    placeholder={t('auth.password')}
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    onSubmitEditing={handleLogin}
                />

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>{t('auth.signIn')}</Text>
                    )}
                </TouchableOpacity>
            {/* Language Switcher */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                {LANGUAGES.map((lang) => (
                    <TouchableOpacity
                        key={lang.code}
                        onPress={() => setLanguage(lang.code)}
                        style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: language === lang.code ? '#4F46E5' : '#F3F4F6',
                            borderWidth: 1,
                            borderColor: language === lang.code ? '#4F46E5' : '#E5E7EB',
                        }}
                    >
                        <Text style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: language === lang.code ? '#fff' : '#6B7280',
                        }}>
                            {lang.flag} {lang.code.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    logo: { fontSize: 56, marginBottom: 8 },
    title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 4 },
    subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 28 },
    input: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#111827',
        marginBottom: 14,
    },
    button: {
        width: '100%',
        backgroundColor: '#4F46E5',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
