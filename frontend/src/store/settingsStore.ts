import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { settingsAPI } from '../services/api';

interface SettingsState {
    settings: Record<string, any>;
    isLoading: boolean;
    fetchSettings: () => Promise<void>;
    getSetting: (key: string, defaultValue?: any) => any;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            settings: {},
            isLoading: false,
            fetchSettings: async () => {
                set({ isLoading: true });
                try {
                    const response = await settingsAPI.getAll();
                    const settingsList = response.data?.settings || [];
                    const settingsMap: Record<string, any> = {};

                    settingsList.forEach((s: any) => {
                        let value = s.value;
                        if (s.dataType === 'boolean') value = s.value === 'true';
                        else if (s.dataType === 'number') value = parseFloat(s.value);
                        else if (s.dataType === 'json') {
                            try {
                                value = JSON.parse(s.value);
                            } catch {
                                value = s.value;
                            }
                        }
                        settingsMap[s.key] = value;
                    });

                    set({ settings: settingsMap, isLoading: false });
                } catch (error) {
                    console.error('Failed to fetch settings:', error);
                    set({ isLoading: false });
                }
            },
            getSetting: (key: string, defaultValue: any = null) => {
                const { settings } = get();
                return settings[key] !== undefined ? settings[key] : defaultValue;
            },
        }),
        {
            name: 'store-settings',
        }
    )
);
