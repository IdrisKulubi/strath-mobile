import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    useRef,
} from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';

import { PrePermissionSheet } from '@/components/notifications/pre-permission-sheet';
import {
    markPrePermissionPromptSeen,
    markPrePermissionPromptShown,
    shouldShowPrePermissionPrompt,
    type PrePermissionContext,
} from '@/lib/notification-permission-prompt';
import {
    enablePushNotificationsFromUserAction,
    registerPushTokenIfGranted,
} from '@/lib/push-registration';

interface PromptOptions {
    context: PrePermissionContext;
    partnerName?: string;
}

interface NotificationPermissionContextValue {
    promptIfAppropriate: (options: PromptOptions) => Promise<void>;
    expoPushToken: string | null;
    setExpoPushToken: (token: string | null) => void;
}

const NotificationPermissionContext = createContext<NotificationPermissionContextValue | null>(null);

export function NotificationPermissionProvider({
    children,
    initialPushToken,
    onPushTokenChange,
}: {
    children: React.ReactNode;
    initialPushToken?: string | null;
    onPushTokenChange?: (token: string | null) => void;
}) {
    const [expoPushToken, setExpoPushTokenState] = useState<string | null>(initialPushToken ?? null);
    const promptBusy = useRef(false);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [sheetContext, setSheetContext] = useState<PrePermissionContext>('settings');
    const [partnerName, setPartnerName] = useState<string | undefined>();

    const setExpoPushToken = useCallback((token: string | null) => {
        setExpoPushTokenState(token);
        onPushTokenChange?.(token);
    }, [onPushTokenChange]);

    const closeSheet = useCallback(() => {
        setSheetVisible(false);
        promptBusy.current = false;
    }, []);

    const promptIfAppropriate = useCallback(async (options: PromptOptions) => {
        if (promptBusy.current) return;
        promptBusy.current = true;
        try {
            const show = await shouldShowPrePermissionPrompt(options.context);
            if (!show) { promptBusy.current = false; return; }
            await markPrePermissionPromptShown();
            setSheetContext(options.context);
            setPartnerName(options.partnerName);
            setSheetVisible(true);
        } catch (error) {
            promptBusy.current = false;
            console.warn('[Notifications] Permission reminder unavailable', error);
        }
    }, []);

    const handleEnable = useCallback(async () => {
        closeSheet();
        try {
            await markPrePermissionPromptSeen(sheetContext, 'accepted');
            const token = await enablePushNotificationsFromUserAction();
            if (token) setExpoPushToken(token);
        } catch (error) {
            console.warn('[Notifications] Enable failed', error);
            Alert.alert('Could not enable alerts', 'Check your connection and try again from Settings.');
        }
    }, [closeSheet, setExpoPushToken, sheetContext]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            if (nextState !== 'active') return;
            void registerPushTokenIfGranted().then((token) => {
                setExpoPushToken(token);
            }).catch((error) => console.warn('[Notifications] Registration failed', error));
        });
        return () => subscription.remove();
    }, [setExpoPushToken]);

    const handleDismiss = useCallback(async () => {
        closeSheet();
        await markPrePermissionPromptSeen(sheetContext, 'dismissed').catch((error) => console.warn('[Notifications] Reminder save failed', error));
    }, [closeSheet, sheetContext]);

    const value = useMemo(
        () => ({ promptIfAppropriate, expoPushToken, setExpoPushToken }),
        [promptIfAppropriate, expoPushToken, setExpoPushToken],
    );

    return (
        <NotificationPermissionContext.Provider value={value}>
            {children}
            <PrePermissionSheet
                visible={sheetVisible}
                context={sheetContext}
                partnerName={partnerName}
                onEnable={handleEnable}
                onDismiss={handleDismiss}
            />
        </NotificationPermissionContext.Provider>
    );
}

export function useNotificationPermissionPrompt(): NotificationPermissionContextValue {
    const ctx = useContext(NotificationPermissionContext);
    if (!ctx) {
        throw new Error('useNotificationPermissionPrompt must be used within NotificationPermissionProvider');
    }
    return ctx;
}
