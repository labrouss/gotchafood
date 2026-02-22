import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { menuAPI } from '../services/api';

const CACHE_KEY = 'menu_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
    categoryId: string;
    category?: { id: string; name: string };
    isAvailable: boolean;
}

export interface Category {
    id: string;
    name: string;
    slug: string;
}

interface MenuState {
    items: MenuItem[];
    categories: Category[];
    lastFetched: number | null;
    isLoading: boolean;
    fetchMenu: (force?: boolean) => Promise<void>;
}

export const useMenuStore = create<MenuState>((set, get) => ({
    items: [],
    categories: [],
    lastFetched: null,
    isLoading: false,

    fetchMenu: async (force = false) => {
        const { lastFetched } = get();
        const now = Date.now();

        // Serve from cache if fresh
        if (!force && lastFetched && now - lastFetched < CACHE_TTL_MS) {
            return;
        }

        set({ isLoading: true });
        try {
            const [menuRes, catRes] = await Promise.all([
                menuAPI.getAll(),
                menuAPI.getCategories(),
            ]);

            const items: MenuItem[] = menuRes.data?.items || menuRes.data || [];
            const categories: Category[] = catRes.data?.categories || catRes.data || [];

            // Persist to AsyncStorage
            await AsyncStorage.setItem(
                CACHE_KEY,
                JSON.stringify({ items, categories, lastFetched: now })
            );

            set({ items, categories, lastFetched: now, isLoading: false });
        } catch (error) {
            // On network error, try to load from cache
            try {
                const cached = await AsyncStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { items, categories, lastFetched } = JSON.parse(cached);
                    set({ items, categories, lastFetched, isLoading: false });
                } else {
                    set({ isLoading: false });
                }
            } catch {
                set({ isLoading: false });
            }
        }
    },
}));
