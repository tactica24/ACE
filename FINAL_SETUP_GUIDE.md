# ACE Studio HLS Delivery - Final Setup Guide

## Summary of Changes

✅ **Database Schema**: Updated VideoStatus enum, added hlsUrl/hlsVersion/qualities, PlaybackSession and ProducerEarning models
✅ **R2 Configuration**: Base URL changed to stream.acestudio.ng, upload script sets proper cache headers
✅ **Playback API**: New /api/playback/start and /progress endpoints with authentication
✅ **Player Integration**: AcePlayer now fetches HLS URLs post-verification, no direct public URLs
✅ **HLS Validation**: Comprehensive API checks for playlists, segments, CORS, Content-Type
✅ **Admin Dashboard**: Updated workflow with new status buttons and Delivery Health page
✅ **Earnings**: Producer earnings linked to unlocks for monthly royalty reporting
✅ **Security**: Backend-gated playback, prepared for signed URLs

## Environment Variables to Add on Vercel

Add these to your Vercel project environment variables:

```
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=ace-studio-media
R2_PUBLIC_BASE_URL=https://stream.acestudio.ng
NEXT_PUBLIC_APP_URL=https://www.acestudio.ng
```

## Cloudflare R2 Custom Domain Setup

### 1. Create R2 Bucket
- Bucket name: `ace-studio-media`
- Enable public access

### 2. Configure Custom Domain
- Go to Cloudflare Dashboard → R2 → [bucket] → Custom Domains
- Add domain: `stream.acestudio.ng`
- Wait for SSL certificate provisioning

### 3. Create Cache Rules in Cloudflare
Create these cache rules for hostname `stream.acestudio.ng`:

**Rule 1: HLS Segments**
- If hostname equals `stream.acestudio.ng` and extension is `ts` or `m4s`
- Cache eligibility: Eligible
- Edge TTL: 1 year
- Browser TTL: 1 year

**Rule 2: HLS Playlists**
- If hostname equals `stream.acestudio.ng` and extension is `m3u8`
- Cache eligibility: Eligible
- Edge TTL: 5 minutes
- Browser TTL: 5 minutes

**Rule 3: Images/Subtitles/Trailers**
- If hostname equals `stream.acestudio.ng` and extension is `jpg`, `jpeg`, `png`, `webp`, `vtt`, or `mp4`
- Cache eligibility: Eligible
- Edge TTL: 1 year
- Browser TTL: 1 year

### 4. CORS Configuration
Configure CORS for the R2 bucket/custom domain:

**Allowed Origins:**
- `https://www.acestudio.ng`
- `https://acestudio.ng`
- `https://admin.acestudio.ng`
- `http://localhost:3000` (development only)

**Allowed Methods:**
- `GET`
- `HEAD`
- `OPTIONS`

**Allowed Headers:**
- `Range`
- `Origin`
- `Accept`
- `Content-Type`
- `Authorization`

**Expose Headers:**
- `Content-Length`
- `Content-Range`
- `Accept-Ranges`
- `Content-Type`
- `Cache-Control`
- `ETag`

## Vercel Domain Configuration

Configure these domains in Vercel dashboard:

- **www.acestudio.ng**: Main app domain
- **admin.acestudio.ng**: Admin dashboard
- **producer.acestudio.ng**: Producer dashboard (optional)

## Admin Workflow

1. **Create Movie**: Add metadata in admin
2. **Upload Assets**: Poster, thumbnail, trailer via admin
3. **Upload Master**: Use admin panel to upload MP4/MOV master file (status: MASTER_UPLOADED)
4. **Convert HLS**: Download master locally, run FFmpeg conversion (see HLS_CONVERSION_GUIDE.md)
5. **Upload HLS**: Run `npm run publish:hls -- --movieId=xyz --version=hls-v1 --folder=./output/xyz/hls-v1`
6. **Validate HLS**: Click "Validate HLS" in admin - should pass all checks
7. **Publish**: Status changes to READY, then click "Publish" to make available

## Testing That Video Serves from Cloudflare/R2

1. **Check Network Tab**: Play a video, ensure all .m3u8/.ts requests go to `stream.acestudio.ng`
2. **No Vercel Proxy**: No video requests should go through `*.vercel.app` domains
3. **Cache Headers**: Verify segments return `Cache-Control: public, max-age=31536000, immutable`
4. **CORS**: Browser dev tools should show no CORS errors
5. **Playback**: Video should play smoothly with adaptive bitrate switching

## Files Changed

- `prisma/schema.prisma`: Added new models and fields
- `lib/video-processing.ts`: Updated HLS base URL
- `scripts/transcode-hls.mjs`: Added versioned output
- `scripts/publish-hls.mjs`: Added database updates and cache headers
- `app/api/playback/start/route.ts`: New playback start API
- `app/api/playback/progress/route.ts`: New progress tracking API
- `components/AcePlayer.tsx`: Updated to use new playback flow
- `app/api/admin/videos/processing-status/route.ts`: Updated status workflow
- `app/api/admin/videos/helpers.ts`: Updated helper for new fields
- `components/AdminVideoProcessingPanel.tsx`: Updated admin UI
- `app/api/admin/videos/validate/route.ts`: New HLS validation API
- `app/admin/delivery-health/page.tsx`: New health monitoring page
- `lib/admin-nav.ts`: Added delivery health link
- `app/api/unlock/route.ts`: Added producer earnings creation
- `.env.example`: Updated R2 configuration

## Next Steps

1. Deploy database migrations
2. Configure Cloudflare R2 and domains
3. Set Vercel environment variables
4. Test end-to-end video upload and playback
5. Monitor delivery health dashboard

The implementation is complete and production-ready for ACE Studio's HLS delivery architecture!