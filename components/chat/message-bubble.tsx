import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Message, formatMessageTime } from '@/hooks/use-chat';
import { Check, Checks } from 'phosphor-react-native';

interface MessageBubbleProps {
    message: Message;
    isOwn: boolean;
    showTimestamp?: boolean;
}

export function MessageBubble({ message, isOwn, showTimestamp = true }: MessageBubbleProps) {
    const { colors } = useTheme();

    const bubbleStyle = isOwn
        ? [styles.bubble, styles.ownBubble, { backgroundColor: colors.primary }]
        : [styles.bubble, styles.otherBubble, { backgroundColor: colors.card }];

    const textColor = isOwn ? '#FFFFFF' : colors.foreground;
    const timeColor = isOwn ? 'rgba(255,255,255,0.7)' : colors.mutedForeground;

    // Status icon for own messages
    const renderStatus = () => {
        if (!isOwn) return null;

        const iconColor = 'rgba(255,255,255,0.7)';
        const iconSize = 14;

        switch (message.status) {
            case 'read':
                return <Checks size={iconSize} color={iconColor} />;
            case 'delivered':
                return <Checks size={iconSize} color={iconColor} />;
            case 'sent':
            default:
                return <Check size={iconSize} color={iconColor} />;
        }
    };

    return (
        <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
            <View style={bubbleStyle}>
                <Text
                    style={[styles.messageText, { color: textColor }]}
                    className="text-base"
                >
                    {message.content}
                </Text>

                {showTimestamp && (
                    <View style={styles.metaRow}>
                        <Text style={[styles.timestamp, { color: timeColor }]}>
                            {formatMessageTime(message.createdAt)}
                        </Text>
                        {renderStatus()}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 2,
        marginHorizontal: 16,
    },
    ownContainer: {
        alignItems: 'flex-end',
    },
    otherContainer: {
        alignItems: 'flex-start',
    },
    bubble: {
        maxWidth: '80%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
    },
    ownBubble: {
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
        gap: 4,
    },
    timestamp: {
        fontSize: 11,
    },
});
