import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    TouchableOpacity,
    Keyboard,
    Modal,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/hooks/use-theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type ToastVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger';
export type ToastPosition = 'top' | 'bottom';
export type ToastSize = 'small' | 'medium' | 'large';

export interface ToastProps {
    message: string;
    variant?: ToastVariant;
    position?: ToastPosition;
    size?: ToastSize;
    duration?: number;
    onHide?: () => void;
    dismissKeyboard?: boolean;
    showInModal?: boolean;
}

interface ToastContextType {
    show: (props: ToastProps) => void;
    hide: () => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const getVariantColors = (variant: ToastVariant, isDark: boolean) => {
    const baseColors = {
        default: {
            bg: isDark ? '#3d2459' : '#ffffff',
            text: isDark ? '#ffffff' : '#1a0d2e',
            border: isDark ? '#482961' : '#e5e5e5',
        },
        accent: {
            bg: isDark ? '#e91e8c' : '#e91e8c',
            text: '#ffffff',
            border: isDark ? '#ff3da1' : '#d946a6',
        },
        success: {
            bg: isDark ? '#10b981' : '#10b981',
            text: '#ffffff',
            border: isDark ? '#34d399' : '#059669',
        },
        warning: {
            bg: isDark ? '#f59e0b' : '#f59e0b',
            text: '#ffffff',
            border: isDark ? '#fbbf24' : '#d97706',
        },
        danger: {
            bg: isDark ? '#ef4444' : '#ef4444',
            text: '#ffffff',
            border: isDark ? '#f87171' : '#dc2626',
        },
    };

    return baseColors[variant];
};

const getSizeStyles = (size: ToastSize) => {
    const sizes = {
        small: {
            paddingVertical: 8,
            paddingHorizontal: 12,
            fontSize: 13,
            minHeight: 40,
        },
        medium: {
            paddingVertical: 12,
            paddingHorizontal: 16,
            fontSize: 14,
            minHeight: 50,
        },
        large: {
            paddingVertical: 16,
            paddingHorizontal: 20,
            fontSize: 16,
            minHeight: 60,
        },
    };

    return sizes[size];
};

const ToastComponent: React.FC<ToastProps & { visible: boolean }> = ({
    message,
    variant = 'default',
    position = 'top',
    size = 'medium',
    visible,
    onHide,
    dismissKeyboard = false,
    showInModal = false,
}) => {
    const { colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const slideAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    const colors = getVariantColors(variant, isDark);
    const sizeStyles = getSizeStyles(size);

    useEffect(() => {
        if (visible) {
            if (dismissKeyboard) {
                Keyboard.dismiss();
            }

            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 8,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, dismissKeyboard]);

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: position === 'top' ? [-100, 0] : [100, 0],
    });

    const toastContent = (
        <Animated.View
            style={[
                styles.container,
                position === 'top' ? styles.topPosition : styles.bottomPosition,
                {
                    transform: [{ translateY }],
                    opacity: opacityAnim,
                },
            ]}
        >
            <TouchableOpacity activeOpacity={0.9} onPress={onHide}>
                <BlurView
                    intensity={Platform.OS === 'ios' ? 80 : 100}
                    tint={isDark ? 'dark' : 'light'}
                    style={[
                        styles.toastWrapper,
                        {
                            backgroundColor: colors.bg + (Platform.OS === 'ios' ? '80' : 'E6'),
                            borderColor: colors.border,
                            minHeight: sizeStyles.minHeight,
                            paddingVertical: sizeStyles.paddingVertical,
                            paddingHorizontal: sizeStyles.paddingHorizontal,
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.message,
                            {
                                color: colors.text,
                                fontSize: sizeStyles.fontSize,
                            },
                        ]}
                        numberOfLines={3}
                    >
                        {message}
                    </Text>
                </BlurView>
            </TouchableOpacity>
        </Animated.View>
    );

    if (showInModal) {
        return (
            <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
                {toastContent}
            </Modal>
        );
    }

    return toastContent;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toastConfig, setToastConfig] = React.useState<
        (ToastProps & { visible: boolean }) | null
    >(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const show = React.useCallback((props: ToastProps) => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        setToastConfig({ ...props, visible: true });

        // Auto hide after duration
        const duration = props.duration ?? 3000;
        if (duration > 0) {
            timeoutRef.current = setTimeout(() => {
                hide();
            }, duration);
        }
    }, []);

    const hide = React.useCallback(() => {
        setToastConfig((prev) => (prev ? { ...prev, visible: false } : null));

        // Clear the toast config after animation completes
        setTimeout(() => {
            setToastConfig(null);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        }, 300);
    }, []);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <ToastContext.Provider value={{ show, hide }}>
            {children}
            {toastConfig && (
                <ToastComponent
                    {...toastConfig}
                    onHide={() => {
                        hide();
                        toastConfig.onHide?.();
                    }}
                />
            )}
        </ToastContext.Provider>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        zIndex: 9999,
    },
    topPosition: {
        top: Platform.OS === 'ios' ? 50 : 20,
    },
    bottomPosition: {
        bottom: Platform.OS === 'ios' ? 50 : 20,
    },
    toastWrapper: {
        borderRadius: 12,
        borderWidth: 1,
        width: '100%',
        maxWidth: SCREEN_WIDTH - 32,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    message: {
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default ToastProvider;
