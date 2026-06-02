import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CaretDown, CaretUp } from 'phosphor-react-native';

import { Text } from '@/components/ui/text';
import type { FaceVerificationSession } from '@/hooks/use-face-verification';
import {
    formatDecisionLabel,
    formatVerificationTimestamp,
    getMatchOutcomeSummary,
    humanizeFailureReason,
    humanizeQualityFlag,
    parseDecisionSummary,
} from '@/lib/verification/decision-summary';
import { useVerificationThemedStyles } from '@/lib/verification/use-verification-themed-styles';
import { SPACING } from '@/lib/design-tokens';

type StatsVariant = 'inline' | 'success' | 'retry';

interface VerificationStatsBlockProps {
    session: FaceVerificationSession | null | undefined;
    profileRetryCount?: number;
    verifiedAtLabel?: string | null;
    variant: StatsVariant;
}

export function VerificationStatsBlock({
    session,
    profileRetryCount,
    verifiedAtLabel,
    variant,
}: VerificationStatsBlockProps) {
    const theme = useVerificationThemedStyles();
    const [expanded, setExpanded] = useState(false);

    if (!session) {
        return null;
    }

    const summary = parseDecisionSummary(session.decisionSummary);
    const results = session.results ?? [];
    const failureReasons = session.failureReasons ?? [];
    const completedLabel = session.completedAt
        ? formatVerificationTimestamp(session.completedAt)
        : null;
    const startedLabel = session.startedAt ? formatVerificationTimestamp(session.startedAt) : null;
    const matchOutcome = getMatchOutcomeSummary(summary);

    const hasTechnicalDetails =
        results.length > 0 ||
        failureReasons.length > 0 ||
        summary.similarityThreshold !== null ||
        summary.sourceFacesDetected !== null ||
        Boolean(session.thresholdConfigVersion);

    const containerStyle =
        variant === 'inline'
            ? theme.statsBlock
            : variant === 'success'
              ? theme.statsBlockSuccess
              : theme.statsBlockRetry;

    const summaryLines: string[] = [];
    summaryLines.push(`Attempt ${session.attemptNumber}`);
    if (typeof profileRetryCount === 'number' && profileRetryCount > 0) {
        summaryLines.push(`${profileRetryCount} retr${profileRetryCount === 1 ? 'y' : 'ies'} on your profile`);
    }
    if (matchOutcome) {
        summaryLines.push(matchOutcome);
    }
    if (completedLabel) {
        summaryLines.push(`Finished ${completedLabel}`);
    } else if (startedLabel) {
        summaryLines.push(`Started ${startedLabel}`);
    }
    if (verifiedAtLabel && variant === 'success') {
        summaryLines.push(`Verified on profile ${verifiedAtLabel}`);
    }

    const showDisclosure = hasTechnicalDetails && variant !== 'inline';
    const useFlatStatsChrome = variant === 'retry' || variant === 'success';

    function StatsCell({ label, value }: { label: string; value: string }) {
        return (
            <View style={useFlatStatsChrome ? theme.statsGridCellFlat : theme.statsGridCell}>
                <Text style={theme.statsGridLabel}>{label}</Text>
                <Text style={theme.statsGridValue}>{value}</Text>
            </View>
        );
    }

    return (
        <View style={containerStyle}>
            <Text variant="label" style={{ color: theme.colors.mutedForeground }}>
                {variant === 'success' ? 'Check summary' : variant === 'retry' ? 'Last check' : 'Session'}
            </Text>

            {variant === 'success' ? (
                <View style={styles.successRow}>
                    {[
                        { label: 'Attempt', value: String(session.attemptNumber) },
                        matchOutcome
                            ? {
                                  label: 'Match',
                                  value:
                                      summary.matchedPhotoCount !== null &&
                                      summary.comparedPhotoCount !== null
                                          ? `${summary.matchedPhotoCount}/${summary.comparedPhotoCount}`
                                          : 'OK',
                              }
                            : null,
                        completedLabel ? { label: 'Finished', value: completedLabel.split(',')[0] } : null,
                    ]
                        .filter((item): item is { label: string; value: string } => !!item)
                        .slice(0, 3)
                        .map((item) => (
                            <View key={item.label} style={theme.successStatsCell}>
                                <Text style={theme.successStatsValue}>{item.value}</Text>
                                <Text style={theme.successStatsLabel}>{item.label}</Text>
                            </View>
                        ))}
                </View>
            ) : (
                <View style={styles.summaryList}>
                    {summaryLines.map((line) => (
                        <Text key={line} variant="caption" style={{ color: theme.colors.foreground }}>
                            {line}
                        </Text>
                    ))}
                </View>
            )}

            {showDisclosure ? (
                <>
                    <Pressable
                        onPress={() => setExpanded((value) => !value)}
                        accessibilityRole="button"
                        accessibilityState={{ expanded }}
                        accessibilityLabel={
                            expanded ? 'Hide technical details' : 'View technical details'
                        }
                        style={({ pressed }) => [
                            theme.statsDisclosureButton,
                            pressed && { opacity: 0.85 },
                        ]}
                    >
                        <Text variant="caption" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                            {expanded ? 'Hide technical details' : 'View technical details'}
                        </Text>
                        {expanded ? (
                            <CaretUp size={16} color={theme.colors.primary} weight="bold" />
                        ) : (
                            <CaretDown size={16} color={theme.colors.primary} weight="bold" />
                        )}
                    </Pressable>

                    {expanded ? (
                        <View style={styles.technicalSection}>
                            <View style={styles.statsGrid}>
                                {summary.comparedPhotoCount !== null ? (
                                    <StatsCell
                                        label="Photos compared"
                                        value={String(summary.comparedPhotoCount)}
                                    />
                                ) : null}
                                {summary.matchedPhotoCount !== null ? (
                                    <StatsCell
                                        label="Strong matches"
                                        value={String(summary.matchedPhotoCount)}
                                    />
                                ) : null}
                                {summary.minimumMatchCount !== null ? (
                                    <StatsCell
                                        label="Matches required"
                                        value={String(summary.minimumMatchCount)}
                                    />
                                ) : null}
                                {summary.similarityThreshold !== null ? (
                                    <StatsCell
                                        label="Match threshold"
                                        value={`${summary.similarityThreshold}%`}
                                    />
                                ) : null}
                                {summary.sourceFacesDetected !== null ? (
                                    <StatsCell
                                        label="Faces in selfie"
                                        value={String(summary.sourceFacesDetected)}
                                    />
                                ) : null}
                                {summary.usableProfilePhotoCount !== null ? (
                                    <StatsCell
                                        label="Profile photos used"
                                        value={String(summary.usableProfilePhotoCount)}
                                    />
                                ) : null}
                            </View>

                            {session.thresholdConfigVersion ? (
                                <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
                                    Ruleset {session.thresholdConfigVersion}
                                </Text>
                            ) : null}

                            {results.length > 0 ? (
                                <View style={styles.comparisonSection}>
                                    <Text variant="small" style={{ color: theme.colors.foreground }}>
                                        Each profile photo
                                    </Text>
                                    {results.map((row, index) => (
                                        <View
                                            key={row.id ?? `${row.targetAssetKey}-${index}`}
                                            style={
                                                useFlatStatsChrome
                                                    ? theme.statsComparisonRowFlat
                                                    : theme.statsComparisonRow
                                            }
                                        >
                                            <View style={styles.comparisonHeader}>
                                                <Text style={theme.statsComparisonTitle}>
                                                    Photo {index + 1}
                                                </Text>
                                                <Text
                                                    style={[
                                                        theme.statsComparisonBadge,
                                                        row.decision === 'matched' &&
                                                            theme.statsComparisonBadgePass,
                                                        row.decision === 'not_matched' &&
                                                            theme.statsComparisonBadgeWarn,
                                                        row.decision === 'error' &&
                                                            theme.statsComparisonBadgeError,
                                                    ]}
                                                >
                                                    {formatDecisionLabel(row.decision)}
                                                </Text>
                                            </View>
                                            <View style={styles.comparisonMetrics}>
                                                <Text style={theme.statsComparisonMetric}>
                                                    Similarity:{' '}
                                                    {row.similarity != null ? `${row.similarity}%` : '—'}
                                                </Text>
                                                <Text style={theme.statsComparisonMetric}>
                                                    Confidence:{' '}
                                                    {row.faceConfidence != null
                                                        ? `${row.faceConfidence}%`
                                                        : '—'}
                                                </Text>
                                            </View>
                                            {row.qualityFlags.length > 0 ? (
                                                <Text style={theme.statsComparisonFlags}>
                                                    {row.qualityFlags
                                                        .map(humanizeQualityFlag)
                                                        .join(' · ')}
                                                </Text>
                                            ) : null}
                                        </View>
                                    ))}
                                </View>
                            ) : null}

                            {failureReasons.length > 0 ? (
                                <View style={styles.failureSection}>
                                    <Text variant="small" style={{ color: theme.colors.foreground }}>
                                        Why it stopped
                                    </Text>
                                    {failureReasons.map((code) => (
                                        <View key={code} style={styles.failureRow}>
                                            <View style={theme.statsFailureDot} />
                                            <Text style={theme.statsFailureText}>
                                                {humanizeFailureReason(code)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            ) : null}
                        </View>
                    ) : null}
                </>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    successRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.tight,
    },
    summaryList: {
        gap: SPACING.micro,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.tight,
    },
    technicalSection: {
        gap: SPACING.compact,
    },
    comparisonSection: {
        gap: SPACING.tight,
        marginTop: SPACING.tight,
    },
    comparisonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: SPACING.tight,
    },
    comparisonMetrics: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.tight,
    },
    failureSection: {
        gap: SPACING.tight,
    },
    failureRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.tight,
    },
});
