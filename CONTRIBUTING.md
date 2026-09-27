# Contributing to Ace Studio

## Development workflow

1. Create a focused branch for one change.
2. Prefer conventional commits: `feat:`, `fix:`, `test:`, `refactor:`, `docs:`, `chore:`.
3. Land implementation and its tests in the same commit when practical.
4. Run before opening a PR:
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run test:coverage
   ```

## Local environment

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run db:push
npm run db:seed
npm run dev
```

Mock-only media (no live Bunny account):

```bash
export MOCK_BUNNY=1
npm run dev
```

## Pull requests

- Keep PRs small and reviewable.
- Do not commit `.env` or production secrets.
- Update `.env.example` when you introduce a new environment variable.
