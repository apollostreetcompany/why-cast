import { buildStoryEditorPrompt, buildStoryWriterPrompt } from "../prompts/story-prompts";
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

interface EditorOutput {
  edited_script: string;
  factual_integrity_notes: string[];
  continuity_notes: string[];
  risks_or_fixes_still_needed: string[];
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

function sanitizeEditedScript(text: string): string {
  return text
    .replace(/^Title:\s.*(?:\r?\n)+/i, "")
    .replace(/(?:^|\n)Cold Open:\s*/gi, "\n")
    .replace(/(?:^|\n)Lesson Recap:\s*/gi, "\nRecap: ")
    .replace(/(?:^|\n)Next Episode Hook:\s*/gi, "\nNext time: ")
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

export async function generateLiveEpisode(env: OpenAIEnv, show: Show): Promise<{
  episode: Partial<Episode>;
  editor: EditorOutput;
}> {
  const narrator = getNarratorPreset(show.narratorPresetId);
  const writerPrompt = buildStoryWriterPrompt({
    hostName: "Mac",
    children: buildChildren(show),
    show,
    sourcePack: show.sourcePack,
    episodeNumber: 1,
    previousEpisodeSummary: "This is the first episode in the series.",
    additionalPreferences: [
      `Narrator delivery style: ${narrator.label} - ${narrator.tone}`,
      "Keep the story memorable enough to anchor a repeat-listen audio experience.",
    ],
  });

  const writerText = await createResponse(
    env,
    writerPrompt,
    [
      "Generate the episode now.",
      "Return only valid JSON.",
      'Use this exact shape: {"title":"...","cold_open":"...","full_script":"...","lesson_recap":"...","next_episode_hook":"..."}',
    ].join(" "),
  );
  const writer = parseJsonBlock<WriterOutput>(writerText);

  const editorPrompt = buildStoryEditorPrompt({
    hostName: "Mac",
    children: buildChildren(show),
    show,
    sourcePack: show.sourcePack,
    episodeNumber: 1,
    previousEpisodeSummary: "This is the first episode in the series.",
    additionalPreferences: [
      `Narrator delivery style: ${narrator.label} - ${narrator.tone}`,
    ],
  });

  const editorText = await createResponse(
    env,
    editorPrompt,
    [
      "Edit the following draft and return only valid JSON.",
      'Use this exact shape: {"edited_script":"...","factual_integrity_notes":["..."],"continuity_notes":["..."],"risks_or_fixes_still_needed":["..."]}',
      "",
      `Title: ${writer.title}`,
      `Cold Open: ${writer.cold_open}`,
      `Full Script: ${writer.full_script}`,
      `Lesson Recap: ${writer.lesson_recap}`,
      `Next Episode Hook: ${writer.next_episode_hook}`,
    ].join("\n"),
  );
  const editor = parseJsonBlock<EditorOutput>(editorText);

  return {
    episode: {
      title: writer.title,
      script: sanitizeEditedScript(editor.edited_script),
      audioUrl: null,
      scriptSource: "openai",
    },
    editor,
  };
}
