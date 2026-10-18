import { useEffect, useState } from 'react';

import {
  clearDatingSetupDraft,
  isSetupResumeDismissed,
  readSetupDraftBeat,
} from '@/lib/dating-setup-draft';
import {
  useExperience,
  useIdentity,
  useQuestionnaire,
  type DiscoveryBlocker,
  type QuestionnaireState,
} from '@/lib/questionnaire';

const SETUP_BLOCKERS: DiscoveryBlocker[] = ['birthDate', 'preferences', 'profile'];

function isServerSetupComplete(missing: DiscoveryBlocker[]) {
  return !SETUP_BLOCKERS.some((blocker) => missing.includes(blocker));
}

export function useSetupResumeTarget() {
  const identity = useIdentity();
  const experience = useExperience();
  const status = useQuestionnaire<QuestionnaireState>(
    'status',
    Boolean(experience.data?.collection),
  );
  const [checkingDraft, setCheckingDraft] = useState(true);
  const [shouldResumeSetup, setShouldResumeSetup] = useState(false);

  useEffect(() => {
    if (identity.isPending) return;
    if (experience.isPending) return;
    if (experience.data?.collection && status.isPending) return;

    let cancelled = false;

    void (async () => {
      if (!identity.data) {
        if (!cancelled) {
          setShouldResumeSetup(false);
          setCheckingDraft(false);
        }
        return;
      }

      if (isSetupResumeDismissed()) {
        if (!cancelled) {
          setShouldResumeSetup(false);
          setCheckingDraft(false);
        }
        return;
      }

      const userId = identity.data;
      const missing = status.data?.discovery?.missing ?? [];
      if (experience.data?.collection && status.data && isServerSetupComplete(missing)) {
        const beat = await readSetupDraftBeat(userId);
        if (beat !== null) {
          await clearDatingSetupDraft(userId);
        }
        if (!cancelled) {
          setShouldResumeSetup(false);
          setCheckingDraft(false);
        }
        return;
      }

      const beat = await readSetupDraftBeat(userId);
      if (!cancelled) {
        setShouldResumeSetup(beat !== null);
        setCheckingDraft(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    experience.data?.collection,
    experience.isPending,
    identity.data,
    identity.isPending,
    status.data,
    status.isPending,
  ]);

  return {
    pending: identity.isPending || experience.isPending || checkingDraft
      || (Boolean(experience.data?.collection) && status.isPending),
    shouldResumeSetup,
  };
}
