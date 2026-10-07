import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useProfile, useUpdateProfile } from '../../src/hooks/useProfile';
import { useAuth } from '../../src/context/AuthContext';
import { C } from '../../constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { data: profile, isLoading } = useProfile();
  const updateMutation = useUpdateProfile();
  const { logout } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setRoomNo(profile.roomNo || '');
      setRollNo(profile.rollNo || '');
      setAvatarBase64(profile.avatarBase64 || null);
    }
  }, [profile]);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photos to pick an avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setAvatarBase64(result.assets[0].base64);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(
      { name, phone, roomNo, rollNo, avatarBase64 },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Profile updated successfully!');
        },
        onError: () => {
          Alert.alert('Error', 'Failed to update profile.');
        }
      }
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.headerTitle}>My Profile</Text>

        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            {avatarBase64 ? (
              <Image source={{ uri: `data:image/jpeg;base64,${avatarBase64}` }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color={C.textMuted} />
              </View>
            )}
            <TouchableOpacity onPress={handlePickImage}>
              <Text style={styles.avatarEditBtnText}>Change Picture</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your Name"
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone Number"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Room Number</Text>
          <TextInput
            style={styles.input}
            value={roomNo}
            onChangeText={setRoomNo}
            placeholder="Room Number"
          />

          <Text style={styles.label}>Roll Number</Text>
          <TextInput
            style={styles.input}
            value={rollNo}
            onChangeText={setRollNo}
            placeholder="Roll Number"
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={updateMutation.isPending}>
            <Text style={styles.saveBtnText}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  container: { padding: 24, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  headerTitle: { fontSize: 32, fontWeight: '800', color: C.text, marginBottom: 24, fontFamily: 'Georgia' },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 24,
  },
  avatarContainer: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 12, backgroundColor: C.surface2 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, marginBottom: 12, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  avatarEditBtnText: { color: C.primary, fontSize: 14, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: C.textSub, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.borderFocus,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: C.text,
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: C.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutBtnText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
});
