import { buildContinuitySummary, buildEpisodeTitle, buildLearningGoal, buildQueuedEpisodePreview } from "./editor";
import { buildNotificationPlan, buildUnlockQuiz, buildWorkflowRuntime } from "./feedback-loop";
import { analyzeScriptTiming } from "../lib/script-metrics";
import { generateShowSlug } from "../lib/show-slugs";
import { getSourcePack } from "../lib/source-packs";
import { getNarratorPreset } from "./narrator-voices";
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
  const storyHook = buildStoryHook(sourcePack, request);

  return [
    `Welcome to why-cast. ${agesLine}`,
    `Tonight's ${request.storyType} begins when ${storyHook}`,
    `${request.characters} notice one strange detail right away, and Mac asks them to follow it instead of rushing past it.`,
    `The lesson thread comes from ${sourcePack.citationLabel}, so every reveal stays grounded in a trusted idea about ${sourcePack.topic}.`,
    `The key fact under the adventure is this: ${sourcePack.transcriptExcerpt}`,
    `Mac turns that fact into a scene the children can picture, asks them to say the big idea out loud, and then tests it with one concrete example inside the story world.`,
    `Instead of lecturing, the narrator keeps the pace moving with one discovery, one reaction, and one small question that helps the lesson stick.`,
    `Before the end, ${request.characters} repeat what they learned in simple words and connect it to something a kid can imagine seeing with their own eyes.`,
    `The episode closes with a quick recap and one curiosity hook so the next part of the series has somewhere real to go.`,
  ].join(" ");
}

function buildReadyEpisode(request: ShowRequest, sourcePack: SourcePack): Episode {
  const narrator = getNarratorPreset(request.narratorPresetId);
  const script = buildScript(sourcePack, request);
  const timing = analyzeScriptTiming(script, request.durationMinutes, narrator.wordsPerMinute);

  return {
    id: createId("ep"),
    episodeNumber: 1,
    title: buildEpisodeTitle(sourcePack, request, 1),
    subject: sourcePack.subject,
    status: "ready",
    durationTargetSec: request.durationMinutes * 60,
    learningGoal: buildLearningGoal(sourcePack, request.ages),
    continuitySummary: buildContinuitySummary(request, sourcePack, 1),
    script,
    citationLabel: sourcePack.citationLabel,
    audioUrl: null,
    scriptSource: "template",
    wordCount: timing.wordCount,
    estimatedDurationSec: timing.estimatedDurationSec,
    durationCompliance: timing.durationCompliance,
  };
}

export function createShow(request: ShowRequest, explicitId?: string, explicitSlug?: string): Show {
  const sourcePack = getSourcePack(request.sourcePackId);
  const slug = explicitSlug ?? generateShowSlug();
  const firstEpisode = buildReadyEpisode(request, sourcePack);
  const queuedEpisodes =
    request.mode === "serialized"
      ? [
          buildQueuedEpisodePreview(request, sourcePack, 2, "quiz-locked"),
          buildQueuedEpisodePreview(request, sourcePack, 3, "queued"),
          buildQueuedEpisodePreview(request, sourcePack, 4, "queued"),
        ]
      : [];

  const show: Show = {
    id: explicitId ?? createId("show"),
    slug,
    mode: request.mode,
    ages: request.ages,
    durationMinutes: request.durationMinutes,
    storyType: request.storyType,
    characters: request.characters,
    narratorPresetId: request.narratorPresetId,
    sourcePack,
    createdAt: new Date().toISOString(),
    episodes: [firstEpisode, ...queuedEpisodes],
    continuityAnchor:
      request.mode === "serialized"
        ? `Keep ${request.characters} emotionally stable, recap the last concept in one beat, and thread ${sourcePack.topic} through the next reveal.`
        : `Keep the episode self-contained and end with one memorable recap of ${sourcePack.topic}.`,
    unlockQuiz: buildUnlockQuiz(request, sourcePack),
    notificationPlan: null,
    workflowRuntime: null,
    judgeNotes: {
      cloudflare: [
        "Workers handle the API and static UI at the edge.",
        "Durable Objects keep serialized show continuity in one authoritative place.",
        "Workflows orchestrate generation, reminders, and delivery steps around each show.",
      ],
      elevenlabs: [
        "Text to Speech for narration.",
        "Sound Effects for scene transitions and world texture.",
        "Speech to Text for transcript QA, captions, and continuity verification.",
      ],
    },
    events: []
  };

  return {
    ...show,
    notificationPlan: buildNotificationPlan(show),
    workflowRuntime: buildWorkflowRuntime(show),
  };
}

export function hydrateShow(show: Show, events: StoryEvent[]): Show {
  return {
    ...show,
    events,
  };
}
