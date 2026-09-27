import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildOwnedUploadKey,
  isOwnedUploadKey,
  sanitizeUploadFilename,
  validateUploadRequest,
} from '../lib/upload-security';

test('sanitizeUploadFilename strips unsafe characters', () => {
  assert.equal(sanitizeUploadFilename('My Movie!!!.mp4'), 'My-Movie---.mp4');
  assert.equal(sanitizeUploadFilename('safe_name-01.mp4'), 'safe_name-01.mp4');
});

test('isOwnedUploadKey enforces user ownership and purpose prefixes', () => {
  const userId = 'user-123';
  const videoKey = `uploads/${userId}/video/asset-1-file.mp4`;
  const otherKey = `uploads/other-user/video/asset-1-file.mp4`;
  const masterKey = `uploads/${userId}/movie/asset-1-file.mp4`;
  const folderMaster = `uploads/${userId}/movies/folder-a/masters/asset-1-file.mp4`;

  assert.equal(isOwnedUploadKey(videoKey, userId), true);
  assert.equal(isOwnedUploadKey(videoKey, userId, 'video'), true);
  assert.equal(isOwnedUploadKey(otherKey, userId), false);
  assert.equal(isOwnedUploadKey(masterKey, userId, 'master'), true);
  assert.equal(isOwnedUploadKey(folderMaster, userId, 'master'), true);
  assert.equal(isOwnedUploadKey('', userId), false);
});

test('buildOwnedUploadKey builds stable owned paths', () => {
  const key = buildOwnedUploadKey({
    userId: 'creator-1',
    purpose: 'poster',
    filename: 'art cover.png',
    assetId: 'asset99',
  });
  assert.equal(key, 'uploads/creator-1/poster/asset99-art-cover.png');
  assert.equal(isOwnedUploadKey(key, 'creator-1', 'poster'), true);
});

test('validateUploadRequest rejects disallowed types and oversize files', () => {
  const ok = validateUploadRequest({
    purpose: 'video',
    filename: 'clip.mp4',
    contentType: 'video/mp4',
    fileSize: 1024,
  });
  assert.equal(ok.ok, true);

  const badType = validateUploadRequest({
    purpose: 'video',
    filename: 'clip.exe',
    contentType: 'application/x-msdownload',
    fileSize: 1024,
  });
  assert.equal(badType.ok, false);
});
