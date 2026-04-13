## Production Load Test

Target:
- `https://www.acestudio.ng`

Current scope:
- anonymous public traffic only
- homepage, highlights, browse, auth entry pages, catalog API
- does not yet cover authenticated wallet, unlock, streaming, payouts, or admin traffic

Why this scope:
- live production has no seeded user traffic yet
- authenticated and payment flows need dedicated safe test accounts and a rollback plan

Run:

```powershell
npx artillery run perf/production-public-load.yml --output perf/results/production-public-load.json
```

Recommended interpretation:
- `p95` under 1s at baseline is healthy
- sustained non-2xx/3xx responses above 1% means the tier is unstable
- rising latency with flat error rate usually means saturation is approaching
- connection resets, 5xx spikes, or timeouts mark the practical ceiling for this deployment shape

Next tests to add after safe test credentials exist:
- authenticated sign-in burst
- wallet top-up callback verification
- stream token generation
- protected stream fetch cadence
- admin report generation and save lifecycle

Important:
- this suite is not evidence for `100000` true concurrent users
- that requires distributed load generation, production telemetry, and staged infrastructure scaling
