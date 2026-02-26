import { useState, useEffect } from 'react';
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
    const { tableId, sessionId, tableNumber, loyaltyPhone } = useLocalSearchParams<{
        tableId: string;
        sessionId: string;
        tableNumber: string;
        loyaltyPhone?: string;
    }>();

    const { items: menuItems, categories, fetchMenu, isLoading: menuLoading } = useMenuStore();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showCart, setShowCart] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Discount state — fetched from backend once we have a loyaltyPhone
    const [discountPercent, setDiscountPercent] = useState(0);
    const [discountTier, setDiscountTier] = useState<string | null>(null);

    useEffect(() => {
        fetchMenu();
    }, []);

    // Fetch loyalty discount tier for this session's customer
    useEffect(() => {
        if (!loyaltyPhone) return;
        waiterAPI.lookupUserLoyalty(loyaltyPhone)
            .then((res) => {
                const u = res.data?.user;
                if (u?.discount) {
                    setDiscountPercent(u.discount);
                    setDiscountTier(u.tier ?? null);
                }
            })
            .catch(() => {
                // Non-fatal — proceed without discount preview
            });
    }, [loyaltyPhone]);

    const filteredItems = (menuItems || []).filter(i => {
        if (!i || !i.isAvailable) return false;
        if (selectedCategory === 'all') return true;
        return i.categoryId === selectedCategory;
    });

    const addToCart = (item: any) => {
        if (!item) return;
        setCart(prev => {
            const existing = prev.find(c => c.menuItemId === item.id);
            if (existing) {
                return prev.map(c => c.menuItemId === item.id
                    ? { ...c, quantity: c.quantity + 1 }
                    : c
                );
            }
            return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, notes: '' }];
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

    const cartSubtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
    const cartDiscount = discountPercent > 0 ? (cartSubtotal * discountPercent) / 100 : 0;
    const cartTotal = cartSubtotal - cartDiscount;
    const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

    const submitOrder = async () => {
        if (cart.length === 0) { Alert.alert('Cart empty', 'Add items before placing an order'); return; }
        setSubmitting(true);
        try {
            await waiterAPI.createOrder(
                sessionId,
                cart.map(c => ({
                    menuItemId: c.menuItemId,
                    quantity: c.quantity,
                    price: c.price,
                    notes: c.notes || undefined,
                })),
                loyaltyPhone || undefined,   // ← sent to backend for discount calculation
            );
            setCart([]);
            const discountMsg = cartDiscount > 0
                ? `\n💰 Loyalty discount applied: −€${cartDiscount.toFixed(2)} (${discountPercent}%)`
                : '';
            Alert.alert('✅ Order Placed!', `The kitchen has received the order.${discountMsg}`, [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to place order');
        } finally {
            setSubmitting(false);
        }
    };

    if (menuLoading && (!menuItems || menuItems.length === 0)) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={{ marginTop: 16, fontSize: 16, color: '#6B7280' }}>Loading menu...</Text>
            </View>
        );
    }

    if (!menuItems || menuItems.length === 0) {
        return (
            <View style={styles.center}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 }}>No menu items available</Text>
                <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>Unable to load the menu</Text>
                <TouchableOpacity
                    onPress={() => fetchMenu(true)}
                    style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#4F46E5', borderRadius: 8 }}
                >
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (showCart) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: `Cart — Table ${tableNumber || tableId}`, headerShown: true }} />

                <ScrollView style={styles.cartContainer}>
                    {/* Loyalty discount banner */}
                    {loyaltyPhone && discountPercent > 0 && (
                        <View style={styles.discountBanner}>
                            <Text style={styles.discountBannerText}>
                                🎫 Loyalty discount active: {discountPercent}%{discountTier ? ` (${discountTier} tier)` : ''}
                            </Text>
                        </View>
                    )}

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
                                <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart({ id: item.menuItemId } as any)}>
                                    <Text style={styles.qtyBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={styles.notesInput}
                                placeholder="Notes (e.g. no onions)"
                                placeholderTextColor="#9CA3AF"
                                value={item.notes}
                                onChangeText={(t) => updateNotes(item.menuItemId, t)}
                            />
                        </View>
                    ))}
                </ScrollView>

                <View style={styles.cartFooter}>
                    {/* Totals */}
                    {discountPercent > 0 ? (
                        <View style={styles.totalsBlock}>
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Subtotal</Text>
                                <Text style={styles.totalValue}>€{cartSubtotal.toFixed(2)}</Text>
                            </View>
                            <View style={styles.totalRow}>
                                <Text style={styles.discountLabel}>Loyalty discount ({discountPercent}%)</Text>
                                <Text style={styles.discountValue}>−€{cartDiscount.toFixed(2)}</Text>
                            </View>
                            <View style={[styles.totalRow, styles.totalRowFinal]}>
                                <Text style={styles.cartTotalText}>Total</Text>
                                <Text style={styles.cartTotalAmount}>€{cartTotal.toFixed(2)}</Text>
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.cartTotal}>Total: €{cartTotal.toFixed(2)}</Text>
                    )}

                    <View style={styles.cartActions}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => setShowCart(false)}>
                            <Text style={styles.backBtnText}>← Menu</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                            onPress={submitOrder}
                            disabled={submitting}
                        >
                            {submitting
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.submitBtnText}>Place Order 🚀</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: `Table ${tableNumber || tableId}`, headerShown: true }} />

            {/* Category Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catBar}>
                <TouchableOpacity
                    style={[styles.catChip, selectedCategory === 'all' && styles.catChipActive]}
                    onPress={() => setSelectedCategory('all')}
                >
                    <Text style={[styles.catChipText, selectedCategory === 'all' && styles.catChipTextActive]}>All</Text>
                </TouchableOpacity>
                {categories.map(cat => (
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

            {/* Loyalty badge on menu screen */}
            {loyaltyPhone && discountPercent > 0 && (
                <View style={styles.loyaltyBadge}>
                    <Text style={styles.loyaltyBadgeText}>
                        🎫 {discountPercent}% loyalty discount will be applied
                    </Text>
                </View>
            )}

            {/* Menu Items */}
            <FlatList
                data={filteredItems}
                keyExtractor={i => i.id}
                numColumns={2}
                columnWrapperStyle={styles.menuRow}
                contentContainerStyle={{ padding: 8 }}
                renderItem={({ item }) => {
                    const inCart = cart.find(c => c.menuItemId === item.id);
                    return (
                        <TouchableOpacity style={styles.menuCard} onPress={() => addToCart(item)}>
                            <Text style={styles.menuItemName}>{item.name}</Text>
                            <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                            <View style={styles.menuCardFooter}>
                                <View>
                                    <Text style={styles.menuItemPrice}>€{Number(item.price || 0).toFixed(2)}</Text>
                                    {discountPercent > 0 && (
                                        <Text style={styles.menuItemDiscountedPrice}>
                                            €{(Number(item.price || 0) * (1 - discountPercent / 100)).toFixed(2)}
                                        </Text>
                                    )}
                                </View>
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

            {/* Cart FAB */}
            {cartCount > 0 && (
                <TouchableOpacity style={styles.cartFab} onPress={() => setShowCart(true)}>
                    <Text style={styles.cartFabText}>
                        🛒 View Cart ({cartCount}) — €{cartTotal.toFixed(2)}
                        {discountPercent > 0 ? ` (${discountPercent}% off)` : ''}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    catBar: { maxHeight: 50, paddingHorizontal: 8, paddingVertical: 8 },
    catChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
    catChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    catChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
    catChipTextActive: { color: '#fff' },

    // Loyalty
    loyaltyBadge: { marginHorizontal: 8, marginBottom: 4, backgroundColor: '#D1FAE5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#10B981' },
    loyaltyBadgeText: { fontSize: 13, fontWeight: '700', color: '#065F46' },
    discountBanner: { backgroundColor: '#D1FAE5', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#10B981' },
    discountBannerText: { fontSize: 14, fontWeight: '700', color: '#065F46' },

    menuRow: { justifyContent: 'space-between' },
    menuCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, margin: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, elevation: 3 },
    menuItemName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
    menuItemDesc: { fontSize: 12, color: '#6B7280', marginBottom: 10, minHeight: 34 },
    menuCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    menuItemPrice: { fontSize: 16, fontWeight: '800', color: '#4F46E5' },
    menuItemDiscountedPrice: { fontSize: 12, fontWeight: '700', color: '#10B981' },
    inCartBadge: { backgroundColor: '#4F46E5', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    inCartText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    cartFab: { position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#4F46E5', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#4F46E5', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
    cartFabText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    cartContainer: { flex: 1, padding: 16 },
    cartItem: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, elevation: 2 },
    cartItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cartItemName: { fontSize: 16, fontWeight: '700', color: '#111827' },
    cartItemPrice: { fontSize: 16, fontWeight: '700', color: '#4F46E5' },
    qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    qtyBtn: { backgroundColor: '#E5E7EB', borderRadius: 8, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    qtyBtnText: { fontSize: 20, fontWeight: '700', color: '#374151' },
    qtyText: { fontSize: 18, fontWeight: '700', color: '#111827', marginHorizontal: 16 },
    notesInput: { marginTop: 10, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, fontSize: 14, color: '#374151', borderWidth: 1, borderColor: '#E5E7EB' },

    cartFooter: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    cartTotal: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 12 },
    totalsBlock: { marginBottom: 12 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    totalRowFinal: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 8, marginTop: 4 },
    totalLabel: { fontSize: 15, color: '#6B7280' },
    totalValue: { fontSize: 15, color: '#374151', fontWeight: '600' },
    discountLabel: { fontSize: 14, color: '#059669', fontWeight: '600' },
    discountValue: { fontSize: 14, color: '#059669', fontWeight: '700' },
    cartTotalText: { fontSize: 18, fontWeight: '800', color: '#111827' },
    cartTotalAmount: { fontSize: 18, fontWeight: '900', color: '#111827' },
    cartActions: { flexDirection: 'row', gap: 10 },
    backBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
    backBtnText: { fontWeight: '700', color: '#374151' },
    submitBtn: { flex: 2, padding: 14, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center' },
    submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
