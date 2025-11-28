import { useCallback } from 'react';
import { toast } from 'heroui-native';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
    title?: string;
    description?: string;
    duration?: number;
}

export function useToast() {
    const showToast = useCallback((
        type: ToastType,
        message: string,
        options?: ToastOptions
    ) => {
        const { title, description, duration = 3000 } = options || {};

        toast({
            title: title || getDefaultTitle(type),
            description: description || message,
            variant: type,
            duration,
        });
    }, []);

    const success = useCallback((message: string, options?: ToastOptions) => {
        showToast('success', message, options);
    }, [showToast]);

    const error = useCallback((message: string, options?: ToastOptions) => {
        showToast('error', message, options);
    }, [showToast]);

    const info = useCallback((message: string, options?: ToastOptions) => {
        showToast('info', message, options);
    }, [showToast]);

    const warning = useCallback((message: string, options?: ToastOptions) => {
        showToast('warning', message, options);
    }, [showToast]);

    return {
        success,
        error,
        info,
        warning,
        showToast,
    };
}

function getDefaultTitle(type: ToastType): string {
    switch (type) {
        case 'success':
            return 'Success';
        case 'error':
            return 'Error';
        case 'info':
            return 'Info';
        case 'warning':
            return 'Warning';
        default:
            return '';
    }
}
