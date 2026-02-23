import { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useMenuStore } from '../../../store/menuCache';
import { waiterAPI } from '../../../services/api';

interface CartItem {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    notes: string;
}

export default function TakeOrderScreen() {
    const params = useLocalSearchParams<{
        tableId: string;
        sessionId?: string; // Made optional for safety check
        tableNumber?: string;
    }>();

    // If sessionId is missing from params, but tableId looks like a session UUID, 
    // we need to be careful. However, the best fix is ensuring they are passed correctly:
    const tableId = params.tableId;
    const sessionId = params.sessionId; 
    const tableNumber = params.tableNumber;

    // ADD THIS LOG TO VERIFY FIX
    console.log("📥 Screen Params:", { tableId, sessionId, tableNumber });

    //const { tableId, sessionId, tableNumber } = useLocalSearchParams<{
    //    tableId: string;
    //    sessionId: string;
    //    tableNumber: string;
    //}>();

    const { items: menuItems, categories, fetchMenu, isLoading: menuLoading } = useMenuStore();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showCart, setShowCart] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchMenu(true);
    }, []);

    // ✅ ROBUST FIX: Use useMemo and Array.isArray to prevent "filter is not a function"
    const filteredItems = useMemo(() => {
        const itemsArray = Array.isArray(menuItems) ? menuItems : [];
        return itemsArray.filter(i => {
            if (!i || !i.isAvailable) return false;
            if (selectedCategory === 'all') return true;
            return i.categoryId === selectedCategory;
        });
    }, [menuItems, selectedCategory]);

     const addToCart = (item: any) => {
    if (!item || !item.id) return;
    
    // Convert string price to number immediately
    const cleanPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;

    setCart(prev => {
        const existing = prev.find(c => c.menuItemId === item.id);
        if (existing) {
            return prev.map(c => c.menuItemId === item.id
                ? { ...c, quantity: c.quantity + 1 }
                : c
            );
        }
        return [...prev, { 
            menuItemId: item.id, 
            name: item.name, 
            price: cleanPrice || 0, 
            quantity: 1, 
            notes: '' 
        }];
    });
};

    const removeFromCart = (menuItemId: string) => {
        setCart(prev => {
            const existing = prev.find(c => c.menuItemId === menuItemId);
            if (existing && existing.quantity > 1) {
                return prev.map(c => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity - 1 } : c);
            }
            return prev.filter(c => c.menuItemId !== menuItemId);
        });
    };

    const updateNotes = (menuItemId: string, notes: string) => {
        setCart(prev => prev.map(c => c.menuItemId === menuItemId ? { ...c, notes } : c));
    };

    const cartTotal = cart.reduce((sum, c) => {
    const price = typeof c.price === 'number' ? c.price : parseFloat(c.price || '0');
    return sum + (price * c.quantity);
}, 0);

    const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

    const submitOrder = async () => {
        if (!sessionId) {
	    console.log("🚀 Submitting Order:", {
        sessionId: sessionId,
        itemsCount: cart.length,
        tableId: tableId
    }); 
            Alert.alert('Error', 'No active session found for this table.');
            return;
        }
        if (cart.length === 0) { 
            Alert.alert('Cart empty', 'Add items before placing an order'); 
            return; 
        }

        setSubmitting(true);
        try {
            await waiterAPI.createOrder(sessionId, cart.map(c => ({
                menuItemId: c.menuItemId,
                quantity: c.quantity,
		price: c.price,
                notes: c.notes || undefined,
            })));
            setCart([]);
            Alert.alert('✅ Order Placed!', 'The kitchen has received the order.', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (err: any) {
            Alert.alert('Order Failed', err?.response?.data?.message || 'Check connection to backend');
        } finally {
            setSubmitting(false);
        }
    };

    if (menuLoading && (!menuItems || (Array.isArray(menuItems) && menuItems.length === 0))) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>Loading menu...</Text>
            </View>
        );
    }

    if (!Array.isArray(menuItems) || menuItems.length === 0) {
        return (
            <View style={styles.center}>
                <Text style={styles.emptyTitle}>No menu items available</Text>
                <Text style={styles.emptySub}>The menu data structure might be incorrect or empty.</Text>
                <TouchableOpacity onPress={() => fetchMenu()} style={styles.retryBtn}>
                    <Text style={styles.retryText}>Retry Fetch</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (showCart) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: `Cart — Table ${tableNumber || tableId}`, headerShown: true }} />
                <ScrollView style={styles.cartContainer}>
                    {cart.map(item => (
                        <View key={item.menuItemId} style={styles.cartItem}>
                            <View style={styles.cartItemHeader}>
                                <Text style={styles.cartItemName}>{item.name}</Text>
                                <Text style={styles.cartItemPrice}>€{(item.price * item.quantity).toFixed(2)}</Text>
                            </View>
                            <View style={styles.qtyRow}>
                                <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.menuItemId)}>
                                    <Text style={styles.qtyBtnText}>−</Text>
                                </TouchableOpacity>
                                <Text style={styles.qtyText}>{item.quantity}</Text>
                                <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart({ id: item.menuItemId, name: item.name, price: item.price })}>
                                    <Text style={styles.qtyBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={styles.notesInput}
                                placeholder="Special instructions..."
                                placeholderTextColor="#9CA3AF"
                                value={item.notes}
                                onChangeText={(t) => updateNotes(item.menuItemId, t)}
                            />
                        </View>
                    ))}
                </ScrollView>
                <View style={styles.cartFooter}>
                    <Text style={styles.cartTotal}>Total: €{cartTotal.toFixed(2)}</Text>
                    <View style={styles.cartActions}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => setShowCart(false)}>
                            <Text style={styles.backBtnText}>← Menu</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.submitBtn, submitting && { opacity: 0.6 }]} 
                            onPress={submitOrder} 
                            disabled={submitting}
                        >
                            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Place Order 🚀</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: `Table ${tableNumber || tableId}`, headerShown: true }} />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catBar}>
                <TouchableOpacity
                    style={[styles.catChip, selectedCategory === 'all' && styles.catChipActive]}
                    onPress={() => setSelectedCategory('all')}
                >
                    <Text style={[styles.catChipText, selectedCategory === 'all' && styles.catChipTextActive]}>All</Text>
                </TouchableOpacity>
                {Array.isArray(categories) && categories.map(cat => (
                    <TouchableOpacity
                        key={cat.id}
                        style={[styles.catChip, selectedCategory === cat.id && styles.catChipActive]}
                        onPress={() => setSelectedCategory(cat.id)}
                    >
                        <Text style={[styles.catChipText, selectedCategory === cat.id && styles.catChipTextActive]}>
                            {cat.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <FlatList
                data={filteredItems}
                keyExtractor={i => i.id}
                numColumns={2}
                columnWrapperStyle={styles.menuRow}
                contentContainerStyle={{ padding: 8, paddingBottom: 100 }}
                renderItem={({ item }) => {
                    const inCart = cart.find(c => c.menuItemId === item.id);
                    return (
                        <TouchableOpacity style={styles.menuCard} onPress={() => addToCart(item)}>
                            <Text style={styles.menuItemName}>{item.name}</Text>
                            <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                            <View style={styles.menuCardFooter}>
			    <Text style={styles.menuItemPrice}>€{Number(item.price || 0).toFixed(2)}</Text>
                                {inCart && (
                                    <View style={styles.inCartBadge}>
                                        <Text style={styles.inCartText}>{inCart.quantity}</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />

            {cartCount > 0 && (
                <TouchableOpacity style={styles.cartFab} onPress={() => setShowCart(true)}>
                    <Text style={styles.cartFabText}>🛒 Cart ({cartCount}) — €{cartTotal.toFixed(2)}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    loadingText: { marginTop: 16, fontSize: 16, color: '#6B7280' },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
    emptySub: { fontSize: 14, color: '#6B7280', marginBottom: 16, textAlign: 'center' },
    retryBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#4F46E5', borderRadius: 8 },
    retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    catBar: { maxHeight: 60, paddingHorizontal: 8, paddingVertical: 10 },
    catChip: {
        paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
        backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB',
        height: 34
    },
    catChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    catChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
    catChipTextActive: { color: '#fff' },
    menuRow: { justifyContent: 'space-between' },
    menuCard: {
        flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, margin: 6,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 3,
    },
    menuItemName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
    menuItemDesc: { fontSize: 12, color: '#6B7280', marginBottom: 10, minHeight: 34 },
    menuCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    menuItemPrice: { fontSize: 16, fontWeight: '800', color: '#4F46E5' },
    inCartBadge: { backgroundColor: '#4F46E5', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    inCartText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    cartFab: {
        position: 'absolute', bottom: 24, left: 16, right: 16,
        backgroundColor: '#4F46E5', borderRadius: 16, padding: 16,
        alignItems: 'center', shadowColor: '#4F46E5', shadowOpacity: 0.4,
        shadowOffset: { width: 0, height: 4 }, elevation: 8,
    },
    cartFabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    cartContainer: { flex: 1, padding: 16 },
    cartItem: {
        backgroundColor: '#fff', borderRadius: 12, padding: 16,
        marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, elevation: 2,
    },
    cartItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cartItemName: { fontSize: 16, fontWeight: '700', color: '#111827' },
    cartItemPrice: { fontSize: 16, fontWeight: '700', color: '#4F46E5' },
    qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    qtyBtn: { backgroundColor: '#E5E7EB', borderRadius: 8, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    qtyBtnText: { fontSize: 20, fontWeight: '700', color: '#374151' },
    qtyText: { fontSize: 18, fontWeight: '700', color: '#111827', marginHorizontal: 16 },
    notesInput: {
        marginTop: 10, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, fontSize: 14,
        color: '#374151', borderWidth: 1, borderColor: '#E5E7EB',
    },
    cartFooter: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    cartTotal: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 12 },
    cartActions: { flexDirection: 'row', gap: 10 },
    backBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
    backBtnText: { fontWeight: '700', color: '#374151' },
    submitBtn: { flex: 2, padding: 14, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center' },
    submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
