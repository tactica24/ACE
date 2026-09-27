import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEpisodeDraft,
  createSubtitleDraft,
  validateFileSize,
} from '../lib/upload-form-helpers';

test('validateFileSize returns message when over limit', () => {
  assert.equal(validateFileSize({ size: 100 }, 200, 'Poster'), null);
  const msg = validateFileSize({ size: 500 }, 200, 'Poster');
  assert.ok(msg && msg.includes('Poster'));
});

test('createSubtitleDraft builds a blank track', () => {
  const draft = createSubtitleDraft('fr', () => 'French');
  assert.equal(draft.languageCode, 'fr');
  assert.equal(draft.label, 'French');
  assert.equal(draft.kind, 'subtitles');
  assert.equal(draft.file, null);
  assert.ok(draft.id.length > 4);
});

test('createEpisodeDraft defaults season and episode numbers', () => {
  const ep = createEpisodeDraft(2, 5);
  assert.equal(ep.seasonNumber, 2);
  assert.equal(ep.episodeNumber, 5);
  assert.equal(ep.primaryVideoFile, null);
  assert.deepEqual(ep.subtitleTracks, []);
});
