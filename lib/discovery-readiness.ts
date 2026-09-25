import type { DiscoveryBlocker } from '@/lib/questionnaire';

export const DISCOVERY_BLOCKER_ORDER: DiscoveryBlocker[] = [
  'answers',
  'birthDate',
  'preferences',
  'profile',
  'verification',
  'visibility',
  'paused',
  'anonymous',
];

export type DiscoveryChecklistRow = {
  id: string;
  label: string;
  description: string;
  done: boolean;
  blockers: DiscoveryBlocker[];
};

export function discoveryChecklistRows(missing: DiscoveryBlocker[]): DiscoveryChecklistRow[] {
  const pending = new Set(missing);
  const rowDone = (blockers: DiscoveryBlocker[]) => blockers.every((item) => !pending.has(item));

  return [
    {
      id: 'answers',
      label: 'Answers',
      description: 'Save every required compatibility answer',
      done: rowDone(['answers']),
      blockers: ['answers'],
    },
    {
      id: 'profile',
      label: 'Profile',
      description: 'Name, photos, and basics on your profile',
      done: rowDone(['profile', 'birthDate']),
      blockers: ['profile', 'birthDate'],
    },
    {
      id: 'preferences',
      label: 'Preferences',
      description: 'Who you want to meet and how far to search',
      done: rowDone(['preferences']),
      blockers: ['preferences'],
    },
    {
      id: 'verification',
      label: 'Face verification',
      description: 'Confirm you are a real person',
      done: rowDone(['verification']),
      blockers: ['verification'],
    },
    {
      id: 'visibility',
      label: 'Visible to others',
      description: 'Profile visible, discovery on, not anonymous',
      done: rowDone(['visibility', 'paused', 'anonymous']),
      blockers: ['visibility', 'paused', 'anonymous'],
    },
  ];
}

export function discoveryStepForBlocker(blocker: DiscoveryBlocker): { label: string; href: string } {
  switch (blocker) {
    case 'answers':
      return { label: 'Continue questions', href: '/questions' };
    case 'birthDate':
      return { label: 'Add your birth date', href: '/dating-setup' };
    case 'preferences':
      return { label: 'Set discovery preferences', href: '/dating-setup' };
    case 'profile':
      return { label: 'Finish your profile', href: '/dating-setup' };
    case 'verification':
      return { label: 'Verify your face', href: '/verification?returnTo=/dating' };
    case 'visibility':
      return { label: 'Turn on visibility', href: '/settings' };
    case 'paused':
      return { label: 'Resume discovery', href: '/settings' };
    case 'anonymous':
      return { label: 'Update visibility settings', href: '/settings' };
    default:
      return { label: 'Finish setup', href: '/dating-setup' };
  }
}

export function firstDiscoveryStep(missing: DiscoveryBlocker[]) {
  for (const blocker of DISCOVERY_BLOCKER_ORDER) {
    if (missing.includes(blocker)) return discoveryStepForBlocker(blocker);
  }
  return null;
}

export function checklistRowAction(row: DiscoveryChecklistRow, missing: DiscoveryBlocker[]) {
  const pending = new Set(missing);
  const blocker = row.blockers.find((item) => pending.has(item));
  return blocker ? discoveryStepForBlocker(blocker) : discoveryStepForBlocker(row.blockers[0]);
}
