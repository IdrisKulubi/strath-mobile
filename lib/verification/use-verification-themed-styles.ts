import { useMemo } from 'react';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING } from '@/lib/design-tokens';

function withAlpha(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) {
        return hex;
    }
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function useVerificationThemedStyles() {
    const { colors, isDark } = useTheme();

    return useMemo(() => {
        const card: ViewStyle = {
            backgroundColor: colors.card,
            borderRadius: RADIUS.lg,
            padding: SPACING.comfortable,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            gap: SPACING.compact,
        };

        const title: TextStyle = {
            fontSize: 28,
            fontWeight: '700',
            color: colors.foreground,
            lineHeight: 34,
        };

        const subtitle: TextStyle = {
            color: colors.mutedForeground,
            fontSize: 15,
            lineHeight: 23,
        };

        const cardTitle: TextStyle = {
            color: colors.foreground,
            fontSize: 18,
            fontWeight: '700',
        };

        const cardMeta: TextStyle = {
            color: colors.primary,
            fontSize: 12,
            fontWeight: '700',
        };

        const statusTitle: TextStyle = {
            color: colors.foreground,
            fontSize: 16,
            fontWeight: '700',
            textTransform: 'capitalize',
        };

        const statusCopy: TextStyle = {
            color: colors.mutedForeground,
            fontSize: 15,
            lineHeight: 22,
        };

        const primaryButton: ViewStyle = {
            backgroundColor: colors.primary,
            borderRadius: RADIUS.md,
            paddingVertical: SPACING.comfortable,
            alignItems: 'center',
            justifyContent: 'center',
        };

        const primaryButtonText: TextStyle = {
            color: colors.primaryForeground,
            fontWeight: '700',
            fontSize: 16,
        };

        const secondaryButton: ViewStyle = {
            alignSelf: 'flex-start',
            paddingHorizontal: SPACING.base,
            paddingVertical: SPACING.tight,
            borderRadius: RADIUS.full,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.secondary,
        };

        const secondaryButtonText: TextStyle = {
            color: colors.foreground,
            fontSize: 13,
            fontWeight: '600',
        };

        const selfiePlaceholder: ViewStyle = {
            height: 220,
            borderRadius: RADIUS.lg,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: withAlpha(colors.primary, 0.45),
            alignItems: 'center',
            justifyContent: 'center',
            gap: SPACING.compact,
            backgroundColor: colors.input,
        };

        const selfiePlaceholderText: TextStyle = {
            color: colors.mutedForeground,
            fontSize: 15,
            fontWeight: '600',
        };

        const resultCardBase: ViewStyle = {
            minHeight: 520,
            borderRadius: RADIUS.xl,
            paddingHorizontal: SPACING.section,
            paddingVertical: 30,
            alignItems: 'center',
            justifyContent: 'center',
            gap: SPACING.comfortable,
            borderWidth: 1,
            backgroundColor: colors.card,
            borderColor: colors.border,
        };

        const resultCardSuccess: ViewStyle = {
            backgroundColor: withAlpha(colors.success, isDark ? 0.12 : 0.08),
            borderColor: withAlpha(colors.success, 0.35),
        };

        const resultCardRetry: ViewStyle = {
            backgroundColor: withAlpha(colors.destructive, isDark ? 0.12 : 0.08),
            borderColor: withAlpha(colors.destructive, 0.35),
        };

        const resultTitle: TextStyle = {
            color: colors.foreground,
            fontSize: 28,
            fontWeight: '700',
            lineHeight: 34,
        };

        const resultBody: TextStyle = {
            color: colors.mutedForeground,
            fontSize: 15,
            lineHeight: 23,
        };

        const resultBodyMuted: TextStyle = {
            color: colors.mutedForeground,
            fontSize: 14,
            lineHeight: 22,
            marginTop: SPACING.tight,
        };

        const resultSecondaryButton: ViewStyle = {
            borderRadius: RADIUS.md,
            paddingVertical: SPACING.base,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.secondary,
            borderWidth: 1,
            borderColor: colors.border,
            width: '100%',
        };

        const resultSecondaryButtonText: TextStyle = {
            color: colors.foreground,
            fontSize: 15,
            fontWeight: '600',
        };

        const resultTertiaryButton: ViewStyle = {
            borderRadius: RADIUS.md,
            paddingVertical: 14,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            width: '100%',
        };

        const resultTertiaryButtonText: TextStyle = {
            color: colors.mutedForeground,
            fontSize: 15,
            fontWeight: '600',
        };

        const processingOverlay: ViewStyle = {
            flex: 1,
            backgroundColor: withAlpha(colors.foreground, isDark ? 0.55 : 0.35),
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: SPACING.section,
        };

        const processingCard: ViewStyle = {
            width: '100%',
            maxWidth: 360,
            borderRadius: RADIUS.xl,
            paddingHorizontal: SPACING.section,
            paddingVertical: 28,
            borderWidth: 1,
            borderColor: colors.border,
            gap: SPACING.compact,
            backgroundColor: colors.card,
        };

        const processingTitle: TextStyle = {
            color: colors.foreground,
            fontSize: 24,
            fontWeight: '800',
            lineHeight: 30,
        };

        const processingCopy: TextStyle = {
            color: colors.mutedForeground,
            fontSize: 15,
            lineHeight: 23,
        };

        const processingBadge: ViewStyle = {
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: SPACING.tight,
            paddingHorizontal: SPACING.compact,
            paddingVertical: SPACING.tight,
            borderRadius: RADIUS.full,
            backgroundColor: withAlpha(colors.warning, 0.14),
        };

        const processingBadgeText: TextStyle = {
            color: colors.warning,
            fontSize: 12,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
        };

        const statsBlock: ViewStyle = {
            marginTop: 14,
            paddingTop: 14,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            gap: SPACING.tight,
        };

        const statsEyebrow: TextStyle = {
            color: colors.mutedForeground,
            fontSize: 11,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.9,
        };

        const statsMetaText: TextStyle = {
            color: colors.foreground,
            fontSize: 13,
            lineHeight: 20,
        };

        const statsGridCell: ViewStyle = {
            minWidth: '44%',
            flexGrow: 1,
            backgroundColor: colors.secondary,
            borderRadius: RADIUS.md,
            paddingVertical: SPACING.tight,
            paddingHorizontal: SPACING.compact,
            gap: 4,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
        };

        const statsGridCellFlat: ViewStyle = {
            minWidth: '44%',
            flexGrow: 1,
            paddingVertical: SPACING.micro,
            gap: 2,
        };

        const statsGridLabel: TextStyle = {
            color: colors.mutedForeground,
            fontSize: 11,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        };

        const statsGridValue: TextStyle = {
            color: colors.foreground,
            fontSize: 18,
            fontWeight: '800',
        };

        const statsFootnote: TextStyle = {
            color: colors.mutedForeground,
            fontSize: 12,
            lineHeight: 18,
        };

        const statsComparisonRow: ViewStyle = {
            backgroundColor: colors.secondary,
            borderRadius: RADIUS.md,
            padding: SPACING.compact,
            gap: SPACING.tight,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
        };

        const statsComparisonRowFlat: ViewStyle = {
            paddingVertical: SPACING.tight,
            gap: SPACING.tight,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
        };

        const statsComparisonTitle: TextStyle = {
            color: colors.foreground,
            fontSize: 14,
            fontWeight: '700',
        };

        const statsComparisonMetric: TextStyle = {
            color: colors.mutedForeground,
            fontSize: 12,
            fontWeight: '600',
        };

        const retryTipText: TextStyle = {
            flex: 1,
            color: colors.mutedForeground,
            fontSize: 13,
            lineHeight: 20,
        };

        const resultPanelFlat: ViewStyle = {
            width: '100%',
            alignItems: 'stretch',
            gap: SPACING.comfortable,
        };

        const resultCauseBanner: ViewStyle = {
            width: '100%',
            paddingVertical: SPACING.tight,
        };

        const resultCauseBannerText: TextStyle = {
            color: colors.mutedForeground,
            fontSize: 14,
            lineHeight: 21,
            textAlign: 'left',
        };

        return {
            colors,
            isDark,
            iconWrap: {
                width: 64,
                height: 64,
                borderRadius: RADIUS.lg,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.secondary,
            } as ViewStyle,
            title,
            subtitle,
            card,
            statusCard: card,
            cardTitle,
            cardMeta,
            statusTitle,
            statusCopy,
            warningText: { color: colors.destructive, fontSize: 12, lineHeight: 18 } as TextStyle,
            primaryButton,
            primaryButtonText,
            primaryButtonDisabled: { opacity: 0.7 } as ViewStyle,
            secondaryButton,
            secondaryButtonText,
            selfiePlaceholder,
            selfiePlaceholderText,
            resultCardBase,
            resultCardSuccess,
            resultCardRetry,
            resultPanelFlat,
            resultTitle,
            resultBody,
            resultBodyMuted,
            resultSecondaryButton,
            resultSecondaryButtonText,
            resultTertiaryButton,
            resultTertiaryButtonText,
            resultIconWrapSuccess: {
                backgroundColor: withAlpha(colors.success, 0.14),
            } as ViewStyle,
            resultIconWrapRetry: {
                backgroundColor: withAlpha(colors.destructive, 0.14),
            } as ViewStyle,
            retryTipDot: {
                width: 8,
                height: 8,
                borderRadius: RADIUS.full,
                backgroundColor: colors.primary,
                marginTop: 6,
            } as ViewStyle,
            retryTipText,
            resultCauseBanner,
            resultCauseBannerText,
            processingOverlay,
            processingCard,
            processingTitle,
            processingCopy,
            processingBadge,
            processingBadgeText,
            progressTrack: {
                height: 10,
                borderRadius: RADIUS.full,
                backgroundColor: colors.muted,
                overflow: 'hidden',
            } as ViewStyle,
            progressFill: {
                height: '100%',
                borderRadius: RADIUS.full,
                backgroundColor: colors.primary,
            } as ViewStyle,
            processingStageDot: {
                width: 12,
                height: 12,
                borderRadius: RADIUS.full,
                backgroundColor: colors.muted,
                borderWidth: 1,
                borderColor: colors.border,
            } as ViewStyle,
            processingStageDotActive: {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
            } as ViewStyle,
            processingStageDotComplete: {
                backgroundColor: colors.success,
                borderColor: colors.success,
            } as ViewStyle,
            processingStageLabel: {
                color: colors.mutedForeground,
                fontSize: 11,
                fontWeight: '700',
            } as TextStyle,
            processingStageLabelActive: {
                color: colors.foreground,
            } as TextStyle,
            statsBlock,
            statsBlockSuccess: {
                width: '100%',
                gap: SPACING.tight,
                paddingTop: SPACING.compact,
            } as ViewStyle,
            statsBlockRetry: {
                width: '100%',
                gap: SPACING.tight,
                paddingTop: SPACING.compact,
                marginTop: SPACING.tight,
            } as ViewStyle,
            statsEyebrow,
            statsMetaText,
            statsGridCell,
            statsGridCellFlat,
            statsGridLabel,
            statsGridValue,
            statsFootnote,
            statsSectionTitle: {
                color: colors.foreground,
                fontSize: 13,
                fontWeight: '700',
            } as TextStyle,
            statsComparisonRow,
            statsComparisonRowFlat,
            statsComparisonTitle,
            statsComparisonMetric,
            statsComparisonBadge: {
                fontSize: 11,
                fontWeight: '800',
                textTransform: 'uppercase',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: RADIUS.full,
                overflow: 'hidden',
                color: colors.mutedForeground,
                backgroundColor: colors.muted,
            } as TextStyle,
            statsComparisonBadgePass: {
                color: colors.success,
                backgroundColor: withAlpha(colors.success, 0.14),
            } as TextStyle,
            statsComparisonBadgeWarn: {
                color: colors.warning,
                backgroundColor: withAlpha(colors.warning, 0.14),
            } as TextStyle,
            statsComparisonBadgeError: {
                color: colors.destructive,
                backgroundColor: withAlpha(colors.destructive, 0.14),
            } as TextStyle,
            statsFailureText: {
                flex: 1,
                color: colors.destructive,
                fontSize: 12,
                lineHeight: 18,
            } as TextStyle,
            successStatsCell: {
                width: '48%',
                flexGrow: 1,
                minHeight: 58,
                borderRadius: RADIUS.md,
                paddingHorizontal: SPACING.compact,
                paddingVertical: SPACING.tight,
                backgroundColor: colors.secondary,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.border,
                justifyContent: 'center',
            } as ViewStyle,
            successStatsValue: {
                color: colors.foreground,
                fontSize: 22,
                lineHeight: 24,
                fontWeight: '800',
            } as TextStyle,
            successStatsLabel: {
                marginTop: 3,
                color: colors.mutedForeground,
                fontSize: 10,
                lineHeight: 13,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
            } as TextStyle,
        };
    }, [colors, isDark]);
}
