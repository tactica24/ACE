# Restore studio video route

A large-file GitHub API limit prevented pushing the full `app/api/studio/video/route.ts` in one agent step. The last known-good full file is on commit `910085f`.

## One-command restore

```bash
cd /path/to/ACE
curl -sL "https://raw.githubusercontent.com/tactica24/ACE/910085f073926d930480848a4418ed7219bf028b/app/api/studio/video/route.ts" \
  -o app/api/studio/video/route.ts
git add app/api/studio/video/route.ts
git commit -m "fix: restore full studio video route from 910085f"
git push origin main
```

Optional: after restore, import tier guards from `@/lib/studio-tiers` instead of local `isPriceTier` / `isRightsTier` helpers (see scoring refactor commits).
