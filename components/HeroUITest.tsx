import React from 'react';
import { View, Text } from 'react-native';
import { Button } from 'heroui-native';

export default function HeroUITestComponent() {
    return (
        <View className="flex-1 justify-center items-center bg-background">
            <Text className="text-xl font-bold mb-4">HeroUI Native Test</Text>
            <Button onPress={() => console.log('Button Pressed!')}>
                Get Started
            </Button>
        </View>
    );
}
