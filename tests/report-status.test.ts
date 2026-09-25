import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeContentWarnings, normalizeLanguageCodes, normalizeSubtitleTracks } from '../lib/content-metadata';
import {
  VALID_STATUS_TRANSITIONS,
  getValidNextStatuses,
  isValidStatusTransition,
} from '../lib/report-status';

test('valid report status transitions are explicit and consistent', () => {
  assert.deepEqual(VALID_STATUS_TRANSITIONS.DRAFT, ['REVIEWED', 'SUPERSEDED']);
  assert.deepEqual(getValidNextStatuses('REVIEWED'), ['APPROVED', 'DRAFT', 'SUPERSEDED']);
  assert.equal(isValidStatusTransition('APPROVED', 'ISSUED'), true);
  assert.equal(isValidStatusTransition('ISSUED', 'APPROVED'), true);
  assert.equal(isValidStatusTransition('PAID', 'APPROVED'), false);
});

test('metadata normalization strips invalid values and normalizes casing', () => {
  assert.deepEqual(normalizeLanguageCodes([' EN ', 'fr', 'fr', 'xx']), ['en', 'fr']);
  assert.deepEqual(normalizeContentWarnings([' Violence ', 'violence', 'drama', '  sex ']), ['violence', 'sex']);
  assert.deepEqual(
    normalizeSubtitleTracks([
      {
        label: ' English ',
        languageCode: ' EN ',
        kind: 'subtitles',
        fileKey: 'uploads/creator-1/subtitles/english.vtt ',
        isDefault: true,
      },
      {
        label: 'French',
        languageCode: 'fr',
        kind: 'captions',
        fileKey: 'uploads/creator-1/subtitles/french.vtt',
        isDefault: false,
      },
      {
        label: '',
        languageCode: 'xx',
        kind: 'captions',
        fileKey: 'uploads/creator-1/subtitles/bad.vtt',
      },
    ]),
    [
      {
        label: 'English',
        languageCode: 'en',
        kind: 'subtitles',
        fileKey: 'uploads/creator-1/subtitles/english.vtt',
        isDefault: true,
      },
      {
        label: 'French',
        languageCode: 'fr',
        kind: 'captions',
        fileKey: 'uploads/creator-1/subtitles/french.vtt',
        isDefault: false,
      },
    ],
  );
});
