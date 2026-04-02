# DEPLOYMENT.md - why-cast

## Current Deployment Target
- Platform: Cloudflare Workers
- Frontend delivery: Workers Static Assets
- API delivery: Hono routes inside the same Worker
- Async pipeline: Cloudflare Workflows

## Local Development
- Preferred command: `make dev`
- Expected local runtime: `wrangler dev`
- Default local port: Wrangler-managed local Worker port (typically `8787`)
- Before changing local ports or adding services, check for collisions.

## Planned Bindings
- `D1`: app data, onboarding, shows, episodes, continuity summaries
- `R2`: generated audio and downloadable assets
- `KV`: source cache, prompt fragments, workflow scratch state
- `Workflow`: episode generation orchestration
- Secrets: `ELEVENLABS_API_KEY`, `LLM_API_KEY`, optional `AI_GATEWAY_URL`

## Health and Smoke Checks
- Health endpoint: `GET /api/health`
- Smoke path: create show request -> create episode job -> retrieve episode list -> play demo audio URL
- Last verified deploy: `https://why-cast.ryan-borker.workers.dev`
- Last verified version: `1c65f822-c458-4333-b1d9-c94e14ac51f8`
- Last smoke results:
  - `GET /api/health` returned `ok: true` on 2026-04-02 UTC
  - `POST /api/shows` returned a serialized show with one ready episode and three queued episodes on 2026-04-02 UTC

## Rollback Path
- Re-deploy the previous Worker version from Cloudflare dashboard or Wrangler deployment history.
- Keep schema changes additive during hackathon window to reduce rollback risk.

## Notes
- Workers Static Assets is the default serving path for this project because Cloudflare recommends Workers, not Pages, for new full-stack projects.
