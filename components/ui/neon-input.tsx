import React, { useState } from 'react';
import { TextInput, View, StyleSheet, TextInputProps, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NeonInputProps extends Omit<TextInputProps, 'style'> {
    borderColor?: string;
    glowColor?: string;
    style?: StyleProp<ViewStyle>;
    icon?: keyof typeof Ionicons.glyphMap;
}

export function NeonInput({
    style,
    borderColor = '#00FFFF', // Default neon cyan
    glowColor = '#00FFFF',
    icon,
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
            {icon && (
                <Ionicons
                    name={icon}
                    size={20}
                    color={isFocused ? borderColor : '#666'}
                    style={styles.icon}
                />
            )}
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
        borderWidth: 1, // Thinner border as per design
        borderRadius: 16, // Slightly less rounded
        backgroundColor: 'rgba(255, 255, 255, 0.05)', // Transparent background
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
        shadowOffset: { width: 0, height: 0 },
    },
    icon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#FFF',
        fontSize: 16,
        height: '100%',
    },
});
