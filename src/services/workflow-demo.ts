import {
  buildContinuityPrompt,
  buildStoryEditorPrompt,
  buildStoryWriterPrompt,
  type PromptChildProfile,
} from "../prompts/story-prompts";
import type { Show } from "../types";

export interface WorkflowStepDemo {
  stage:
    | "request-accepted"
    | "durable-object"
    | "source-extract"
    | "writer"
    | "editor"
    | "audio-render"
    | "audio-qa"
    | "delivery";
  label: string;
  detail: string;
}

export interface WorkflowDemo {
  childProfiles: PromptChildProfile[];
  promptBundle: {
    writer: string;
    editor: string;
    continuity: string;
  };
  generatedDraft: {
    title: string;
    coldOpen: string;
    fullScript: string;
    lessonRecap: string;
    nextEpisodeHook: string;
  };
  editorPass: {
    editedScript: string;
    factualIntegrityNotes: string[];
    continuityNotes: string[];
    risksOrFixesStillNeeded: string[];
  };
  continuityMemory: {
    continuitySummary: string;
    lessonMemory: string;
    characterState: string;
    nextEpisodeSetup: string;
  };
  workflowSteps: WorkflowStepDemo[];
}

function titleCase(input: string): string {
  return input
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function splitCharacterNames(characters: string): string[] {
  return characters
    .split(/,| and /i)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildChildProfiles(show: Show): PromptChildProfile[] {
  const names = splitCharacterNames(show.characters);

  return show.ages.map((age, index) => ({
    name: names[index] ?? `Listener ${index + 1}`,
    age,
    interests:
      show.sourcePack.subject === "history"
        ? ["mysteries", "maps", "ancient worlds"]
        : show.sourcePack.subject === "science"
          ? ["experiments", "nature", "surprising discoveries"]
          : ["puzzles", "patterns", "sharing fairly"],
    learningStyle: age <= 6 ? "playful and visual" : "story-first with clear explanations",
  }));
}

function buildGeneratedDraft(show: Show, childProfiles: PromptChildProfile[]) {
  const firstEpisode = show.episodes[0];
  const youngest = Math.min(...show.ages);
  const namedKids = childProfiles.map((child) => child.name).join(" and ");
  const source = show.sourcePack;

  return {
    title: `${titleCase(show.storyType)} on the ${source.topic} Trail`,
    coldOpen: `${namedKids} hear the river before they see it, and the sound is carrying a clue no one else has noticed.`,
    fullScript: [
      `Mac lowers his voice and says, "Tonight, ${namedKids} are stepping into ${source.topic}."`,
      `${childProfiles[0]?.name ?? "The older child"} spots that every village, field, and boat seems to bend toward the Nile, while ${childProfiles[1]?.name ?? "the younger child"} notices how alive the river makes everything feel.`,
      `Instead of stopping the story for a lecture, the discovery happens inside the adventure: if the river rises, crops grow; if boats can travel, trade spreads; if fertile soil gathers, cities can stay strong.`,
      `That is the lesson hidden inside the scene: ${source.transcriptExcerpt}`,
      `When the children solve the clue, they realize Ancient Egypt was not random at all. It was shaped by the Nile every single day, from food to movement to community.`,
      `Mac closes the moment with one image a ${youngest}-year-old can hold onto: "The Nile was like a life-giving road made of water."`,
      `Then he asks one question that keeps the story alive: "If a whole kingdom followed one river, what else might the river decide next?"`,
      `The episode stays within ${firstEpisode?.durationTargetSec ? Math.round(firstEpisode.durationTargetSec / 60) : show.durationMinutes} minutes and sounds like a real story, not a lesson plan.`,
    ].join(" "),
    lessonRecap: `Ancient Egypt grew strong because the Nile gave water, rich soil, and a way to travel and trade.`,
    nextEpisodeHook: `In the next episode, the children follow the river deeper and discover how people planned their lives around its changing seasons.`,
  };
}

function buildEditorPass(show: Show, draft: WorkflowDemo["generatedDraft"]) {
  return {
    editedScript: [
      draft.coldOpen,
      draft.fullScript,
      `Recap beat: ${draft.lessonRecap}`,
      `Hook beat: ${draft.nextEpisodeHook}`,
      `Continuity anchor preserved: ${show.continuityAnchor}`,
    ].join(" "),
    factualIntegrityNotes: [
      `The script preserves the source-of-truth claim from ${show.sourcePack.citationLabel}.`,
      "No unsupported historical cause was added beyond the supplied lesson facts.",
    ],
    continuityNotes: [
      "The main characters keep a consistent emotional role between wonder and discovery.",
      "The ending question naturally opens the next serialized episode.",
    ],
    risksOrFixesStillNeeded: [
      "Replace deterministic draft text with live LLM generation before final submission.",
      "Tune final wording for spoken cadence after ElevenLabs voice selection is locked.",
    ],
  };
}

function buildContinuityMemory(show: Show, draft: WorkflowDemo["generatedDraft"]) {
  const firstEpisode = show.episodes[0];

  return {
    continuitySummary: firstEpisode?.continuitySummary ?? show.continuityAnchor,
    lessonMemory: draft.lessonRecap,
    characterState: `${show.characters} end the episode curious, successful, and ready to keep following the lesson trail.`,
    nextEpisodeSetup: `For the next episode, keep the same sense of discovery, briefly review the Nile lesson, then extend the story with one new question about ${show.sourcePack.topic} in the next episode.`,
  };
}

export function buildWorkflowDemo(show: Show): WorkflowDemo {
  const childProfiles = buildChildProfiles(show);
  const context = {
    children: childProfiles,
    show,
    sourcePack: show.sourcePack,
    episodeNumber: 1,
    previousEpisodeSummary: show.mode === "serialized" ? "No previous episode yet. This is the series opener." : "Standalone episode.",
    additionalPreferences: [
      "Keep the story emotionally safe and confidence-building.",
      "Make the educational reveal feel magical but still grounded.",
    ],
  };
  const generatedDraft = buildGeneratedDraft(show, childProfiles);
  const editorPass = buildEditorPass(show, generatedDraft);
  const continuityMemory = buildContinuityMemory(show, generatedDraft);

  return {
    childProfiles,
    promptBundle: {
      writer: buildStoryWriterPrompt(context),
      editor: buildStoryEditorPrompt(context),
      continuity: buildContinuityPrompt(context),
    },
    generatedDraft,
    editorPass,
    continuityMemory,
    workflowSteps: [
      {
        stage: "request-accepted",
        label: "Request accepted at the edge",
        detail: "The Worker validates the onboarding payload and assigns the show to a globally addressable show room.",
      },
      {
        stage: "durable-object",
        label: "Continuity locked in Durable Object",
        detail: "The show room stores the continuity anchor, event log, and serialized handoff state.",
      },
      {
        stage: "source-extract",
        label: "Trusted source extracted",
        detail: `Khan Academy facts are normalized into a teachable story brief for ${show.sourcePack.topic}.`,
      },
      {
        stage: "writer",
        label: "Writer prompt produces story draft",
        detail: "Mac writes a story-first script using the child profiles, show context, and lesson constraints.",
      },
      {
        stage: "editor",
        label: "Editor pass protects quality",
        detail: "A second pass tightens pacing, checks factual integrity, and sharpens the emotional arc.",
      },
      {
        stage: "audio-render",
        label: "ElevenLabs builds the audio stack",
        detail: "Narration and scene texture are rendered as separate steps so the final episode sounds alive.",
      },
      {
        stage: "audio-qa",
        label: "Speech-to-text verifies the final render",
        detail: "A transcript QA pass compares audio against the approved script and produces captions plus continuity notes.",
      },
      {
        stage: "delivery",
        label: "Episode delivered and next beat queued",
        detail: "The first episode is ready for phone playback while the next episode setup is stored for serialized follow-up.",
      },
    ],
  };
}
