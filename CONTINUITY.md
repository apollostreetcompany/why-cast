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
2. Use Cloudflare Workflows for the async episode-generation pipeline so we can model long-running multi-step story creation without inventing our own queue orchestration.
3. Keep the onboarding surface to five inputs: age(s), episode length, one-off vs serialized, vetted source pack, and story/character prompt.
4. Prioritize a believable thin slice over full curriculum breadth: Khan Academy + history/math/science + 3-5 minute episodes.
5. Use a framework-light frontend for the hackathon MVP to reduce build risk and keep iteration speed high.
6. Use browser speech synthesis as the temporary audio-preview fallback until real ElevenLabs audio generation is wired.

## State

### Done
- [x] Bound RepoPrompt to a dedicated `why-cast` workspace and confirmed the repo was empty.
- [x] Initialized git, created GitHub remote, and started branch `codex/feat/bead-001-foundation`.
- [x] Created canonical project memory files and the adapted why-cast hackathon plan.
- [x] Scaffolded a Cloudflare Worker MVP with static assets, API routes, curated source packs, tests, and a successful Wrangler dry run.
- [x] Bead 001 committed: foundation docs, Worker scaffold, frontend MVP, and story-generation test coverage.
- [x] Deployed the scaffold to Cloudflare Workers and verified `/api/health` plus `POST /api/shows` against production.

### Now
- Bead 002: wire D1-backed show persistence and replace the in-memory demo store.

### Next
- Add a mock or real async workflow path for episode generation status updates.
- Wire real LLM + ElevenLabs integrations and deploy.
- Pre-generate showcase stories and capture demo video assets.

## Open Questions
- UNCONFIRMED: which LLM provider should be primary for generation during the hackathon.
- Current MVP answer: episode delivery is mobile web playback first, with download/script fallback until real audio generation is wired.
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
- `/Users/borker/dev/why-cast/src/services/story-generator.ts`
- `/Users/borker/dev/why-cast/public/index.html`
- `/Users/borker/Downloads/EXECUTION-PLAN.md`
- Commands: `wrangler dev`, `wrangler deploy`, `npm test`, `make dev`, `npx wrangler deploy --dry-run`
- Live URL: `https://why-cast.ryan-borker.workers.dev`
