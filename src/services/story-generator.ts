import { buildContinuitySummary, buildEpisodeTitle, buildLearningGoal, buildQueuedEpisodePreview } from "./editor";
import { getSourcePack } from "../lib/source-packs";
import type { Episode, Show, ShowRequest, SourcePack, StoryEvent } from "../types";

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function buildStoryHook(sourcePack: SourcePack, request: ShowRequest): string {
  if (sourcePack.subject === "science") {
    return `${request.characters} discover a glowing greenhouse map that only lights up when they explain what the plants are doing.`;
  }

  if (sourcePack.subject === "math") {
    return `${request.characters} must split a treasure pie fairly before the moon clock runs out.`;
  }

  return `${request.characters} drift along the Nile on a story boat and learn why an entire kingdom grew beside one river.`;
}

function buildScript(sourcePack: SourcePack, request: ShowRequest): string {
  const agesLine =
    request.ages.length === 1
      ? `This story is tuned for a ${request.ages[0]}-year-old listener.`
      : `This story is tuned for listeners ages ${request.ages.join(", ")}.`;

  return [
    `Welcome to why-cast. ${agesLine}`,
    `Tonight's ${request.storyType} begins when ${buildStoryHook(sourcePack, request)}`,
    `The lesson thread comes from ${sourcePack.citationLabel}. It teaches ${sourcePack.concept}.`,
    `Trusted fact: ${sourcePack.transcriptExcerpt}`,
    `In the story, the characters test the idea in one small scene, repeat the key concept out loud, and connect it to something a kid can picture right away.`,
    `Before the end, the narrator reviews the big idea one more time and asks a tiny recall question so the next episode has something to build on.`,
    `That gives us a ${request.durationMinutes}-minute episode that feels like story first, but still stays grounded in the source.`
  ].join(" ");
}

function buildReadyEpisode(request: ShowRequest): Episode {
  const sourcePack = getSourcePack(request.sourcePackId);

  return {
    id: createId("ep"),
    episodeNumber: 1,
    title: buildEpisodeTitle(sourcePack, request, 1),
    subject: sourcePack.subject,
    status: "ready",
    durationTargetSec: request.durationMinutes * 60,
    learningGoal: buildLearningGoal(sourcePack, request.ages),
    continuitySummary: buildContinuitySummary(request, sourcePack, 1),
    script: buildScript(sourcePack, request),
    citationLabel: sourcePack.citationLabel,
    audioUrl: null
  };
}

export function createShow(request: ShowRequest): Show {
  const sourcePack = getSourcePack(request.sourcePackId);
  const firstEpisode = buildReadyEpisode(request);
  const queuedEpisodes =
    request.mode === "serialized"
      ? [2, 3, 4].map((episodeNumber) =>
          buildQueuedEpisodePreview(request, sourcePack, episodeNumber),
        )
      : [];

  return {
    id: createId("show"),
    mode: request.mode,
    ages: request.ages,
    durationMinutes: request.durationMinutes,
    storyType: request.storyType,
    characters: request.characters,
    sourcePack,
    createdAt: new Date().toISOString(),
    episodes: [firstEpisode, ...queuedEpisodes],
    continuityAnchor:
      request.mode === "serialized"
        ? `Keep ${request.characters} emotionally stable, recap the last concept in one beat, and thread ${sourcePack.topic} through the next reveal.`
        : `Keep the episode self-contained and end with one memorable recap of ${sourcePack.topic}.`,
    judgeNotes: {
      cloudflare: [
        "Workers handle the API and static UI at the edge.",
        "Durable Objects keep serialized show continuity in one authoritative place.",
        "Workflows are the planned async engine for generation, editing, and delivery.",
      ],
      elevenlabs: [
        "Text to Speech for narration.",
        "Sound Effects for scene transitions and world texture.",
        "Speech to Text for transcript QA, captions, and continuity verification.",
      ],
    },
    events: []
  };
}

export function hydrateShow(show: Show, events: StoryEvent[]): Show {
  return {
    ...show,
    events,
  };
}
