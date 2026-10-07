import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView, Modal, FlatList, Image, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { postRegister, postLogin } from '../../src/api/auth';
import { getHostels } from '../../src/api/hostels';
import { parseApiError } from '../../src/utils/apiError';
import type { Hostel } from '../../src/types';
import { C } from '../../constants/Colors';

type FieldKeys = 'name' | 'email' | 'password' | 'hostelId' | 'rollNo' | 'phone' | 'roomNo';
type FieldErrors = Partial<Record<FieldKeys, string>>;

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [phone, setPhone] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [hostelId, setHostelId] = useState('');
  const [hostelName, setHostelName] = useState('');

  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [hostelPickerOpen, setHostelPickerOpen] = useState(false);
  const [hostelsLoading, setHostelsLoading] = useState(true);
  const [hostelsError, setHostelsError] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        console.log('[Register] Loading hostels...');
        const data = await getHostels();
        console.log('[Register] Loaded hostels:', data.length);
        if (!cancelled) setHostels(data);
      } catch (err) {
        console.error('[Register] Failed to load hostels:', err);
        if (!cancelled) {
          const { message } = parseApiError(err);
          setHostelsError(message);
        }
      } finally {
        if (!cancelled) setHostelsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const clearField = (key: FieldKeys) =>
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));

  const validate = (): boolean => {
    const errs: FieldErrors = {};
    if (name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Enter a valid email address';
    if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!hostelId) errs.hostelId = 'Please select a hostel';
    if (phone.trim() && !/^\d{10}$/.test(phone.trim())) errs.phone = 'Phone must be exactly 10 digits';
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      console.log('[Register] Validation failed:', errs);
      // Scroll to top so user sees the first error
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const handleRegister = async () => {
    console.log('[Register] Create Account pressed');
    if (!validate()) return;
    setServerError(null);
    setLoading(true);
    try {
      console.log('[Register] Sending registration request...');
      await postRegister({
        name: name.trim(), email: email.trim(), password, hostelId,
        rollNo: rollNo.trim() || undefined, phone: phone.trim() || undefined,
        roomNo: roomNo.trim() || undefined,
      });
      console.log('[Register] Registration successful, logging in...');
      const result = await postLogin(email.trim(), password);
      console.log('[Register] Login successful, setting auth state...');
      await login(result.accessToken, result.user);
      console.log('[Register] Navigating to app...');
      router.replace('/(app)' as any);
    } catch (err: any) {
      console.error('[Register] Registration error:', err?.message || err);
      const { message, isNetwork } = parseApiError(err);
      const status = err?.response?.status;
      let errorMsg: string;
      if (!isNetwork && status === 409) {
        errorMsg = 'This email is already registered. Try logging in instead.';
      } else {
        errorMsg = message;
      }
      setServerError(errorMsg);
      // Scroll to top so the error box is visible
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      // Also show an alert as fallback so user definitely sees the error
      Alert.alert('Registration Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image source={require('../../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Savoury today</Text>
        </View>

        <View style={styles.form}>
          {serverError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          )}

          {/* Name */}
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={[styles.input, fieldErrors.name && styles.inputError]}
            value={name} onChangeText={(v) => { setName(v); clearField('name'); }}
            placeholder="Your full name" placeholderTextColor="#64748b" editable={!loading}
          />
          {fieldErrors.name && <Text style={styles.fieldError}>{fieldErrors.name}</Text>}

          {/* Email */}
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={[styles.input, fieldErrors.email && styles.inputError]}
            value={email} onChangeText={(v) => { setEmail(v); clearField('email'); }}
            keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            placeholder="you@example.com" placeholderTextColor="#64748b" editable={!loading}
          />
          {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}

          {/* Password */}
          <Text style={styles.label}>Password * (min 6 chars)</Text>
          <TextInput
            style={[styles.input, fieldErrors.password && styles.inputError]}
            value={password} onChangeText={(v) => { setPassword(v); clearField('password'); }}
            secureTextEntry placeholder="••••••••" placeholderTextColor="#64748b" editable={!loading}
          />
          {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}

          {/* Hostel Picker */}
          <Text style={styles.label}>Hostel *</Text>
          {hostelsLoading ? (
            <View style={[styles.input, styles.pickerLoading]}>
              <ActivityIndicator size="small" color="#6366f1" />
              <Text style={styles.pickerLoadingText}>Loading hostels…</Text>
            </View>
          ) : hostelsError ? (
            <View style={[styles.input, styles.pickerError]}>
              <Text style={styles.fieldError}>{hostelsError}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.input, styles.picker, fieldErrors.hostelId && styles.inputError]}
              onPress={() => setHostelPickerOpen(true)}
              disabled={loading}
            >
              <Text style={hostelName ? styles.pickerValue : styles.pickerPlaceholder}>
                {hostelName || 'Select your hostel'}
              </Text>
              <Text style={styles.pickerChevron}>▾</Text>
            </TouchableOpacity>
          )}
          {fieldErrors.hostelId && <Text style={styles.fieldError}>{fieldErrors.hostelId}</Text>}

          {/* Room No */}
          <Text style={styles.label}>Room Number (optional)</Text>
          <TextInput
            style={styles.input}
            value={roomNo} onChangeText={setRoomNo}
            placeholder="e.g. 214, B-302" placeholderTextColor="#64748b"
            autoCapitalize="characters" editable={!loading}
          />

          {/* Roll No */}
          <Text style={styles.label}>Roll Number (optional)</Text>
          <TextInput
            style={styles.input}
            value={rollNo} onChangeText={setRollNo}
            placeholder="e.g. CS21B001" placeholderTextColor="#64748b"
            autoCapitalize="characters" editable={!loading}
          />

          {/* Phone */}
          <Text style={styles.label}>Phone (optional)</Text>
          <TextInput
            style={styles.input}
            value={phone} onChangeText={setPhone}
            keyboardType="phone-pad" placeholder="+91 98765 43210"
            placeholderTextColor="#64748b" editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={() => router.back()} disabled={loading}>
            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={styles.linkHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Hostel picker modal */}
      <Modal visible={hostelPickerOpen} animationType="slide" transparent>
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <View style={modal.header}>
              <Text style={modal.title}>Select Hostel</Text>
              <TouchableOpacity onPress={() => setHostelPickerOpen(false)}>
                <Text style={modal.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={hostels}
              keyExtractor={(h) => h.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[modal.item, item.id === hostelId && modal.itemSelected]}
                  onPress={() => {
                    setHostelId(item.id);
                    setHostelName(item.name);
                    clearField('hostelId');
                    setHostelPickerOpen(false);
                  }}
                >
                  <Text style={[modal.itemText, item.id === hostelId && modal.itemTextSelected]}>
                    {item.name}
                  </Text>
                  {item.id === hostelId && <Text style={modal.check}>✓</Text>}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={modal.empty}>No hostels found.</Text>}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: C.bg },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 48 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoImage: { width: 56, height: 56, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: C.textMuted, marginTop: 6 },
  form: { width: '100%' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.dangerBg, borderRadius: 10, padding: 12, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: C.danger,
  },
  errorText: { color: C.danger, fontSize: 13, lineHeight: 19, flex: 1 },
  label: { color: C.textSub, fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 18 },
  input: {
    backgroundColor: C.surface2, borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 14, color: C.text, fontSize: 15,
    borderWidth: 1, borderColor: C.border,
  },
  inputError: { borderColor: C.danger },
  fieldError: { color: C.danger, fontSize: 12, marginTop: 4, marginLeft: 4 },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerValue: { color: C.text, fontSize: 15 },
  pickerPlaceholder: { color: C.textMuted, fontSize: 15 },
  pickerChevron: { color: C.accent, fontSize: 18 },
  pickerLoading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickerLoadingText: { color: C.textMuted, fontSize: 14 },
  pickerError: { borderColor: C.danger },
  button: {
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  linkBtn: { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
  linkText: { color: C.textMuted, fontSize: 14 },
  linkHighlight: { color: C.accent, fontWeight: '700' },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '60%', paddingBottom: 40,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: { color: C.text, fontSize: 17, fontWeight: '700' },
  close: { color: C.textMuted, fontSize: 18, paddingHorizontal: 4 },
  item: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  itemSelected: { backgroundColor: C.accentLight },
  itemText: { color: C.textSub, fontSize: 16 },
  itemTextSelected: { color: C.primary, fontWeight: '700' },
  check: { color: C.success, fontSize: 18 },
  empty: { color: C.textMuted, textAlign: 'center', padding: 32 },
});
