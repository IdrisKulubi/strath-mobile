import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { SafeAreaView } from 'react-native-safe-area-context';

type LegalSection = 'help' | 'privacy' | 'terms' | 'licenses';

const LEGAL_CONTENT: Record<LegalSection, { title: string; content: string }> = {
    help: {
        title: 'Help Center',
        content: `Welcome to StrathSpace Help Center

Getting Started
━━━━━━━━━━━━━━━
StrathSpace is a dating and social networking app exclusively for Strathmore University students. To get started, you'll need to verify your university email address.

Creating Your Profile
━━━━━━━━━━━━━━━━━━━
1. Add at least one photo of yourself
2. Fill in your basic information (name, course, year)
3. Write a bio that represents you
4. Add your interests to find like-minded people

Matching & Connections
━━━━━━━━━━━━━━━━━━━━
• Swipe right to like someone, left to pass
• When two people like each other, it's a match!
• Once matched, you can start chatting
• Be respectful in all your conversations

Safety Features
━━━━━━━━━━━━━
• Block users who make you uncomfortable
• Report inappropriate behavior
• Your location is never shared precisely
• You control who can see your profile

Account Issues
━━━━━━━━━━━━━
• Forgot password? Use the "Forgot Password" option on the login screen
• Can't verify email? Check your spam folder
• Account suspended? Contact support

Contact Support
━━━━━━━━━━━━━━
For additional help, email us at:
support@strathspace.com

We typically respond within 24-48 hours.`
    },
    privacy: {
        title: 'Privacy Policy',
        content: `StrathSpace Privacy Policy
Last Updated: January 2026

1. Information We Collect
━━━━━━━━━━━━━━━━━━━━━━━
We collect information you provide directly:
• Account information (name, email, photos)
• Profile information (bio, interests, preferences)
• Communications (messages with other users)
• Usage data (how you interact with the app)

2. How We Use Your Information
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• To provide and improve our services
• To match you with compatible users
• To communicate with you about your account
• To ensure safety and prevent abuse
• To comply with legal obligations

3. Information Sharing
━━━━━━━━━━━━━━━━━━━━━
We do NOT sell your personal information.
We may share information:
• With other users (your public profile)
• With service providers (hosting, analytics)
• When required by law
• To protect safety and rights

4. Your Choices
━━━━━━━━━━━━━━
• Edit or delete your profile anytime
• Control your visibility settings
• Block or report users
• Request data deletion
• Opt out of notifications

5. Data Security
━━━━━━━━━━━━━━━
• Encrypted data transmission (HTTPS)
• Secure password storage
• Regular security audits
• Limited employee access

6. Data Retention
━━━━━━━━━━━━━━━
• Active accounts: data retained while active
• Deleted accounts: data removed within 30 days
• Messages: deleted when match is removed
• Logs: retained for 90 days

7. University Data
━━━━━━━━━━━━━━━━
• We verify Strathmore email addresses
• We do not access university academic records
• We operate independently from the university

8. Age Requirement
━━━━━━━━━━━━━━━━
You must be 18 or older to use StrathSpace.

9. Contact Us
━━━━━━━━━━━━
Privacy concerns: privacy@strathspace.com

10. Changes to Policy
━━━━━━━━━━━━━━━━━━
We'll notify you of significant changes via email or in-app notification.`
    },
    terms: {
        title: 'Terms of Service',
        content: `StrathSpace Terms of Service
Last Updated: January 2026

1. Acceptance of Terms
━━━━━━━━━━━━━━━━━━━━
By using StrathSpace, you agree to these terms. If you don't agree, please don't use the app.

2. Eligibility
━━━━━━━━━━━━━
To use StrathSpace, you must:
• Be at least 18 years old
• Be a current Strathmore University student or alumni
• Have a valid @strathmore.edu email
• Be legally able to enter a binding contract

3. Your Account
━━━━━━━━━━━━━━
• You're responsible for your account security
• Don't share your login credentials
• All information must be accurate
• One account per person

4. Community Guidelines
━━━━━━━━━━━━━━━━━━━━
You agree NOT to:
• Harass, bully, or intimidate others
• Post inappropriate or explicit content
• Impersonate others or create fake profiles
• Use the app for commercial purposes
• Spam or send unsolicited messages
• Share others' private information
• Violate any laws or university policies

5. Content Ownership
━━━━━━━━━━━━━━━━━━
• You own your content (photos, messages)
• You grant us license to display your content
• Don't post content you don't have rights to
• We may remove content that violates guidelines

6. Matching & Interactions
━━━━━━━━━━━━━━━━━━━━━━
• Matches don't guarantee relationships
• We don't screen users' backgrounds
• Always meet in public places first
• Report any suspicious behavior

7. Premium Features
━━━━━━━━━━━━━━━━━
• Some features may require payment
• Purchases are non-refundable
• Subscriptions auto-renew unless cancelled
• Prices may change with notice

8. Termination
━━━━━━━━━━━━━
We may suspend or terminate your account if you:
• Violate these terms
• Engage in harmful behavior
• Create multiple accounts
• Don't verify your email

You can delete your account anytime in Settings.

9. Disclaimers
━━━━━━━━━━━━━
• Service provided "as is"
• We don't guarantee matches or outcomes
• We're not responsible for user behavior
• App may have bugs or downtime

10. Limitation of Liability
━━━━━━━━━━━━━━━━━━━━━━
To the maximum extent permitted by law, StrathSpace is not liable for any indirect, incidental, or consequential damages.

11. Dispute Resolution
━━━━━━━━━━━━━━━━━━━━
• Disputes governed by Kenyan law
• Attempt informal resolution first
• Formal disputes in Nairobi courts

12. Contact
━━━━━━━━
Questions: legal@strathspace.com

13. Changes
━━━━━━━━
We'll notify you of significant changes. Continued use means acceptance.`
    },
    licenses: {
        title: 'Open Source Licenses',
        content: `StrathSpace Open Source Licenses

This app is built with amazing open source software. We're grateful to the developers and communities behind these projects.

React Native
━━━━━━━━━━━
MIT License
Copyright (c) Meta Platforms, Inc.

Expo
━━━━
MIT License
Copyright (c) 2015-present 650 Industries, Inc.

React Navigation
━━━━━━━━━━━━━━
MIT License
Copyright (c) 2017 React Navigation Contributors

TanStack Query
━━━━━━━━━━━━━
MIT License
Copyright (c) 2021-present Tanner Linsley

Drizzle ORM
━━━━━━━━━━━
Apache License 2.0
Copyright (c) Drizzle Team

Better Auth
━━━━━━━━━━
MIT License

NativeWind
━━━━━━━━━
MIT License
Copyright (c) Mark Lawlor

React Native Reanimated
━━━━━━━━━━━━━━━━━━━━━━
MIT License
Copyright (c) 2016 Software Mansion

React Native Gesture Handler
━━━━━━━━━━━━━━━━━━━━━━━━━━
MIT License
Copyright (c) 2016 Software Mansion

Phosphor Icons
━━━━━━━━━━━━━
MIT License
Copyright (c) 2020 Phosphor Icons

Zod
━━━
MIT License
Copyright (c) 2020 Colin McDonnell

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Full license texts are available in our GitHub repository and bundled with each package.

Thank you to all the open source contributors who make apps like ours possible! ❤️`
    }
};

export default function LegalScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const params = useLocalSearchParams<{ section: LegalSection }>();
    
    const section = (params.section || 'terms') as LegalSection;
    const content = LEGAL_CONTENT[section] || LEGAL_CONTENT.terms;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>{content.title}</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Content */}
            <ScrollView 
                style={styles.scrollView} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={[styles.content, { color: isDark ? '#e2e8f0' : '#334155' }]}>
                    {content.content}
                </Text>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    placeholder: {
        width: 32,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    content: {
        fontSize: 15,
        lineHeight: 24,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
});
