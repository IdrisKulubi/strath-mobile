/** User-facing onboarding steps: Splash through Celebration (indices 0–11). */
export const ONBOARDING_STEP_COUNT = 12;

/** Essentials sub-flow when first/last name are already available. */
export const ESSENTIALS_STEPS_WITH_PREFILLED_NAME = 5;

/** Essentials sub-flow when the name fallback screen is shown. */
export const ESSENTIALS_STEPS_WITH_NAME_FALLBACK = 6;

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
