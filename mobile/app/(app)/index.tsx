import { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    RefreshControl, Alert, ActivityIndicator, ScrollView, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

    // --- MODAL STATE ---
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);

    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['waiterDashboard'],
        queryFn: () => waiterAPI.getDashboard(),
        refetchInterval: 10000,
        select: (r) => r.data,
    });

    // --- LOGIC HANDLERS ---

    const handleMarkServed = async (sessionId: string, orderId: string) => {
        try {
            await waiterAPI.updateOrderStatus(sessionId, orderId);
            queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] });
        } catch (e: any) {
            console.error("Server Error:", e?.response?.data || e);
            Alert.alert('Error', 'Could not mark as served');
        }
    };

    const handleOpenPayment = (session: any) => {
        setSelectedSession(session);
        setPaymentModalVisible(true);
    };

    const finalizePayment = async (method: string) => {
        if (!selectedSession) return;
        try {
            // Passing the selected payment method to the backend
            await waiterAPI.endSession(selectedSession.id, { paymentMethod: method });
            setPaymentModalVisible(false);
            setSelectedSession(null);
            queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] });
            Alert.alert('Success', 'Payment confirmed and table closed');
        } catch (e: any) {
            Alert.alert('Error', 'Failed to end session');
        }
    };

    const startSession = async (tableId: string, tableNumber: string) => {
        Alert.alert(`Start Table ${tableNumber}`, 'How many guests?', [
            { text: '1-2', onPress: () => performStart(tableId, 2) },
            { text: '3-4', onPress: () => performStart(tableId, 4) },
            { text: 'Cancel', style: 'cancel' }
        ]);
    };

    const performStart = async (tableId: string, partySize: number) => {
        try {
            await waiterAPI.startSession({ tableId, partySize });
            queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] });
        } catch (e: any) {
            Alert.alert('Error', 'Failed to start session');
        }
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
        ]);
    };

    // --- DATA EXTRACTION ---
    const myTables: any[] = data?.sessions || data?.data?.sessions || [];
    const freeTables: any[] = data?.freeTables || data?.data?.freeTables || [];

    if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>👋 {user?.firstName || 'Waiter'}</Text>
                    <Text style={styles.headerSubtitle}>{user?.email}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <ScrollView refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
                {/* Active Tables Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🍽️ My Active Tables ({myTables.length})</Text>
                    {myTables.length === 0 ? (
                        <View style={styles.emptyState}><Text style={styles.emptyText}>No active tables</Text></View>
                    ) : (
                        myTables.map((session: any) => {
                            const runningTotal = session.orders?.reduce((acc: number, order: any) => {
                                return acc + (parseFloat(order.totalAmount) || 0);
                            }, 0) || 0;

                            return (
                                <View key={session.id} style={styles.tableCard}>
                                    <View style={styles.tableHeader}>
                                        <View>
                                            <Text style={styles.tableNumber}>Table {session.table.tableNumber}</Text>
                                            <Text style={styles.partySize}>👥 {session.partySize} guests</Text>
                                        </View>
                                        <View style={styles.totalBadge}>
                                            <Text style={styles.totalBadgeLabel}>Current Total</Text>
                                            <Text style={styles.totalBadgeValue}>€{runningTotal.toFixed(2)}</Text>
                                        </View>
                                    </View>

                                    {session.orders?.map((order: any) => (
                                        <View key={order.id} style={styles.orderRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.orderLabel}>Order {order.orderNumber}</Text>
                                                {order.status === 'READY' && (
                                                    <TouchableOpacity
                                                        style={styles.serveBtn}
                                                        onPress={() => handleMarkServed(session.id, order.id)}
                                                    >
                                                        <Text style={styles.serveBtnText}>✋ Mark Served</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[order.status] || '#6B7280' }]}>
                                                <Text style={styles.statusText}>{order.status}</Text>
                                            </View>
                                        </View>
                                    ))}

                                    <View style={styles.buttonGroup}>
                                        <TouchableOpacity
                                            style={styles.actionBtn}
                                            onPress={() => router.push({
                                                pathname: `/take-order/${session.tableId}`,
                                                params: { sessionId: session.id, tableNumber: session.table.tableNumber }
                                            })}
                                        >
                                            <Text style={styles.btnText}>📝 New Order</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.completeBtn}
                                            onPress={() => handleOpenPayment(session)}
                                        >
                                            <Text style={styles.btnText}>💰 Bill & Pay</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>

                {/* Free Tables Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🟢 Available ({freeTables.length})</Text>
                    <View style={styles.tableGrid}>
                        {freeTables.map((table: any) => (
                            <TouchableOpacity
                                key={table.id}
                                style={styles.freeTableCard}
                                onPress={() => startSession(table.id, table.tableNumber)}
                            >
                                <Text style={styles.freeTableNumber}>{table.tableNumber}</Text>
                                <Text style={styles.freeTableCapacity}>Max {table.capacity}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* --- PAYMENT MODAL --- */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={paymentModalVisible}
                onRequestClose={() => setPaymentModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>💳 Complete Payment</Text>
                            <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                                <Text style={styles.closeX}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSubtitle}>Table {selectedSession?.table?.tableNumber}</Text>

                        <View style={styles.paymentSummary}>
                            <Text style={styles.totalLabel}>TOTAL TO PAY</Text>
                            <Text style={styles.totalValue}>
                                €{(selectedSession?.orders?.reduce((acc: number, o: any) => acc + parseFloat(o.totalAmount || 0), 0) || 0).toFixed(2)}
                            </Text>
                        </View>

                        <Text style={styles.methodLabel}>Payment Method</Text>
                        <View style={styles.methodContainer}>
                            <TouchableOpacity style={styles.methodBtn} onPress={() => finalizePayment('CASH')}>
                                <Text style={{fontSize: 24}}>💵</Text>
                                <Text style={styles.methodBtnText}>Cash</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.methodBtn} onPress={() => finalizePayment('CARD')}>
                                <Text style={{fontSize: 24}}>💳</Text>
                                <Text style={styles.methodBtnText}>Card</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.methodBtn} onPress={() => finalizePayment('OTHER')}>
                                <Text style={{fontSize: 24}}>🏦</Text>
                                <Text style={styles.methodBtnText}>Other</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.infoBox}>
                            <Text style={styles.infoText}>👤 Party Size: {selectedSession?.partySize} guests</Text>
                            <Text style={styles.infoText}>📦 Total Orders: {selectedSession?.orders?.length}</Text>
                        </View>

                        <TouchableOpacity 
                            style={styles.cancelModalBtn} 
                            onPress={() => setPaymentModalVisible(false)}
                        >
                            <Text style={styles.cancelModalText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: '#4F46E5', padding: 20, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerSubtitle: { fontSize: 13, color: '#E0E7FF' },
    logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 8 },
    logoutText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    section: { padding: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#111827' },
    emptyState: { padding: 20, alignItems: 'center', backgroundColor: '#fff', borderRadius: 12 },
    emptyText: { color: '#9CA3AF' },
    tableCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
    tableHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 10, marginBottom: 10 },
    tableNumber: { fontSize: 18, fontWeight: 'bold' },
    partySize: { color: '#6B7280' },
    orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
    orderLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: '800', color: '#fff' },
    serveBtn: { backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, marginTop: 5, alignSelf: 'flex-start' },
    serveBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    buttonGroup: { flexDirection: 'row', gap: 10, marginTop: 15 },
    actionBtn: { flex: 1.5, backgroundColor: '#4F46E5', padding: 12, borderRadius: 8, alignItems: 'center' },
    completeBtn: { flex: 1, backgroundColor: '#111827', padding: 12, borderRadius: 8, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: 'bold' },
    tableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    freeTableCard: { width: '31%', backgroundColor: '#10B981', borderRadius: 12, padding: 15, alignItems: 'center' },
    freeTableNumber: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    freeTableCapacity: { fontSize: 10, color: '#D1FAE5' },
    totalBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'flex-end', justifyContent: 'center' },
    totalBadgeLabel: { fontSize: 10, color: '#6B7280', textTransform: 'uppercase', fontWeight: 'bold' },
    totalBadgeValue: { fontSize: 16, fontWeight: '800', color: '#111827' },
    
    // --- MODAL STYLES ---
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 480 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
    closeX: { fontSize: 22, color: '#9CA3AF', padding: 4 },
    paymentSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#F3F4F6' },
    totalLabel: { fontSize: 12, fontWeight: '800', color: '#6B7280' },
    totalValue: { fontSize: 32, fontWeight: '900', color: '#10B981' },
    methodLabel: { fontSize: 15, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
    methodContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 24 },
    methodBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB', padding: 16, borderRadius: 16, alignItems: 'center' },
    methodBtnText: { marginTop: 8, fontWeight: '700', color: '#374151', fontSize: 13 },
    infoBox: { backgroundColor: '#EFF6FF', padding: 16, borderRadius: 16, marginBottom: 24 },
    infoText: { fontSize: 14, color: '#1E40AF', fontWeight: '500', marginBottom: 4 },
    cancelModalBtn: { padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16 },
    cancelModalText: { color: '#6B7280', fontWeight: 'bold', fontSize: 15 },
});
