import {
  buildStoryCompellingValidatorPrompt,
  buildStoryWriterPrompt,
} from "../prompts/story-prompts";
import { analyzeScriptTiming } from "../lib/script-metrics";
import { getNarratorPreset } from "./narrator-voices";
import type { Episode, Show } from "../types";

interface OpenAIEnv {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
}

interface WriterOutput {
  title: string;
  cold_open: string;
  full_script: string;
  lesson_recap: string;
  next_episode_hook: string;
}

interface CompellingCheckOutput {
  isCompelling: boolean;
  reason: string;
}

function pickString(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string") {
      return value;
    }
  }

  return "";
}

function splitCharacterNames(characters: string): string[] {
  return characters
    .split(/,| and /i)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildChildren(show: Show) {
  const names = splitCharacterNames(show.characters);
  return show.ages.map((age, index) => ({
    name: names[index] ?? `Listener ${index + 1}`,
    age,
    interests:
      show.sourcePack.subject === "history"
        ? ["mysteries", "maps", "ancient worlds"]
        : show.sourcePack.subject === "science"
          ? ["experiments", "nature", "discoveries"]
          : ["puzzles", "patterns", "sharing fairly"],
    learningStyle: age <= 6 ? "playful and visual" : "story-first with clear explanations",
  }));
}

function extractText(responseJson: any): string {
  if (typeof responseJson.output_text === "string" && responseJson.output_text.length > 0) {
    return responseJson.output_text;
  }

  const output = Array.isArray(responseJson.output) ? responseJson.output : [];
  const chunks: string[] = [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const block of content) {
      if (typeof block?.text === "string") {
        chunks.push(block.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function parseJsonBlock<T>(text: string): T {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? text;
  return JSON.parse(raw.trim()) as T;
}

function normalizeWriterOutput(output: Record<string, unknown>): WriterOutput {
  return {
    title: pickString(output, "title", "Title"),
    cold_open: pickString(output, "cold_open", "coldOpen", "Cold Open"),
    full_script: pickString(output, "full_script", "fullScript", "Full Script"),
    lesson_recap: pickString(output, "lesson_recap", "lessonRecap", "Lesson Recap"),
    next_episode_hook: pickString(
      output,
      "next_episode_hook",
      "nextEpisodeHook",
      "Next Episode Hook",
    ),
  };
}

function normalizeCompellingCheck(output: Record<string, unknown>): CompellingCheckOutput {
  return {
    isCompelling:
      typeof output.is_compelling === "boolean"
        ? output.is_compelling
        : typeof output.isCompelling === "boolean"
          ? output.isCompelling
          : false,
    reason: pickString(output, "reason", "Reason"),
  };
}

function buildPreviousEpisodeSummary(show: Show, episodeNumber: number): string {
  if (episodeNumber <= 1) {
    return "This is the first episode in the series.";
  }

  const previousEpisode = show.episodes.find((episode) => episode.episodeNumber === episodeNumber - 1);
  if (!previousEpisode) {
    return "The previous episode summary was unavailable. Keep continuity gentle and clear.";
  }

  return `${previousEpisode.title}. ${previousEpisode.continuitySummary}`;
}

function buildSpokenScript(writer: WriterOutput): string {
  return [
    writer.cold_open.trim(),
    writer.full_script.trim(),
    `Recap: ${writer.lesson_recap.trim()}`,
    `Next time: ${writer.next_episode_hook.trim()}`,
  ]
    .filter(Boolean)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function createResponse(
  env: OpenAIEnv,
  instructions: string,
  input: string,
): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL ?? "gpt-4.1",
      instructions,
      input,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI response failed: ${response.status} ${body}`);
  }

  const json = await response.json<any>();
  return extractText(json);
}

export async function generateLiveEpisode(
  env: OpenAIEnv,
  show: Show,
  episodeId: string,
): Promise<{
  episode: Partial<Episode>;
  validation: CompellingCheckOutput;
  attempts: number;
}> {
  const targetEpisode = show.episodes.find((episode) => episode.id === episodeId);
  if (!targetEpisode) {
    throw new Error("Episode not found for live generation.");
  }

  const narrator = getNarratorPreset(show.narratorPresetId);
  const previousEpisodeSummary = buildPreviousEpisodeSummary(show, targetEpisode.episodeNumber);
  const targetWords = Math.round(show.durationMinutes * narrator.wordsPerMinute);
  const minWords = Math.round(targetWords * 0.88);
  const maxWords = Math.round(targetWords * 1.16);

  const writerPrompt = buildStoryWriterPrompt({
    hostName: "Mac",
    children: buildChildren(show),
    show,
    sourcePack: show.sourcePack,
    episodeNumber: targetEpisode.episodeNumber,
    previousEpisodeSummary,
    additionalPreferences: [
      `Narrator delivery style: ${narrator.label} - ${narrator.tone}`,
      `Aim for roughly ${targetWords} spoken words, with an acceptable range of ${minWords} to ${maxWords} words.`,
      `The finished script must sound like a real ${show.durationMinutes}-minute performance for ${narrator.label}.`,
      "Keep the story memorable enough to anchor a repeat-listen audio experience.",
    ],
  });

  let lastWriter: WriterOutput | null = null;
  let lastTiming = null as ReturnType<typeof analyzeScriptTiming> | null;
  let attempts = 0;

  while (attempts < 3) {
    attempts += 1;
    const writerText = await createResponse(
      env,
      writerPrompt,
      [
        "Generate the episode now.",
        "Return only valid JSON.",
        'Use this exact shape: {"title":"...","cold_open":"...","full_script":"...","lesson_recap":"...","next_episode_hook":"..."}',
        `Episode target: ${show.durationMinutes} minutes spoken aloud.`,
        `Spoken word budget: ${minWords}-${maxWords} words.`,
        attempts > 1 && lastTiming
          ? `Previous attempt was ${lastTiming.durationCompliance}. Retry with a script that lands inside the word budget.`
          : "Hit the word budget on this attempt.",
      ].join(" "),
    );
    const writer = normalizeWriterOutput(parseJsonBlock<Record<string, unknown>>(writerText));
    const script = buildSpokenScript(writer);
    const timing = analyzeScriptTiming(script, show.durationMinutes, narrator.wordsPerMinute);

    lastWriter = writer;
    lastTiming = timing;

    if (timing.durationCompliance === "pass") {
      break;
    }
  }

  if (!lastWriter || !lastTiming) {
    throw new Error("Live generation did not produce a usable script.");
  }

  if (lastTiming.durationCompliance !== "pass") {
    throw new Error(
      `Generated script missed the spoken-time target for a ${show.durationMinutes}-minute episode. Please regenerate.`,
    );
  }

  const finalScript = buildSpokenScript(lastWriter);
  const validatorPrompt = buildStoryCompellingValidatorPrompt({
    hostName: "Mac",
    children: buildChildren(show),
    show,
    sourcePack: show.sourcePack,
    episodeNumber: targetEpisode.episodeNumber,
    previousEpisodeSummary,
    additionalPreferences: [
      `Narrator delivery style: ${narrator.label} - ${narrator.tone}`,
      `This script currently lands at about ${lastTiming.estimatedDurationSec} seconds, which matches the time target.`,
    ],
  });

  const validatorText = await createResponse(
    env,
    validatorPrompt,
    [
      "Judge the script as written.",
      "Return only valid JSON.",
      "",
      finalScript,
    ].join("\n"),
  );
  const validation = normalizeCompellingCheck(
    parseJsonBlock<Record<string, unknown>>(validatorText),
  );

  return {
    episode: {
      title: lastWriter.title,
      status: "ready",
      script: finalScript,
      audioUrl: null,
      scriptSource: "openai",
      wordCount: lastTiming.wordCount,
      estimatedDurationSec: lastTiming.estimatedDurationSec,
      durationCompliance: lastTiming.durationCompliance,
      compelling: validation.isCompelling,
      compellingReason: validation.reason,
    },
    validation,
    attempts,
  };
}
