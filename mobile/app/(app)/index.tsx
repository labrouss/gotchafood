import { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    RefreshControl, Alert, ActivityIndicator, ScrollView, Modal,
    TextInput, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { waiterAPI } from '../../services/api';
import { requestNotificationPermissions, notifyReadyOrders, clearNotificationCache } from '../../services/notifications';
import QRScannerModal from '../../components/QRScannerModal';

const STATUS_COLORS: Record<string, string> = {
    PENDING: '#F59E0B',
    CONFIRMED: '#3B82F6',
    PREPARING: '#8B5CF6',
    READY: '#10B981',
    SERVED: '#6B7280',
};

export default function DashboardScreen() {
    const queryClient = useQueryClient();
    const insets = useSafeAreaInsets();
    const { user, logout } = useAuthStore();

    // --- MODAL STATE ---
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    
    // Customer identification modal
    const [customerModalVisible, setCustomerModalVisible] = useState(false);
    const [selectedTable, setSelectedTable] = useState<{ id: string; number: string } | null>(null);
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerSearching, setCustomerSearching] = useState(false);
    const [customerFound, setCustomerFound] = useState<any>(null);
    const [qrScannerVisible, setQrScannerVisible] = useState(false);
    // Keyed by tableId — carries loyalty phone to take-order without storing in DB
    const [sessionLoyaltyPhones, setSessionLoyaltyPhones] = useState<Record<string,string>>({});

    // Request local notification permissions once on mount
    useEffect(() => {
        requestNotificationPermissions();
    }, []);

    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['waiterDashboard'],
        queryFn: () => waiterAPI.getDashboard(),
        refetchInterval: 10000,
        select: (r) => r.data,
    });

    // Fire a local notification whenever an order flips to READY
    useEffect(() => {
        if (myTables.length > 0) {
            notifyReadyOrders(myTables);
        }
    }, [myTables]);

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
        // Open customer modal first
        setSelectedTable({ id: tableId, number: tableNumber });
        setCustomerModalVisible(true);
        setCustomerPhone('');
        setCustomerFound(null);
    };

    const lookupCustomer = async () => {
        if (!customerPhone || customerPhone.length < 10) {
            Alert.alert('Invalid Phone', 'Please enter a valid phone number');
            return;
        }

        setCustomerSearching(true);
        try {
            // Try Customer table first (walk-in customers tracked by phone)
            const response = await waiterAPI.lookupLoyaltyCustomer(customerPhone);

            if (response.data?.customer) {
                // Found in Customer (walk-in) table
                const c = response.data.customer;
                setCustomerFound(c);
                Alert.alert(
                    'Customer Found! ✅',
                    `${c.name}\nPoints: ${c.points}\nDiscount: ${c.discount || 0}%`
                );
                return;
            }

            // Not in Customer table — try User/LoyaltyReward table (app users)
            console.log('📞 Customer not in walk-in table, trying app users...');
            const userResponse = await waiterAPI.lookupUserLoyalty(customerPhone);
            if (userResponse.data?.user) {
                const u = userResponse.data.user;
                // id is empty: app Users can't be used as TableSession.customerId
                setCustomerFound({
                    id: '',
                    name: u.name,
                    phone: u.phone,
                    points: u.points ?? 0,
                    discount: u.discount ?? 0,
                    visits: 0,
                });
                Alert.alert(
                    'Customer Found! ✅',
                    `${u.name}\nPoints: ${u.points ?? 0}\nDiscount: ${u.discount ?? 0}%`
                );
                return;
            }

            Alert.alert('Not Found', 'No loyalty account found for this number');
            setCustomerFound(null);
        } catch (e: any) {
            console.error('Lookup error:', e);
            Alert.alert('Error', 'Could not search for customer');
            setCustomerFound(null);
        } finally {
            setCustomerSearching(false);
        }
    };

    const confirmStartSession = async (partySize: number) => {
        if (!selectedTable) return;
        
        try {
            const sessionData: any = {
                tableId: selectedTable.id,
                partySize,
            };
            
            if (customerFound) {
                // Only send customerId for walk-in Customer records (phone lookup).
                // QR-scanned app Users have id='' — sending their User.id as
                // customerId causes a FK error (different table).
                if (customerFound.id) {
                    sessionData.customerId = customerFound.id;
                }
                sessionData.loyaltyDiscount = customerFound.discount || 0;
            }
            
            await waiterAPI.startSession(sessionData);
            queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] });

            // Store loyalty phone in state keyed by tableId so take-order can use it
            if (customerFound?.phone && selectedTable) {
                setSessionLoyaltyPhones(prev => ({ ...prev, [selectedTable.id]: customerFound.phone }));
            }

            setCustomerModalVisible(false);
            setSelectedTable(null);
            setCustomerPhone('');
            setCustomerFound(null);

            Alert.alert('Success', `Table ${selectedTable.number} started!${customerFound ? ' with loyalty applied' : ''}`);
        } catch (e: any) {
            Alert.alert('Error', 'Failed to start session');
        }
    };

    const skipCustomerLookup = () => {
        Alert.alert(
            `Start Table ${selectedTable?.number}`,
            'How many guests?',
            [
                { text: '1-2', onPress: () => confirmStartSession(2) },
                { text: '3-4', onPress: () => confirmStartSession(4) },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: async () => { clearNotificationCache(); await logout(); router.replace('/(auth)/login'); } },
        ]);
    };

    // --- DATA EXTRACTION ---
    const myTables: any[] = data?.sessions || data?.data?.sessions || [];
    const freeTables: any[] = data?.freeTables || data?.data?.freeTables || [];

    if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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

                            const totalItems = session.orders?.reduce((sum: number, o: any) => 
                                sum + (o.items?.length || 0), 0) || 0;

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

                                    {/* Clickable Orders */}
                                    {session.orders?.map((order: any) => (
                                        <TouchableOpacity 
                                            key={order.id} 
                                            style={styles.orderRow}
                                            onPress={() => {
                                                console.log('📋 Viewing order:', order.id);
                                                router.push(`/order-detail/${order.id}`);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                                    <Text style={styles.orderLabel}>Order {order.orderNumber}</Text>
                                                    <Text style={styles.tapHint}> (Tap to view)</Text>
                                                </View>
                                                
                                                <Text style={styles.orderItems}>
                                                    {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''} • €{parseFloat(order.totalAmount || 0).toFixed(2)}
                                                </Text>
                                                
                                                {order.status === 'READY' && (
                                                    <TouchableOpacity
                                                        style={styles.serveBtn}
                                                        onPress={(e) => {
                                                            e.stopPropagation();
                                                            handleMarkServed(session.id, order.id);
                                                        }}
                                                    >
                                                        <Text style={styles.serveBtnText}>✋ Mark Served</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                            
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[order.status] || '#6B7280' }]}>
                                                    <Text style={styles.statusText}>{order.status}</Text>
                                                </View>
                                                <Text style={{ fontSize: 16, marginTop: 4 }}>👆</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}

                                    {/* View All Items Summary */}
                                    {session.orders && session.orders.length > 0 && (
                                        <TouchableOpacity
                                            style={styles.viewAllBtn}
                                            onPress={() => {
                                                if (session.orders[0]) {
                                                    router.push(`/order-detail/${session.orders[0].id}`);
                                                }
                                            }}
                                        >
                                            <Text style={styles.viewAllText}>
                                                📋 View All Items ({totalItems} total)
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    <View style={styles.buttonGroup}>
                                        <TouchableOpacity
                                            style={styles.actionBtn}
                                            onPress={() => router.push({
                                                pathname: `/take-order/${session.tableId}`,
                                                params: { sessionId: session.id, tableNumber: session.table.tableNumber, loyaltyPhone: sessionLoyaltyPhones[session.tableId] || '' }
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

                        {/* Review Orders Button */}
                        {selectedSession?.orders && selectedSession.orders.length > 0 && (
                            <TouchableOpacity 
                                style={styles.reviewOrdersBtn}
                                onPress={() => {
                                    setPaymentModalVisible(false);
                                    if (selectedSession.orders[0]) {
                                        router.push(`/order-detail/${selectedSession.orders[0].id}`);
                                    }
                                }}
                            >
                                <Text style={styles.reviewOrdersText}>
                                    📋 Review Orders Before Payment
                                </Text>
                            </TouchableOpacity>
                        )}

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

            {/* --- CUSTOMER IDENTIFICATION MODAL --- */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={customerModalVisible}
                onRequestClose={() => { Keyboard.dismiss(); setCustomerModalVisible(false); }}
            >
                {/*
                  KeyboardAvoidingView lives inside the Modal so it only affects
                  this bottom sheet. On iOS it pads the content up by the exact
                  keyboard height; on Android it shrinks the available height.
                */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                    keyboardVerticalOffset={0}
                >
                    <View style={styles.customerModalSheet}>
                        {/* Drag handle */}
                        <View style={styles.dragHandle} />

                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>🎫 Customer Check-in</Text>
                                <Text style={styles.modalSubtitle}>
                                    Table {selectedTable?.number}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => { Keyboard.dismiss(); setCustomerModalVisible(false); }}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            >
                                <Text style={styles.closeX}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/*
                          ScrollView lets content scroll up when the keyboard
                          appears, keeping the phone input always visible.
                          keyboardShouldPersistTaps="handled" means tapping the
                          Search button works without first dismissing keyboard.
                        */}
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 24 }}
                        >
                            {/* ── 1. PHONE INPUT — top priority ── */}
                            <View style={styles.inputSection}>
                                <Text style={styles.inputLabel}>📱 Phone Number</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={styles.phoneInput}
                                        placeholder="Enter phone number"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="phone-pad"
                                        returnKeyType="search"
                                        value={customerPhone}
                                        onChangeText={setCustomerPhone}
                                        onSubmitEditing={lookupCustomer}
                                        maxLength={15}
                                    />
                                    <TouchableOpacity
                                        style={[styles.lookupBtn, customerSearching && { opacity: 0.6 }]}
                                        onPress={lookupCustomer}
                                        disabled={customerSearching}
                                    >
                                        {customerSearching ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Text style={styles.lookupBtnText}>Search</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* ── 2. CUSTOMER FOUND CARD ── */}
                            {customerFound && (
                                <View style={styles.customerFoundBox}>
                                    <Text style={styles.customerFoundTitle}>✅ Customer Found!</Text>
                                    <Text style={styles.customerName}>{customerFound.name}</Text>
                                    <View style={styles.customerStatsRow}>
                                        <View style={styles.customerStat}>
                                            <Text style={styles.statLabel}>Points</Text>
                                            <Text style={styles.statValue}>{customerFound.points || 0}</Text>
                                        </View>
                                        <View style={styles.customerStat}>
                                            <Text style={styles.statLabel}>Discount</Text>
                                            <Text style={styles.statValue}>{customerFound.discount || 0}%</Text>
                                        </View>
                                        <View style={styles.customerStat}>
                                            <Text style={styles.statLabel}>Visits</Text>
                                            <Text style={styles.statValue}>{customerFound.visits || 0}</Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* ── 3. SCAN CARD ── */}
                            <TouchableOpacity
                                style={styles.scanBtn}
                                onPress={() => {
                                    Keyboard.dismiss();
                                    setCustomerModalVisible(false);
                                    setQrScannerVisible(true);
                                }}
                            >
                                <Text style={styles.scanBtnText}>📷 Scan Loyalty Card</Text>
                            </TouchableOpacity>

                            {/* ── 4. PARTY SIZE ── */}
                            <View style={styles.partySizeSection}>
                                <Text style={styles.inputLabel}>👥 Party Size</Text>
                                <View style={styles.partySizeRow}>
                                    {[1, 2, 3, 4].map((n) => (
                                        <TouchableOpacity
                                            key={n}
                                            style={styles.partySizeBtn}
                                            onPress={() => confirmStartSession(n)}
                                        >
                                            <Text style={styles.partySizeBtnText}>{n === 4 ? '4+' : String(n)}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* ── 5. SKIP ── */}
                            <TouchableOpacity
                                style={styles.skipBtn}
                                onPress={skipCustomerLookup}
                            >
                                <Text style={styles.skipBtnText}>Skip • Continue without loyalty</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* QR Scanner — full screen, layered on top of everything */}
            <QRScannerModal
                visible={qrScannerVisible}
                onClose={() => {
                    setQrScannerVisible(false);
                    // Reopen customer modal so waiter can use phone instead
                    setCustomerModalVisible(true);
                }}
                onCustomerFound={(customer) => {
                    setCustomerFound(customer);
                    setQrScannerVisible(false);
                    // Reopen customer modal to show found customer + pick party size
                    setCustomerModalVisible(true);
                }}
                identifyLoyalty={waiterAPI.identifyLoyalty}
                lookupLoyaltyCustomer={waiterAPI.lookupLoyaltyCustomer}
                lookupUserLoyalty={waiterAPI.lookupUserLoyalty}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
    orderRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginHorizontal: -12,
        marginBottom: 8,
        backgroundColor: '#FAFAFA',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    orderLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
    orderItems: { fontSize: 13, color: '#6B7280', marginTop: 2, marginBottom: 6 },
    tapHint: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: '800', color: '#fff' },
    serveBtn: { backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, marginTop: 5, alignSelf: 'flex-start' },
    serveBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    viewAllBtn: { padding: 10, backgroundColor: '#F3F4F6', borderRadius: 8, marginTop: 8, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
    viewAllText: { fontSize: 13, fontWeight: '600', color: '#4F46E5' },
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
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
    // Customer modal uses its own sheet style to allow keyboard avoidance + scroll
    customerModalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '92%' },
    dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
    closeX: { fontSize: 22, color: '#9CA3AF', padding: 4 },
    paymentSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6' },
    totalLabel: { fontSize: 12, fontWeight: '800', color: '#6B7280' },
    totalValue: { fontSize: 32, fontWeight: '900', color: '#10B981' },
    reviewOrdersBtn: { backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE', alignItems: 'center' },
    reviewOrdersText: { fontSize: 14, fontWeight: '600', color: '#1E40AF' },
    methodLabel: { fontSize: 15, fontWeight: 'bold', color: '#374151', marginBottom: 12 },
    methodContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 24 },
    methodBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB', padding: 16, borderRadius: 16, alignItems: 'center' },
    methodBtnText: { marginTop: 8, fontWeight: '700', color: '#374151', fontSize: 13 },
    infoBox: { backgroundColor: '#EFF6FF', padding: 16, borderRadius: 16, marginBottom: 24 },
    infoText: { fontSize: 14, color: '#1E40AF', fontWeight: '500', marginBottom: 4 },
    cancelModalBtn: { padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16 },
    cancelModalText: { color: '#6B7280', fontWeight: 'bold', fontSize: 15 },
    
    // Customer Modal Styles
    customerFoundBox: { backgroundColor: '#D1FAE5', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 2, borderColor: '#10B981' },
    customerFoundTitle: { fontSize: 14, fontWeight: '700', color: '#065F46', marginBottom: 8 },
    customerName: { fontSize: 22, fontWeight: '800', color: '#065F46', marginBottom: 12 },
    customerStatsRow: { flexDirection: 'row', justifyContent: 'space-around' },
    customerStat: { alignItems: 'center' },
    statLabel: { fontSize: 11, color: '#059669', fontWeight: '600', textTransform: 'uppercase' },
    statValue: { fontSize: 18, fontWeight: '800', color: '#065F46', marginTop: 2 },
    inputSection: { marginBottom: 16 },
    inputLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
    inputRow: { flexDirection: 'row', gap: 8 },
    phoneInput: { flex: 1, backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 16, color: '#111827' },
    lookupBtn: { backgroundColor: '#4F46E5', borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center', minWidth: 80 },
    lookupBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    scanBtn: { backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#3B82F6', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 20 },
    scanBtnText: { color: '#1E40AF', fontWeight: '700', fontSize: 15 },
    partySizeSection: { marginBottom: 16 },
    partySizeRow: { flexDirection: 'row', gap: 10 },
    partySizeBtn: { flex: 1, backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    partySizeBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    skipBtn: { padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12 },
    skipBtnText: { color: '#6B7280', fontWeight: '600', fontSize: 14 },
});
