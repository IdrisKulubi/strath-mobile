/** User-facing onboarding steps: Splash through Celebration (indices 0–7). */
export const ONBOARDING_STEP_COUNT = 8;

/** Essentials sub-flow when first/last name are already available. */
export const ESSENTIALS_STEPS_WITH_PREFILLED_NAME = 1;

/** Essentials sub-flow when the name fallback screen is shown. */
export const ESSENTIALS_STEPS_WITH_NAME_FALLBACK = 2;

export const CORE_PROFILE_SUBSTEP_COUNT = 4;
export const CAMPUS_BASICS_SUBSTEP_COUNT = 3;

export const DATING_GOAL_OPTIONS = [
    {
        value: 'serious',
        label: 'Long-term dating',
        description: 'Ready to build something meaningful',
        emoji: '💍',
    },
    {
        value: 'casual',
        label: 'Casual dating',
        description: 'See where things go, no pressure',
        emoji: '🌊',
    },
    {
        value: 'open',
        label: 'Open to anything',
        description: 'Exploring connections on campus',
        emoji: '✨',
    },
] as const;

export const GENDER_IDENTITY_OPTIONS = [
    { value: 'male', label: 'Man', emoji: '👨' },
    { value: 'female', label: 'Woman', emoji: '👩' },
    { value: 'other', label: 'Non-binary / Other', emoji: '✨' },
] as const;

export const MATCH_PREFERENCE_OPTIONS = [
    { value: 'women', label: 'Women', description: 'Show me women', emoji: '👩' },
    { value: 'men', label: 'Men', description: 'Show me men', emoji: '👨' },
    { value: 'everyone', label: 'Everyone', description: 'Open to all genders', emoji: '💕' },
] as const;

export const YEAR_OF_STUDY_OPTIONS = [
    { value: '1', label: '1st Year', description: 'Just getting started', emoji: '🌱' },
    { value: '2', label: '2nd Year', description: 'Finding my rhythm', emoji: '🌿' },
    { value: '3', label: '3rd Year', description: 'Deep in the coursework', emoji: '🌳' },
    { value: '4', label: '4th Year', description: 'Wrapping up undergrad', emoji: '🎓' },
    { value: '5', label: 'Postgrad', description: 'Masters, PhD, or beyond', emoji: '🎯' },
] as const;

export function onboardingStepLabel(stepIndex: number): string {
    const step = Math.min(Math.max(stepIndex + 1, 1), ONBOARDING_STEP_COUNT);
    return `Step ${step} of ${ONBOARDING_STEP_COUNT}`;
}

export function essentialsStepLabel(internalStep: number, hasPrefilledName: boolean): string {
    if (hasPrefilledName) {
        const step = Math.min(Math.max(internalStep, 1), ESSENTIALS_STEPS_WITH_PREFILLED_NAME);
        return `Step ${step} of ${ESSENTIALS_STEPS_WITH_PREFILLED_NAME}`;
    }

    const step = Math.min(Math.max(internalStep + 1, 1), ESSENTIALS_STEPS_WITH_NAME_FALLBACK);
    return `Step ${step} of ${ESSENTIALS_STEPS_WITH_NAME_FALLBACK}`;
}

export function coreProfileStepLabel(internalStep: number): string {
    const step = Math.min(Math.max(internalStep + 1, 1), CORE_PROFILE_SUBSTEP_COUNT);
    return `Step ${step} of ${CORE_PROFILE_SUBSTEP_COUNT}`;
}

export function campusBasicsStepLabel(internalStep: number): string {
    const step = Math.min(Math.max(internalStep + 1, 1), CAMPUS_BASICS_SUBSTEP_COUNT);
    return `Step ${step} of ${CAMPUS_BASICS_SUBSTEP_COUNT}`;
}
