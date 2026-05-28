# Launch Status (2026-03-22)

## Strict checklist
- [x] `.env` file present and production secrets configured — **DONE**
- [ ] `ffmpeg` installed — **WARNING** (only required on hosts that run local transcoding)
- [ ] `ffprobe` installed — **WARNING** (only required on hosts that run local transcoding)
- [x] Lint gate (`npm run lint`) — **DONE**
- [x] Production build gate (`npm run build`) — **DONE**
- [x] Relay smoke gate (`npm run smoke:relay`) — **DONE**

## Notes
- You can launch once all **BLOCKED** checks are cleared (current run has zero BLOCKED).
- FFmpeg tooling is optional and only needed on hosts that normalize uploaded MP4 masters.
