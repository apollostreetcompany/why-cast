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

## Rollback Path
- Re-deploy the previous Worker version from Cloudflare dashboard or Wrangler deployment history.
- Keep schema changes additive during hackathon window to reduce rollback risk.

## Notes
- Workers Static Assets is the default serving path for this project because Cloudflare recommends Workers, not Pages, for new full-stack projects.
