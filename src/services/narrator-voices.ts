export interface NarratorPreset {
  id: string;
  label: string;
  subtitle: string;
  tone: string;
  wordsPerMinute: number;
  sampleLine: string;
  browserVoiceHints: string[];
  elevenLabsVoiceId: string;
  elevenLabsVoiceSettings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
}

export const narratorPresets: NarratorPreset[] = [
  {
    id: "mac-wonder-guide",
    label: "Mac: Wonder Guide",
    subtitle: "Warm, curious, cinematic",
    tone: "Bright narration that feels adventurous and emotionally safe.",
    wordsPerMinute: 126,
    sampleLine:
      "Tonight, we are following a clue so old that even the river remembers it.",
    browserVoiceHints: ["Samantha", "Ava", "Allison"],
    elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM",
    elevenLabsVoiceSettings: {
      stability: 0.42,
      similarity_boost: 0.88,
      style: 0.3,
      use_speaker_boost: true,
    },
  },
  {
    id: "mac-campfire",
    label: "Mac: Campfire Storyteller",
    subtitle: "Rich, grounded, reassuring",
    tone: "A slower storyteller voice with calm authority and warmth.",
    wordsPerMinute: 118,
    sampleLine:
      "Come closer, because this is the kind of story that begins with a whisper and grows into a world.",
    browserVoiceHints: ["Daniel", "Alex", "Aaron"],
    elevenLabsVoiceId: "ErXwobaYiN019PkySvjV",
    elevenLabsVoiceSettings: {
      stability: 0.55,
      similarity_boost: 0.82,
      style: 0.18,
      use_speaker_boost: true,
    },
  },
  {
    id: "mac-playful-spark",
    label: "Mac: Playful Spark",
    subtitle: "Light, quick, energetic",
    tone: "Fast, excited delivery for curious younger listeners.",
    wordsPerMinute: 134,
    sampleLine:
      "Wait, did you hear that? Something important just clicked into place.",
    browserVoiceHints: ["Karen", "Moira", "Siri Female"],
    elevenLabsVoiceId: "EXAVITQu4vr4xnSDxMaL",
    elevenLabsVoiceSettings: {
      stability: 0.36,
      similarity_boost: 0.84,
      style: 0.45,
      use_speaker_boost: true,
    },
  },
  {
    id: "mac-bedtime-deep",
    label: "Mac: Bedtime Deep Dive",
    subtitle: "Soft, soothing, thoughtful",
    tone: "A bedtime-friendly voice that still makes the lesson feel vivid.",
    wordsPerMinute: 112,
    sampleLine:
      "Close your eyes for a moment and picture a river carrying an entire civilization forward.",
    browserVoiceHints: ["Fred", "Tom", "Siri Male"],
    elevenLabsVoiceId: "pNInz6obpgDQGcFmaJgB",
    elevenLabsVoiceSettings: {
      stability: 0.62,
      similarity_boost: 0.76,
      style: 0.1,
      use_speaker_boost: true,
    },
  },
];

export function getNarratorPreset(id: string | undefined): NarratorPreset {
  if (!id) {
    return narratorPresets[0];
  }

  return narratorPresets.find((preset) => preset.id === id) ?? narratorPresets[0];
}
