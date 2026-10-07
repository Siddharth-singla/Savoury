import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { postLogin } from '../../src/api/auth';
import { parseApiError } from '../../src/utils/apiError';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../constants/Colors';

const BG_IMAGE = {
  uri: 'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=900&q=80',
};

type FieldErrors = Partial<Record<'email' | 'password', string>>;

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const errs: FieldErrors = {};
    if (!/^[^\s@]+@thapar\.edu$/.test(email.trim())) errs.email = 'Enter a valid @thapar.edu email address';
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

        {/* ── Hero Image ── */}
        <View style={styles.heroWrap}>
          <Image source={BG_IMAGE} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Image source={require('../../assets/images/logo-light.png')} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.appName}>SAVOURY</Text>
            <Text style={styles.tagline}>Smart Dining & Mess Management</Text>
          </View>
        </View>

        {/* ── Form Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to continue</Text>

          {serverError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={C.danger} />
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          )}

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputWrap, fieldErrors.email && styles.inputWrapError]}>
            <Ionicons name="mail-outline" size={18} color={C.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(v) => { setEmail(v); setFieldErrors((p) => ({ ...p, email: undefined })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@example.com"
              placeholderTextColor={C.textMuted}
              editable={!loading}
            />
          </View>
          {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputWrap, fieldErrors.password && styles.inputWrapError]}>
            <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={(v) => { setPassword(v); setFieldErrors((p) => ({ ...p, password: undefined })); }}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              placeholderTextColor={C.textMuted}
              editable={!loading}
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textMuted} />
            </TouchableOpacity>
          </View>
          {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Sign In</Text>
            }
          </TouchableOpacity>

          {/* Register */}
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => router.push('/(auth)/register' as any)}
            disabled={loading}
          >
            <Text style={styles.linkText}>
              Don't have an account?{' '}
              <Text style={styles.linkHighlight}>Register here</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: C.bg },
  container: { flexGrow: 1 },

  /* Hero */
  heroWrap:    { height: 280, position: 'relative' },
  heroImage:   { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(22,10,4,0.55)' },
  heroContent: { flex: 1, justifyContent: 'flex-end', padding: 28, paddingBottom: 32 },
  logoImage: {
    width: 60, height: 60, marginBottom: 10,
  },
  appName: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 2, textTransform: 'uppercase' },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, letterSpacing: 0.3 },

  /* Card */
  card: {
    backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 40, flex: 1,
    marginTop: -20,
  },
  cardTitle:    { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  cardSubtitle: { fontSize: 14, color: C.textMuted, marginTop: 4, marginBottom: 20 },

  /* Error */
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.dangerBg, borderRadius: 10, padding: 12, marginBottom: 16,
    borderLeftWidth: 3, borderLeftColor: C.danger,
  },
  errorText: { color: C.danger, fontSize: 13, flex: 1, lineHeight: 18 },

  /* Input */
  label:    { color: C.textSub, fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 16 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface2, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 2,
  },
  inputWrapError: { borderColor: C.danger },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1, color: C.text, fontSize: 15, paddingVertical: 13,
  },
  eyeBtn: { padding: 4 },
  fieldError: { color: C.danger, fontSize: 12, marginTop: 4, marginLeft: 4 },

  /* Button */
  button: {
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  /* Link */
  linkBtn:       { alignItems: 'center', marginTop: 18, paddingVertical: 8 },
  linkText:      { color: C.textMuted, fontSize: 14 },
  linkHighlight: { color: C.accent, fontWeight: '700' },
});
