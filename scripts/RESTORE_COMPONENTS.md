# Restore large components after thin-entrypoint split

If `components/upload-form/UploadFormMain.tsx` (or moderation/player mains) are missing, restore from the last full revisions:

```bash
PARENT=6a4ccd2900040b9d0df7727393d464fd03c0d059

mkdir -p components/upload-form components/moderation components/player

curl -sL "https://raw.githubusercontent.com/tactica24/ACE/$PARENT/components/UploadForm.tsx" \
  -o components/upload-form/UploadFormMain.tsx

curl -sL "https://raw.githubusercontent.com/tactica24/ACE/$PARENT/components/ModerationQueue.tsx" \
  -o components/moderation/ModerationQueueMain.tsx

curl -sL "https://raw.githubusercontent.com/tactica24/ACE/$PARENT/components/AcePlayer.tsx" \
  -o components/player/AcePlayerMain.tsx

# Full studio video route
curl -sL "https://raw.githubusercontent.com/tactica24/ACE/910085f073926d930480848a4418ed7219bf028b/app/api/studio/video/route.ts" \
  -o app/api/studio/video/route.ts

git add components app/api/studio/video/route.ts
git commit -m "fix: restore full component implementations and studio video route"
git push origin main
```

Then run `npm install` (picks up pino + @sentry/nextjs) and `npm run test`.
