import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export function FloatingEmojis() {
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Top Left */}
            <Text style={[styles.emoji, { top: height * 0.1, left: width * 0.1, fontSize: 40, transform: [{ rotate: '-15deg' }] }]}>😍</Text>

            {/* Top Right */}
            <Text style={[styles.emoji, { top: height * 0.12, right: width * 0.1, fontSize: 35, transform: [{ rotate: '15deg' }] }]}>💕</Text>

            {/* Middle Left - Rocket */}
            <Text style={[styles.emoji, { top: height * 0.3, left: -10, fontSize: 50, transform: [{ rotate: '45deg' }] }]}>🚀</Text>

            {/* Middle Right - Tongue */}
            <Text style={[styles.emoji, { top: height * 0.4, right: width * 0.05, fontSize: 38, transform: [{ rotate: '-10deg' }] }]}>😝</Text>

            {/* Bottom Left - Heart */}
            <Text style={[styles.emoji, { bottom: height * 0.2, left: width * 0.08, fontSize: 45 }]}>💖</Text>

            {/* Bottom Right - Star Eyes */}
            <Text style={[styles.emoji, { bottom: height * 0.15, right: width * 0.1, fontSize: 42, transform: [{ rotate: '10deg' }] }]}>🤩</Text>

            {/* Extra Rocket */}
            <Text style={[styles.emoji, { top: height * 0.15, right: width * 0.3, fontSize: 25, opacity: 0.5, transform: [{ rotate: '-45deg' }] }]}>🚀</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    emoji: {
        position: 'absolute',
        textShadowColor: 'rgba(255, 0, 255, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
});
