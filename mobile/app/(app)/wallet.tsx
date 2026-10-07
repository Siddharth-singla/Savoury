import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getWalletBalance, getWalletTransactions, requestCashout, getSemesterEndDate, WalletTransaction } from '../../src/api/wallet';
import { C } from '../../constants/Colors';

const TX_TYPE_LABELS: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  TOPUP:          { label: 'Top Up',         icon: 'add-circle-outline', color: '#3a6b3a', bgColor: 'rgba(58,107,58,0.1)' },
  MEAL_DEDUCTION: { label: 'Meal Deduction', icon: 'restaurant-outline', color: '#8b1a1a', bgColor: 'rgba(139,26,26,0.08)' },
  CASHOUT:        { label: 'Cashout',        icon: 'cash-outline',       color: '#7c3a1e', bgColor: 'rgba(124,58,30,0.08)' },
};

export default function WalletScreen() {
  const queryClient = useQueryClient();

  const [selectedPreference, setSelectedPreference] = useState<'KEEP' | 'CASHOUT'>('KEEP');

  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance } = useQuery({
    queryKey: ['walletBalance'],
    queryFn: getWalletBalance,
  });

  const { data: txData, isLoading: txLoading, refetch: refetchTx } = useQuery({
    queryKey: ['walletTransactions'],
    queryFn: getWalletTransactions,
  });

  const { data: semesterEndDate, refetch: refetchSemesterEnd } = useQuery({
    queryKey: ['semesterEndDate'],
    queryFn: getSemesterEndDate,
  });

  useFocusEffect(
    useCallback(() => {
      refetchBalance();
      refetchTx();
      refetchSemesterEnd();
    }, [])
  );

  const isSemesterEnded = useMemo(() => {
    if (!semesterEndDate) return false;
    const semEnd = new Date(semesterEndDate + 'T00:00:00.000Z');
    const dayAfter = new Date(semEnd);
    dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
    return new Date() >= dayAfter;
  }, [semesterEndDate]);

  const formattedSemesterEnd = useMemo(() => {
    if (!semesterEndDate) return null;
    const [y, m, d] = semesterEndDate.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }, [semesterEndDate]);

  const cashoutMutation = useMutation({
    mutationFn: requestCashout,
    onSuccess: () => {
      Alert.alert('Request Submitted', 'Your cashout request has been submitted successfully.');
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['walletTransactions'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit cashout request.');
    }
  });

  const handleCashout = () => {
    if (!balanceData) return;
    const balance = Number(balanceData.walletBalance);
    if (balance <= 0) {
      Alert.alert('Not Allowed', 'Your balance must be greater than zero to request a cashout.');
      return;
    }
    Alert.alert(
      'Request Cashout',
      `Request cashout of ₹${balance.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request', style: 'default', onPress: () => cashoutMutation.mutate(balance) }
      ]
    );
  };

  const renderTransaction = ({ item, index }: { item: WalletTransaction; index: number }) => {
    const isPositive = item.type === 'TOPUP';
    const amountStr = Number(item.amount).toFixed(2);
    const sign = isPositive ? '+' : '-';
    const meta = TX_TYPE_LABELS[item.type] || TX_TYPE_LABELS.MEAL_DEDUCTION;
    const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    const timeStr = new Date(item.createdAt).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit',
    });

    return (
      <View style={[styles.txRow, index === 0 && styles.txRowFirst]}>
        <View style={[styles.txIconWrap, { backgroundColor: meta.bgColor }]}>
          <Ionicons name={meta.icon as any} size={20} color={meta.color} />
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txType}>{meta.label}</Text>
          {item.note ? <Text style={styles.txNote}>{item.note}</Text> : null}
          <Text style={styles.txDate}>{dateStr} · {timeStr}</Text>
        </View>
        <Text style={[styles.txAmount, { color: isPositive ? C.success : C.danger }]}>
          {sign}₹{amountStr}
        </Text>
      </View>
    );
  };

  const isLoading = balanceLoading || txLoading;
  const balance = balanceData?.walletBalance ? Number(balanceData.walletBalance) : 0;
  const balanceStr = balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const transactions = txData?.transactions || [];

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderTransaction}
        refreshing={isLoading}
        onRefresh={() => { refetchBalance(); refetchTx(); }}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* ── Balance Hero Card ── */}
            <LinearGradient
              colors={['#2d1810', '#4a2518', '#1a0f0a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroWalletIcon}>
                  <Ionicons name="wallet" size={28} color="rgba(255,255,255,0.9)" />
                </View>
                <Text style={styles.heroLabel}>YOUR BALANCE</Text>
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="large" style={{ marginVertical: 8 }} />
                ) : (
                  <Text style={styles.heroBalance}>₹{balanceStr}</Text>
                )}
                {balanceData?.semesterLabel && (
                  <View style={styles.heroSemesterBadge}>
                    <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.heroSemester}>{balanceData.semesterLabel}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>

            {/* ── End of Semester Points & Cashout Preference Card ── */}
            <View style={styles.preferenceCard}>
              <View style={styles.preferenceHeader}>
                <Ionicons name="sparkles" size={16} color={C.accent} />
                <Text style={styles.preferenceTitle}>END-OF-SEMESTER OPTIONS</Text>
              </View>

              {/* 2-Option Tabs: Keep Points vs Cashout */}
              <View style={styles.optionTabs}>
                <TouchableOpacity
                  style={[
                    styles.optionTab,
                    selectedPreference === 'KEEP' && styles.optionTabActive,
                  ]}
                  onPress={() => setSelectedPreference('KEEP')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={16}
                    color={selectedPreference === 'KEEP' ? '#fff' : C.textSub}
                  />
                  <Text style={[
                    styles.optionTabText,
                    selectedPreference === 'KEEP' && styles.optionTabTextActive,
                  ]}>
                    Keep Points
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionTab,
                    selectedPreference === 'CASHOUT' && styles.optionTabActive,
                  ]}
                  onPress={() => setSelectedPreference('CASHOUT')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isSemesterEnded ? 'cash-outline' : 'lock-closed'}
                    size={16}
                    color={selectedPreference === 'CASHOUT' ? '#fff' : C.textSub}
                  />
                  <Text style={[
                    styles.optionTabText,
                    selectedPreference === 'CASHOUT' && styles.optionTabTextActive,
                  ]}>
                    Cashout {isSemesterEnded ? '' : '🔒'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Option Details */}
              {selectedPreference === 'KEEP' ? (
                <View style={styles.optionDescBox}>
                  <Text style={styles.optionDescTitle}>✨ Roll Over Points</Text>
                  <Text style={styles.optionDescText}>
                    Your balance (₹{balanceStr}) remains safely stored in the app and will roll over to your next semester meal plan automatically.
                  </Text>
                  <View style={styles.keepActiveBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#3a6b3a" />
                    <Text style={styles.keepActiveText}>Points retained in app</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.optionDescBox}>
                  <View style={styles.lockedHeaderRow}>
                    <Ionicons name={isSemesterEnded ? "cash-outline" : "lock-closed"} size={18} color={isSemesterEnded ? "#3a6b3a" : "#b45309"} />
                    <Text style={[styles.lockedTitle, isSemesterEnded && { color: "#3a6b3a" }]}>
                      {isSemesterEnded ? 'Cashout Available' : 'Cashout Locked Until Semester End'}
                    </Text>
                  </View>
                  <Text style={styles.optionDescText}>
                    {isSemesterEnded 
                      ? `The semester has concluded. You can request a bank payout of your full remaining balance (₹${balanceStr}).`
                      : `Cashout requests are only permitted after the semester officially ends${formattedSemesterEnd ? ` on ${formattedSemesterEnd}` : ''}. Your points are 100% secure.`
                    }
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.cashoutBtn,
                      (!isSemesterEnded || balance <= 0 || cashoutMutation.isPending) && styles.cashoutBtnDisabled,
                    ]}
                    onPress={() => {
                      if (!isSemesterEnded) {
                        Alert.alert('Locked', `You can withdraw your remaining money when the semester ends${formattedSemesterEnd ? ` on ${formattedSemesterEnd}` : ''}.`);
                        return;
                      }
                      handleCashout();
                    }}
                    activeOpacity={0.8}
                  >
                    {cashoutMutation.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name={isSemesterEnded ? "cash-outline" : "lock-closed"} size={18} color="#fff" />
                        <Text style={styles.cashoutBtnText}>
                          Request Cashout of ₹{balanceStr}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* ── Balance Info Pills ── */}
            <View style={styles.infoRow}>
              <View style={styles.infoPill}>
                <Ionicons name="restaurant-outline" size={14} color={C.textSub} />
                <Text style={styles.infoPillText}>Meals deducted daily</Text>
              </View>
              <View style={styles.infoPill}>
                <Ionicons name="shield-checkmark-outline" size={14} color={C.textSub} />
                <Text style={styles.infoPillText}>Secure transactions</Text>
              </View>
            </View>

            {/* ── Transaction History Header ── */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>TRANSACTION HISTORY</Text>
              <Text style={styles.sectionCount}>{transactions.length} records</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptyMsg}>Your transaction history will appear here.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  listContent: { paddingBottom: 40 },

  /* Hero Card */
  heroCard: {
    height: 240, margin: 16, borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  heroContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  heroWalletIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  heroLabel: {
    fontSize: 12, fontWeight: '700', letterSpacing: 2,
    color: 'rgba(255,255,255,0.7)', marginBottom: 6, textTransform: 'uppercase',
  },
  heroBalance: { fontSize: 48, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  heroSemesterBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
  },
  heroSemester: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  /* Preference Card */
  preferenceCard: {
    backgroundColor: C.surface, marginHorizontal: 16, borderRadius: 20,
    padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  preferenceHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14,
  },
  preferenceTitle: {
    fontSize: 11, fontWeight: '800', letterSpacing: 1, color: C.textMuted,
    textTransform: 'uppercase',
  },
  optionTabs: {
    flexDirection: 'row', backgroundColor: C.surface2, borderRadius: 12,
    padding: 4, marginBottom: 14, gap: 4,
  },
  optionTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
  },
  optionTabActive: {
    backgroundColor: C.primary,
    shadowColor: C.primary, shadowOpacity: 0.15, shadowRadius: 4, elevation: 2,
  },
  optionTabText: { fontSize: 13, fontWeight: '600', color: C.textSub },
  optionTabTextActive: { color: '#ffffff', fontWeight: '700' },

  optionDescBox: {
    backgroundColor: C.surface2, borderRadius: 14, padding: 14,
  },
  optionDescTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  optionDescText:  { fontSize: 12, color: C.textMuted, lineHeight: 17 },

  keepActiveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    backgroundColor: 'rgba(58,107,58,0.1)', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  keepActiveText: { fontSize: 12, fontWeight: '600', color: '#3a6b3a' },

  lockedHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  lockedTitle: { fontSize: 13, fontWeight: '700', color: '#b45309' },
  lockedInfoPill: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10,
    backgroundColor: '#fef3c7', padding: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#fde68a',
  },
  lockedInfoText: { fontSize: 11, color: '#92400e', flex: 1, lineHeight: 15 },

  /* Cashout Button */
  cashoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 12, paddingVertical: 12, borderRadius: 10,
    backgroundColor: C.primary,
  },
  cashoutBtnDisabled: { backgroundColor: C.surface3, opacity: 0.6 },
  cashoutBtnText:     { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  /* Info pills */
  infoRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 20 },
  infoPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surface, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: C.border,
  },
  infoPillText: { fontSize: 11, color: C.textSub, fontWeight: '500', flex: 1 },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', letterSpacing: 1, color: C.textMuted, textTransform: 'uppercase',
  },
  sectionCount: { fontSize: 12, color: C.textMuted },

  /* Transaction Row */
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, marginHorizontal: 16, marginBottom: 8,
    padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
  },
  txRowFirst: { borderTopWidth: 1 },
  txIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  txInfo:   { flex: 1 },
  txType:   { color: C.text, fontWeight: '700', fontSize: 14, marginBottom: 2 },
  txNote:   { color: C.textMuted, fontSize: 12, marginBottom: 2 },
  txDate:   { color: C.textMuted, fontSize: 11 },
  txAmount: { fontWeight: '800', fontSize: 16 },

  /* Empty */
  emptyWrap:  { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 8 },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  emptyMsg:   { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
});
