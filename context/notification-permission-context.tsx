import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { PrePermissionSheet } from '@/components/notifications/pre-permission-sheet';
import {
    markPrePermissionPromptSeen,
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
    const [sheetVisible, setSheetVisible] = useState(false);
    const [sheetContext, setSheetContext] = useState<PrePermissionContext>('settings');
    const [partnerName, setPartnerName] = useState<string | undefined>();

    const setExpoPushToken = useCallback((token: string | null) => {
        setExpoPushTokenState(token);
        onPushTokenChange?.(token);
    }, [onPushTokenChange]);

    const closeSheet = useCallback(() => {
        setSheetVisible(false);
    }, []);

    const promptIfAppropriate = useCallback(async (options: PromptOptions) => {
        const show = await shouldShowPrePermissionPrompt(options.context);
        if (!show) return;

        setSheetContext(options.context);
        setPartnerName(options.partnerName);
        setSheetVisible(true);
    }, []);

    const handleEnable = useCallback(async () => {
        await markPrePermissionPromptSeen(sheetContext, 'accepted');
        closeSheet();
        const token = await enablePushNotificationsFromUserAction();
        if (token) {
            setExpoPushToken(token);
        }
    }, [closeSheet, setExpoPushToken, sheetContext]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            if (nextState !== 'active') return;
            void registerPushTokenIfGranted().then((token) => {
                if (token) setExpoPushToken(token);
            });
        });
        return () => subscription.remove();
    }, [setExpoPushToken]);

    const handleDismiss = useCallback(async () => {
        await markPrePermissionPromptSeen(sheetContext, 'dismissed');
        closeSheet();
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
