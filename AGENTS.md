# AGENTS.md - why-cast

## 1. Mission (North Star)
Build an audio-first hackathon MVP that turns trusted educational source material into short serialized podcast episodes for kids and parents.

Goals:
1. Ship a believable Cloudflare-first MVP in hours, not days.
2. Generate 3-5 minute episodes from vetted source material, starting with Khan Academy.
3. Keep the UI extremely simple: three buttons and two short text flows.
4. Support both one-off stories and serialized shows with continuity memory.
5. Deliver playable and downloadable audio quickly, with room for follow-up episodes.
6. Produce a strong demo story and a fast-cut promo video that shows the concept clearly.

## 2. Core Architecture
Planned repo structure:

```text
why-cast/
├── public/                  # Simple static UI served by Workers assets
├── src/
│   ├── index.ts             # Hono Worker entrypoint
│   ├── lib/                 # Env, prompts, source normalization, utilities
│   ├── routes/              # API routes
│   ├── workflows/           # Cloudflare Workflows orchestration
│   └── services/            # Episode generation, continuity, audio delivery
├── db/
│   └── migrations/          # D1 schema
├── docs/
│   └── plans/               # Planning artifacts
├── handoff/
│   ├── beads.jsonl
│   └── beads.schema.json
├── AGENTS.md
├── CONTINUITY.md
├── DEPLOYMENT.md
├── HANDOFF.md
├── MISTAKES.md
└── Makefile
```

Runtime architecture:

```text
Phone/Web UI -> Cloudflare Worker + Static Assets
             -> Hono API routes
             -> Cloudflare Workflows for async episode pipeline
             -> D1 for shows, episodes, onboarding, continuity
             -> R2 for generated audio and downloadable assets
             -> KV for source extract cache / prompt cache
             -> External LLM + ElevenLabs APIs
```

## 3. Tech Stack
| Layer | Choice | Specifics |
|---|---|---|
| Frontend | Static HTML/CSS/JS first | Simple onboarding and episode playback UI, no framework required for MVP |
| Edge App | Cloudflare Workers + Hono | TypeScript Worker with static asset binding and JSON API |
| Async Orchestration | Cloudflare Workflows | Long-running episode generation and serialized continuity pipeline |
| Database | Cloudflare D1 | Shows, episodes, source packs, onboarding, episode status, continuity summaries |
| Blob Storage | Cloudflare R2 | Audio files, transcripts, demo assets |
| Cache | Cloudflare KV | Cached source extracts, prompt fragments, temporary episode state |
| AI Generation | External LLM via Worker fetch | Story generation, editor pass, continuity summaries |
| TTS | ElevenLabs | Episode voice generation |
| Tooling | Wrangler, TypeScript, Vitest | Local dev, deployment, tests |
| CI/CD | GitHub + Wrangler deploy | Required checks before merge once CI is added |

## 4. Agent and Sub-Agent Profiles

### Hybrid Agent Selection Policy (Mandatory)

Default behavior:
- Use contextual/dynamic agent selection for low-risk and single-domain beads.

Hard guardrails (must override dynamic choice):
- If bead changes schema/migrations, auth/policy/security logic, public API contracts, or deployment/runtime:
  - Required path: Architect review -> domain Engineer implementation -> Analyst review.
- If bead includes Figma URL/node or visual parity requirement:
  - Required implementer: Frontend Engineer with Figma tool access.
- If bead touches deploy targets (Render/Vercel/infra config):
  - Required implementer: DevOps Engineer (or equivalent deploy specialist).

Selection protocol per bead:
1. Primary agent chosen by context.
2. Record selection rationale in bead summary. Required fields: chosen agent; why chosen; confidence (low/medium/high); fallback agent.
3. If confidence is low or bead spans multiple domains: split bead or escalate to Architect before implementation.

Non-negotiable:
- Dynamic selection cannot bypass hard guardrails.

Current working profile for this hackathon:
- Primary agent: Product/Platform Engineer
- Why: empty repo, fast MVP architecture, Cloudflare-first stack, and UX simplification
- Confidence: high
- Fallback agent: Frontend Engineer for UI polish, DevOps Engineer for deployment hardening

## 5. Branching & Commits
Convention: `<type>(bead-N): description`
Types: feat, optimization, fix, test, docs, chore.

Branch naming:
- `codex/feat/bead-N-description`
- `codex/fix/bead-N-description`
- `codex/chore/bead-N-description`

Repository policy:
- GitHub remote: `https://github.com/apollostreetcompany/why-cast`
- No direct commits to `main`
- Squash merge only
- Push after every bead

## 6. Continuity Ledger
Protocol for `CONTINUITY.md`:
- Read/update every turn.
- Exact format with headings.
- Beads vs Ledger distinction.
- Ledger Snapshot in replies.
- UNCONFIRMED for gaps.

Additional ledger rules:
- Append decisions only; do not rewrite history.
- Note tradeoffs when choosing speed over completeness.
- Track demo-critical assets separately from product-critical assets.

## 7. Workflow

### Bead Entry Gate (Mandatory)

Before implementation starts:
1. Bead scope and acceptance tests are explicit.
2. Agent selected using Hybrid Agent Selection Policy.
3. Required tools declared (RepoPrompt, Context7, Wrangler, Cloudflare docs, etc.).
4. Risk class declared as one of: `Low` (single-domain, no contract/security/deploy impact); `Medium` (multi-file/domain, no hard-guardrail impact); `High` (any hard-guardrail triggered).

If missing, bead is not started.

### Bead Exit Gate (Mandatory)

Before bead is marked complete:
1. Required tests pass for risk class.
2. Reviewer checklist completed (completeness, quality, consistency, tests, security).
3. `CONTINUITY.md` updated.
4. `handoff/beads.jsonl` updated.
5. Chat bead summary posted.

Hackathon operating rule:
- Prefer a working thin slice over a broad unfinished surface area.
- First deploy goal: onboarding -> show request -> episode job created -> playable demo output.

## 8. Orchestration

### Spawn Contract (Mandatory)

Each spawned agent prompt must include:
1. Owned files/paths.
2. In-scope and out-of-scope work.
3. Required tools and constraints.
4. Acceptance tests and expected outputs.
5. Report must include: changes made; test commands/results; assumptions/risks; follow-up recommendations.

### Escalation Rules

Architect sign-off required before implementation if:
1. Public API shape changes.
2. Data schema/migration changes.
3. Policy/security model semantics change.
4. Deployment architecture/runtime behavior changes.
