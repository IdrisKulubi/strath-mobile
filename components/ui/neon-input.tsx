import React, { useState } from 'react';
import { TextInput, View, StyleSheet, TextInputProps, Animated, StyleProp, ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

interface NeonInputProps extends Omit<TextInputProps, 'style'> {
    borderColor?: string;
    glowColor?: string;
    style?: StyleProp<ViewStyle>;
}

export function NeonInput({
    style,
    borderColor = '#00FFFF', // Default neon cyan
    glowColor = '#00FFFF',
    ...props
}: NeonInputProps) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View
            style={[
                styles.container,
                {
                    borderColor: isFocused ? borderColor : '#333',
                    shadowColor: isFocused ? glowColor : 'transparent',
                    shadowOpacity: isFocused ? 0.5 : 0,
                    shadowRadius: isFocused ? 10 : 0,
                    elevation: isFocused ? 10 : 0,
                },
                style,
            ]}
        >
            <TextInput
                style={styles.input}
                placeholderTextColor="#666"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                {...props}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 56,
        borderWidth: 2,
        borderRadius: 28,
        backgroundColor: '#000', // Deep black background for contrast
        justifyContent: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
        shadowOffset: { width: 0, height: 0 },
    },
    input: {
        color: '#FFF',
        fontSize: 16,
        height: '100%',
    },
});
