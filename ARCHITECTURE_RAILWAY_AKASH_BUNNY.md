# Historical Note

This file name is kept only so older references do not break.

The current source of truth is:

- [`ARCHITECTURE_CONTABO_BUNNY.md`](ARCHITECTURE_CONTABO_BUNNY.md)
- [`DEPLOY_CONTABO_BUNNY.md`](DEPLOY_CONTABO_BUNNY.md)

The app now uses:

- Bunny for storage and delivery
- Contabo for one-at-a-time worker orchestration
- FFmpeg for transcoding
- signed HLS for viewer playback

Do not use older R2 or Bunny Stream ingestion notes for deployment.
