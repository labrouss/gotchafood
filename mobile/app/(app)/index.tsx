import { useEffect, useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { waiterAPI } from '../../services/api';

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

    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['waiterDashboard'],
        queryFn: () => waiterAPI.getDashboard(),
        refetchInterval: 15000,
        select: (r) => r.data,
    });

    // Debug logging
    useEffect(() => {
        if (data) {
            console.log('📊 Dashboard data received');
            console.log('🪑 My tables:', myTables.length);
            console.log('🟢 Free tables:', freeTables.length);
        }
    }, [data]);

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Logout', 
                style: 'destructive', 
                onPress: async () => {
                    await logout();
                    console.log('🔓 Logged out - Navigating to login');
                    router.replace('/(auth)/login');
                }
            },
        ]);
    };

    // Extract data with multiple fallbacks
    const myTables: any[] = data?.data?.activeSessions || data?.myTables || data?.activeSessions || data?.sessions || [];
    const freeTables: any[] = data?.data?.freeTables || data?.freeTables || data?.availableTables || [];

    const startSession = async (tableId: string, tableNumber: string) => {
        Alert.alert(
            `Start Session — Table ${tableNumber}`,
            'How many guests?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: '1', 
                    onPress: async () => {
                        try {
                            console.log('🪑 Starting session for table:', tableNumber);
                            await waiterAPI.startSession({ tableId, partySize: 1 });
                            queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] });
                            Alert.alert('Success', 'Session started!');
                        } catch (e: any) {
                            console.error('❌ Start session error:', e);
                            Alert.alert('Error', e?.response?.data?.message || 'Failed to start session');
                        }
                    }
                },
                {
                    text: '2-4', 
                    onPress: async () => {
                        try {
                            await waiterAPI.startSession({ tableId, partySize: 2 });
                            queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] });
                            Alert.alert('Success', 'Session started!');
                        } catch (e: any) {
                            Alert.alert('Error', e?.response?.data?.message || 'Failed to start session');
                        }
                    }
                },
                {
                    text: '5+', 
                    onPress: async () => {
                        try {
                            await waiterAPI.startSession({ tableId, partySize: 5 });
                            queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] });
                            Alert.alert('Success', 'Session started!');
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
                <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>👋 Hello, {user?.firstName || 'Waiter'}</Text>
                    <Text style={styles.headerSubtitle}>{user?.email}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
            >
                {/* My Active Tables Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        🍽️ My Active Tables ({myTables.length})
                    </Text>

                    {myTables.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No active tables</Text>
                            <Text style={styles.emptySubtext}>
                                Start a session from available tables below
                            </Text>
                        </View>
                    ) : (
                        myTables.map((session: any) => (
                            <TouchableOpacity
                                key={session.id}
                                style={styles.tableCard}
                                onPress={() => router.push(`/take-order/${session.id}`)}
                            >
                                <View style={styles.tableHeader}>
                                    <Text style={styles.tableNumber}>
                                        Table {session.tableNumber || session.table?.tableNumber}
                                    </Text>
                                    <Text style={styles.partySize}>
                                        👥 {session.partySize} guests
                                    </Text>
                                </View>

                                {session.orders && session.orders.length > 0 && (
                                    <View style={styles.ordersSection}>
                                        {session.orders.map((order: any) => (
                                            <View key={order.id} style={styles.orderBadge}>
                                                <Text style={styles.orderNumber}>
                                                    {order.orderNumber}
                                                </Text>
                                                <View 
                                                    style={[
                                                        styles.statusBadge,
                                                        { backgroundColor: STATUS_COLORS[order.status] || '#6B7280' }
                                                    ]}
                                                >
                                                    <Text style={styles.statusText}>
                                                        {order.status}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                <TouchableOpacity 
                                    style={styles.actionBtn}
                                    onPress={() => router.push(`/take-order/${session.id}`)}
                                >
                                    <Text style={styles.actionBtnText}>
                                        📝 Take Order
                                    </Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Available Tables Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        🟢 Available Tables ({freeTables.length})
                    </Text>

                    {freeTables.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No available tables</Text>
                        </View>
                    ) : (
                        <View style={styles.tableGrid}>
                            {freeTables.map((table: any) => (
                                <TouchableOpacity
                                    key={table.id}
                                    style={styles.freeTableCard}
                                    onPress={() => startSession(table.id, table.tableNumber)}
                                >
                                    <Text style={styles.freeTableNumber}>
                                        {table.tableNumber}
                                    </Text>
                                    <Text style={styles.freeTableCapacity}>
                                        Max {table.capacity}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#6B7280',
    },
    header: {
        backgroundColor: '#4F46E5',
        padding: 20,
        paddingTop: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#E0E7FF',
        marginTop: 4,
    },
    logoutBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    logoutText: {
        color: '#fff',
        fontWeight: '600',
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        color: '#111827',
    },
    emptyState: {
        padding: 32,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 4,
    },
    tableCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    tableHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    tableNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    partySize: {
        fontSize: 14,
        color: '#6B7280',
    },
    ordersSection: {
        marginBottom: 12,
    },
    orderBadge: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    orderNumber: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    actionBtn: {
        backgroundColor: '#4F46E5',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    actionBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    tableGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
    },
    freeTableCard: {
        width: '31%',
        margin: '1%',
        backgroundColor: '#10B981',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 80,
    },
    freeTableNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
    },
    freeTableCapacity: {
        fontSize: 12,
        color: '#D1FAE5',
        marginTop: 4,
    },
});
