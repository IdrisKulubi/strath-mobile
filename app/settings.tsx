import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { useProfile } from '@/hooks/use-profile';
import { authClient } from '@/lib/auth-client';
import { getAuthToken } from '@/lib/auth-helpers';
import * as SecureStore from 'expo-secure-store';

export default function SettingsScreen() {
    const router = useRouter();
    const { colors, isDark, toggleTheme } = useTheme();
    const { data: profile } = useProfile();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Mock state
    const [dateMode, setDateMode] = useState(true);
    const [incognito, setIncognito] = useState(false);
    const [spotlight, setSpotlight] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(true);

    const clearAllLocalData = async () => {
        try {
            // Clear SecureStore items used by auth
            const keysToDelete = [
                'strathspace_session_token',
                'strathspace_session',
                'strathspace_user',
                'strathspace.session_token',
                'strathspace.session',
                'strathspace.user',
            ];
            
            for (const key of keysToDelete) {
                try {
                    await SecureStore.deleteItemAsync(key);
                } catch (e) {
                    // Key might not exist, continue
                }
            }
        } catch (error) {
            console.error('Error clearing local data:', error);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    style: "destructive",
                    onPress: async () => {
                        setIsLoggingOut(true);
                        try {
                            // Sign out from the server
                            await authClient.signOut();
                            
                            // Clear all local data
                            await clearAllLocalData();
                            
                            // Navigate to login
                            router.replace('/(auth)/login');
                        } catch (error) {
                            console.error('Logout error:', error);
                            // Even if server signout fails, clear local data and redirect
                            await clearAllLocalData();
                            router.replace('/(auth)/login');
                        } finally {
                            setIsLoggingOut(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Delete Account",
            "Are you sure you want to delete your account? You won't be able to log back in to this account, but you can create a new one with a different email.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        // Second confirmation
                        Alert.alert(
                            "Confirm Deletion",
                            "This action cannot be undone. Your account will be permanently deactivated.",
                            [
                                { text: "Cancel", style: "cancel" },
                                {
                                    text: "Yes, Delete My Account",
                                    style: "destructive",
                                    onPress: async () => {
                                        setIsDeleting(true);
                                        try {
                                            // Get auth token (works with Apple Sign In)
                                            const token = await getAuthToken();

                                            if (!token) {
                                                throw new Error('Not authenticated');
                                            }

                                            // Call delete account API
                                            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/delete-account`, {
                                                method: 'DELETE',
                                                headers: {
                                                    'Authorization': `Bearer ${token}`,
                                                    'Content-Type': 'application/json',
                                                },
                                            });

                                            if (!response.ok) {
                                                const errorData = await response.json().catch(() => ({}));
                                                throw new Error(errorData.error || 'Failed to delete account');
                                            }

                                            // Clear all local data
                                            await clearAllLocalData();

                                            Alert.alert(
                                                "Account Deleted",
                                                "Your account has been deleted. You can create a new account if you wish.",
                                                [
                                                    {
                                                        text: "OK",
                                                        onPress: () => router.replace('/(auth)/login')
                                                    }
                                                ]
                                            );
                                        } catch (error) {
                                            console.error('Delete account error:', error);
                                            Alert.alert(
                                                "Error",
                                                error instanceof Error ? error.message : "Failed to delete account. Please try again."
                                            );
                                        } finally {
                                            setIsDeleting(false);
                                        }
                                    }
                                }
                            ]
                        );
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
                    <SettingItem label="Help Center" type="link" onPress={() => router.push('/legal?section=help')} />
                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    <SettingItem label="Privacy Policy" type="link" onPress={() => router.push('/legal?section=privacy')} />
                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    <SettingItem label="Terms of Service" type="link" onPress={() => router.push('/legal?section=terms')} />
                    <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    <SettingItem label="Licenses" type="link" onPress={() => router.push('/legal?section=licenses')} />
                </SettingCard>

                {/* Actions */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity 
                        style={styles.actionButton} 
                        onPress={handleLogout}
                        disabled={isLoggingOut || isDeleting}
                    >
                        {isLoggingOut ? (
                            <ActivityIndicator size="small" color={colors.mutedForeground} />
                        ) : (
                            <Text style={[styles.actionButtonText, { color: colors.mutedForeground }]}>Log Out</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.actionButton} 
                        onPress={handleDeleteAccount}
                        disabled={isLoggingOut || isDeleting}
                    >
                        {isDeleting ? (
                            <ActivityIndicator size="small" color="#ef4444" />
                        ) : (
                            <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Delete Account</Text>
                        )}
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
