import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../constants/Colors';
import { useNotices } from '../../src/hooks/useNotices';
import type { Notice } from '../../src/api/notices';

/* ── Helpers ── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function roleLabel(role: string): string {
  switch (role) {
    case 'WARDEN_ADMIN': return 'Warden';
    case 'MESS_COMMITTEE': return 'Mess Committee';
    case 'SUPER_ADMIN': return 'Admin';
    default: return role.replace(/_/g, ' ');
  }
}

function roleBadgeColor(role: string): { bg: string; text: string } {
  switch (role) {
    case 'WARDEN_ADMIN': return { bg: 'rgba(124,58,30,0.10)', text: '#7c3a1e' };
    case 'MESS_COMMITTEE': return { bg: 'rgba(58,107,58,0.10)', text: '#3a6b3a' };
    default: return { bg: 'rgba(0,0,0,0.06)', text: C.textMuted };
  }
}

function targetBadge(targetRole: string | null): string | null {
  if (!targetRole) return null;
  switch (targetRole) {
    case 'STUDENT': return '👨‍🎓 Students';
    case 'MESS_COMMITTEE': return '🍽️ Committee';
    case 'COUNTER_STAFF': return '📋 Staff';
    default: return targetRole.replace(/_/g, ' ');
  }
}

/* ── Notice Card ── */

function NoticeCard({ item, index }: { item: Notice; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useState(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: Math.min(index * 60, 300),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        delay: Math.min(index * 60, 300),
        useNativeDriver: true,
      }),
    ]).start();
  });

  const badge = roleBadgeColor(item.postedBy.role);
  const target = targetBadge(item.targetRole);
  const isRecent = Date.now() - new Date(item.createdAt).getTime() < 3_600_000; // < 1hr

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Top row: author + time */}
      <View style={styles.cardTop}>
        <View style={styles.authorRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.postedBy.name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName}>{item.postedBy.name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.roleBadgeText, { color: badge.text }]}>
                {roleLabel(item.postedBy.role)}
              </Text>
            </View>
          </View>
          <View style={styles.timeRow}>
            {isRecent && <View style={styles.newDot} />}
            <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
          </View>
        </View>
      </View>

      {/* Date & Time */}
      <Text style={styles.dateLabel}>
        {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>

      {/* Title */}
      <Text style={styles.cardTitle}>{item.title}</Text>

      {/* Body */}
      <Text style={styles.cardBody}>{item.body}</Text>

      {/* Target badge */}
      {target && (
        <View style={styles.targetBadge}>
          <Text style={styles.targetBadgeText}>{target}</Text>
        </View>
      )}
    </Animated.View>
  );
}

/* ── Empty State ── */

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="megaphone-outline" size={48} color={C.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>No Notices Yet</Text>
      <Text style={styles.emptyBody}>
        When your mess administration posts an announcement, it will appear here.
      </Text>
    </View>
  );
}

/* ── Main Screen ── */

export default function NoticesScreen() {
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotices();

  const allNotices = data?.pages.flatMap((p) => p.notices) ?? [];

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item, index }: { item: Notice; index: number }) => (
      <NoticeCard item={item} index={index} />
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoMark}>
          <Ionicons name="megaphone" size={16} color="#fff" />
        </View>
        <Text style={styles.title}>Notices</Text>
        <View style={{ flex: 1 }} />
        {isRefetching && !isLoading && (
          <ActivityIndicator size="small" color={C.accent} style={{ marginRight: 4 }} />
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading notices…</Text>
        </View>
      ) : (
        <FlatList
          data={allNotices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            allNotices.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={onRefresh}
              tintColor={C.accent}
              colors={[C.accent]}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<EmptyState />}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                size="small"
                color={C.accent}
                style={{ paddingVertical: 20 }}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

/* ── Styles ── */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: C.text },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: C.textMuted, fontSize: 14 },

  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  listContentEmpty: { flex: 1 },

  /* Card */
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { marginBottom: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  authorName: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  newDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.accent,
  },
  timeText: { fontSize: 11, color: C.textMuted, fontWeight: '500' },
  dateLabel: { fontSize: 11, color: C.textMuted, fontWeight: '500', marginBottom: 4, letterSpacing: 0.3 },

  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  cardBody: {
    fontSize: 14,
    color: C.textSub,
    lineHeight: 21,
  },
  targetBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: C.border,
  },
  targetBadgeText: { fontSize: 11, color: C.textMuted, fontWeight: '600' },

  /* Empty */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    marginBottom: 8,
  },
  emptyBody: {
    color: C.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
