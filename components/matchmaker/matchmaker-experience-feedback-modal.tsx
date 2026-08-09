import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ShieldCheck, Star, X } from 'lucide-react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useSubmitMatchmakerExperienceFeedback } from '@/hooks/use-app-feedback';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';

const MAX_COMMENT_LENGTH = 600;
const RATING_LABELS = [
  'Not for me',
  'Needs work',
  'It is okay',
  'Really useful',
  'Love it',
] as const;

interface MatchmakerExperienceFeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export function MatchmakerExperienceFeedbackModal({
  visible,
  onClose,
  onSubmitted,
}: MatchmakerExperienceFeedbackModalProps) {
  const reduceMotion = useReducedMotion();
  const toast = useToast();
  const submitFeedback = useSubmitMatchmakerExperienceFeedback();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const selectedLabel = useMemo(
    () => rating ? RATING_LABELS[rating - 1] : 'Choose from 1 to 5 stars',
    [rating],
  );

  const selectRating = useCallback((nextRating: number) => {
    Haptics.selectionAsync();
    setRating(nextRating);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!rating || submitFeedback.isPending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await submitFeedback.mutateAsync({ rating, message: comment });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show({
        message: 'Thank you. Your Matchmaker feedback was sent.',
        variant: 'success',
        position: 'top',
      });
      setRating(null);
      setComment('');
      onSubmitted();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.show({
        message: error instanceof Error ? error.message : 'Could not send your feedback.',
        variant: 'danger',
        position: 'top',
      });
    }
  }, [comment, onSubmitted, rating, submitFeedback, toast]);

  return (
    <Modal
      animationType="fade"
      transparent
      statusBarTranslucent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalRoot}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close Matchmaker feedback"
          onPress={onClose}
          style={styles.scrim}
        />

        <Animated.View
          accessibilityViewIsModal
          entering={reduceMotion ? undefined : FadeInDown.duration(220)}
          style={styles.sheet}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>YOUR TAKE</Text>
                <Text style={styles.title}>How is Matchmaker feeling?</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close feedback"
                hitSlop={8}
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <X size={21} color={MATCHMAKER_HOME.mutedForeground} />
              </Pressable>
            </View>

            <Text style={styles.body}>
              Rate today&apos;s experience. One star means it is not working for you, five means you love it.
            </Text>

            <View accessibilityRole="radiogroup" style={styles.ratingSection}>
              <View style={styles.starsRow}>
                {RATING_LABELS.map((label, index) => {
                  const value = index + 1;
                  const selected = rating !== null && value <= rating;
                  return (
                    <Pressable
                      key={label}
                      accessibilityRole="radio"
                      accessibilityLabel={`${value} ${value === 1 ? 'star' : 'stars'}, ${label}`}
                      accessibilityState={{ checked: rating === value }}
                      onPress={() => selectRating(value)}
                      style={({ pressed }) => [
                        styles.starButton,
                        rating === value && styles.starButtonSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Star
                        size={27}
                        strokeWidth={2}
                        color={selected ? MATCHMAKER_HOME.primary : MATCHMAKER_HOME.subtleForeground}
                        fill={selected ? MATCHMAKER_HOME.primary : 'transparent'}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <Text accessibilityLiveRegion="polite" style={styles.ratingLabel}>{selectedLabel}</Text>
            </View>

            <View style={styles.commentSection}>
              <View style={styles.commentHeading}>
                <Text style={styles.commentLabel}>What should we keep, improve, or change?</Text>
                <Text style={styles.optional}>Optional</Text>
              </View>
              <View style={styles.inputShell}>
                <TextInput
                  accessibilityLabel="Optional Matchmaker feedback"
                  value={comment}
                  onChangeText={(value) => setComment(value.slice(0, MAX_COMMENT_LENGTH))}
                  placeholder="Tell us what worked, what felt wrong, or what you would remove."
                  placeholderTextColor={MATCHMAKER_HOME.subtleForeground}
                  multiline
                  maxLength={MAX_COMMENT_LENGTH}
                  textAlignVertical="top"
                  style={styles.input}
                />
                <Text style={styles.counter}>{comment.length}/{MAX_COMMENT_LENGTH}</Text>
              </View>
            </View>

            <View style={styles.privacyRow}>
              <ShieldCheck size={16} color={MATCHMAKER_HOME.mutedForeground} />
              <Text style={styles.privacyText}>
                Sent with your account contact details so our team can follow up if needed.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send Matchmaker feedback"
              accessibilityState={{ disabled: !rating, busy: submitFeedback.isPending }}
              disabled={!rating || submitFeedback.isPending}
              onPress={() => handleSubmit().catch(() => undefined)}
              style={({ pressed }) => [
                styles.submitButton,
                (!rating || submitFeedback.isPending) && styles.submitButtonDisabled,
                pressed && Boolean(rating) && !submitFeedback.isPending && styles.submitButtonPressed,
              ]}
            >
              {submitFeedback.isPending ? (
                <ActivityIndicator size="small" color={MATCHMAKER_HOME.primaryForeground} />
              ) : (
                <Text style={styles.submitText}>Send feedback</Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Give feedback later"
              disabled={submitFeedback.isPending}
              onPress={onClose}
              style={({ pressed }) => [styles.laterButton, pressed && styles.pressed]}
            >
              <Text style={styles.laterText}>Maybe later</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 6, 15, 0.76)',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: MATCHMAKER_HOME.borderStrong,
    backgroundColor: MATCHMAKER_HOME.backgroundRaised,
    overflow: 'hidden',
  },
  content: {
    gap: SPACING.comfortable,
    paddingHorizontal: SPACING.section,
    paddingTop: SPACING.section,
    paddingBottom: 34,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.base,
  },
  headerCopy: {
    flex: 1,
    gap: 5,
  },
  eyebrow: {
    color: MATCHMAKER_HOME.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MATCHMAKER_HOME.surface,
  },
  body: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 15,
    lineHeight: 21,
  },
  ratingSection: {
    alignItems: 'center',
    gap: SPACING.compact,
  },
  starsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  starButton: {
    flex: 1,
    maxWidth: 54,
    minWidth: 44,
    height: 50,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: MATCHMAKER_HOME.border,
    backgroundColor: MATCHMAKER_HOME.surface,
  },
  starButtonSelected: {
    borderColor: MATCHMAKER_HOME.primary,
    backgroundColor: 'rgba(217, 74, 143, 0.10)',
  },
  ratingLabel: {
    minHeight: 20,
    color: MATCHMAKER_HOME.foreground,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  commentSection: {
    gap: SPACING.tight,
  },
  commentHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACING.compact,
  },
  commentLabel: {
    flex: 1,
    color: MATCHMAKER_HOME.foreground,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  optional: {
    color: MATCHMAKER_HOME.subtleForeground,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  inputShell: {
    minHeight: 116,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: MATCHMAKER_HOME.border,
    backgroundColor: MATCHMAKER_HOME.surface,
    padding: SPACING.compact,
  },
  input: {
    minHeight: 76,
    color: MATCHMAKER_HOME.foreground,
    fontSize: 15,
    lineHeight: 21,
    padding: 0,
  },
  counter: {
    alignSelf: 'flex-end',
    color: MATCHMAKER_HOME.subtleForeground,
    fontSize: 11,
    lineHeight: 15,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.tight,
  },
  privacyText: {
    flex: 1,
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 12,
    lineHeight: 17,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MATCHMAKER_HOME.primary,
  },
  submitButtonDisabled: {
    opacity: 0.42,
  },
  submitButtonPressed: {
    backgroundColor: MATCHMAKER_HOME.primaryPressed,
  },
  submitText: {
    color: MATCHMAKER_HOME.primaryForeground,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  laterButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterText: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
});
