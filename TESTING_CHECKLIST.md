# Testing Checklist for ACE Studio HLS Delivery

## Manual QA Checklist

### Admin Workflow
- [ ] Create new movie metadata (title, description, etc.)
- [ ] Upload poster/thumbnail/trailer assets
- [ ] Upload master MP4 file - status changes to MASTER_UPLOADED
- [ ] Download master and convert to HLS locally using FFmpeg
- [ ] Run `npm run publish:hls -- --movieId=xyz --version=hls-v1 --folder=./output/xyz/hls-v1`
- [ ] Check admin videos page - HLS URL is set, qualities populated, status HLS_UPLOADED
- [ ] Click Validate HLS - should pass all checks (master.m3u8, playlists, segments, Content-Type, CORS)
- [ ] Status changes to READY
- [ ] Click Publish - status changes to PUBLISHED

### Playback Flow
- [ ] As anonymous user, visit movie page - see paywall, no HLS URL exposed
- [ ] Sign up/login, unlock movie using credits/balance
- [ ] Click Watch - player loads HLS URL from /api/playback/start
- [ ] Video plays in adaptive bitrate (switch qualities)
- [ ] Progress tracked via /api/playback/progress
- [ ] Video does not route through Vercel (check network tab - all requests to stream.acestudio.ng)

### Browser Compatibility
- [ ] Chrome/Edge: Uses hls.js, plays HLS
- [ ] Safari/iOS: Uses native HLS, plays HLS
- [ ] Firefox: Falls back to progressive if needed

### Error States
- [ ] Unlocked user sees playback URL
- [ ] Non-unlocked user sees paywall
- [ ] Movie not ready - appropriate error
- [ ] Network issues - graceful fallback

### R2 Delivery
- [ ] All HLS requests go to stream.acestudio.ng
- [ ] Cache-Control headers correct (playlists: 300s, segments: 1 year)
- [ ] Content-Type correct (.m3u8: application/vnd.apple.mpegurl, .ts: video/mp2t)
- [ ] CORS allows ACE Studio origins
- [ ] Cloudflare cache hit on subsequent segment requests

### Earnings & Reporting
- [ ] After unlock, check producer earnings table has entry
- [ ] Monthly report aggregates earnings correctly
- [ ] Platform vs producer share calculated per video settings

## Automated Tests (if implemented)

Run tests:
```bash
npm test
```

Check for:
- Playback API authentication
- HLS validation logic
- Schema migrations
- R2 upload script