# Secure Stream CDN Setup

Use this when the R2 buckets already exist:

- Master bucket: `ace-masters`
- HLS bucket: `ace-hls`
- Stream domain: `stream.acestudio.ng`

## 1. Vercel env

Make sure these are set in Vercel:

```env
MASTER_R2_BUCKET=ace-masters
HLS_R2_BUCKET=ace-hls
ACE_CDN_BASE_URL=https://stream.acestudio.ng
```

Keep your existing R2 S3 credentials:

```env
R2_ENDPOINT=https://<cloudflare-account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_BUCKET=<general-media-bucket>
```

`ACE_STREAM_SIGNING_SECRET` must be set in both Vercel and the Cloudflare Worker.

## 2. Deploy Worker

Run:

```bash
npm run setup:stream-worker
```

Use these prompts:

```text
Stream domain: stream.acestudio.ng
Cloudflare zone name: acestudio.ng
HLS R2 bucket name: ace-hls
Allowed app origin: https://acestudio.ng
ACE_STREAM_SIGNING_SECRET: paste the exact same value from Vercel
```

The script writes `infra/cloudflare-stream-worker/wrangler.toml`, logs into Cloudflare
if needed, sets the Worker secret, and deploys the Worker.

## 3. Cloudflare DNS

In Cloudflare DNS, make sure `stream.acestudio.ng` exists and is proxied.

If you do not have a target service for the record yet, create a proxied `AAAA`
record:

```text
Name: stream
IPv6 address: 100::
Proxy status: Proxied
```

The Worker route `stream.acestudio.ng/*` will handle requests before that origin
is reached.
