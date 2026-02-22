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
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,

      login: async (email: string, password: string) => {
        console.log('🔐 Attempting login for:', email);
        
        try {
          const response = await authAPI.login(email.trim().toLowerCase(), password);
          console.log('✅ Login response:', response.data);
          
          // ✅ FIX: Response structure is { data: { token, user }, success, message }
          // So we need response.data.data to get the actual token and user
          const { data } = response.data;
          
          if (!data || !data.token || !data.user) {
            console.error('❌ Invalid response structure:', response.data);
            throw new Error('Invalid response from server');
          }
          
          const { token, user } = data;
          
          console.log('✅ Token received:', token.substring(0, 20) + '...');
          console.log('✅ User:', user.email, user.role);
          
          set({ token, user });
          console.log('✅ Auth state updated');
        } catch (error: any) {
          console.error('❌ Login error:', error.response?.data || error.message);
          throw error;
        }
      },

      logout: async () => {
  console.log('👋 Logging out');
  set({ token: null, user: null });

  // Wait for storage to clear
  await AsyncStorage.removeItem('auth-storage');
  console.log('✅ Storage cleared');
},
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
