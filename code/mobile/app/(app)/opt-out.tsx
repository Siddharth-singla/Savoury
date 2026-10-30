import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getOptOuts, setOptOuts, removeOptOut, removeOptOutRange, MealOptOut,
} from '../../src/api/optout';
import { C } from '../../constants/Colors';

const CALENDAR_HERO = {
  uri: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&q=80',
};

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isDateInPast(d: Date): boolean {
  const todayStr = toDateString(new Date());
  return toDateString(d) < todayStr;
}

export default function OptOutCalendarScreen() {
  const queryClient = useQueryClient();
  const [viewDate, setViewDate] = useState(() => new Date());

  // ── Opt-out range selection ──────────────────────────────────────
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  // ── Re-opt-in range selection (in the schedule list) ────────────
  const [reOptRangeStart, setReOptRangeStart] = useState<string | null>(null);
  const [reOptRangeEnd, setReOptRangeEnd] = useState<string | null>(null);
  const [reOptMode, setReOptMode] = useState<'single' | 'range'>('single');

  // ── Per-item remove loading state (Bug 1 fix) ───────────────────
  const [removingDate, setRemovingDate] = useState<string | null>(null);

  // Query window
  const queryStart = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    return toDateString(d);
  }, []);

  const queryEnd = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    d.setDate(28);
    return toDateString(d);
  }, []);

  const { data: optOuts = [], isLoading, refetch } = useQuery<MealOptOut[]>({
    queryKey: ['optOuts', queryStart, queryEnd],
    queryFn: () => getOptOuts(queryStart, queryEnd),
  });

  useFocusEffect(
    useCallback(() => { refetch(); }, [refetch])
  );

  const optedOutDatesSet = useMemo(
    () => new Set(optOuts.map(o => o.date.split('T')[0])),
    [optOuts],
  );

  // ── Mutations ───────────────────────────────────────────────────

  const setOptOutMutation = useMutation({
    mutationFn: ({ start, end }: { start: string; end: string }) => setOptOuts(start, end),
    onSuccess: (data) => {
      // Bug 4 fix: guard skippedClosedMeals
      const skipped = data.skippedClosedMeals ?? 0;
      let msg = `Successfully opted out of ${data.mealsOptedOut ?? 'all'} open meal(s) across ${data.count} day(s).`;
      if (skipped > 0) {
        msg += `\n\nNote: ${skipped} meal(s) whose cutoff had already passed were kept as-is.`;
      }
      Alert.alert('Opt-Out Confirmed', msg);
      setRangeStart(null);
      setRangeEnd(null);
      queryClient.invalidateQueries({ queryKey: ['optOuts'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit opt-out dates.');
      // Invalidate even on error — the server may have partially written records
      queryClient.invalidateQueries({ queryKey: ['optOuts'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  // Bug 1 fix: single-date remove tracks which date is loading
  const removeSingleMutation = useMutation({
    mutationFn: (date: string) => removeOptOut(date),
    onSuccess: () => {
      setRemovingDate(null);
      Alert.alert('Re-opted In', 'You have successfully opted back into meals for this date.');
      queryClient.invalidateQueries({ queryKey: ['optOuts'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err: any) => {
      setRemovingDate(null);
      Alert.alert('Error', err.response?.data?.error || 'Failed to remove opt-out.');
    },
  });

  // Bug 3 fix: range remove mutation
  const removeRangeMutation = useMutation({
    mutationFn: ({ start, end }: { start: string; end: string }) =>
      removeOptOutRange(start, end),
    onSuccess: (data) => {
      Alert.alert(
        'Re-opted In',
        `Successfully re-opted into ${data.reOptedInMeals} meal(s) across ${data.daysReOptedIn} day(s).`,
      );
      setReOptRangeStart(null);
      setReOptRangeEnd(null);
      setRangeStart(null);
      setRangeEnd(null);
      queryClient.invalidateQueries({ queryKey: ['optOuts'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error || 'Failed to remove opt-outs for the selected range.');
    },
  });

  // ── Calendar matrix ─────────────────────────────────────────────
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: Array<{ date: Date; dateStr: string; isCurrentMonth: boolean }> = [];

    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      days.push({ date: d, dateStr: toDateString(d), isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, dateStr: toDateString(d), isCurrentMonth: true });
    }
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        days.push({ date: d, dateStr: toDateString(d), isCurrentMonth: false });
      }
    }
    return days;
  }, [year, month]);

  // ── Bug 2 fix: smarter range selection ──────────────────────────
  const handleDatePress = (dateStr: string) => {
    const d = parseDateString(dateStr);
    if (isDateInPast(d)) {
      Alert.alert('Past Date', 'Cannot modify meal status for dates in the past.');
      return;
    }

    if (!rangeStart) {
      // No selection yet — start a new range
      setRangeStart(dateStr);
      setRangeEnd(null);
      return;
    }

    if (rangeStart && !rangeEnd) {
      // One bound set — complete the range
      if (dateStr < rangeStart) {
        // Tapped before start: make this the new start, keep old start as end
        setRangeEnd(rangeStart);
        setRangeStart(dateStr);
      } else if (dateStr === rangeStart) {
        // Tapped same date: deselect
        setRangeStart(null);
      } else {
        setRangeEnd(dateStr);
      }
      return;
    }

    // Both bounds set — start fresh
    setRangeStart(dateStr);
    setRangeEnd(null);
  };

  const effectiveStart = useMemo(() => {
    if (!rangeStart) return null;
    if (!rangeEnd) return rangeStart;
    return rangeStart <= rangeEnd ? rangeStart : rangeEnd;
  }, [rangeStart, rangeEnd]);

  const effectiveEnd = useMemo(() => {
    if (!rangeStart) return null;
    if (!rangeEnd) return rangeStart;
    return rangeStart <= rangeEnd ? rangeEnd : rangeStart;
  }, [rangeStart, rangeEnd]);

  const selectedCount = useMemo(() => {
    if (!effectiveStart || !effectiveEnd) return 0;
    const s = parseDateString(effectiveStart);
    const e = parseDateString(effectiveEnd);
    return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [effectiveStart, effectiveEnd]);

  // Find all opted-out dates that fall inside the selected date range
  const optedOutDatesInRange = useMemo(() => {
    if (!effectiveStart || !effectiveEnd) return [];
    return optOuts
      .map(o => o.date.split('T')[0])
      .filter(d => d >= effectiveStart && d <= effectiveEnd);
  }, [optOuts, effectiveStart, effectiveEnd]);

  // If the selection contains ANY opted-out dates, show Opt-In!
  const isOptInSelection = Boolean(
    (effectiveStart && optedOutDatesSet.has(effectiveStart)) ||
    (effectiveEnd && optedOutDatesSet.has(effectiveEnd)) ||
    optedOutDatesInRange.length > 0
  );

  console.log('[OptOut UI State]', {
    rangeStart,
    rangeEnd,
    effectiveStart,
    effectiveEnd,
    isOptInSelection,
    optedOutCount: optedOutDatesInRange.length,
  });

  const handleApplyOptOut = () => {
    if (!effectiveStart || !effectiveEnd) return;

    Alert.alert(
      'Confirm Meal Opt-Out',
      `Opt out of all meals (Breakfast, Lunch & Dinner) from ${effectiveStart} to ${effectiveEnd} (${selectedCount} days)?\n\nNo meal deductions will take place on these dates.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: () => setOptOutMutation.mutate({ start: effectiveStart, end: effectiveEnd }),
        },
      ],
    );
  };

  const handleApplyCalendarReOptIn = () => {
    if (!effectiveStart || !effectiveEnd) return;

    Alert.alert(
      'Confirm Meal Opt-In',
      `Re-opt into all meals (Breakfast, Lunch & Dinner) from ${effectiveStart} to ${effectiveEnd} (${selectedCount} ${selectedCount === 1 ? 'day' : 'days'})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => removeRangeMutation.mutate({ start: effectiveStart, end: effectiveEnd }),
        },
      ],
    );
  };

  const handleQuickSelect = (days: number) => {
    const today = new Date();
    const startStr = toDateString(today);
    const end = new Date(today);
    end.setDate(today.getDate() + (days - 1));
    setRangeStart(startStr);
    setRangeEnd(toDateString(end));
  };

  // ── Re-opt-in range helpers ──────────────────────────────────────
  const handleReOptDatePress = (dateStr: string) => {
    if (!reOptRangeStart) {
      setReOptRangeStart(dateStr);
      setReOptRangeEnd(null);
      return;
    }
    if (reOptRangeStart && !reOptRangeEnd) {
      if (dateStr < reOptRangeStart) {
        setReOptRangeEnd(reOptRangeStart);
        setReOptRangeStart(dateStr);
      } else if (dateStr === reOptRangeStart) {
        setReOptRangeStart(null);
      } else {
        setReOptRangeEnd(dateStr);
      }
      return;
    }
    setReOptRangeStart(dateStr);
    setReOptRangeEnd(null);
  };

  const handleApplyReOptRange = () => {
    if (!reOptRangeStart) return;
    const end = reOptRangeEnd || reOptRangeStart;
    const count =
      Math.round(
        (parseDateString(end).getTime() - parseDateString(reOptRangeStart).getTime()) /
        (1000 * 60 * 60 * 24),
      ) + 1;

    Alert.alert(
      'Re-opt Into Meals',
      `Re-opt into all open meals from ${reOptRangeStart} to ${end} (${count} days)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () =>
            removeRangeMutation.mutate({ start: reOptRangeStart, end }),
        },
      ],
    );
  };

  const todayStr = toDateString(new Date());
  const upcomingOptOuts = useMemo(
    () =>
      optOuts
        .filter(o => o.date.split('T')[0] >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [optOuts, todayStr],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero Banner ── */}
        <View style={styles.heroCard}>
          <Image source={CALENDAR_HERO} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <View style={styles.heroTag}>
              <Ionicons name="calendar" size={13} color="#fff" />
              <Text style={styles.heroTagText}>MEAL ABSENCE PLANNER</Text>
            </View>
            <Text style={styles.heroTitle}>Opt-Out Calendar</Text>
            <Text style={styles.heroSubtitle}>
              Going home or stepping out? Mark your dates to skip all 3 meals with zero balance deductions.
            </Text>
          </View>
        </View>

        {/* ── Cutoff Notice Pill ── */}
        <View style={styles.cutoffPill}>
          <Ionicons name="time-outline" size={16} color="#b45309" />
          <Text style={styles.cutoffText}>
            <Text style={{ fontWeight: '700' }}>9:00 PM Daily Cutoff:</Text> Today's meals can be opted out before 9 PM.
          </Text>
        </View>

        {/* ── Quick Preset Chips ── */}
        <View style={styles.presetsRow}>
          {([1, 2, 3, 7] as const).map((days) => (
            <TouchableOpacity key={days} style={styles.presetChip} onPress={() => handleQuickSelect(days)}>
              <Text style={styles.presetChipText}>
                {days === 1 ? '1 Day' : days === 2 ? 'Weekend (2 Days)' : days === 7 ? '1 Week' : `${days} Days`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Interactive Calendar Card ── */}
        <View style={styles.calendarCard}>
          {/* Month Header Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity
              onPress={() => setViewDate(new Date(year, month - 1, 1))}
              style={styles.navBtn}
            >
              <Ionicons name="chevron-back" size={18} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{MONTHS_NAMES[month]} {year}</Text>
            <TouchableOpacity
              onPress={() => setViewDate(new Date(year, month + 1, 1))}
              style={styles.navBtn}
            >
              <Ionicons name="chevron-forward" size={18} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* Days of Week Header */}
          <View style={styles.weekDaysRow}>
            {DAYS_SHORT.map(d => (
              <Text key={d} style={styles.weekDayLabel}>{d}</Text>
            ))}
          </View>

          {/* Grid of Dates */}
          <View style={styles.daysGrid}>
            {calendarDays.map(({ date, dateStr, isCurrentMonth }) => {
              const isPast = isDateInPast(date);
              const isOptedOut = optedOutDatesSet.has(dateStr);
              const isStart = rangeStart === dateStr;
              const isEnd = rangeEnd === dateStr;
              const inRange =
                effectiveStart &&
                effectiveEnd &&
                dateStr >= effectiveStart &&
                dateStr <= effectiveEnd;

              return (
                <TouchableOpacity
                  key={dateStr}
                  onPress={() => handleDatePress(dateStr)}
                  disabled={!isCurrentMonth}
                  style={[
                    styles.dayCell,
                    !isCurrentMonth && styles.dayCellOutside,
                    inRange && (isOptInSelection ? styles.dayCellInRangeSuccess : styles.dayCellInRange),
                    (isStart || isEnd) && (isOptInSelection ? styles.dayCellSelectedSuccess : styles.dayCellSelected),
                    isOptedOut && !inRange && styles.dayCellOptedOut,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !isCurrentMonth && styles.dayTextOutside,
                      isPast && isCurrentMonth && styles.dayTextPast,
                      inRange && (isOptInSelection ? styles.dayTextInRangeSuccess : styles.dayTextInRange),
                      (isStart || isEnd) && styles.dayTextSelected,
                      isOptedOut && !inRange && styles.dayTextOptedOut,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                  {isOptedOut && (
                    <View
                      style={[
                        styles.optedOutDot,
                        (isStart || isEnd) && { backgroundColor: '#fff' },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#c2410c' }]} />
              <Text style={styles.legendLabel}>Opted Out</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: C.primary }]} />
              <Text style={styles.legendLabel}>Selected Range</Text>
            </View>
          </View>
        </View>

        {/* ── Selection Action Box ── */}
        {effectiveStart && (
          <View style={[
            styles.actionCard,
            isOptInSelection && styles.actionCardSuccess,
          ]}>
            <View style={styles.actionInfo}>
              <Ionicons
                name={isOptInSelection ? 'restaurant-outline' : 'calendar-outline'}
                size={22}
                color={isOptInSelection ? C.success : C.primary}
              />
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.actionTitle,
                  isOptInSelection && { color: C.success },
                ]}>
                  {effectiveStart !== effectiveEnd ? `${effectiveStart} → ${effectiveEnd}` : effectiveStart}
                </Text>
                <Text style={styles.actionSubtitle}>
                  {isOptInSelection
                    ? `${selectedCount} ${selectedCount === 1 ? 'day' : 'days'} selected • Tap below to re-opt in`
                    : `${selectedCount} ${selectedCount === 1 ? 'day' : 'days'} selected (All 3 meals opted out)`}
                </Text>
              </View>
            </View>
            <View style={styles.actionBtnRow}>
              <TouchableOpacity
                style={styles.cancelSelectionBtn}
                onPress={() => { setRangeStart(null); setRangeEnd(null); }}
              >
                <Text style={styles.cancelSelectionText}>Clear</Text>
              </TouchableOpacity>

              {isOptInSelection ? (
                <TouchableOpacity
                  style={[styles.confirmOptOutBtn, { backgroundColor: C.success }]}
                  onPress={handleApplyCalendarReOptIn}
                  disabled={removeRangeMutation.isPending}
                >
                  {removeRangeMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text style={styles.confirmOptOutText}>Opt In ({selectedCount}d)</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.confirmOptOutBtn}
                  onPress={handleApplyOptOut}
                  disabled={setOptOutMutation.isPending}
                >
                  {setOptOutMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text style={styles.confirmOptOutText}>Opt Out ({selectedCount}d)</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Scheduled Absences Section ── */}
        <View style={styles.scheduleSection}>
          <View style={styles.scheduleHeader}>
            <Ionicons name="list-outline" size={18} color={C.primary} />
            <Text style={styles.scheduleTitle}>YOUR SCHEDULED ABSENCES</Text>
            <Text style={styles.scheduleCount}>{upcomingOptOuts.length}</Text>
          </View>

          {/* Re-opt-in mode toggle */}
          {upcomingOptOuts.length > 0 && (
            <View style={styles.reOptModeRow}>
              <TouchableOpacity
                style={[styles.reOptModeBtn, reOptMode === 'single' && styles.reOptModeBtnActive]}
                onPress={() => {
                  setReOptMode('single');
                  setReOptRangeStart(null);
                  setReOptRangeEnd(null);
                }}
              >
                <Text style={[styles.reOptModeBtnText, reOptMode === 'single' && styles.reOptModeBtnTextActive]}>
                  Single Date
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reOptModeBtn, reOptMode === 'range' && styles.reOptModeBtnActive]}
                onPress={() => {
                  setReOptMode('range');
                  setReOptRangeStart(null);
                  setReOptRangeEnd(null);
                }}
              >
                <Text style={[styles.reOptModeBtnText, reOptMode === 'range' && styles.reOptModeBtnTextActive]}>
                  Date Range
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Range re-opt-in action box */}
          {reOptMode === 'range' && reOptRangeStart && (
            <View style={styles.reOptRangeCard}>
              <View style={styles.actionInfo}>
                <Ionicons name="arrow-undo-circle-outline" size={20} color={C.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionTitle, { color: C.accent }]}>
                    {reOptRangeEnd
                      ? `${reOptRangeStart} → ${reOptRangeEnd}`
                      : `${reOptRangeStart} (tap another date to set end)`}
                  </Text>
                  <Text style={styles.actionSubtitle}>Tap dates below to set range, then confirm</Text>
                </View>
              </View>
              <View style={styles.actionBtnRow}>
                <TouchableOpacity
                  style={styles.cancelSelectionBtn}
                  onPress={() => { setReOptRangeStart(null); setReOptRangeEnd(null); }}
                >
                  <Text style={styles.cancelSelectionText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmOptOutBtn, { backgroundColor: C.accent }]}
                  onPress={handleApplyReOptRange}
                  disabled={removeRangeMutation.isPending}
                >
                  {removeRangeMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="arrow-undo-outline" size={16} color="#fff" />
                      <Text style={styles.confirmOptOutText}>Re-Opt In</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isLoading ? (
            <ActivityIndicator color={C.primary} style={{ marginVertical: 20 }} />
          ) : upcomingOptOuts.length === 0 ? (
            <View style={styles.emptySchedule}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>No Upcoming Absences</Text>
              <Text style={styles.emptyText}>
                You are currently scheduled to receive all meals. Use the calendar above to mark dates you'll be away.
              </Text>
            </View>
          ) : (
            upcomingOptOuts.map((item) => {
              const itemDateStr = item.date.split('T')[0];
              const d = parseDateString(itemDateStr);
              const formattedDate = d.toLocaleDateString('en-IN', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
              });

              // Range mode: highlight selected range in the list
              const effectiveReOptEnd = reOptRangeEnd || reOptRangeStart;
              const isInReOptRange =
                reOptMode === 'range' &&
                reOptRangeStart &&
                effectiveReOptEnd &&
                itemDateStr >= reOptRangeStart &&
                itemDateStr <= effectiveReOptEnd;
              const isReOptStart = reOptMode === 'range' && reOptRangeStart === itemDateStr;
              const isReOptEnd = reOptMode === 'range' && reOptRangeEnd === itemDateStr;

              // Bug 1 fix: only this item's button disables when it's loading
              const isThisRemoving = removingDate === itemDateStr && removeSingleMutation.isPending;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.scheduleItem,
                    isInReOptRange && styles.scheduleItemHighlighted,
                    (isReOptStart || isReOptEnd) && styles.scheduleItemRangeEnd,
                  ]}
                  activeOpacity={reOptMode === 'range' ? 0.7 : 1}
                  onPress={() => reOptMode === 'range' && handleReOptDatePress(itemDateStr)}
                >
                  <View style={styles.scheduleItemLeft}>
                    <View style={[
                      styles.dateBadge,
                      (isReOptStart || isReOptEnd) && { backgroundColor: C.accent, borderColor: C.accent },
                    ]}>
                      <Text style={[
                        styles.dateBadgeMonth,
                        (isReOptStart || isReOptEnd) && { color: '#fff' },
                      ]}>
                        {MONTHS_NAMES[d.getMonth()].slice(0, 3)}
                      </Text>
                      <Text style={[
                        styles.dateBadgeDay,
                        (isReOptStart || isReOptEnd) && { color: '#fff' },
                      ]}>
                        {d.getDate()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scheduleItemDate}>{formattedDate}</Text>
                      <Text style={styles.scheduleItemMeals}>Absence Scheduled</Text>
                    </View>
                  </View>

                  {reOptMode === 'single' && (
                    <TouchableOpacity
                      style={styles.reOptInBtn}
                      onPress={() => {
                        Alert.alert(
                          'Cancel Opt-Out',
                          `Re-opt into open meals for ${formattedDate}? (Closed meals past cutoff remain locked)`,
                          [
                            { text: 'Keep Opted Out', style: 'cancel' },
                            {
                              text: 'Re-Opt In',
                              onPress: () => {
                                setRemovingDate(itemDateStr);
                                removeSingleMutation.mutate(itemDateStr);
                              },
                            },
                          ],
                        );
                      }}
                      disabled={isThisRemoving}
                    >
                      {isThisRemoving ? (
                        <ActivityIndicator size="small" color={C.accent} />
                      ) : (
                        <>
                          <Ionicons name="arrow-undo-outline" size={14} color={C.accent} />
                          <Text style={styles.reOptInText}>Re-Opt In</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {reOptMode === 'range' && (isReOptStart || isReOptEnd) && (
                    <View style={[styles.reOptInBtn, { backgroundColor: 'rgba(124,58,30,0.18)' }]}>
                      <Ionicons name="radio-button-on-outline" size={14} color={C.accent} />
                      <Text style={styles.reOptInText}>{isReOptStart ? 'Start' : 'End'}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 40 },

  /* Hero Card */
  heroCard: {
    height: 190, margin: 16, borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  heroImage:   { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(28,15,6,0.68)' },
  heroContent: { flex: 1, justifyContent: 'flex-end', padding: 18 },
  heroTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 6,
  },
  heroTagText:  { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  heroTitle:    { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 4 },
  heroSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.78)', lineHeight: 17 },

  /* Cutoff pill */
  cutoffPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef3c7', marginHorizontal: 16, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: '#fde68a',
  },
  cutoffText: { fontSize: 12, color: '#92400e', flex: 1, lineHeight: 16 },

  /* Presets */
  presetsRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 16, flexWrap: 'wrap',
  },
  presetChip: {
    backgroundColor: C.surface, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
  },
  presetChipText: { fontSize: 12, fontWeight: '600', color: C.textSub },

  /* Calendar Card */
  calendarCard: {
    backgroundColor: C.surface, marginHorizontal: 16, borderRadius: 20,
    padding: 16, borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, marginBottom: 16,
  },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16,
  },
  navBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center',
  },
  monthTitle: { fontSize: 16, fontWeight: '800', color: C.text, fontFamily: 'Georgia' },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  weekDayLabel: {
    width: '14.28%', textAlign: 'center', fontSize: 11, fontWeight: '700',
    color: C.textMuted, textTransform: 'uppercase',
  },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%', height: 42, alignItems: 'center', justifyContent: 'center',
    marginVertical: 2, borderRadius: 10,
  },
  dayCellOutside:  { opacity: 0.25 },
  dayCellInRange:          { backgroundColor: 'rgba(45,27,14,0.08)', borderRadius: 0 },
  dayCellInRangeSuccess:   { backgroundColor: 'rgba(58,107,58,0.12)', borderRadius: 0 },
  dayCellSelected:         { backgroundColor: C.primary, borderRadius: 10 },
  dayCellSelectedSuccess:  { backgroundColor: C.success, borderRadius: 10 },
  dayCellOptedOut:         { backgroundColor: 'rgba(194,65,12,0.12)' },
  dayText:                 { fontSize: 14, fontWeight: '600', color: C.text },
  dayTextOutside:          { color: C.textMuted },
  dayTextPast:             { color: C.textMuted, opacity: 0.45 },
  dayTextInRange:          { color: C.primary, fontWeight: '700' },
  dayTextInRangeSuccess:   { color: C.success, fontWeight: '700' },
  dayTextSelected:         { color: '#ffffff', fontWeight: '800' },
  dayTextOptedOut:         { color: '#c2410c', fontWeight: '700' },
  optedOutDot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: '#c2410c',
    position: 'absolute', bottom: 4,
  },

  /* Legend */
  legendRow: {
    flexDirection: 'row', gap: 16, justifyContent: 'center',
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
  },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: C.textMuted, fontWeight: '500' },

  /* Action Card */
  actionCard: {
    backgroundColor: C.surface, marginHorizontal: 16, borderRadius: 16,
    padding: 16, borderWidth: 1.5, borderColor: C.primary, marginBottom: 16,
    shadowColor: C.primary, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  actionCardSuccess: {
    borderColor: C.success,
    shadowColor: C.success,
  },
  actionInfo:           { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  actionTitle:          { fontSize: 15, fontWeight: '800', color: C.primary },
  actionSubtitle:       { fontSize: 12, color: C.textMuted, marginTop: 2 },
  actionBtnRow:         { flexDirection: 'row', gap: 10 },
  cancelSelectionBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center',
  },
  cancelSelectionText:  { color: C.textSub, fontSize: 13, fontWeight: '700' },
  confirmOptOutBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 10, backgroundColor: C.primary,
  },
  confirmOptOutText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  /* Schedule Section */
  scheduleSection: { paddingHorizontal: 16 },
  scheduleHeader:  {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  scheduleTitle: {
    fontSize: 11, fontWeight: '800', letterSpacing: 1, color: C.textMuted,
    textTransform: 'uppercase', flex: 1,
  },
  scheduleCount: {
    fontSize: 11, fontWeight: '700', color: C.primary,
    backgroundColor: C.surface2, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
  },

  /* Re-opt-in mode toggle */
  reOptModeRow: {
    flexDirection: 'row', gap: 8, marginBottom: 12,
    backgroundColor: C.surface2, borderRadius: 12, padding: 4,
  },
  reOptModeBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
  },
  reOptModeBtnActive: { backgroundColor: C.surface, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  reOptModeBtnText:       { fontSize: 13, fontWeight: '600', color: C.textMuted },
  reOptModeBtnTextActive: { color: C.text, fontWeight: '700' },

  /* Re-opt-in range card */
  reOptRangeCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: C.accent, marginBottom: 12,
    shadowColor: C.accent, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },

  /* Schedule list items */
  emptySchedule: {
    backgroundColor: C.surface, borderRadius: 16, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
  emptyText:  { fontSize: 12, color: C.textMuted, textAlign: 'center', lineHeight: 18 },

  scheduleItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface, borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: C.border,
  },
  scheduleItemHighlighted: {
    backgroundColor: 'rgba(124,58,30,0.06)',
    borderColor: 'rgba(124,58,30,0.2)',
  },
  scheduleItemRangeEnd: {
    borderColor: C.accent,
    borderWidth: 1.5,
  },
  scheduleItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  dateBadge: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  dateBadgeMonth: { fontSize: 10, fontWeight: '700', color: C.accent, textTransform: 'uppercase' },
  dateBadgeDay:   { fontSize: 16, fontWeight: '800', color: C.text, lineHeight: 18 },
  scheduleItemDate:  { fontSize: 14, fontWeight: '700', color: C.text },
  scheduleItemMeals: { fontSize: 11, color: C.textMuted, marginTop: 2 },

  reOptInBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(124,58,30,0.08)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(124,58,30,0.2)',
    minWidth: 80, justifyContent: 'center',
  },
  reOptInText: { fontSize: 12, fontWeight: '700', color: C.accent },
});
