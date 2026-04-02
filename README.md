# why-cast

Audio-first educational storytelling for kids, built for a fast Cloudflare + ElevenLabs hackathon sprint.

## Current MVP
- Five-input onboarding flow
- Curated Khan Academy source packs
- One-off and serialized show modes
- Deterministic first-episode generation
- Static frontend + Hono API on Cloudflare Workers
- Durable Object-backed show room state for serialized continuity
- Judge-facing plan for ElevenLabs Text to Speech, Sound Effects, and Speech to Text
- Real ElevenLabs narrator samples and Episode 1 audio rendering
- Prompt bundle, editor pass, continuity memory, and workflow demo artifacts via API
- Quiz-gated episode unlock loop for families
- Cloudflare Workflows for show pipeline orchestration and reminder planning

## Quick Start
1. `make install`
2. `make dev`
3. Open the local Wrangler URL

## Validation
- `make typecheck`
- `make test`

## Demo API
- `GET /api/health`
- `GET /api/narrators`
- `GET /api/narrators/:narratorPresetId/sample`
- `POST /api/shows`
- `GET /api/shows/:showId`
- `GET /api/shows/:showId/workflow-demo`
- `POST /api/shows/:showId/generate-live`
- `POST /api/shows/:showId/render-audio`
- `GET /api/shows/:showId/episodes/:episodeId/audio`
- `POST /api/shows/:showId/quiz/submit`

## Current Limits
- D1 and R2 are still the next storage layer to wire for production persistence and hosted audio files.
- Audio artifacts currently live in Durable Object storage, which is good enough for the hackathon slice but not the long-term hosting layer.
- Episode 2+ generation is still gated/planned, not fully automated with live model plus audio rendering yet.
