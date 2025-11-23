import { Redirect } from 'expo-router';
import { Text, View, ActivityIndicator } from 'react-native';
import { useSession } from '../lib/auth-client';

export default function Index() {
    const { data: session, isPending, error } = useSession();

    if (isPending) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (session) {
        return <Redirect href="/(tabs)" />;
    }

    return <Redirect href="/(auth)/login" />;
}
