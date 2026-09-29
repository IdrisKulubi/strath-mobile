import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, GraduationCap, Heart, HeartHandshake, MapPin, MessageCircle, MoreHorizontal, Shield, X } from 'lucide-react-native';

import { Action, Copy, Feedback, Field, Loading, Notice, SectionLabel } from '@/components/questionnaire/ui';
import { PhotoButton, ProfileGallery } from '@/components/questionnaire/profile-gallery';
import { useTheme } from '@/hooks/use-theme';
import { PROFILE_PHOTO, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { compatibilityLabel, useQuestionnaire, useQuestionnaireMutation, type DecisionResponse, type PublicComparison } from '@/lib/questionnaire';

type ProfileTab = 'About' | 'Photos' | 'Answers';

function LiquidFill({ tint, overlay }: { tint: string; overlay: string }) {
  const { isDark } = useTheme();
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        isInteractive
        tintColor={tint}
        colorScheme={isDark ? 'dark' : 'light'}
        style={[StyleSheet.absoluteFill, styles.glassSurface]}
      />
    );
  }
  return (
    <>
      <BlurView
        intensity={Platform.OS === 'ios' ? 64 : 44}
        tint={isDark ? 'dark' : 'light'}
        style={[StyleSheet.absoluteFill, styles.glassSurface]}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glassSurface, { backgroundColor: overlay }]} />
    </>
  );
}

function FloatingGlassButton({
  label,
  disabled,
  pressed,
  onPress,
  onPressIn,
  onPressOut,
  tint,
  overlay,
  borderColor,
  shadowColor,
  prominent,
  circle,
  children,
}: {
  label: string;
  disabled?: boolean;
  pressed?: boolean;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  tint: string;
  overlay: string;
  borderColor: string;
  shadowColor: string;
  prominent?: boolean;
  circle?: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const shape: StyleProp<ViewStyle> = circle ? styles.pass : styles.like;
  return (
    <View
      style={[
        circle ? styles.passLift : styles.likeLift,
        {
          boxShadow: prominent
            ? `0px 16px 28px ${shadowColor}`
            : `0px 10px 18px ${shadowColor}`,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        accessibilityState={{ disabled }}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[
          styles.glassButton,
          shape,
          {
            borderColor,
            opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
          },
        ]}
      >
        <LiquidFill tint={tint} overlay={overlay} />
        <LinearGradient
          pointerEvents="none"
          colors={[colors.glassSheen, 'transparent']}
          style={styles.gloss}
        />
        <View style={circle ? styles.passContent : styles.likeContent}>{children}</View>
      </Pressable>
    </View>
  );
}

export default function CompatibilityProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  return <ProfileDetails key={userId} userId={userId} />;
}

function ProfileDetails({ userId }: { userId: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const comparison = useQuestionnaire<PublicComparison>(`comparison/${userId}`, Boolean(userId));
  const block = useQuestionnaireMutation<{ saved: true }>('block');
  const report = useQuestionnaireMutation<{ saved: true }>('report');
  const decision = useQuestionnaireMutation<DecisionResponse>('decisions');
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [footerHeight, setFooterHeight] = useState(110);
  const [compactHeader, setCompactHeader] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('About');
  const [photosVisible, setPhotosVisible] = useState(false);
  const [pressedControl, setPressedControl] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const sections = useRef({ bodyTop: 0, answersInBody: 0, safetyInAnswers: 0 });
  const person = comparison.data?.profile;
  const back = () => router.canGoBack() ? router.back() : router.replace('/dating' as never);
  const jump = (y: number, animated = false) => scroll.current?.scrollTo({ y: Math.max(0, y - 72), animated });
  const questions = comparison.data?.questions ?? [];
  const educationLine = person
    ? [person.university, person.course, person.yearOfStudy ? `Year ${person.yearOfStudy}` : null].filter(Boolean).join(' · ')
    : '';
  const footerBottomPad = SPACING.base;

  const selectTab = (tab: ProfileTab) => {
    setActiveTab(tab);
    if (tab === 'Photos') setPhotosVisible(true);
  };

  const openSafety = () => {
    setActiveTab('Answers');
    setSafetyOpen(true);
  };

  useEffect(() => {
    if (activeTab !== 'Answers') return;
    const { bodyTop, answersInBody, safetyInAnswers } = sections.current;
    const y = bodyTop + answersInBody + (safetyOpen ? safetyInAnswers : 0);
    requestAnimationFrame(() => jump(y, true));
  }, [activeTab, safetyOpen]);

  return <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.screen, { backgroundColor: colors.background }]}>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
      scrollEventThrottle={32} onScroll={(event) => setCompactHeader(event.nativeEvent.contentOffset.y > 220)}
      contentContainerStyle={[styles.content, { paddingBottom: !safetyOpen && person ? footerHeight + SPACING.section : insets.bottom + SPACING.large }]}>
      {person ? <Feedback error={comparison.error} /> : null}
      {!person ? <>
        <Action label="Back" tone="ghost" onPress={back} />
        {comparison.isPending ? <Loading label="Loading profile" /> : null}
        <Feedback error={comparison.error} />
        {comparison.isError ? <Action label="Try loading again" onPress={() => { void comparison.refetch(); }} /> : null}
      </> : <>
        <View style={styles.bleed}>
          <ProfileGallery photos={person.photos} name={person.name} bleed minimalChrome overlayTopInset={insets.top}
            photosVisible={photosVisible} onPhotosVisibleChange={setPhotosVisible}
            topLeft={<PhotoButton label="Back" onPress={back}><ChevronLeft size={25} color={PROFILE_PHOTO.foreground} /></PhotoButton>}
            topRight={<PhotoButton label="Profile safety options" onPress={openSafety}><MoreHorizontal size={23} color={PROFILE_PHOTO.foreground} /></PhotoButton>}>
            <Text accessibilityRole="header" numberOfLines={2} style={styles.name}>{person.name}, {person.age}</Text>
            {person.city ? <View style={styles.row}><MapPin size={18} color={PROFILE_PHOTO.foreground} /><Text numberOfLines={2} style={styles.location}>{person.city}</Text></View> : null}
          </ProfileGallery>
        </View>

        <View style={styles.body} onLayout={(event) => { sections.current.bodyTop = event.nativeEvent.layout.y; }}>
          {person.intentions.length ? <View style={[styles.intention, { borderTopColor: colors.controlBorder }]}>
            <Heart size={16} color={colors.mutedForeground} fill={colors.mutedForeground} /><Text style={[styles.intentionText, { color: colors.foreground }]}>{person.intentions.join(' · ')}</Text>
          </View> : null}

          <View style={[styles.about, { borderTopColor: colors.controlBorder }]}>
            <Text accessibilityRole="header" style={[styles.aboutTitle, { color: colors.foreground }]}>About me</Text>
            <Text style={[styles.bio, { color: colors.foreground }]}>{person.bio || 'This person hasn’t added a bio yet.'}</Text>
          </View>

          {educationLine ? <View style={styles.row}>
            <GraduationCap size={18} color={colors.mutedForeground} />
            <Text style={[styles.education, { color: colors.mutedForeground }]}>{educationLine}</Text>
          </View> : null}

          <View style={[styles.tabs, { borderColor: colors.controlBorder }]}>
            {(['About', 'Photos', 'Answers'] as const).map((label) => {
              const selected = activeTab === label;
              return <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected }}
                accessibilityLabel={label} onPress={() => selectTab(label)}
                onPressIn={() => setPressedControl(label)} onPressOut={() => setPressedControl(null)}
                style={[
                  styles.tab,
                  { opacity: pressedControl === label ? 0.65 : 1 },
                ]}>
                <Text numberOfLines={1} style={[styles.tabLabel, { color: selected ? colors.foreground : colors.mutedForeground, fontWeight: selected ? '600' : '400' }]}>{label}</Text>
                {selected ? <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} /> : null}
              </Pressable>;
            })}
          </View>

          {activeTab === 'Answers' ? <View style={styles.section} onLayout={(event) => { sections.current.answersInBody = event.nativeEvent.layout.y; }}>
            <View style={[styles.section, styles.divider, { borderTopColor: colors.controlBorder }]}>
              <View style={styles.answersHeading}>
                <SectionLabel>Their answers</SectionLabel>
                <Text style={[styles.answersCount, { color: colors.mutedForeground }]}>{questions.length} answered</Text>
              </View>
              <Copy muted>Read what {person.name} chose for each question. Your answer appears below when you answered it too.</Copy>
              {!questions.length ? <Copy muted>No questionnaire answers to show yet.</Copy> : null}
              {questions.map((question, index) => <View key={question.id} style={[styles.answer, { borderBottomColor: colors.controlBorder }]}>
                <Text style={[styles.answerNumber, { color: colors.primaryText }]}>QUESTION {index + 1} OF {questions.length}</Text>
                <Text style={[TYPOGRAPHY.headline, { color: colors.foreground }]}>{question.prompt}</Text>
                <View style={[styles.answerValue, { backgroundColor: colors.control }]}>
                  <Text style={[TYPOGRAPHY.caption, { color: colors.mutedForeground }]}>{person.name} answered</Text>
                  <Text style={[styles.selectedAnswer, { color: colors.foreground }]}>{question.options.find((option) => option.id === question.theirs)?.label ?? 'Answer unavailable'}</Text>
                  {question.theirExplanation ? <Copy muted>{question.theirExplanation}</Copy> : null}
                </View>
                {question.yours ? <View style={styles.yourAnswer}>
                  <Text style={[TYPOGRAPHY.caption, { color: colors.mutedForeground }]}>You answered</Text>
                  <Text style={[TYPOGRAPHY.callout, { color: colors.foreground }]}>{question.options.find((option) => option.id === question.yours)?.label ?? 'Answer unavailable'}</Text>
                  {question.yourExplanation ? <Copy muted>{question.yourExplanation}</Copy> : null}
                </View> : null}
              </View>)}
            </View>

            <View style={[styles.section, styles.divider, { borderTopColor: colors.controlBorder }]}>
              <SectionLabel>Your compatibility</SectionLabel>
              <View style={styles.row}><HeartHandshake size={25} color={colors.primaryText} /><Text style={[styles.score, { color: colors.foreground }]}>{compatibilityLabel(comparison.data?.compatibility)}</Text></View>
              <Copy muted>Based on both people’s answers. This is not a prediction of relationship success.</Copy>
              {comparison.data?.compatibility.status === 'insufficient_evidence' ? <Notice>Answer more questions to build enough shared evidence for a percentage.</Notice> : null}
            </View>

            {matchId ? <Notice tone="success">It’s a match! You both liked each other. You can start messaging now.</Notice> : decision.isSuccess ? <Notice>Your like was saved.</Notice> : null}

            <View style={[styles.section, styles.divider, { borderTopColor: colors.controlBorder }]} onLayout={(event) => { sections.current.safetyInAnswers = event.nativeEvent.layout.y; }}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: safetyOpen }} onPress={() => setSafetyOpen((value) => !value)} style={styles.safetyLink}>
                <Shield size={21} color={colors.mutedForeground} /><Text style={[styles.rowText, { color: colors.mutedForeground }]}>{safetyOpen ? 'Close safety options' : 'Report or block'}</Text><ChevronRight size={19} color={colors.mutedForeground} />
              </Pressable>
              {safetyOpen ? <>
                <Feedback error={block.error ?? report.error} />
                {!confirmBlock ? <Action label="Block this person" tone="danger" onPress={() => setConfirmBlock(true)} /> : <View style={styles.section}>
                  <Copy>Blocking removes this profile from discovery immediately. Existing records are retained for safety.</Copy>
                  <Action label={block.isPending ? 'Blocking…' : 'Confirm block'} tone="danger" disabled={block.isPending} onPress={() => block.mutate({ targetId: userId }, { onSuccess: () => router.replace('/dating' as never) })} />
                  <Action label="Cancel" tone="ghost" disabled={block.isPending} onPress={() => setConfirmBlock(false)} />
                </View>}
                <Action label={reporting ? 'Cancel report' : 'Report a concern'} onPress={() => setReporting((value) => !value)} />
                {reporting ? <View style={styles.section}>
                  <Field label="What happened?" value={reason} onChangeText={setReason} multiline maxLength={1000} placeholder="Describe the concern for the safety team" />
                  <Action label={report.isSuccess ? 'Report submitted' : report.isPending ? 'Submitting…' : 'Submit report'} tone="primary" disabled={report.isPending || report.isSuccess || !reason.trim()} onPress={() => report.mutate({ targetId: userId, reason: reason.trim() })} />
                </View> : null}
              </> : null}
            </View>
          </View> : null}
        </View>
      </>}
    </ScrollView>
    {person && compactHeader ? <View style={[styles.compactHeader, { backgroundColor: colors.background, borderBottomColor: colors.controlBorder, paddingTop: insets.top + SPACING.tight }]}>
      <PhotoButton label="Back" onPress={back}><ChevronLeft size={25} color={colors.foreground} /></PhotoButton>
      <Text numberOfLines={1} accessibilityRole="header" style={[styles.compactName, { color: colors.foreground }]}>{person.name}, {person.age}</Text>
      <PhotoButton label="Profile safety options" onPress={openSafety}><MoreHorizontal size={23} color={colors.foreground} /></PhotoButton>
    </View> : null}
    {person && !safetyOpen ? <View pointerEvents="box-none" onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)} style={[styles.footer, { paddingBottom: footerBottomPad }]}>
      <Feedback error={decision.error} />
      <View pointerEvents="box-none" style={styles.footerRow}>
        {!matchId ? <FloatingGlassButton
          label={`Pass on ${person.name}`}
          circle
          disabled={decision.isPending || decision.isSuccess}
          pressed={pressedControl === 'pass'}
          tint={colors.actionGlassTint}
          overlay={colors.actionGlassOverlay}
          borderColor={colors.actionGlassBorder}
          shadowColor={colors.glassShadow}
          onPress={() => decision.mutate({ targetId: userId, decision: 'pass' }, { onSuccess: () => router.replace('/dating' as never) })}
          onPressIn={() => setPressedControl('pass')}
          onPressOut={() => setPressedControl(null)}
        >
          <X size={24} color={colors.foreground} />
        </FloatingGlassButton> : null}
        <FloatingGlassButton
          label={matchId ? 'Send a message' : `Like ${person.name}`}
          prominent
          disabled={!matchId && (decision.isPending || decision.isSuccess)}
          pressed={pressedControl === 'like'}
          tint={colors.primaryGlassTint}
          overlay={colors.primaryGlassOverlay}
          borderColor={colors.primaryGlassBorder}
          shadowColor={colors.primaryGlassShadow}
          onPress={() => matchId ? router.push({ pathname: '/dating-chat/[matchId]', params: { matchId } } as never) : decision.mutate({ targetId: userId, decision: 'like' }, { onSuccess: (result) => setMatchId(result.matchId ?? null) })}
          onPressIn={() => setPressedControl('like')}
          onPressOut={() => setPressedControl(null)}
        >
          {matchId ? <MessageCircle size={24} color={colors.primaryForeground} /> : <Heart size={24} color={colors.primaryForeground} fill={colors.primaryForeground} />}
          <Text style={[styles.likeLabel, { color: colors.primaryForeground }]}>{matchId ? 'Send a message' : decision.isPending ? 'Saving…' : decision.isSuccess ? 'Liked' : `Like ${person.name}`}</Text>
        </FloatingGlassButton>
      </View>
    </View> : null}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  compactHeader: { position: 'absolute', top: 0, width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: SPACING.screenX, paddingBottom: SPACING.tight, flexDirection: 'row', alignItems: 'center', gap: SPACING.compact, borderBottomWidth: StyleSheet.hairlineWidth },
  compactName: { ...TYPOGRAPHY.headline, flex: 1 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: SPACING.screenX, gap: SPACING.base },
  bleed: { marginHorizontal: -SPACING.screenX, alignSelf: 'stretch' },
  body: { gap: SPACING.compact, width: '100%', alignSelf: 'stretch' },
  name: { ...TYPOGRAPHY.display, color: PROFILE_PHOTO.foreground },
  location: { ...TYPOGRAPHY.callout, color: PROFILE_PHOTO.foreground, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.compact },
  rowText: { ...TYPOGRAPHY.body, flex: 1 },
  education: { ...TYPOGRAPHY.caption, flex: 1 },
  intentionText: { ...TYPOGRAPHY.callout, flex: 1 },
  intention: { flexDirection: 'row', alignItems: 'center', gap: SPACING.tight },
  about: { gap: SPACING.micro, paddingTop: SPACING.compact, borderTopWidth: StyleSheet.hairlineWidth },
  aboutTitle: { ...TYPOGRAPHY.callout, fontWeight: '600' },
  bio: { ...TYPOGRAPHY.callout },
  tabs: { flexDirection: 'row', width: '100%', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: {
    flex: 1,
    flexBasis: 0,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.tight,
    paddingVertical: SPACING.compact,
  },
  tabIndicator: { position: 'absolute', bottom: 0, left: '18%', right: '18%', height: 2, borderRadius: RADIUS.full },
  tabLabel: { ...TYPOGRAPHY.callout, textAlign: 'center' },
  section: { gap: SPACING.base },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: SPACING.base, marginTop: SPACING.tight },
  score: { ...TYPOGRAPHY.headline, flex: 1 },
  answersHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: SPACING.tight },
  answersCount: { ...TYPOGRAPHY.caption },
  answer: { gap: SPACING.compact, paddingVertical: SPACING.base, borderBottomWidth: StyleSheet.hairlineWidth },
  answerNumber: { ...TYPOGRAPHY.caption, fontWeight: '700', letterSpacing: 0.7 },
  answerValue: { borderRadius: RADIUS.md, padding: SPACING.base, gap: SPACING.tight },
  selectedAnswer: { ...TYPOGRAPHY.body, fontWeight: '600' },
  yourAnswer: { gap: SPACING.micro, paddingHorizontal: SPACING.tight },
  safetyLink: { flexDirection: 'row', alignItems: 'center', gap: SPACING.compact, minHeight: 56 },
  footer: { position: 'absolute', bottom: 0, width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: SPACING.screenX, paddingTop: SPACING.compact, gap: SPACING.tight, zIndex: 2 },
  footerRow: { flexDirection: 'row', width: '100%', gap: SPACING.compact, alignItems: 'center' },
  passLift: { width: 56, height: 56, borderRadius: RADIUS.full },
  likeLift: { flex: 1, borderRadius: RADIUS.full },
  glassButton: { borderWidth: 1, overflow: 'hidden', borderCurve: 'continuous' },
  glassSurface: { borderRadius: RADIUS.full, borderCurve: 'continuous' },
  gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '46%' },
  pass: { width: 56, height: 56, borderRadius: RADIUS.full },
  passContent: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  like: { flex: 1, minHeight: 56, borderRadius: RADIUS.full },
  likeContent: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.compact, gap: SPACING.compact, zIndex: 1 },
  likeLabel: { ...TYPOGRAPHY.headline, flexShrink: 1, textAlign: 'center' },
});
