# feat: why-cast hackathon MVP

## Plan Metadata
- Date: 2026-04-02
- Plan depth: Deep
- Origin: adapted from `/Users/borker/Downloads/EXECUTION-PLAN.md`
- Working repo: `/Users/borker/dev/why-cast`

## Problem Frame
The source plan is a generic educational lesson generator. why-cast needs a more focused, more believable hackathon story: trusted educational material becomes short kid-friendly narrative podcast episodes, optionally serialized, with continuity and later episode delivery. The winning version is not a broad curriculum platform. It is a clear audio product with a strong demo and obvious Cloudflare architecture.

## Success Criteria
1. A parent can complete a five-input onboarding flow in under a minute.
2. The system can create a show request for one-off or serialized mode.
3. The backend can generate or convincingly mock a first 3-5 minute episode from trusted source material.
4. The user can play and download the resulting episode on a phone.
5. The app can show a believable path to later episodes with continuity memory.
6. The product can be deployed on Cloudflare and demoed live.

## Scope Boundary

### In Scope
- Audio-first onboarding and playback flow
- Khan Academy as the initial vetted source pack
- History, math, and science story wrappers
- One-off and serialized show modes
- Continuity memory and editor-pass architecture
- Cloudflare Worker, D1, R2, KV, and Workflows usage
- Demo-ready video storyboard built around 5-second scenes

### Out of Scope
- Full curriculum graph
- Native mobile app
- Account system beyond a lightweight parent/session record
- Rich source marketplace
- Production-grade notifications and payments

## Requirements Traceability

### From user request
1. Inputs must be: kid age(s), requested length, one-off vs serialized, vetted sources, story type/characters.
2. Source material must begin with trusted transcripts, using Khan Academy first.
3. Episode output must feel like a short story that teaches history, math, or science concepts.
4. Backend must manage continuity and an editor step for coherence.
5. Follow-up episodes should review past concepts and introduce new ones inside the episode time budget.
6. The product should be simple, believable, and deployable quickly.
7. A fast AI video workflow is required for the hackathon demo.

## Architecture Decisions

### 1. Single Worker + Static Assets
Use one Cloudflare Worker as the full-stack entrypoint.

Why:
- Official Cloudflare guidance now favors Workers Static Assets over Pages for new full-stack apps.
- It minimizes deployment surface area and avoids split hosting complexity.
- It keeps API routes and frontend iterations in one project.

Files:
- `src/index.ts`
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `wrangler.jsonc`

### 2. Durable Objects for Serialized Continuity
Use one Durable Object per show as the authoritative "show room."

Responsibilities:
- hold the continuity anchor
- keep the event log for creation, review, and handoff
- serialize follow-up episode state changes
- act as the single writer for show-level memory during the hackathon MVP

Why:
- This maps directly to the organizers' interest in Durable Objects.
- Serialized children's stories naturally want one authoritative owner of continuity.
- It creates a more interesting Cloudflare architecture than a plain stateless API.

Files:
- `src/durable-objects/show-room.ts`
- `src/index.ts`
- `wrangler.jsonc`

### 3. Cloudflare Workflows for Episode Generation
Treat episode creation as an async workflow with explicit stages:
1. Normalize request
2. Resolve source pack
3. Pull or load transcript excerpts
4. Draft episode
5. Run editor/continuity pass
6. Generate audio
7. Persist assets and status

Why:
- This gives the demo a real system story, not a single blocking request.
- It cleanly separates "request received" from "episode ready".
- It makes serialized continuity easier to reason about than ad hoc cron logic.

Files:
- `src/workflows/generateEpisode.ts`
- `src/services/story-generator.ts`
- `src/services/editor.ts`
- `src/services/audio.ts`

### 4. D1 + R2 + KV Responsibilities
- `D1`: source packs, parent sessions, shows, episode requests, continuity summaries, episode metadata
- `R2`: final audio files, optional transcript files, demo assets
- `KV`: cached transcript extracts, prompt blocks, short-lived workflow caches

Why:
- Each storage product maps cleanly to one job and showcases the Cloudflare stack credibly.

### 5. Combine Multiple ElevenLabs APIs
Use at least three ElevenLabs APIs in the hackathon story:
- Text to Speech for narration
- Sound Effects for short scene transitions and emotional texture
- Speech to Text for transcript verification, caption output, and continuity QA after render

Why:
- This responds directly to the organizers' guidance.
- It gives a stronger demo than plain narration alone.
- The transcription pass helps the "editor" concept feel real and technically coherent.

### 6. Start with Curated Source Packs
Do not build broad web search first. Seed curated Khan Academy transcript/excerpt packs for demo topics.

Why:
- Trust and reliability are more important than breadth in the hackathon window.
- Curated inputs reduce hallucination risk and make demos repeatable.
- This still leaves room for a future search/scrape layer.

Files:
- `src/lib/source-packs.ts`
- `data/source-packs/khan/*.json`

## User Flow
1. Parent lands on homepage.
2. Parent sets age or ages.
3. Parent chooses story length: 3, 4, or 5 minutes.
4. Parent chooses one-off or serialized.
5. Parent selects vetted source pack, defaulting to Khan Academy.
6. Parent enters story type and characters.
7. Parent submits and receives a show request confirmation.
8. First episode appears as generating, then playable/downloadable.
9. Serialized mode reveals upcoming episodes and continuity notes.

## Data Model

### Tables
- `parent_sessions`
  - `id`, `created_at`, `child_ages`, `delivery_target`
- `shows`
  - `id`, `parent_session_id`, `mode`, `source_pack_id`, `story_premise`, `status`, `created_at`
- `episodes`
  - `id`, `show_id`, `episode_number`, `title`, `duration_target_sec`, `status`, `script`, `audio_url`, `continuity_summary`, `created_at`
- `source_packs`
  - `id`, `provider`, `topic`, `subject`, `grade_band`, `transcript_excerpt`, `citation_label`
- `episode_jobs`
  - `id`, `show_id`, `episode_id`, `workflow_instance_id`, `status`, `error`, `created_at`

## Implementation Units

### Bead 001: Foundation
- Create required project files and plan documents
- Scaffold Worker, static assets, package config, and minimal health route
- Risk: low

### Bead 002: Request + Persistence Slice
- Build onboarding form submission
- Add D1 schema and create show/episode records
- Return a pending first episode response
- Risk: medium
- Files:
  - `db/migrations/0001_initial.sql`
  - `src/routes/shows.ts`
  - `src/lib/db.ts`
  - `tests/shows.test.ts`

### Bead 003: Mock Episode Pipeline
- Add curated source packs
- Generate deterministic demo script output
- Simulate continuity summary and later episodes
- Risk: medium
- Files:
  - `src/services/story-generator.ts`
  - `src/services/editor.ts`
  - `src/lib/source-packs.ts`
  - `tests/story-generator.test.ts`

### Bead 004: Real Audio + Storage
- Integrate ElevenLabs
- Upload audio to R2
- Make episode playback/download real
- Risk: high
- Files:
  - `src/services/audio.ts`
  - `src/routes/episodes.ts`
  - `tests/audio.test.ts`

### Bead 005: Workflow Orchestration + Deploy
- Move generation to Cloudflare Workflows
- Wire deployment bindings and smoke checks
- Risk: high
- Files:
  - `src/workflows/generateEpisode.ts`
  - `wrangler.jsonc`
  - `DEPLOYMENT.md`

## Validation Strategy

### Code
- `npm run typecheck`
- `npm run test`
- Route-level tests for health and show creation
- Deterministic tests for story generation helpers

### Docs/Process
- Verify canonical files exist
- Check plan paths and command references
- Keep `AGENTS.md`, `CONTINUITY.md`, `HANDOFF.md`, and `DEPLOYMENT.md` aligned

### Deploy/Ops
- `GET /api/health`
- create show -> retrieve episode -> play audio URL
- document rollback path

## Go / No-Go Assessment

### Yes, buildable in the next few hours if we constrain scope
Recommended hackathon cut:
1. One source provider: Khan Academy
2. One delivery surface: mobile web
3. One async path: first episode generation
4. One continuity proof: episode 2 preview with recap memory
5. One polished demo story per subject category

### Things to avoid today
1. Account systems
2. Real-time multi-provider search
3. Native mobile wrappers
4. Complicated scheduling infrastructure
5. Fancy visual design that steals time from the story/audio pipeline

## Demo Video Plan

### 5-second scene board
1. Overwhelmed parent choosing content for a child
2. why-cast onboarding with the five inputs
3. "Khan Academy" vetted source selection
4. Cloudflare-powered generation status
5. Episode player on phone
6. Download action
7. Serialized episode rail showing "Episode 2 coming later"
8. Continuity concept recap card
9. Child-imagination visual cutaway tied to lesson topic
10. Final product logo + Cloudflare + ElevenLabs mention

### Production approach
- Fastest path: real app screen recording + ElevenLabs voiceover + AI-generated cutaways every 5 seconds.
- Keep scene prompts simple and consistent so they can be generated and extended quickly.

## Risks and Tradeoffs
1. Real transcript ingestion may take longer than expected, so seed curated excerpts first.
2. Real async orchestration can slip; a synchronous mocked first version is acceptable if the workflow shape is preserved in code and demo language.
3. TTS latency may be too slow for live demos; cache at least two showcase episodes in advance.
4. The product will be judged more on coherence and credibility than full feature completeness.

## Immediate Recommendation
Proceed with the Cloudflare Worker foundation now, then build the first show request and mock episode pipeline before adding real audio. That sequence gives the highest odds of a live deploy plus a convincing demo inside the hackathon window.
