import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    description?: string;
}

interface ToastContextType {
    show: (message: string, type?: ToastType, description?: string) => void;
    hide: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const show = useCallback((message: string, type: ToastType = 'info', description?: string) => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { id, type, message, description }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    const hide = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ show, hide }}>
            {children}
            <View className="absolute top-12 left-0 right-0 z-50 flex-col items-center space-y-2 pointer-events-none px-4">
                {toasts.map((toast) => (
                    <Animated.View
                        key={toast.id}
                        entering={FadeInUp}
                        exiting={FadeOutUp}
                        className={cn(
                            'w-full max-w-sm rounded-lg border p-4 shadow-lg pointer-events-auto flex-row items-center',
                            toast.type === 'success' && 'bg-background border-green-500',
                            toast.type === 'error' && 'bg-destructive border-destructive',
                            toast.type === 'warning' && 'bg-background border-yellow-500',
                            toast.type === 'info' && 'bg-background border-border'
                        )}
                    >
                        <View className="mr-3">
                            {toast.type === 'success' && <Ionicons name="checkmark-circle" size={24} color="#22c55e" />}
                            {toast.type === 'error' && <Ionicons name="alert-circle" size={24} color="white" />}
                            {toast.type === 'warning' && <Ionicons name="warning" size={24} color="#eab308" />}
                            {toast.type === 'info' && <Ionicons name="information-circle" size={24} color="#e91e8c" />}
                        </View>
                        <View className="flex-1">
                            <Text className={cn("font-semibold", toast.type === 'error' ? 'text-white' : 'text-foreground')}>
                                {toast.message}
                            </Text>
                            {toast.description && (
                                <Text className={cn("text-sm", toast.type === 'error' ? 'text-white/90' : 'text-muted-foreground')}>
                                    {toast.description}
                                </Text>
                            )}
                        </View>
                    </Animated.View>
                ))}
            </View>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return {
        toast: context.show,
        dismiss: context.hide,
        success: (message: string, description?: string) => context.show(message, 'success', description),
        error: (message: string, description?: string) => context.show(message, 'error', description),
        warning: (message: string, description?: string) => context.show(message, 'warning', description),
        info: (message: string, description?: string) => context.show(message, 'info', description),
    };
}
