import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { postLogin } from '../../src/api/auth';
import { parseApiError } from '../../src/utils/apiError';

type FieldErrors = Partial<Record<'email' | 'password', string>>;

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const errs: FieldErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Enter a valid email address';
    if (!password) errs.password = 'Password is required';
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return false; }
    setFieldErrors({});
    return true;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setServerError(null);
    setLoading(true);
    try {
      const result = await postLogin(email.trim(), password);
      await login(result.accessToken, result.user);
      router.replace('/(app)' as any);
    } catch (err) {
      const { message, isNetwork } = parseApiError(err);
      if (!isNetwork && (err as { response?: { status?: number } }).response?.status === 401) {
        setServerError('Invalid email or password.');
      } else {
        setServerError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>🍽️</Text>
          <Text style={styles.title}>SmartMess</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
        </View>

        <View style={styles.form}>
          {serverError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          )}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, fieldErrors.email ? styles.inputError : undefined]}
            value={email}
            onChangeText={(v) => { setEmail(v); setFieldErrors((p) => ({ ...p, email: undefined })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="you@example.com"
            placeholderTextColor="#64748b"
            editable={!loading}
          />
          {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, fieldErrors.password ? styles.inputError : undefined]}
            value={password}
            onChangeText={(v) => { setPassword(v); setFieldErrors((p) => ({ ...p, password: undefined })); }}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            editable={!loading}
            onSubmitEditing={handleLogin}
          />
          {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => router.push('/(auth)/register' as any)}
            disabled={loading}
          >
            <Text style={styles.linkText}>
              Don&apos;t have an account?{' '}
              <Text style={styles.linkHighlight}>Register</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f172a' },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 32, fontWeight: '700', color: '#f1f5f9', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#94a3b8', marginTop: 6 },
  form: { width: '100%' },
  errorBox: {
    backgroundColor: '#450a0a', borderRadius: 10, padding: 12, marginBottom: 16,
    borderLeftWidth: 4, borderLeftColor: '#ef4444',
  },
  errorText: { color: '#fca5a5', fontSize: 13, lineHeight: 19 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 18 },
  input: {
    backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, color: '#f1f5f9', fontSize: 16,
    borderWidth: 1, borderColor: '#334155',
  },
  inputError: { borderColor: '#ef4444' },
  fieldError: { color: '#fca5a5', fontSize: 12, marginTop: 4, marginLeft: 4 },
  button: {
    backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkBtn: { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
  linkText: { color: '#64748b', fontSize: 14 },
  linkHighlight: { color: '#818cf8', fontWeight: '600' },
});
