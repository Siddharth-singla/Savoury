import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { getWalletBalance, getWalletTransactions, requestCashout, WalletTransaction } from '../../src/api/wallet';

export default function WalletScreen() {
  const queryClient = useQueryClient();
  const [isRequesting, setIsRequesting] = useState(false);

  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance } = useQuery({
    queryKey: ['walletBalance'],
    queryFn: getWalletBalance,
  });

  const { data: txData, isLoading: txLoading, refetch: refetchTx } = useQuery({
    queryKey: ['walletTransactions'],
    queryFn: getWalletTransactions,
  });

  useFocusEffect(
    useCallback(() => {
      refetchBalance();
      refetchTx();
    }, [])
  );

  const cashoutMutation = useMutation({
    mutationFn: requestCashout,
    onSuccess: () => {
      Alert.alert('Success', 'Cashout request submitted successfully.');
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
      `Are you sure you want to request a cashout of ₹${balance.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Request', 
          style: 'default',
          onPress: () => cashoutMutation.mutate(balance)
        }
      ]
    );
  };

  const renderTransaction = ({ item }: { item: WalletTransaction }) => {
    const isPositive = item.type === 'TOPUP';
    const amountStr = Number(item.amount).toFixed(2);
    const sign = isPositive ? '+' : '-';
    const amountColor = isPositive ? '#4ade80' : '#f87171';
    
    return (
      <View style={styles.txRow}>
        <View style={styles.txLeft}>
          <Text style={styles.txType}>{item.type.replace('_', ' ')}</Text>
          <Text style={styles.txNote}>{item.note || 'No description'}</Text>
          <Text style={styles.txDate}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
        <Text style={[styles.txAmount, { color: amountColor }]}>
          {sign}₹{amountStr}
        </Text>
      </View>
    );
  };

  const isLoading = balanceLoading || txLoading;
  const balanceStr = balanceData?.walletBalance 
    ? Number(balanceData.walletBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
    : '0.00';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wallet</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Current Balance</Text>
            <Text style={styles.balanceValue}>₹{balanceStr}</Text>
            {balanceData?.semesterLabel && (
              <Text style={styles.semesterLabel}>Semester: {balanceData.semesterLabel}</Text>
            )}
            <TouchableOpacity 
              style={[styles.cashoutBtn, Number(balanceStr) <= 0 && styles.cashoutBtnDisabled]} 
              onPress={handleCashout}
              disabled={Number(balanceStr) <= 0 || cashoutMutation.isPending}
            >
              {cashoutMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.cashoutText}>Request Cashout</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.historyTitle}>Transaction History</Text>
          <FlatList
            data={txData?.transactions || []}
            keyExtractor={item => item.id}
            renderItem={renderTransaction}
            contentContainerStyle={styles.listContent}
            onRefresh={() => { refetchBalance(); refetchTx(); }}
            refreshing={isLoading}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No transactions found.</Text>
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  balanceCard: {
    margin: 20,
    padding: 24,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center'
  },
  balanceLabel: { color: '#94a3b8', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  balanceValue: { color: '#4ade80', fontSize: 40, fontWeight: '800' },
  semesterLabel: { color: '#64748b', fontSize: 12, marginTop: 4 },
  cashoutBtn: {
    marginTop: 20,
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center'
  },
  cashoutBtnDisabled: {
    backgroundColor: '#334155'
  },
  cashoutText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f8fafc',
    marginHorizontal: 20,
    marginBottom: 10
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  txLeft: { flex: 1, paddingRight: 12 },
  txType: { color: '#f1f5f9', fontWeight: '600', fontSize: 14, marginBottom: 2 },
  txNote: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  txDate: { color: '#64748b', fontSize: 11 },
  txAmount: { fontWeight: '700', fontSize: 16 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 14 }
});
