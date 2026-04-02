# DEPLOYMENT.md - why-cast

## Current Deployment Target
- Backend platform: Cloudflare Workers
- Public frontend URL: Cloudflare Pages at `https://why-cast.pages.dev`
- Backend/frontend alias: the Pages site calls the Worker API at `https://why-cast.ryan-borker.workers.dev`
- Worker frontend delivery: React + Vite build served through Workers Static Assets
- API delivery: Hono routes inside the Worker
- Async pipeline: Cloudflare Workflows

## Local Development
- Preferred command: `make dev`
- Expected local runtime: `npm run build` followed by `wrangler dev`, or `make dev` for the combined watch loop
- Default local port: Wrangler-managed local Worker port (typically `8787`)
- Before changing local ports or adding services, check for collisions.

## Deployment Commands
- Worker deploy: `make deploy`
- Pages frontend alias deploy: `make deploy-pages`
- Pages build helper: `make prepare-pages`
- Pages deploys require `PAGES_API_BASE_URL` to point at the live Worker API if you want the frontend hosted separately from the Worker.

## Planned Bindings
- `D1`: app data, onboarding, shows, episodes, continuity summaries
- `R2`: generated audio and downloadable assets
- `KV`: source cache, prompt fragments, workflow scratch state
- `Durable Objects`: serialized show room state, event log, continuity anchor
- `Workflow`: episode generation orchestration
- Secrets: `OPENAI_API_KEY` configured, `ELEVENLABS_API_KEY` configured, optional `AI_GATEWAY_URL`

## Health and Smoke Checks
- Health endpoint: `GET /api/health`
- Smoke path: create show request -> create episode job -> retrieve episode list -> play demo audio URL
- Last verified deploy: `https://why-cast.ryan-borker.workers.dev`
- Last verified Pages URL: `https://why-cast.pages.dev`
- Last verified version: `873a98cd-87a4-4f98-a37b-0202e7ab0729`
- Last smoke results:
  - `GET /` returned the new React/Vite landing page shell with the WhyCast title and built asset references on 2026-04-02 UTC
  - `GET /api/health` returned `ok: true` plus judge-facing architecture metadata, including active Workflows, on 2026-04-02 UTC
  - `GET /api/config` returned four narrator presets plus `elevenLabsReady: true` on 2026-04-02 UTC
  - `POST /api/shows` returned a Durable Object-backed serialized show with one ready episode, three queued episodes, continuity events, and a multi-API ElevenLabs audio plan on 2026-04-02 UTC
  - `GET /api/shows/:showId` retrieved the same show state from the Durable Object on 2026-04-02 UTC
  - `GET /api/shows/:showId/workflow-demo` returned the prompt bundle, generated draft, editor pass, continuity memory, and workflow stage artifacts on 2026-04-02 UTC
  - `POST /api/shows/:showId/quiz/submit` passed a family quiz and unlocked Episode 2 on 2026-04-02 UTC
  - `POST /api/shows/:showId/generate-live` regenerated Episode 1 through the live OpenAI path on 2026-04-02 UTC
  - `GET /api/narrators/:narratorPresetId/sample` returned real ElevenLabs narrator audio on 2026-04-02 UTC
  - `POST /api/shows/:showId/render-audio` rendered and stored real Episode 1 audio, and `GET /api/shows/:showId/episodes/:episodeId/audio` streamed it back on 2026-04-02 UTC
  - `POST /api/shows -> POST /api/shows/:showId/generate-live -> POST /api/shows/:showId/render-audio` completed successfully end to end on 2026-04-02 UTC after the audio-trimming safeguard was added
  - `GET https://why-cast.pages.dev` returned the Pages-hosted WhyCast frontend on 2026-04-02 UTC
  - `GET https://why-cast.pages.dev/casts/:slug` returned the SPA shell correctly through the Pages `_redirects` fallback on 2026-04-02 UTC
  - `GET https://why-cast.ryan-borker.workers.dev/api/config` with `Origin: https://why-cast.pages.dev` returned `Access-Control-Allow-Origin: *` on 2026-04-02 UTC

## Rollback Path
- Re-deploy the previous Worker version from Cloudflare dashboard or Wrangler deployment history.
- Keep schema changes additive during hackathon window to reduce rollback risk.

## Notes
- Workers Static Assets is the default serving path for this project because Cloudflare recommends Workers, not Pages, for new full-stack projects.
- Current deployed Worker includes a `ShowRoom` Durable Object binding and migration for serialized continuity ownership.
- Audio artifacts are currently stored in Durable Object storage for speed; move them to R2 when we want longer-lived hosted files.
- The landing page now builds into `dist/` via Vite, and Wrangler serves that directory as the asset bundle.
- The new Pages deployment is a frontend alias, not a backend migration: Pages hosts the React app while the existing Worker continues to own API routes, Durable Objects, Workflows, and audio generation.
- Use `.pages-dist/` only as a temporary deploy artifact. The `_redirects` file required by Pages cannot live in the Worker asset bundle because it triggers a Cloudflare redirect validation error there.
