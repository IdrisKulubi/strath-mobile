import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    isDark: boolean;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function themeFromSystem(system: string | null | undefined): Theme {
    return system === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useSystemColorScheme();
    const { setColorScheme } = useNativewindColorScheme();
    const [theme, setThemeState] = useState<Theme>(() => themeFromSystem(systemScheme));

    useEffect(() => {
        setColorScheme(theme);
    }, [theme, setColorScheme]);

    useEffect(() => {
        let cancelled = false;
        AsyncStorage.getItem('user-theme').then((savedTheme) => {
            if (cancelled) return;
            if (savedTheme === 'dark' || savedTheme === 'light') {
                setThemeState(savedTheme);
                setColorScheme(savedTheme);
            } else {
                const t = themeFromSystem(systemScheme);
                setThemeState(t);
                setColorScheme(t);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [systemScheme, setColorScheme]);

    const setTheme = useCallback(
        (newTheme: Theme) => {
            setThemeState(newTheme);
            setColorScheme(newTheme);
            AsyncStorage.setItem('user-theme', newTheme);
        },
        [setColorScheme]
    );

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }, [theme, setTheme]);

    return (
        <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useThemeContext() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useThemeContext must be used within a ThemeProvider');
    }
    return context;
}
