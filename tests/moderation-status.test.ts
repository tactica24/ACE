import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasFailedBunnyPlayback,
  hasReadyBunnyPlayback,
  isBunnyPlaybackInProgress,
  normalizeProcessingStatusLabel,
} from '../lib/moderation-status';

test('normalizeProcessingStatusLabel maps known codes', () => {
  assert.equal(normalizeProcessingStatusLabel(null), 'Awaiting source');
  assert.equal(normalizeProcessingStatusLabel('READY_TO_STREAM'), 'Bunny Stream playback ready');
  assert.equal(normalizeProcessingStatusLabel('TRANSCODE_FAILED'), 'Bunny Stream needs attention');
  assert.equal(normalizeProcessingStatusLabel('CUSTOM_CODE'), 'Custom Code');
});

test('bunny playback helpers classify ready / failed / in-progress', () => {
  assert.equal(hasReadyBunnyPlayback({ processingStatus: 'READY_TO_STREAM' }), true);
  assert.equal(hasReadyBunnyPlayback({ hlsManifestReady: true }), true);
  assert.equal(hasFailedBunnyPlayback({ processingStatus: 'TRANSCODE_FAILED' }), true);
  assert.equal(
    isBunnyPlaybackInProgress({
      bunnyStreamVideoId: 'vid-1',
      processingStatus: 'ENCODING_STARTED',
    }),
    true,
  );
  assert.equal(
    isBunnyPlaybackInProgress({
      bunnyStreamVideoId: 'vid-1',
      processingStatus: 'READY_TO_STREAM',
    }),
    false,
  );
});
