# CONTINUITY.md - why-cast

## Goal (incl. success criteria)
Ship an audio-first Cloudflare MVP for why-cast that turns vetted educational sources into 3-5 minute kid-friendly story episodes, with a simple onboarding flow, downloadable audio, and at least one believable serialized-show demo path. Success means we can deploy a working thin slice, generate or mock a first episode flow credibly, and present a tight demo/video narrative for the hackathon.

## Constraints/Assumptions
- Hackathon timebox is approximately 10-12 hours.
- The repo started empty on 2026-04-02.
- UI must stay very simple and mobile-friendly.
- Source trust matters more than breadth; Khan Academy is the initial source set.
- Cloudflare stack should be used prominently and appropriately.
- External LLM and ElevenLabs calls may be stubbed initially if credentials are not ready.

## Key Decisions
1. Start with a single Cloudflare Worker serving both static assets and API routes, because official Cloudflare guidance now recommends Workers Static Assets for new full-stack projects over Pages.
2. Use Durable Objects as the authoritative home for serialized show continuity, event history, and episode handoff state.
3. Use Cloudflare Workflows for the async episode-generation pipeline so we can model long-running multi-step story creation without inventing our own queue orchestration.
4. Make the ElevenLabs story multi-API, not TTS-only: narration, sound effects, and speech-to-text QA/captions.
5. Keep the onboarding surface to five inputs: age(s), episode length, one-off vs serialized, vetted source pack, and story/character prompt.
6. Prioritize a believable thin slice over full curriculum breadth: Khan Academy + history/math/science + 3-5 minute episodes.
7. Use a framework-light frontend for the hackathon MVP to reduce build risk and keep iteration speed high.
8. Use browser speech synthesis as the temporary audio-preview fallback until real ElevenLabs audio generation is wired.
9. Store the first rendered audio artifact in Durable Object storage for the hackathon slice, then move audio persistence to R2 when longer-lived hosting becomes a priority.
10. Expose real ElevenLabs narrator sampling and episode rendering directly through Worker routes so judges can hear the Cloudflare plus ElevenLabs story without leaving the site.
11. Ship the polished landing page as a React + Vite frontend served by the same Worker, while preserving the existing API and demo routes.
12. Trim live-generated scripts before TTS so the hackathon-era Durable Object audio storage path stays reliable until R2 takes over.
13. Simplify the landing page back toward an editorial collage aesthetic: minimal copy, fewer sections, no stack-marketing clutter, and a hero composition that echoes the original paper-cutout reference.
14. New shows should get deterministic four-word public slugs and use those names to derive their Durable Object identity, so a cast can be reopened later at a human-readable URL without adding D1 first.
15. Episode generation and audio rendering should be selection-based, not implicitly pinned to Episode 1, so the UI can clearly target the current script and serialized episodes can be worked on in order.
16. Live generation should enforce spoken-duration budgets and use a non-editing yes/no validator for “compelling” checks; if a draft fails timing or validation, regenerate rather than silently editing it.
17. Episode audio stored in Durable Object SQLite should use a smaller MP3 output format than narrator samples, because full-length 3-5 minute renders can exceed SQLite blob limits at the previous bitrate.

## State

### Done
- [x] Bound RepoPrompt to a dedicated `why-cast` workspace and confirmed the repo was empty.
- [x] Initialized git, created GitHub remote, and started branch `codex/feat/bead-001-foundation`.
- [x] Created canonical project memory files and the adapted why-cast hackathon plan.
- [x] Scaffolded a Cloudflare Worker MVP with static assets, API routes, curated source packs, tests, and a successful Wrangler dry run.
- [x] Bead 001 committed: foundation docs, Worker scaffold, frontend MVP, and story-generation test coverage.
- [x] Deployed the scaffold to Cloudflare Workers and verified `/api/health` plus `POST /api/shows` against production.
- [x] Upgraded show state ownership from in-memory storage to a Durable Object-backed show room model.
- [x] Added judge-facing Cloudflare and multi-API ElevenLabs architecture cues to the live product response and UI.
- [x] Added repo-ready writer, editor, and continuity prompt templates that preserve the requested structure while improving control over quality.
- [x] Added a full workflow demo artifact: prompt bundle, generated draft, editor pass, continuity memory, and step-by-step Cloudflare/ElevenLabs pipeline output.
- [x] Bead 003 committed and deployed: prompt-driven workflow demo artifacts are now exposed by the live API.
- [x] Added Cloudflare Workflow orchestration plus a family quiz gate that unlocks the next serialized episode and supports daily reminder planning.
- [x] Bead 004 committed and deployed: the live API now supports quiz submission, active Workflows, and reminder-oriented feedback loops.
- [x] Added four selectable narrator presets with on-site sample playback.
- [x] Added a real OpenAI-backed `generate-live` route and deployed the required Worker secret.
- [x] Bead 005 committed and deployed: narrator selection and live script regeneration are available in production.
- [x] Added a real ElevenLabs-backed narrator sample route and Episode 1 render-audio route.
- [x] Added Durable Object-backed storage and playback for rendered episode audio artifacts.
- [x] Bead 006 committed and deployed: real server-side narration is available in production.
- [x] Replaced the minimal static page with a polished React + Vite landing page served from the existing Worker.
- [x] Kept the full live demo path working from the landing page: create show, regenerate script, render audio, and stream playback.
- [x] Bead 007 committed and deployed: the production landing page is now demo-ready.
- [x] Bead 008 committed and deployed: the create modal now scrolls correctly on shorter viewports.
- [x] Simplified the landing page hero and demo framing to match the original collage-like vibe, and removed the supplementary Cloudflare-heavy marketing copy and pill clutter from the user-facing experience.
- [x] Bead 009 deployed: the live page now uses a cleaner editorial composition while preserving the real demo flow.
- [x] Added deterministic four-word saved-cast URLs and a slug-based API lookup route that can reopen a show later without D1.
- [x] Switched the live demo into a selected-episode workspace with a full script viewer, clear episode highlighting, and episode-specific generate/render actions.
- [x] Hardened live generation with spoken-duration targeting plus a non-editing compelling validator, and blocked audio renders when the selected draft is too short.
- [x] Lowered stored episode MP3 bitrate so longer renders fit in Durable Object storage again.
- [x] Bead 010 deployed: production now supports slug lookups, episode-specific generate/render flows, and duration-verified narration.

### Now
- Bead 011: wire D1 persistence and async episode status updates under the existing Durable Object and Workflow layer.

### Next
- Add R2-backed audio hosting once longer-lived asset storage matters more than speed.
- Pre-generate showcase stories and capture demo video assets.
- Add the viral promo video assets and embed the final demo cut on the landing page.

## Open Questions
- UNCONFIRMED: which LLM provider should be primary for generation during the hackathon.
- Current MVP answer: episode delivery is mobile web playback first, with downloadable MP3 plus script fallback.
- Current MVP answer: real narration now works for narrator samples and Episode 1, stored in Durable Object storage until R2 is added.
- UNCONFIRMED: whether source ingestion will use direct curated transcripts only or a search/scrape layer in the MVP.

## Working Set
- `/Users/borker/dev/why-cast/AGENTS.md`
- `/Users/borker/dev/why-cast/CONTINUITY.md`
- `/Users/borker/dev/why-cast/HANDOFF.md`
- `/Users/borker/dev/why-cast/MISTAKES.md`
- `/Users/borker/dev/why-cast/DEPLOYMENT.md`
- `/Users/borker/dev/why-cast/README.md`
- `/Users/borker/dev/why-cast/Makefile`
- `/Users/borker/dev/why-cast/docs/plans/2026-04-02-001-feat-why-cast-hackathon-beta-plan.md`
- `/Users/borker/dev/why-cast/src/index.ts`
- `/Users/borker/dev/why-cast/src/durable-objects/show-room.ts`
- `/Users/borker/dev/why-cast/src/lib/audio-stack.ts`
- `/Users/borker/dev/why-cast/src/prompts/story-prompts.ts`
- `/Users/borker/dev/why-cast/src/services/workflow-demo.ts`
- `/Users/borker/dev/why-cast/src/services/story-generator.ts`
- `/Users/borker/dev/why-cast/src/client/WhyCastLanding.tsx`
- `/Users/borker/dev/why-cast/src/client/main.tsx`
- `/Users/borker/dev/why-cast/index.html`
- `/Users/borker/Downloads/EXECUTION-PLAN.md`
- Commands: `npm run build`, `wrangler dev`, `wrangler deploy`, `npm test`, `make dev`, `npx wrangler deploy --dry-run`
- Live URL: `https://why-cast.ryan-borker.workers.dev`
