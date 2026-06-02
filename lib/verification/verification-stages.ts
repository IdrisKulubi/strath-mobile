export const UPLOAD_STAGES = [
    {
        key: 'upload',
        badge: 'Step 1 of 2',
        title: 'Uploading your selfie',
        body: 'Saving your selfie and sending it in.',
        progress: 0.3,
    },
    {
        key: 'queue',
        badge: 'Step 2 of 2',
        title: 'Starting your check',
        body: 'Your verification is lined up and about to run.',
        progress: 0.5,
    },
] as const;

export const PROCESSING_STAGES = [
    {
        key: 'read',
        badge: 'Step 1 of 3',
        title: 'Reading your selfie',
        body: 'Checking that your face is clear and easy to read.',
        progress: 0.68,
    },
    {
        key: 'match',
        badge: 'Step 2 of 3',
        title: 'Matching your photos',
        body: 'Comparing your selfie with your profile photos.',
        progress: 0.84,
    },
    {
        key: 'finish',
        badge: 'Step 3 of 3',
        title: 'Finishing up',
        body: 'Wrapping up the final checks now.',
        progress: 0.96,
    },
] as const;

export type VerificationOverlayStage = (typeof UPLOAD_STAGES)[number] | (typeof PROCESSING_STAGES)[number];
