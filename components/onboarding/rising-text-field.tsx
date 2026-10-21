import React, { useContext, useRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { RisingKeyboardFocusContext } from './rising-sheet-screen';

interface RisingTextFieldProps extends TextInputProps {
    label: string;
    error?: string;
}

export function RisingTextField({ label, error, multiline, style, onFocus, onBlur, onContentSizeChange, ...props }: RisingTextFieldProps) {
    const { colors } = useTheme();
    const [focused, setFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const keyboardFocus = useContext(RisingKeyboardFocusContext);

    return (
        <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
            <TextInput
                ref={inputRef}
                {...props}
                accessibilityLabel={props.accessibilityLabel ?? label}
                multiline={multiline}
                onFocus={(event) => { setFocused(true); keyboardFocus?.registerFocusedInput(inputRef.current); onFocus?.(event); }}
                onBlur={(event) => { setFocused(false); keyboardFocus?.registerFocusedInput(null); onBlur?.(event); }}
                onContentSizeChange={(event) => { onContentSizeChange?.(event); if (focused) keyboardFocus?.revealFocusedInput(); }}
                placeholderTextColor={colors.mutedForeground}
                style={[
                    styles.input,
                    multiline && styles.multiline,
                    { color: colors.foreground, backgroundColor: colors.control, borderColor: error ? colors.destructive : focused ? colors.primary : colors.controlBorder },
                    style,
                ]}
            />
            {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    field: { gap: SPACING.tight },
    label: { ...TYPOGRAPHY.body, fontWeight: '600' },
    input: { minHeight: HEIGHTS.input, borderRadius: RADIUS.row, borderWidth: 1, paddingHorizontal: SPACING.base, paddingVertical: SPACING.compact, ...TYPOGRAPHY.body },
    multiline: { minHeight: 116, textAlignVertical: 'top' },
    error: { ...TYPOGRAPHY.caption },
});
