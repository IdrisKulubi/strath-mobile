import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';

type Theme = 'light' | 'dark';
type ThemePreference = 'system' | Theme;

const THEME_PREFERENCE_KEY = 'theme-preference';

interface ThemeContextType {
    theme: Theme;
    isDark: boolean;
    preference: ThemePreference;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    setThemePreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function themeFromSystem(system: string | null | undefined): Theme {
    return system === 'dark' ? 'dark' : 'light';
}

function resolveTheme(preference: ThemePreference, system: string | null | undefined): Theme {
    if (preference === 'system') {
        return themeFromSystem(system);
    }
    return preference;
}

function parseStoredPreference(savedPreference: string | null): ThemePreference {
    if (savedPreference === 'system' || savedPreference === 'light' || savedPreference === 'dark') {
        return savedPreference;
    }
    return 'system';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useSystemColorScheme();
    const { setColorScheme } = useNativewindColorScheme();
    const [preference, setPreferenceState] = useState<ThemePreference>('system');

    const theme = useMemo(
        () => resolveTheme(preference, systemScheme),
        [preference, systemScheme],
    );

    useEffect(() => {
        setColorScheme(theme);
    }, [theme, setColorScheme]);

    useEffect(() => {
        let cancelled = false;

        async function hydratePreference() {
            const savedPreference = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);

            if (cancelled) {
                return;
            }

            const nextPreference = parseStoredPreference(savedPreference);
            setPreferenceState(nextPreference);

            if (!savedPreference) {
                await AsyncStorage.setItem(THEME_PREFERENCE_KEY, 'system');
            }
        }

        void hydratePreference();

        return () => {
            cancelled = true;
        };
    }, []);

    const setThemePreference = useCallback(async (nextPreference: ThemePreference) => {
        setPreferenceState(nextPreference);
        await AsyncStorage.setItem(THEME_PREFERENCE_KEY, nextPreference);
    }, []);

    const setTheme = useCallback(
        (newTheme: Theme) => {
            void setThemePreference(newTheme);
        },
        [setThemePreference],
    );

    const toggleTheme = useCallback(() => {
        const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
        void setThemePreference(nextTheme);
    }, [setThemePreference, theme]);

    return (
        <ThemeContext.Provider
            value={{
                theme,
                isDark: theme === 'dark',
                preference,
                toggleTheme,
                setTheme,
                setThemePreference,
            }}
        >
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
