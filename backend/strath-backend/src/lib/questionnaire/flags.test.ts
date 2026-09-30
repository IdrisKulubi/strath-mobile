import assert from 'node:assert/strict';
import { test } from 'node:test';

import { flags } from './flags';

test('questionnaire experience applies to every account when global switches are ready', () => {
  const keys = [
    'QUESTIONNAIRE_SCHEMA_READY',
    'QUESTIONNAIRE_COLLECTION_ENABLED',
    'QUESTIONNAIRE_MATCHING_ENABLED',
    'QUESTIONNAIRE_SHELL_ENABLED',
    'QUESTIONNAIRE_USER_IDS',
  ] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.QUESTIONNAIRE_SCHEMA_READY = 'true';
    process.env.QUESTIONNAIRE_COLLECTION_ENABLED = 'true';
    process.env.QUESTIONNAIRE_MATCHING_ENABLED = 'true';
    process.env.QUESTIONNAIRE_SHELL_ENABLED = 'true';
    process.env.QUESTIONNAIRE_USER_IDS = 'some-other-account';
    assert.deepEqual(flags(), { collection: true, matching: true, shell: true });

    process.env.QUESTIONNAIRE_COLLECTION_ENABLED = 'false';
    assert.deepEqual(flags(), { collection: false, matching: false, shell: false });
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
