import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useProfile } from '../../src/hooks/useProfile';
import { useMenu } from '../../src/hooks/useMenu';
import { useBookings } from '../../src/hooks/useBookings';
import { useToggleBooking } from '../../src/hooks/useToggleBooking';
import { getOptOuts } from '../../src/api/optout';
import { C } from '../../constants/Colors';

import type { MenuItem, Booking } from '../../src/types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Meal header images (Unsplash free photos)
const MEAL_IMAGES: Record<string, { uri: string }> = {
  breakfast: { uri: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80' },
  lunch:     { uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80' },
  dinner:    { uri: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80' },
  default:   { uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80' },
};

function getMealImage(name: string) {
  const n = name.toLowerCase();
  if (n.includes('breakfast')) return MEAL_IMAGES.breakfast;
  if (n.includes('lunch')) return MEAL_IMAGES.lunch;
  if (n.includes('dinner') || n.includes('supper')) return MEAL_IMAGES.dinner;
  return MEAL_IMAGES.default;
}

function getMealIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('breakfast')) return 'sunny-outline';
  if (n.includes('lunch')) return 'restaurant-outline';
  if (n.includes('dinner') || n.includes('supper')) return 'moon-outline';
  return 'cafe-outline';
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDayRange(base: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

function startOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r;
}
function endOfDay(d: Date): Date {
  const r = new Date(d); r.setHours(23, 59, 59, 999); return r;
}
function toLocalStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isSameDayByString(utcIsoString: string, localDate: Date): boolean {
  return utcIsoString.startsWith(toLocalStr(localDate));
}

const CATEGORY_ICONS: Record<string, string> = {
  'Main Entrées': '🍛',
  'Side Dishes':  '🥗',
  'Condiments':   '🫙',
  'Beverages':    '☕',
  'Items':        '🍽️',
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const days = useMemo(() => getDayRange(today), [today]);
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [pendingToggles, setPendingToggles] = useState<Set<string>>(new Set());

  const rangeStart = days[0];
  const rangeEnd = endOfDay(days[6]);

  const menuQuery = useMenu(rangeStart, rangeEnd);
  const bookingsQuery = useBookings(rangeStart, rangeEnd);
  const toggleMutation = useToggleBooking();

  const optOutsQuery = useQuery({
    queryKey: ['optOuts', toLocalStr(rangeStart), toLocalStr(rangeEnd)],
    queryFn: () => getOptOuts(toLocalStr(rangeStart), toLocalStr(rangeEnd)),
  });

  const bookingsQueryKey = ['bookings', rangeStart.toISOString(), rangeEnd.toISOString()];

  useFocusEffect(
    useCallback(() => {
      menuQuery.refetch();
      bookingsQuery.refetch();
      optOutsQuery.refetch();
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

  const isCalendarOptedOut = useMemo(() => {
    if (!optOutsQuery.data) return false;
    return optOutsQuery.data.some((o) => isSameDayByString(o.date, selectedDay));
  }, [optOutsQuery.data, selectedDay]);

  const getMealTypeName = (mealTypeId: string) =>
    menuQuery.data?.mealTypes.find((mt) => mt.id === mealTypeId)?.name ?? mealTypeId;

  const getMealServing = (mealTypeId: string) => {
    const mt = menuQuery.data?.mealTypes.find((m) => m.id === mealTypeId);
    if (!mt) return '';
    const fmt = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      const s = h >= 12 ? 'PM' : 'AM';
      return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${s}`;
    };
    return `${fmt(mt.servingStart)} – ${fmt(mt.servingEnd)}`;
  };

  const handleToggle = (booking: Booking | undefined, mealTypeId: string) => {
    if (booking?.lockedAt) return;
    if (pendingToggles.has(mealTypeId)) return;

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
    const isOptedIn = !booking || booking.status === 'OPTED_IN' || booking.status === 'LOCKED';
    const isPending = pendingToggles.has(menu.mealTypeId);
    const mealName = getMealTypeName(menu.mealTypeId);
    const serving = getMealServing(menu.mealTypeId);
    const items = menu.items as Record<string, string[]>;
    const mealImage = getMealImage(mealName);

    return (
      <View key={menu.id} style={[styles.card, isLocked && styles.cardLocked]}>
        {/* Meal Hero Image */}
        <View style={styles.cardImageWrapper}>
          <Image
            source={mealImage}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={styles.cardImageOverlay} />
          <View style={styles.cardImageContent}>
            <View style={styles.mealIconBadge}>
              <Ionicons name={getMealIcon(mealName) as any} size={16} color={C.textSub} />
            </View>
            <Text style={styles.cardMealTitle}>{mealName}</Text>
            {serving !== '' && (
              <Text style={styles.cardServing}>{serving}</Text>
            )}
          </View>
        </View>

        {/* Opt In/Out Toggle */}
        <View style={styles.cardBody}>
          <View style={styles.toggleRow}>
            {isLocked ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={styles.toggleLabel}>
                    {booking?.status === 'OPTED_OUT' ? '❌ Opted out' : '🔒 Booking locked'}
                  </Text>
                  <Text style={styles.toggleSub}>
                    {booking?.status === 'OPTED_OUT' ? 'Closed · You will not be served' : 'Cutoff passed · Meal is closed'}
                  </Text>
                </View>
                <View style={styles.lockedBadge}>
                  <Text style={styles.lockedBadgeText}>Closed</Text>
                </View>
              </View>
            ) : (
              <>
                <View>
                  <Text style={styles.toggleLabel}>
                    {isOptedIn ? '✅ You\'re opted in' : '❌ Opted out'}
                  </Text>
                  <Text style={styles.toggleSub}>
                    {isCalendarOptedOut && !isOptedIn
                      ? 'Marked in Calendar (Tap to re-opt in)'
                      : isOptedIn
                      ? 'Tap to opt out'
                      : 'Tap to opt back in'}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleToggle(booking, menu.mealTypeId)}
                  disabled={isPending}
                  style={[
                    styles.toggleBtn,
                    isOptedIn ? styles.toggleBtnIn : styles.toggleBtnOut,
                    isPending && { opacity: 0.5 },
                  ]}
                >
                  {isPending ? (
                    <ActivityIndicator size="small" color={isOptedIn ? C.success : C.danger} />
                  ) : (
                    <Text style={[styles.toggleBtnText, isOptedIn ? styles.toggleBtnTextIn : styles.toggleBtnTextOut]}>
                      {isOptedIn ? 'OPT OUT' : 'OPT IN'}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Menu Categories */}
          <View style={styles.divider} />
          <View style={styles.itemsContainer}>
            {Object.entries(items).map(([category, dishes]) => (
              <View key={category} style={styles.categoryBlock}>
                <Text style={styles.categoryLabel}>
                  {CATEGORY_ICONS[category] || '🍽️'} {category}
                </Text>
                <Text style={styles.categoryItems}>
                  {Array.isArray(dishes) ? dishes.join(' · ') : String(dishes)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const selectedDateStr = `${DAYS[selectedDay.getDay()]}, ${selectedDay.getDate()} ${MONTHS[selectedDay.getMonth()]}`;

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.greeting}>{getGreeting()}, {user?.name?.split(' ')[0] || 'there'}</Text>
            {user?.hostelName && (
              <Text style={styles.hostelName}>{user.hostelName}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push('/profile')} style={[styles.logoutBtn, profile?.avatarBase64 ? { padding: 0, overflow: 'hidden', borderWidth: 0 } : {}]}>
          {profile?.avatarBase64 ? (
            <Image source={{ uri: `data:image/jpeg;base64,${profile.avatarBase64}` }} style={{ width: 34, height: 34, borderRadius: 10 }} />
          ) : (
            <Ionicons name="person-outline" size={18} color={C.textMuted} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Day Selector ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.datePicker}
        contentContainerStyle={styles.datePickerContent}
      >
        {days.map((day) => {
          const isSelected = toLocalStr(day) === toLocalStr(selectedDay);
          const isToday = toLocalStr(day) === toLocalStr(today);
          const isOptedOutDay = optOutsQuery.data?.some((o) => isSameDayByString(o.date, day)) ?? false;

          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[
                styles.dayChip,
                isSelected && styles.dayChipSelected,
                isOptedOutDay && !isSelected && { borderColor: 'rgba(194,65,12,0.3)', backgroundColor: 'rgba(194,65,12,0.06)' },
              ]}
              onPress={() => setSelectedDay(startOfDay(day))}
            >
              <Text style={[styles.dayWeek, isSelected && styles.dayWeekSelected, isOptedOutDay && !isSelected && { color: '#c2410c' }]}>
                {isToday ? 'Today' : DAYS[day.getDay()]}
              </Text>
              <Text style={[styles.dayNum, isSelected && styles.dayNumSelected, isOptedOutDay && !isSelected && { color: '#c2410c' }]}>
                {day.getDate()}
              </Text>
              <View style={[
                styles.dayDot,
                isSelected && styles.dayDotActive,
                isOptedOutDay && !isSelected && { backgroundColor: '#c2410c' },
              ]} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Content ── */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => { menuQuery.refetch(); bookingsQuery.refetch(); }}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        {/* Date heading */}
        <View style={styles.dateHeading}>
          <Ionicons name="calendar-outline" size={14} color={C.textMuted} />
          <Text style={styles.dateHeadingText}>{selectedDateStr}</Text>
        </View>

        {/* ── Scheduled Absence Banner (if day is opted out) ── */}
        {isCalendarOptedOut && (
          <View style={styles.calendarBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Ionicons name="calendar" size={16} color="#c2410c" />
              <Text style={styles.calendarBannerTitle}>Scheduled Day Absence</Text>
            </View>
            <Text style={styles.calendarBannerText}>
              You have marked yourself absent for this date via the Calendar. All 3 meals are opted out and won't be charged.
            </Text>
            <TouchableOpacity
              style={styles.calendarBannerBtn}
              onPress={() => router.push('/(app)/opt-out')}
            >
              <Text style={styles.calendarBannerBtnText}>Manage in Calendar →</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading && (
          <View style={styles.center}>
            <ActivityIndicator color={C.primary} size="large" />
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
            <Text style={styles.emptyTitle}>No menu yet</Text>
            <Text style={styles.emptyMsg}>No meals have been published for this date.</Text>
          </View>
        )}

        {!isLoading && !isError && menusForDay.map(renderMealCard)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },

  /* Top Bar */
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
    backgroundColor: C.bg,
  },
  topBarLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoImage: {
    width: 36, height: 36, borderRadius: 10,
  },
  greeting:    { fontSize: 16, fontWeight: '700', color: C.text },
  hostelName:  { fontSize: 12, color: C.textMuted, marginTop: 1 },
  logoutBtn:   { padding: 8, borderRadius: 10, backgroundColor: C.surface2 },

  /* Day Picker */
  datePicker:        { maxHeight: 90, flexGrow: 0, backgroundColor: C.bg },
  datePickerContent: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  dayChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', minWidth: 60,
  },
  dayChipSelected: { backgroundColor: C.primary, borderColor: C.primary },
  dayWeek:         { color: C.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  dayWeekSelected: { color: 'rgba(255,255,255,0.7)' },
  dayNum:          { color: C.text, fontSize: 18, fontWeight: '800', marginTop: 2 },
  dayNumSelected:  { color: '#fff' },
  dayDot:          { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent', marginTop: 4 },
  dayDotActive:    { backgroundColor: '#d97706' },

  /* Content */
  content:          { flex: 1, backgroundColor: C.bg },
  contentContainer: { padding: 16, gap: 16, paddingBottom: 40 },

  dateHeading: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4,
  },
  dateHeadingText: {
    fontSize: 12, fontWeight: '700', color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase',
  },

  /* States */
  center:      { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  loadingText: { color: C.textMuted, marginTop: 8, fontSize: 14 },
  errorEmoji:  { fontSize: 40 },
  errorMsg:    { color: C.danger, textAlign: 'center', paddingHorizontal: 32, fontSize: 14 },
  retryBtn: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 10,
    backgroundColor: C.primary, borderRadius: 20,
  },
  retryText:  { color: '#fff', fontWeight: '600' },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginTop: 4 },
  emptyMsg:   { color: C.textMuted, fontSize: 14, textAlign: 'center', maxWidth: 260, lineHeight: 20 },

  /* Meal Card */
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardLocked: { opacity: 0.85 },

  /* Card Image */
  cardImageWrapper: { height: 140, position: 'relative' },
  cardImage:        { width: '100%', height: '100%' },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(29,15,5,0.52)',
  },
  cardImageContent: {
    position: 'absolute', bottom: 14, left: 16, right: 16,
  },
  mealIconBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  cardMealTitle: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  cardServing:   { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 3, fontWeight: '500' },

  /* Card Body */
  cardBody: { padding: 16 },

  /* Toggle row */
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: C.text },
  toggleSub:   { fontSize: 12, color: C.textMuted, marginTop: 2 },
  toggleBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
    minWidth: 90, alignItems: 'center',
  },
  toggleBtnIn:      { backgroundColor: C.successBg, borderColor: C.success },
  toggleBtnOut:     { backgroundColor: C.dangerBg, borderColor: C.danger },
  toggleBtnText:    { fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },
  toggleBtnTextIn:  { color: C.success },
  toggleBtnTextOut: { color: C.danger },

  lockedBadge: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border,
  },
  lockedBadgeText: { color: C.textMuted, fontSize: 12, fontWeight: '600' },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },

  /* Menu Categories */
  itemsContainer: { gap: 10 },
  categoryBlock:  {},
  categoryLabel: {
    fontSize: 12, fontWeight: '700', color: C.accent,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  categoryItems: {
    fontSize: 13, color: C.textSub, lineHeight: 19,
  },

  /* Calendar Opt-Out Banner */
  calendarBanner: {
    backgroundColor: '#fff7ed', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#fed7aa',
    marginBottom: 4,
  },
  calendarBannerTitle: { fontSize: 14, fontWeight: '800', color: '#c2410c' },
  calendarBannerText:  { fontSize: 12, color: '#9a3412', lineHeight: 17, marginVertical: 4 },
  calendarBannerBtn: {
    alignSelf: 'flex-start', marginTop: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#ffedd5', borderWidth: 1, borderColor: '#fdba74',
  },
  calendarBannerBtnText: { fontSize: 11, fontWeight: '700', color: '#c2410c' },
});

