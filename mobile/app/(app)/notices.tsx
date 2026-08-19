import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NoticesScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Notices</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.icon}>📢</Text>
        <Text style={styles.heading}>Coming Soon</Text>
        <Text style={styles.body}>
          The notices feature is not yet available. Check back soon for announcements
          from your mess administration.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 24, paddingBottom: 0 },
  title: { color: '#f1f5f9', fontSize: 24, fontWeight: '700' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  icon: { fontSize: 64 },
  heading: { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  body: { color: '#64748b', fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
