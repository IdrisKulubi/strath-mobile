import React from 'react';

import { Copy, Notice, Page } from '@/components/questionnaire/ui';
import { useExperience } from '@/lib/questionnaire';

export default function LikesScreen() {
  const experience = useExperience();
  return (
    <Page title="Likes">
      <Copy>Received and sent likes will appear here without a new paywall.</Copy>
      {!experience.data?.matching
        ? <Notice>Likes are intentionally unavailable in this onboarding preview. They open after compatible discovery is tested.</Notice>
        : <Notice>Likes become available with the Phase 5 connection release.</Notice>}
    </Page>
  );
}
