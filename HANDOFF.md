# HANDOFF.md - why-cast

## Current Status
- Cloudflare Worker MVP is live at `https://why-cast.ryan-borker.workers.dev`.
- GitHub remote exists at `apollostreetcompany/why-cast`.
- Active branch: `codex/feat/bead-001-foundation`.
- Real OpenAI-backed script generation and real ElevenLabs-backed Episode 1 narration are deployed.
- The production landing page is now a polished React + Vite frontend served by the same Worker.

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
1. Add D1 persistence under the Durable Object and workflow layer.
2. Move hosted audio to R2 when longer-lived assets matter more than speed.
3. Pre-generate 2-3 showcase stories and capture demo assets.
4. Cut the fast 5-second-scene promo video.

## Demo Notes
- Favor a crisp demo with 1-2 excellent episode examples over broad feature surface.
- Video should be built around 5-second scenes with a mix of screen capture and AI-generated cutaways.
- Judges can now hear narrator samples and rendered show audio directly from the site.
- The current live demo path from the landing page is: open modal -> create serialized Ancient Egypt show -> generate live script -> render studio audio.
