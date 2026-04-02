import type { Show } from "../types";

export interface AudioStackStep {
  name: string;
  provider: string;
  purpose: string;
}

export interface AudioStackPlan {
  headline: string;
  steps: AudioStackStep[];
}

export function buildAudioStackPlan(show: Show): AudioStackPlan {
  return {
    headline: `why-cast uses a multi-step ElevenLabs stack for ${show.mode === "serialized" ? "serialized" : "single"} audio delivery.`,
    steps: [
      {
        name: "Narration",
        provider: "ElevenLabs Text to Speech",
        purpose: `Generate the primary narrator voice for ${show.episodes[0]?.title ?? "the first episode"}.`,
      },
      {
        name: "Scene texture",
        provider: "ElevenLabs Sound Effects",
        purpose: `Add short transitions and world-building cues that match the ${show.storyType.toLowerCase()} tone without overwhelming the lesson.`,
      },
      {
        name: "Transcript QA",
        provider: "ElevenLabs Speech to Text",
        purpose: "Transcribe the rendered episode so the editor can compare the final audio against the approved script, store captions, and keep continuity accurate across later episodes.",
      },
    ],
  };
}
