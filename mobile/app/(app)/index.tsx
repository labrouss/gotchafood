import { useEffect, useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { waiterAPI } from '../../services/api';
import { sendLocalNotification } from '../../services/notifications';

const STATUS_COLORS: Record<string, string> = {
    PENDING: '#F59E0B',
    CONFIRMED: '#3B82F6',
    PREPARING: '#8B5CF6',
    READY: '#10B981',
    SERVED: '#6B7280',
};

export default function DashboardScreen() {
    const queryClient = useQueryClient();
    const { user, logout } = useAuthStore();
    const [previousReadyIds, setPreviousReadyIds] = useState<Set<string>>(new Set());

    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['waiterDashboard'],
        queryFn: () => waiterAPI.getDashboard(),
        refetchInterval: 15000, // poll every 15s in foreground
        select: (r) => r.data,
    });

    // Detect newly READY orders while app is in foreground
    useEffect(() => {
        const orders: any[] = data?.activeOrders || data?.orders || [];
        const readyOrders = orders.filter((o: any) => o.status === 'READY');
        readyOrders.forEach((o: any) => {
            if (!previousReadyIds.has(o.id)) {
                sendLocalNotification(
                    '🔔 Order Ready!',
                    `Order ${o.orderNumber || ''} — Table ${o.tableNumber || ''} is ready to serve.`
                );
            }
        });
        setPreviousReadyIds(new Set(readyOrders.map((o: any) => o.id)));
    }, [data]);

    const clockInMutation = useMutation({
        mutationFn: () => waiterAPI.clockIn(),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] }),
    });

    const clockOutMutation = useMutation({
        mutationFn: () => waiterAPI.clockOut(),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] }),
    });

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
        ]);
    };

    const isClockedIn = data?.shift?.clockedIn ?? false;
    const myTables: any[] = data?.myTables || data?.activeSessions || [];
    const freeTables: any[] = data?.freeTables || [];

    const startSession = async (tableId: string, tableNumber: string) => {
        Alert.alert(
            `Start Session — Table ${tableNumber}`,
            'How many guests?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: '1', onPress: async () => {
                        try {
                            await waiterAPI.startSession({ tableId, partySize: 1 });
                            queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] });
                        } catch (e: any) {
                            Alert.alert('Error', e?.response?.data?.message || 'Failed to start session');
                        }
                    }
                },
                {
                    text: '2+', onPress: async () => {
                        try {
                            await waiterAPI.startSession({ tableId, partySize: 2 });
                            queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] });
                        } catch (e: any) {
                            Alert.alert('Error', e?.response?.data?.message || 'Failed to start session');
                        }
                    }
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcome}>Welcome, {user?.firstName} 👋</Text>
                    <Text style={styles.role}>Waiter Dashboard</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={[styles.clockBtn, isClockedIn ? styles.clockOut : styles.clockIn]}
                        onPress={() => isClockedIn ? clockOutMutation.mutate() : clockInMutation.mutate()}
                    >
                        <Text style={styles.clockBtnText}>{isClockedIn ? '🔴 Clock Out' : '🟢 Clock In'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <Text style={styles.logoutText}>⎍</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={[{ key: 'content' }]}
                keyExtractor={(i) => i.key}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
                renderItem={() => (
                    <View>
                        {/* My Active Tables */}
                        <Text style={styles.sectionTitle}>🍽️ My Tables ({myTables.length})</Text>
                        {myTables.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <Text style={styles.emptyText}>No active tables. Start a session below.</Text>
                            </View>
                        ) : (
                            myTables.map((session: any) => (
                                <TouchableOpacity
                                    key={session.id}
                                    style={styles.tableCard}
                                    onPress={() => router.push(`/(app)/take-order/${session.tableId || session.table?.id}?sessionId=${session.id}`)}
                                >
                                    <View style={styles.tableCardLeft}>
                                        <Text style={styles.tableNumber}>Table {session.tableNumber || session.table?.number || '?'}</Text>
                                        <Text style={styles.tableGuests}>{session.partySize || 1} guests · {session.orders?.length || 0} orders</Text>
                                    </View>
                                    <View style={styles.tableCardRight}>
                                        {session.orders?.some((o: any) => o.status === 'READY') && (
                                            <View style={styles.readyBadge}>
                                                <Text style={styles.readyBadgeText}>✅ READY</Text>
                                            </View>
                                        )}
                                        <Text style={styles.arrowText}>›</Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}

                        {/* Free Tables */}
                        <Text style={styles.sectionTitle}>🪑 Free Tables ({freeTables.length})</Text>
                        <View style={styles.freeTablesGrid}>
                            {freeTables.map((table: any) => (
                                <TouchableOpacity
                                    key={table.id}
                                    style={styles.freeTableCard}
                                    onPress={() => startSession(table.id, table.number)}
                                >
                                    <Text style={styles.freeTableNumber}>{table.number}</Text>
                                    <Text style={styles.freeTableCap}>Cap: {table.capacity}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: '#4F46E5',
        padding: 20,
        paddingTop: 56,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    welcome: { color: '#fff', fontSize: 20, fontWeight: '700' },
    role: { color: '#C7D2FE', fontSize: 13, marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    clockBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    clockIn: { backgroundColor: '#10B981' },
    clockOut: { backgroundColor: '#EF4444' },
    clockBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 10 },
    logoutText: { color: '#fff', fontSize: 16 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', padding: 16, paddingBottom: 8 },
    emptyCard: {
        marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12,
        padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
    },
    emptyText: { color: '#9CA3AF', fontSize: 14 },
    tableCard: {
        marginHorizontal: 16, marginBottom: 10, backgroundColor: '#fff',
        borderRadius: 14, padding: 16, flexDirection: 'row',
        justifyContent: 'space-between', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
        borderLeftWidth: 4, borderLeftColor: '#4F46E5',
    },
    tableCardLeft: { flex: 1 },
    tableNumber: { fontSize: 18, fontWeight: '800', color: '#111827' },
    tableGuests: { fontSize: 13, color: '#6B7280', marginTop: 3 },
    tableCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    readyBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    readyBadgeText: { color: '#065F46', fontSize: 12, fontWeight: '700' },
    arrowText: { fontSize: 24, color: '#9CA3AF' },
    freeTablesGrid: {
        flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 24,
    },
    freeTableCard: {
        backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center',
        width: '22%', borderWidth: 1, borderColor: '#E5E7EB',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 2,
    },
    freeTableNumber: { fontSize: 20, fontWeight: '800', color: '#4F46E5' },
    freeTableCap: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
});
