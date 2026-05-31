# ACE Media Architecture

## Current production media flow

The app is now designed around one media path:

`Admin upload -> Bunny master -> Akash worker -> Livepeer transcode -> Bunny HLS -> signed viewer playback`

## Storage model

Bunny is the only storage provider used by runtime code.

Stored asset categories:

- `posters/`
- `trailers/`
- `subtitles/`
- `uploads/` for masters and direct uploads
- `streams/` for HLS output
- `downloads/` for APK delivery when enabled

## Processing model

### 1. Admin upload

Admin uploads the master to Bunny directly through the app upload signing flow.

The app stores:

- `masterKey`
- `masterFileName`
- `masterFileSize`
- `masterUploadedAt`

and sets the title to `MASTER_UPLOADED`.

### 2. Akash orchestration

After a master is attached, the app creates an Akash deployment for a worker that knows:

- the `videoId`
- the Bunny `masterKey`
- the target `hlsOutputPath`
- the callback URL back into the app

The app records:

- `orchestrationProvider = AKASH`
- `orchestrationJobId`

### 3. Livepeer transcode

The Akash worker submits the Bunny master to Livepeer and passes Bunny's S3-compatible output config so Livepeer writes the HLS package back into Bunny.

The app records:

- `transcodeProvider = LIVEPEER`
- `transcodeTaskId`
- `transcodeRequestedAt`

### 4. Callback and verification

The worker posts progress back to:

`/api/internal/video-pipeline/callback`

On completion, the app:

1. verifies the HLS manifest exists in Bunny
2. verifies segment availability
3. signs the HLS manifest URL
4. sets the title to `READY`
5. marks the master as deletion-eligible

## Playback model

### Web

The player prefers HLS:

- native HLS when the browser supports it
- `hls.js` otherwise

### Mobile

The mobile playback repository now prefers the HLS URL returned by the playback API.

## Admin lifecycle

1. Upload or replace master
2. Start or sync pipeline if needed
3. Wait for `READY_TO_STREAM`
4. Publish
5. Delete master only after HLS verification

## Why the master can be deleted

Once HLS is verified in Bunny, viewers no longer need the original master for playback. That leaves:

- HLS manifest
- HLS segments
- poster
- trailer
- subtitles
- metadata

as the viewer-facing delivery set.
