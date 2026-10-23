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
  Easing,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING } from '@/lib/design-tokens';

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

const getVariantColors = (
  variant: ToastVariant,
  colors: ReturnType<typeof useTheme>['colors'],
) => {
  const map = {
    default: {
      bg: colors.card,
      text: colors.foreground,
      border: colors.border,
    },
    accent: {
      bg: colors.primary,
      text: colors.primaryForeground,
      border: colors.primary,
    },
    success: {
      bg: 'success' in colors ? (colors as { success: string }).success : '#3DB87A',
      text: colors.primaryForeground,
      border: 'success' in colors ? (colors as { success: string }).success : '#3DB87A',
    },
    warning: {
      bg: 'warning' in colors ? (colors as { warning: string }).warning : '#E0A040',
      text: colors.primaryForeground,
      border: 'warning' in colors ? (colors as { warning: string }).warning : '#E0A040',
    },
    danger: {
      bg: colors.destructive,
      text: colors.primaryForeground,
      border: colors.destructive,
    },
  };
  return map[variant];
};

const getSizeStyles = (size: ToastSize) => {
  const sizes = {
    small: { paddingVertical: 8, paddingHorizontal: 12, fontSize: 13, minHeight: 40 },
    medium: { paddingVertical: 12, paddingHorizontal: 16, fontSize: 14, minHeight: 48 },
    large: { paddingVertical: 16, paddingHorizontal: 20, fontSize: 16, minHeight: 56 },
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
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const variantColors = getVariantColors(variant, colors);
  const sizeStyles = getSizeStyles(size);

  useEffect(() => {
    if (visible) {
      if (dismissKeyboard) Keyboard.dismiss();

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, dismissKeyboard, slideAnim, opacityAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: position === 'top' ? [-80, 0] : [80, 0],
  });

  const toastContent = (
    <Animated.View
      style={[
        styles.container,
        position === 'top' ? styles.topPosition : styles.bottomPosition,
        { transform: [{ translateY }], opacity: opacityAnim },
      ]}
    >
      <TouchableOpacity activeOpacity={0.92} onPress={onHide} accessibilityRole="button">
        <View
          style={[
            styles.toastWrapper,
            {
              backgroundColor: variantColors.bg,
              borderColor: variantColors.border,
              minHeight: sizeStyles.minHeight,
              paddingVertical: sizeStyles.paddingVertical,
              paddingHorizontal: sizeStyles.paddingHorizontal,
            },
          ]}
        >
          <Text
            style={[styles.message, { color: variantColors.text, fontSize: sizeStyles.fontSize }]}
            numberOfLines={3}
          >
            {message}
          </Text>
        </View>
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
  const [toastConfig, setToastConfig] = React.useState<(ToastProps & { visible: boolean }) | null>(
    null,
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = React.useCallback(() => {
    setToastConfig((prev) => (prev ? { ...prev, visible: false } : null));
    setTimeout(() => {
      setToastConfig(null);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, 220);
  }, []);

  const show = React.useCallback(
    (props: ToastProps) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setToastConfig({ ...props, visible: true });
      const duration = props.duration ?? 3000;
      if (duration > 0) {
        timeoutRef.current = setTimeout(() => hide(), duration);
      }
    },
    [hide],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
    paddingHorizontal: SPACING.base,
    zIndex: 9999,
  },
  topPosition: { top: Platform.OS === 'ios' ? 56 : 24 },
  bottomPosition: { bottom: Platform.OS === 'ios' ? 48 : 24 },
  toastWrapper: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    width: '100%',
    maxWidth: SCREEN_WIDTH - SPACING.base * 2,
    shadowColor: '#141118',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  message: {
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ToastProvider;
