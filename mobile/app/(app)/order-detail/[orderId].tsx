import { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderAPI } from '../../../services/api';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    PENDING: { bg: '#FEF3C7', text: '#92400E', label: '⏳ Pending' },
    CONFIRMED: { bg: '#DBEAFE', text: '#1E40AF', label: '✓ Confirmed' },
    PREPARING: { bg: '#EDE9FE', text: '#5B21B6', label: '🍳 Preparing' },
    READY: { bg: '#D1FAE5', text: '#065F46', label: '✅ Ready!' },
    SERVED: { bg: '#F3F4F6', text: '#374151', label: '👔 Served' },
};

export default function OrderDetailScreen() {
    const { orderId } = useLocalSearchParams<{ orderId: string }>();
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['orderDetail', orderId],
        queryFn: () => orderAPI.getById(orderId),
        refetchInterval: 10000,
        select: (r) => r.data?.data?.order || r.data?.order || r.data,
    });

    const serveMutation = useMutation({
        mutationFn: () => orderAPI.markServed(orderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orderDetail', orderId] });
            queryClient.invalidateQueries({ queryKey: ['waiterDashboard'] });
            Alert.alert('✅ Done', 'Order marked as served!');
        },
        onError: (e: any) => Alert.alert('Error', e?.response?.data?.message || 'Failed to mark served'),
    });

    if (isLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;
    }

    if (!data) {
        return (
            <View style={styles.center}>
                <Text style={{ fontSize: 16, color: '#6B7280' }}>Order not found.</Text>
            </View>
        );
    }

    const order = data;
    const status = STATUS_COLORS[order.status] || { bg: '#F3F4F6', text: '#374151', label: order.status };
    const items = order.items || order.orderItems || [];

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: `Order ${order.orderNumber}`, headerShown: true }} />

            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Status Banner */}
                <View style={[styles.statusBanner, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusLabel, { color: status.text }]}>{status.label}</Text>
                    <Text style={[styles.orderNum, { color: status.text }]}>#{order.orderNumber}</Text>
                </View>

                {/* Customer Info */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Customer</Text>
                    <Text style={styles.cardValue}>
                        {order.user?.firstName} {order.user?.lastName}
                    </Text>
                    {order.tableNumber && (
                        <Text style={styles.cardSub}>Table {order.tableNumber}</Text>
                    )}
                    <Text style={styles.cardSub}>
                        {new Date(order.createdAt).toLocaleString()}
                    </Text>
                </View>

                {/* Items */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Items ({items.length})</Text>
                    {items.map((item: any, i: number) => (
                        <View key={i} style={styles.itemRow}>
                            <View style={styles.itemLeft}>
                                <Text style={styles.itemName}>
                                    {item.quantity}× {item.menuItem?.name || item.name}
                                </Text>
                                {item.notes && (
                                    <Text style={styles.itemNotes}>📝 {item.notes}</Text>
                                )}
                            </View>
                            <Text style={styles.itemPrice}>
                                €{(parseFloat(item.price) * item.quantity).toFixed(2)}
                            </Text>
                        </View>
                    ))}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalAmount}>€{parseFloat(order.totalAmount).toFixed(2)}</Text>
                    </View>
                </View>

                {/* Notes */}
                {order.notes && (
                    <View style={[styles.card, { backgroundColor: '#FFFBEB' }]}>
                        <Text style={styles.cardTitle}>Order Notes</Text>
                        <Text style={styles.cardValue}>{order.notes}</Text>
                    </View>
                )}
            </ScrollView>

            {/* Mark as Served */}
            {order.status === 'READY' && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.serveBtn, serveMutation.isPending && { opacity: 0.6 }]}
                        onPress={() => Alert.alert(
                            'Mark as Served',
                            'Confirm that this order has been delivered to the table?',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Confirm ✅', onPress: () => serveMutation.mutate() },
                            ]
                        )}
                        disabled={serveMutation.isPending}
                    >
                        {serveMutation.isPending
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.serveBtnText}>✅ Mark as Served</Text>
                        }
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    statusBanner: {
        borderRadius: 16, padding: 20, marginBottom: 12,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    statusLabel: { fontSize: 20, fontWeight: '800' },
    orderNum: { fontSize: 16, fontWeight: '700' },
    card: {
        backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 3,
    },
    cardTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    cardValue: { fontSize: 17, fontWeight: '700', color: '#111827' },
    cardSub: { fontSize: 13, color: '#6B7280', marginTop: 3 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    itemLeft: { flex: 1 },
    itemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
    itemNotes: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
    itemPrice: { fontSize: 15, fontWeight: '700', color: '#4F46E5' },
    totalRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        marginTop: 12, paddingTop: 12, borderTopWidth: 2, borderTopColor: '#E5E7EB',
    },
    totalLabel: { fontSize: 17, fontWeight: '700', color: '#111827' },
    totalAmount: { fontSize: 20, fontWeight: '800', color: '#111827' },
    footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    serveBtn: {
        backgroundColor: '#10B981', borderRadius: 14, padding: 16,
        alignItems: 'center', shadowColor: '#10B981', shadowOpacity: 0.3, elevation: 4,
    },
    serveBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
