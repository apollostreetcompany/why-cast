import type { Episode, Show } from "../types";
import { getNarratorPreset, type NarratorPreset } from "./narrator-voices";

interface ElevenLabsEnv {
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_MODEL?: string;
}

const MAX_EPISODE_TTS_CHARACTERS = 5000;

export interface AudioArtifact {
  audioBuffer: ArrayBuffer;
  mimeType: string;
  fileExtension: "mp3";
  voiceId: string;
  modelId: string;
  presetId: string;
}

async function synthesizeText(
  env: ElevenLabsEnv,
  preset: NarratorPreset,
  text: string,
  outputFormat = "mp3_44100_128",
): Promise<AudioArtifact> {
  if (!env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not configured.");
  }

  const modelId = env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2";
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${preset.elevenLabsVoiceId}?output_format=${outputFormat}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: preset.elevenLabsVoiceSettings,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ElevenLabs synthesis failed: ${response.status} ${body}`);
  }

  return {
    audioBuffer: await response.arrayBuffer(),
    mimeType: response.headers.get("Content-Type") ?? "audio/mpeg",
    fileExtension: "mp3",
    voiceId: preset.elevenLabsVoiceId,
    modelId,
    presetId: preset.id,
  };
}

function trimEpisodeScriptForAudio(script: string): string {
  const compact = script.replace(/\s+/g, " ").trim();
  if (compact.length <= MAX_EPISODE_TTS_CHARACTERS) {
    return compact;
  }

  const candidate = compact.slice(0, MAX_EPISODE_TTS_CHARACTERS);
  const lastSentenceBreak = Math.max(
    candidate.lastIndexOf(". "),
    candidate.lastIndexOf("! "),
    candidate.lastIndexOf("? "),
  );

  if (lastSentenceBreak >= 1600) {
    return candidate.slice(0, lastSentenceBreak + 1).trim();
  }

  return `${candidate.slice(0, MAX_EPISODE_TTS_CHARACTERS - 3).trim()}...`;
}

export async function synthesizeNarratorSample(
  env: ElevenLabsEnv,
  narratorPresetId: string,
): Promise<AudioArtifact> {
  const preset = getNarratorPreset(narratorPresetId);
  return synthesizeText(env, preset, preset.sampleLine, "mp3_44100_128");
}

export async function synthesizeEpisodeAudio(
  env: ElevenLabsEnv,
  show: Show,
  episode: Episode,
): Promise<AudioArtifact> {
  if (!episode?.script) {
    throw new Error("Selected episode script is not available for audio rendering.");
  }

  const preset = getNarratorPreset(show.narratorPresetId);
  return synthesizeText(env, preset, trimEpisodeScriptForAudio(episode.script), "mp3_22050_32");
}
