import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Hourglass } from 'phosphor-react-native';

import { Text } from '@/components/ui/text';
import type { VerificationOverlayStage } from '@/lib/verification/verification-stages';
import { useVerificationThemedStyles } from '@/lib/verification/use-verification-themed-styles';
import { SPACING } from '@/lib/design-tokens';

interface VerificationProcessingOverlayProps {
    visible: boolean;
    stage: VerificationOverlayStage | undefined;
    stageIndex: number;
    stages: readonly VerificationOverlayStage[];
}

export function VerificationProcessingOverlay({
    visible,
    stage,
    stageIndex,
    stages,
}: VerificationProcessingOverlayProps) {
    const theme = useVerificationThemedStyles();
    const cappedIndex = Math.min(stageIndex, stages.length - 1);

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
            <View style={theme.processingOverlay}>
                <View style={theme.processingCard}>
                    <View style={theme.processingBadge}>
                        <Hourglass size={22} color={theme.colors.warning} weight="fill" />
                        <Text style={theme.processingBadgeText}>{stage?.badge ?? 'In progress'}</Text>
                    </View>

                    <Text style={theme.processingTitle}>
                        {stage?.title ?? 'Verification in progress'}
                    </Text>
                    <Text style={theme.processingCopy}>
                        {stage?.body ?? 'Your verification is moving to the next step.'}
                    </Text>

                    <View style={theme.progressTrack}>
                        <View
                            style={[
                                theme.progressFill,
                                {
                                    width: `${Math.round((stage?.progress ?? 0) * 100)}%` as const,
                                },
                            ]}
                        />
                    </View>

                    <View style={styles.stageRow}>
                        {stages.map((item, index) => {
                            const isComplete = index < cappedIndex;
                            const isActive = index === cappedIndex;

                            return (
                                <View key={item.key} style={styles.stageItem}>
                                    <View
                                        style={[
                                            theme.processingStageDot,
                                            isComplete && theme.processingStageDotComplete,
                                            isActive && theme.processingStageDotActive,
                                        ]}
                                    />
                                    <Text
                                        style={[
                                            theme.processingStageLabel,
                                            isActive && theme.processingStageLabelActive,
                                        ]}
                                    >
                                        {index + 1}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    stageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.section,
        paddingTop: SPACING.tight,
    },
    stageItem: {
        alignItems: 'center',
        gap: SPACING.tight,
    },
});
