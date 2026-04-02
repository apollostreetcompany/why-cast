export type StoryMode = "one-off" | "serialized";

export interface SourcePack {
  id: string;
  provider: string;
  topic: string;
  subject: "science" | "math" | "history";
  citationLabel: string;
  transcriptExcerpt: string;
  concept: string;
}

export interface ShowRequest {
  ages: number[];
  durationMinutes: 3 | 4 | 5;
  mode: StoryMode;
  sourcePackId: string;
  storyType: string;
  characters: string;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  subject: SourcePack["subject"];
  status: "ready" | "queued";
  durationTargetSec: number;
  learningGoal: string;
  continuitySummary: string;
  script: string;
  citationLabel: string;
  audioUrl: string | null;
}

export interface StoryEvent {
  id: string;
  type:
    | "show-created"
    | "continuity-locked"
    | "episode-queued"
    | "audio-stack-planned"
    | "episode-reviewed";
  detail: string;
  timestamp: string;
}

export interface Show {
  id: string;
  mode: StoryMode;
  ages: number[];
  durationMinutes: number;
  storyType: string;
  characters: string;
  sourcePack: SourcePack;
  createdAt: string;
  episodes: Episode[];
  continuityAnchor: string;
  judgeNotes: {
    cloudflare: string[];
    elevenlabs: string[];
  };
  events: StoryEvent[];
}
