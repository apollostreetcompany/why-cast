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
- `Durable Objects`: serialized show room state, event log, continuity anchor
- `Workflow`: episode generation orchestration
- Secrets: `ELEVENLABS_API_KEY`, `LLM_API_KEY`, optional `AI_GATEWAY_URL`

## Health and Smoke Checks
- Health endpoint: `GET /api/health`
- Smoke path: create show request -> create episode job -> retrieve episode list -> play demo audio URL
- Last verified deploy: `https://why-cast.ryan-borker.workers.dev`
- Last verified version: `a3081337-8f15-4f3a-a08e-6879baeda2b7`
- Last smoke results:
  - `GET /api/health` returned `ok: true` plus judge-facing architecture metadata, including active Workflows, on 2026-04-02 UTC
  - `POST /api/shows` returned a Durable Object-backed serialized show with one ready episode, three queued episodes, continuity events, and a multi-API ElevenLabs audio plan on 2026-04-02 UTC
  - `GET /api/shows/:showId` retrieved the same show state from the Durable Object on 2026-04-02 UTC
  - `GET /api/shows/:showId/workflow-demo` returned the prompt bundle, generated draft, editor pass, continuity memory, and workflow stage artifacts on 2026-04-02 UTC
  - `POST /api/shows/:showId/quiz/submit` passed a family quiz and unlocked Episode 2 on 2026-04-02 UTC

## Rollback Path
- Re-deploy the previous Worker version from Cloudflare dashboard or Wrangler deployment history.
- Keep schema changes additive during hackathon window to reduce rollback risk.

## Notes
- Workers Static Assets is the default serving path for this project because Cloudflare recommends Workers, not Pages, for new full-stack projects.
- Current deployed Worker includes a `ShowRoom` Durable Object binding and migration for serialized continuity ownership.
