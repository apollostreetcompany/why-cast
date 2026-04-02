# HANDOFF.md - why-cast

## Current Status
- Workspace scaffold in progress from an empty repo.
- GitHub remote exists at `apollostreetcompany/why-cast`.
- Active branch: `codex/feat/bead-001-foundation`.

## Product Direction
- why-cast is an audio-first educational storytelling app for kids and parents.
- Input flow: age(s), episode length, one-off vs serialized, vetted source pack, story type/characters.
- Output flow: first playable episode fast, follow-up serialized episodes later, downloadable audio.

## Locked Architecture
- Cloudflare Worker with static assets and Hono API
- Cloudflare Workflows for async generation
- D1 for state and continuity
- R2 for audio
- KV for cached source artifacts and prompt state

## Next Execution Priorities
1. Finish the initial plan doc and MVP scope guardrails.
2. Scaffold the Worker app, static UI, and API endpoints.
3. Add D1 schema and mock continuity pipeline.
4. Replace mocks with real LLM + ElevenLabs calls.
5. Deploy and capture demo assets.

## Demo Notes
- Favor a crisp demo with 1-2 excellent episode examples over broad feature surface.
- Video should be built around 5-second scenes with a mix of screen capture and AI-generated cutaways.
