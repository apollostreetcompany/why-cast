import type { Show } from "../types";
import { getNarratorPreset, type NarratorPreset } from "./narrator-voices";

interface ElevenLabsEnv {
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_MODEL?: string;
}

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
): Promise<AudioArtifact> {
  if (!env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not configured.");
  }

  const modelId = env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2";
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${preset.elevenLabsVoiceId}?output_format=mp3_44100_128`,
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

export async function synthesizeNarratorSample(
  env: ElevenLabsEnv,
  narratorPresetId: string,
): Promise<AudioArtifact> {
  const preset = getNarratorPreset(narratorPresetId);
  return synthesizeText(env, preset, preset.sampleLine);
}

export async function synthesizeEpisodeAudio(
  env: ElevenLabsEnv,
  show: Show,
): Promise<AudioArtifact> {
  const episode = show.episodes.find((item) => item.episodeNumber === 1) ?? show.episodes[0];

  if (!episode?.script) {
    throw new Error("Episode 1 script is not available for audio rendering.");
  }

  const preset = getNarratorPreset(show.narratorPresetId);
  return synthesizeText(env, preset, episode.script);
}
