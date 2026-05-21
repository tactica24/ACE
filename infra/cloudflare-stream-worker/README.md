# ACE Stream Worker

This Worker makes `https://stream.acestudio.ng/movies/{videoId}/master.m3u8?token=...`
serve private HLS files from Cloudflare R2 after validating the same JWT stream
token issued by the ACE app.

The R2 bucket stays private. The Worker validates `ACE_STREAM_SIGNING_SECRET`,
checks the token has not expired, checks `payload.videoId` matches the URL, then
serves manifests and cacheable media segments.

## Setup

1. Copy `wrangler.toml.example` to `wrangler.toml`.
2. Set `bucket_name` to your HLS bucket, for example `ace-hls`.
3. In Cloudflare DNS, create/proxy `stream.acestudio.ng`.
4. Set the Worker route to `stream.acestudio.ng/*`.
5. Add the same signing secret used by Vercel:

```bash
wrangler secret put ACE_STREAM_SIGNING_SECRET
```

6. Deploy:

```bash
wrangler deploy
```

## Required Vercel Env

Set:

```env
ACE_CDN_BASE_URL=https://stream.acestudio.ng
ACE_STREAM_SIGNING_SECRET=<same value used in the Worker secret>
HLS_R2_BUCKET=<same R2 bucket bound to HLS_BUCKET>
```

When `ACE_CDN_BASE_URL` is set, the app returns signed HLS URLs on
`stream.acestudio.ng`. If it is not set, the app falls back to `/api/hls/...`.
