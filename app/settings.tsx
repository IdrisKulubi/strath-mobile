import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { useProfile } from '@/hooks/use-profile';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const router = useRouter();
    const { colors, isDark, toggleTheme } = useTheme();
    const { data: profile } = useProfile();

    // Mock state
    const [dateMode, setDateMode] = useState(true);
    const [incognito, setIncognito] = useState(false);
    const [spotlight, setSpotlight] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(true);

    const handleLogout = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    style: "destructive",
                    onPress: () => router.replace('/(auth)/login')
                }
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "This action is irreversible. All your data will be permanently removed.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        Alert.alert("Account Deleted", "Your account has been scheduled for deletion.");
                        router.replace('/(auth)/login');
                    }
                }
            ]
        );
    };

    const SettingCard = ({ title, children, style }: { title?: string, children: React.ReactNode, style?: any }) => (
        <View style={[styles.cardContainer, style]}>
            {title && (
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
            )}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {children}
            </View>
        </View>
    );

    const SettingItem = ({
        label,
        value,
        onValueChange,
        type = 'switch',
        description,
        icon,
        onPress
    }: {
        label: string,
        value?: boolean | string,
        onValueChange?: (val: boolean) => void,
        type?: 'switch' | 'link' | 'value',
        description?: string,
        icon?: keyof typeof Ionicons.glyphMap,
        onPress?: () => void
    }) => (
        <TouchableOpacity
            style={[styles.settingItem, onPress && styles.pressableItem]}
            onPress={onPress}
            disabled={!onPress && type === 'switch'}
            activeOpacity={0.7}
        >
            <View style={styles.settingHeader}>
                <View style={styles.labelContainer}>
                    {icon && <Ionicons name={icon} size={22} color={colors.foreground} style={{ marginRight: 12 }} />}
                    <Text style={[styles.settingLabel, { color: colors.foreground }]}>{label}</Text>
                </View>

                {type === 'switch' && (
                    <Switch
                        value={value as boolean}
                        onValueChange={onValueChange}
                        trackColor={{ false: '#767577', true: colors.primary }}
                        thumbColor={Platform.OS === 'ios' ? '#fff' : (value ? '#fff' : '#f4f3f4')}
                    />
                )}

                {type === 'link' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {value && <Text style={[styles.valueText, { color: colors.mutedForeground }]}>{value}</Text>}
                        <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                    </View>
                )}

                {type === 'value' && (
                    <Text style={[styles.valueText, { color: colors.mutedForeground }]}>{value}</Text>
                )}
            </View>

            {description && (
                <Text style={[styles.description, { color: colors.mutedForeground }]}>
                    {description}
                </Text>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Text style={[styles.headerButtonText, { color: colors.mutedForeground }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.doneButton}>
                    <Text style={[styles.headerButtonText, { color: colors.primary, fontWeight: '600' }]}>Done</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Account Section */}
                <SettingCard title="Account">
                    <SettingItem
                        label="Phone Number"
                        value={profile?.phoneNumber || "Not set"}
                        type="value"
                    />
                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    <SettingItem
                        label="Email"
                        value={profile?.user?.email || "Not set"}
                        type="value"
                    />
                </SettingCard>

                {/* Discovery Section */}
                <SettingCard title="Discovery">
                    <SettingItem
                        label="Current Location"
                        value="Nairobi, KE"
                        type="link"
                        onPress={() => { }}
                    />
                </SettingCard>

                {/* Modes Section */}
                <SettingCard title="Modes">
                    <SettingItem
                        label="Date Mode"
                        type="switch"
                        value={dateMode}
                        onValueChange={setDateMode}
                        description="Hide your profile in Date and just use BFF or Bizz. If you do this, you'll lose your connections and chats in Date."
                    />
                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    <SettingItem
                        label="Snooze Mode"
                        type="link"
                        description="Hide your profile temporarily, in all modes. You won't lose any connections or chats."
                        onPress={() => { }}
                    />
                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    <SettingItem
                        label="Incognito Mode"
                        type="switch"
                        value={incognito}
                        onValueChange={setIncognito}
                        description="Only people you've liked already will see your profile."
                    />
                </SettingCard>

                {/* Boost Section */}
                <SettingCard>
                    <SettingItem
                        label="Auto-Spotlight"
                        type="switch"
                        value={spotlight}
                        onValueChange={setSpotlight}
                        description="We'll use Spotlight automatically to boost your profile when most people will see it."
                    />
                </SettingCard>

                {/* App Settings */}
                <SettingCard title="App Settings">
                    <SettingItem
                        label="Dark Mode"
                        type="switch"
                        value={isDark}
                        onValueChange={toggleTheme}
                    />
                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    <SettingItem
                        label="Notifications"
                        type="link"
                        onPress={() => { }}
                    />
                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    <SettingItem
                        label="Video Autoplay"
                        type="link"
                        value="Always"
                        onPress={() => { }}
                    />
                </SettingCard>

                {/* Legal & Support */}
                <SettingCard title="Legal & Support">
                    <SettingItem label="Help Center" type="link" onPress={() => { }} />
                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    <SettingItem label="Privacy Policy" type="link" onPress={() => { }} />
                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    <SettingItem label="Terms of Service" type="link" onPress={() => { }} />
                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    <SettingItem label="Licenses" type="link" onPress={() => { }} />
                </SettingCard>

                {/* Actions */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
                        <Text style={[styles.actionButtonText, { color: colors.mutedForeground }]}>Log Out</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={handleDeleteAccount}>
                        <Text style={[styles.actionButtonText, { color: colors.mutedForeground }]}>Delete Account</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.versionText, { color: colors.mutedForeground }]}>StrathSpace v1.0.0 (Build 100)</Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    headerButtonText: {
        fontSize: 16,
    },
    backButton: {
        minWidth: 60,
    },
    doneButton: {
        minWidth: 60,
        alignItems: 'flex-end',
    },
    scrollContent: {
        padding: 16,
    },
    cardContainer: {
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        marginLeft: 4,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
    },
    settingItem: {
        padding: 16,
    },
    pressableItem: {
        // Add active state styles if needed
    },
    settingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '500',
    },
    valueText: {
        fontSize: 16,
        marginRight: 8,
    },
    description: {
        fontSize: 13,
        marginTop: 8,
        lineHeight: 18,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    actionsContainer: {
        marginTop: 16,
        gap: 16,
        alignItems: 'center',
    },
    actionButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    footer: {
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 20,
    },
    versionText: {
        fontSize: 12,
    },
});
