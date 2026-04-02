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
- `POST /api/shows`
- `GET /api/shows/:showId`
- `GET /api/shows/:showId/workflow-demo`

## Current Limits
- Real D1, R2, Workflows, and ElevenLabs integrations are scaffold targets, not fully wired yet.
- Audio preview currently uses browser speech synthesis while real TTS is added.
