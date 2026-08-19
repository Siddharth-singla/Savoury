import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useMenu } from '../../src/hooks/useMenu';
import { useBookings } from '../../src/hooks/useBookings';
import { useToggleBooking } from '../../src/hooks/useToggleBooking';

import type { MenuItem, Booking } from '../../src/types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getDayRange(base: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}
function toLocalStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDayByString(utcIsoString: string, localDate: Date): boolean {
  return utcIsoString.startsWith(toLocalStr(localDate));
}

export default function HomeScreen() {
  const { logout, user } = useAuth();
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const days = useMemo(() => getDayRange(today), [today]);
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());

  const rangeStart = days[0];
  const rangeEnd = endOfDay(days[6]);

  const menuQuery = useMenu(rangeStart, rangeEnd);
  const bookingsQuery = useBookings(rangeStart, rangeEnd);
  const toggleMutation = useToggleBooking();

  const bookingsQueryKey = ['bookings', rangeStart.toISOString(), rangeEnd.toISOString()];

  useFocusEffect(
    useCallback(() => {
      menuQuery.refetch();
      bookingsQuery.refetch();
    }, [])
  );

  const menusForDay = useMemo(() => {
    if (!menuQuery.data) return [];
    return menuQuery.data.menus.filter((m) => isSameDayByString(m.date, selectedDay));
  }, [menuQuery.data, selectedDay]);

  const bookingsForDay = useMemo(() => {
    if (!bookingsQuery.data) return [];
    return bookingsQuery.data.filter((b) => isSameDayByString(b.date, selectedDay));
  }, [bookingsQuery.data, selectedDay]);

  const getMealTypeName = (mealTypeId: string) =>
    menuQuery.data?.mealTypes.find((mt) => mt.id === mealTypeId)?.name ?? mealTypeId;

  const handleToggle = (booking: Booking | undefined, mealTypeId: string) => {
    // Only block if the booking is explicitly locked
    if (booking?.lockedAt) return;
    if (pendingToggles.has(mealTypeId)) return;

    // If no booking row yet: meal is OPTED_IN by default
    const currentStatus = booking?.status ?? 'OPTED_IN';
    const nextStatus = currentStatus === 'OPTED_OUT' ? 'OPTED_IN' : 'OPTED_OUT';
    
    setPendingToggles(prev => new Set(prev).add(mealTypeId));

    toggleMutation.mutate({
      mealTypeId,
      date: selectedDay,
      status: nextStatus,
      queryKey: bookingsQueryKey,
    }, {
      onSettled: () => {
        setPendingToggles(prev => {
          const next = new Set(prev);
          next.delete(mealTypeId);
          return next;
        });
      }
    });
  };

  const isLoading = menuQuery.isLoading || bookingsQuery.isLoading;
  const isError = menuQuery.isError || bookingsQuery.isError;

  const checkCutoffPassed = (mealTypeId: string, mealDateStr: string) => {
    const mt = menuQuery.data?.mealTypes.find((m) => m.id === mealTypeId);
    if (!mt) return false;
    
    const [cutoffHour, cutoffMinute] = mt.cutoffTime.split(':').map(Number);
    const [servingHour, servingMinute] = mt.servingStart.split(':').map(Number);
    
    const isPreviousDay = cutoffHour > servingHour || (cutoffHour === servingHour && cutoffMinute > servingMinute);
    
    const mealDate = new Date(mealDateStr);
    const year = mealDate.getUTCFullYear();
    const month = mealDate.getUTCMonth();
    const date = mealDate.getUTCDate();
    
    const cutoffMoment = new Date(year, month, isPreviousDay ? date - 1 : date, cutoffHour, cutoffMinute, 0, 0);
    return Date.now() > cutoffMoment.getTime();
  };

  const renderMealCard = (menu: MenuItem) => {
    const booking = bookingsForDay.find((b) => b.mealTypeId === menu.mealTypeId);
    const isCutoffPassed = checkCutoffPassed(menu.mealTypeId, menu.date);
    const isLocked = !!booking?.lockedAt || booking?.status === 'LOCKED' || isCutoffPassed;
    // No booking row = implicit OPTED_IN (default). LOCKED = past cutoff but still eating.
    const isOptedIn = !booking || booking.status === 'OPTED_IN' || booking.status === 'LOCKED';
    const items = menu.items as Record<string, string[]>;

    return (
      <View key={menu.id} style={[styles.card, isLocked && styles.cardLocked]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.mealName}>{getMealTypeName(menu.mealTypeId)}</Text>
            {isLocked && (
              <View style={styles.lockedBadge}>
                <Text style={styles.lockedBadgeText}>🔒 Locked</Text>
              </View>
            )}
          </View>
          {isLocked ? (
            <View style={styles.lockedTogglePlaceholder}>
              <Text style={styles.lockedText}>Closed</Text>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleToggle(booking, menu.mealTypeId)}
              disabled={pendingToggles.has(menu.mealTypeId)}
              style={[
                styles.largeToggle, 
                isOptedIn ? styles.largeToggleIn : styles.largeToggleOut,
                pendingToggles.has(menu.mealTypeId) && { opacity: 0.5 }
              ]}
            >
              <Text style={[styles.largeToggleText, isOptedIn ? styles.largeToggleTextIn : styles.largeToggleTextOut]}>
                {isOptedIn ? '✓ OPTED IN' : '✕ OPTED OUT'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.itemsContainer}>
          {Object.entries(items).map(([category, dishes]) => (
            <View key={category} style={styles.itemRow}>
              <Text style={styles.itemCategory}>{category}: </Text>
              <Text style={styles.itemList}>
                {Array.isArray(dishes) ? dishes.join(', ') : String(dishes)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>
            Hey {user?.name?.split(' ')[0] || 'there'} 👋
          </Text>
          {user?.hostelName && (
            <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>
              {user.hostelName}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datePicker}
        contentContainerStyle={styles.datePickerContent}>
        {days.map((day) => {
          const isSelected = toLocalStr(day) === toLocalStr(selectedDay);
          const isToday = toLocalStr(day) === toLocalStr(today);
          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[styles.dayChip, isSelected && styles.dayChipSelected]}
              onPress={() => setSelectedDay(startOfDay(day))}
            >
              <Text style={[styles.dayWeek, isSelected && styles.dayTextSelected]}>
                {isToday ? 'Today' : DAYS[day.getDay()]}
              </Text>
              <Text style={[styles.dayNum, isSelected && styles.dayTextSelected]}>
                {day.getDate()} {MONTHS[day.getMonth()]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl 
            refreshing={isLoading} 
            onRefresh={() => {
              menuQuery.refetch();
              bookingsQuery.refetch();
            }} 
          />
        }
      >
        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color="#6366f1" size="large" />
            <Text style={styles.loadingText}>Loading meals…</Text>
          </View>
        )}

        {isError && !isLoading && (
          <View style={styles.center}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorMsg}>Failed to load menu. Check your connection.</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => { menuQuery.refetch(); bookingsQuery.refetch(); }}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !isError && menusForDay.length === 0 && (
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyMsg}>No menu published for this date yet.</Text>
          </View>
        )}

        {!isLoading && !isError && menusForDay.map(renderMealCard)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  greeting: { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  logoutBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#1e293b', borderRadius: 20 },
  logoutText: { color: '#94a3b8', fontSize: 13 },
  datePicker: { maxHeight: 80, flexGrow: 0 },
  datePickerContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  dayChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', alignItems: 'center',
  },
  dayChipSelected: { backgroundColor: '#4f46e5', borderColor: '#6366f1' },
  dayWeek: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  dayNum: { color: '#94a3b8', fontSize: 14, fontWeight: '700', marginTop: 2 },
  dayTextSelected: { color: '#fff' },
  content: { flex: 1 },
  contentContainer: { padding: 16, gap: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  loadingText: { color: '#64748b', marginTop: 8 },
  errorEmoji: { fontSize: 40 },
  errorMsg: { color: '#fca5a5', textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: '#4f46e5', borderRadius: 20,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyEmoji: { fontSize: 48 },
  emptyMsg: { color: '#64748b', fontSize: 15, textAlign: 'center' },
  card: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#334155',
  },
  cardLocked: { borderColor: '#475569', opacity: 0.8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  mealName: { color: '#f1f5f9', fontSize: 17, fontWeight: '700' },
  lockedBadge: {
    marginTop: 4, backgroundColor: '#1e3a5f', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  lockedBadgeText: { color: '#93c5fd', fontSize: 11, fontWeight: '600' },
  lockedTogglePlaceholder: {
    backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  lockedText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  itemsContainer: { gap: 4 },
  itemRow: { flexDirection: 'row', flexWrap: 'wrap' },
  itemCategory: { color: '#6366f1', fontSize: 13, fontWeight: '600' },
  itemList: { color: '#94a3b8', fontSize: 13, flex: 1 },
  largeToggle: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 2,
    minWidth: 120,
    alignItems: 'center',
  },
  largeToggleIn: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: '#22c55e',
  },
  largeToggleOut: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#ef4444',
  },
  largeToggleText: {
    fontWeight: '700',
    fontSize: 14,
  },
  largeToggleTextIn: {
    color: '#4ade80',
  },
  largeToggleTextOut: {
    color: '#f87171',
  }
});
