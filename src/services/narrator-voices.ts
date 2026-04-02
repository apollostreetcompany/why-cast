export interface NarratorPreset {
  id: string;
  label: string;
  subtitle: string;
  tone: string;
  sampleLine: string;
  browserVoiceHints: string[];
}

export const narratorPresets: NarratorPreset[] = [
  {
    id: "mac-wonder-guide",
    label: "Mac: Wonder Guide",
    subtitle: "Warm, curious, cinematic",
    tone: "Bright narration that feels adventurous and emotionally safe.",
    sampleLine:
      "Tonight, we are following a clue so old that even the river remembers it.",
    browserVoiceHints: ["Samantha", "Ava", "Allison"],
  },
  {
    id: "mac-campfire",
    label: "Mac: Campfire Storyteller",
    subtitle: "Rich, grounded, reassuring",
    tone: "A slower storyteller voice with calm authority and warmth.",
    sampleLine:
      "Come closer, because this is the kind of story that begins with a whisper and grows into a world.",
    browserVoiceHints: ["Daniel", "Alex", "Aaron"],
  },
  {
    id: "mac-playful-spark",
    label: "Mac: Playful Spark",
    subtitle: "Light, quick, energetic",
    tone: "Fast, excited delivery for curious younger listeners.",
    sampleLine:
      "Wait, did you hear that? Something important just clicked into place.",
    browserVoiceHints: ["Karen", "Moira", "Siri Female"],
  },
  {
    id: "mac-bedtime-deep",
    label: "Mac: Bedtime Deep Dive",
    subtitle: "Soft, soothing, thoughtful",
    tone: "A bedtime-friendly voice that still makes the lesson feel vivid.",
    sampleLine:
      "Close your eyes for a moment and picture a river carrying an entire civilization forward.",
    browserVoiceHints: ["Fred", "Tom", "Siri Male"],
  },
];

export function getNarratorPreset(id: string | undefined): NarratorPreset {
  if (!id) {
    return narratorPresets[0];
  }

  return narratorPresets.find((preset) => preset.id === id) ?? narratorPresets[0];
}
