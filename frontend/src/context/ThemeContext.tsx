import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsAPI } from '../services/api';

interface ThemeContextType {
    storeName: string;
    logoUrl: string | null;
    primaryColor: string;
    isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    storeName: 'Food Ordering App',
    logoUrl: null,
    primaryColor: '#dc2626', // red-600
    isLoading: true,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [storeName, setStoreName] = useState('Food Ordering App');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [primaryColor, setPrimaryColor] = useState('#dc2626');

    const { data: settings, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: settingsAPI.getAll,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    useEffect(() => {
        if (settings?.data?.settings) {
            // Parse settings array into object for easier access
            const settingsArray = settings.data.settings;
            const settingsMap = settingsArray.reduce((acc: any, curr: any) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {});

            if (settingsMap['theme.store_name']) setStoreName(settingsMap['theme.store_name']);
            if (settingsMap['theme.logo_url']) setLogoUrl(settingsMap['theme.logo_url']);

            if (settingsMap['theme.primary_color']) {
                const color = settingsMap['theme.primary_color'];
                setPrimaryColor(color);
                // Set CSS variable for global usage if needed
                document.documentElement.style.setProperty('--primary-color', color);
            }
        }
    }, [settings]);

    return (
        <ThemeContext.Provider value={{ storeName, logoUrl, primaryColor, isLoading }}>
            {children}
        </ThemeContext.Provider>
    );
};
