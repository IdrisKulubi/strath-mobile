import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, GraduationCap, Heart, HeartHandshake, MapPin, MessageCircle, MoreHorizontal, Shield, X } from 'lucide-react-native';

import { Action, Copy, Feedback, Field, Loading, Notice, SectionLabel } from '@/components/questionnaire/ui';
import { PhotoButton, ProfileGallery } from '@/components/questionnaire/profile-gallery';
import { useTheme } from '@/hooks/use-theme';
import { PROFILE_PHOTO, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { compatibilityLabel, useQuestionnaire, useQuestionnaireMutation, type DecisionResponse, type PublicComparison } from '@/lib/questionnaire';

type ProfileTab = 'About' | 'Photos' | 'Answers';

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
  const [showAllAnswers, setShowAllAnswers] = useState(false);
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
  const visibleQuestions = showAllAnswers ? questions : questions.slice(0, 3);
  const educationLine = person
    ? [person.university, person.course, person.yearOfStudy ? `Year ${person.yearOfStudy}` : null].filter(Boolean).join(' · ')
    : '';
  const footerBottomPad = SPACING.base;

  const answersScrollY = () => sections.current.bodyTop + sections.current.answersInBody;

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
              <SectionLabel>Your compatibility</SectionLabel>
              <View style={styles.row}><HeartHandshake size={25} color={colors.primaryText} /><Text style={[styles.score, { color: colors.foreground }]}>{compatibilityLabel(comparison.data?.compatibility)}</Text></View>
              <Copy muted>Based on both people’s answers. This is not a prediction of relationship success.</Copy>
              {comparison.data?.compatibility.status === 'insufficient_evidence' ? <Notice>Answer more questions to build enough shared evidence for a percentage.</Notice> : null}
            </View>

            <View style={[styles.section, styles.divider, { borderTopColor: colors.controlBorder }]}>
              <SectionLabel>Public answers</SectionLabel>
              <Copy muted>Get to know their views and see how your answers compare.</Copy>
              {!questions.length ? <Copy muted>No public answers to show yet. Private answers stay hidden.</Copy> : null}
              {visibleQuestions.map((question) => <View key={question.id} style={[styles.answer, { borderBottomColor: colors.controlBorder }]}>
                <Text style={[TYPOGRAPHY.headline, { color: colors.foreground }]}>{question.prompt}</Text>
                <View style={[styles.answerValue, { backgroundColor: colors.control }]}>
                  <Text style={[TYPOGRAPHY.caption, { color: colors.mutedForeground }]}>{person.name}</Text>
                  <Copy>{question.options.find((option) => option.id === question.theirs)?.label ?? 'Answer unavailable'}</Copy>
                  {question.theirExplanation ? <Copy muted>{question.theirExplanation}</Copy> : null}
                </View>
                {question.yours ? <Copy muted>You: {question.options.find((option) => option.id === question.yours)?.label ?? 'Answer unavailable'}</Copy> : null}
                {question.yourExplanation ? <Copy muted>Your note: {question.yourExplanation}</Copy> : null}
              </View>)}
              {questions.length > 3 ? <Action label={showAllAnswers ? 'Show fewer answers' : `View all ${questions.length} public answers`} tone="ghost" onPress={() => { setShowAllAnswers((value) => !value); if (showAllAnswers) jump(answersScrollY()); }} /> : null}
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
    {person && !safetyOpen ? <View onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)} style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.controlBorder, paddingBottom: footerBottomPad }]}>
      <Feedback error={decision.error} />
      <View style={styles.footerRow}>
        {!matchId ? <Pressable accessibilityRole="button" accessibilityLabel={`Pass on ${person.name}`} disabled={decision.isPending || decision.isSuccess} accessibilityState={{ disabled: decision.isPending || decision.isSuccess }}
          onPress={() => decision.mutate({ targetId: userId, decision: 'pass' }, { onSuccess: () => router.replace('/dating' as never) })}
          onPressIn={() => setPressedControl('pass')} onPressOut={() => setPressedControl(null)}
          style={[styles.pass, { backgroundColor: colors.control, borderColor: colors.controlBorder, opacity: decision.isPending || decision.isSuccess ? 0.45 : pressedControl === 'pass' ? 0.6 : 1 }]}><X size={24} color={colors.foreground} /></Pressable> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={matchId ? 'Send a message' : `Like ${person.name}`} disabled={!matchId && (decision.isPending || decision.isSuccess)} accessibilityState={{ disabled: !matchId && (decision.isPending || decision.isSuccess) }}
          onPress={() => matchId ? router.push({ pathname: '/dating-chat/[matchId]', params: { matchId } } as never) : decision.mutate({ targetId: userId, decision: 'like' }, { onSuccess: (result) => setMatchId(result.matchId ?? null) })}
          onPressIn={() => setPressedControl('like')} onPressOut={() => setPressedControl(null)}
          style={[styles.like, { backgroundColor: colors.primary, opacity: !matchId && (decision.isPending || decision.isSuccess) ? 0.6 : pressedControl === 'like' ? 0.7 : 1 }]}>
          {matchId ? <MessageCircle size={24} color={colors.primaryForeground} /> : <Heart size={24} color={colors.primaryForeground} fill={colors.primaryForeground} />}
          <Text style={[styles.likeLabel, { color: colors.primaryForeground }]}>{matchId ? 'Send a message' : decision.isPending ? 'Saving…' : decision.isSuccess ? 'Liked' : `Like ${person.name}`}</Text>
        </Pressable>
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
  answer: { gap: SPACING.compact, paddingVertical: SPACING.base, borderBottomWidth: StyleSheet.hairlineWidth },
  answerValue: { borderRadius: RADIUS.md, padding: SPACING.base, gap: SPACING.tight },
  safetyLink: { flexDirection: 'row', alignItems: 'center', gap: SPACING.compact, minHeight: 56 },
  footer: { position: 'absolute', bottom: 0, width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: SPACING.screenX, paddingTop: SPACING.compact, borderTopWidth: StyleSheet.hairlineWidth, gap: SPACING.tight, zIndex: 2 },
  footerRow: { flexDirection: 'row', width: '100%', gap: SPACING.compact, alignItems: 'center' },
  pass: { width: 56, height: 56, borderWidth: StyleSheet.hairlineWidth, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  like: { flex: 1, minHeight: 56, borderRadius: RADIUS.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.base, paddingVertical: SPACING.compact, gap: SPACING.compact },
  likeLabel: { ...TYPOGRAPHY.headline, flexShrink: 1, textAlign: 'center' },
});
