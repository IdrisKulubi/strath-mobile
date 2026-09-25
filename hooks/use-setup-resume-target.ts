import { useEffect, useState } from 'react';

import { isSetupResumeDismissed, readSetupDraftBeat } from '@/lib/dating-setup-draft';
import { useIdentity } from '@/lib/questionnaire';

export function useSetupResumeTarget() {
  const identity = useIdentity();
  const [checkingDraft, setCheckingDraft] = useState(true);
  const [shouldResumeSetup, setShouldResumeSetup] = useState(false);

  useEffect(() => {
    if (identity.isPending) return;

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

      const beat = await readSetupDraftBeat(identity.data);
      if (!cancelled) {
        setShouldResumeSetup(beat !== null);
        setCheckingDraft(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [identity.data, identity.isPending]);

  return {
    pending: identity.isPending || checkingDraft,
    shouldResumeSetup,
  };
}
