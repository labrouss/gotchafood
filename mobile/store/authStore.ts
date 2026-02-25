import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  hasHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      hasHydrated: false,

      setHasHydrated: (state) => {
        set({ hasHydrated: state });
      },

      login: async (email: string, password: string) => {
        console.log('🔐 Attempting login for:', email);
        
        try {
          const response = await authAPI.login(email.trim().toLowerCase(), password);
          console.log('✅ Login response received');
          
          const { data } = response.data;
          
          if (!data || !data.token || !data.user) {
            console.error('❌ Invalid response structure:', response.data);
            throw new Error('Invalid response from server');
          }
          
          const { token, user } = data;
          
          console.log('✅ Token received:', token.substring(0, 20) + '...');
          console.log('✅ User:', user.email, user.role);
          
          set({ token, user });
          console.log('✅ Auth state updated in store');
        } catch (error: any) {
          console.error('❌ Login error:', error.response?.data || error.message);
          throw error;
        }
      },

      logout: async () => {
        console.log('👋 Logging out');
        set({ token: null, user: null });
        
        // Clear AsyncStorage completely
        try {
          await AsyncStorage.removeItem('auth-storage');
          console.log('✅ Auth storage cleared');
        } catch (error) {
          console.error('❌ Error clearing storage:', error);
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        console.log('💧 Hydration complete');
        console.log('   User:', state?.user?.email || 'none');
        console.log('   Token:', state?.token ? 'exists' : 'none');
        state?.setHasHydrated(true);
      },
    }
  )
);
