export type StoryMode = "one-off" | "serialized";
export type EpisodeStatus = "ready" | "queued" | "quiz-locked";

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
  narratorPresetId?: string;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  subject: SourcePack["subject"];
  status: EpisodeStatus;
  durationTargetSec: number;
  learningGoal: string;
  continuitySummary: string;
  script: string;
  citationLabel: string;
  audioUrl: string | null;
  audioMimeType?: string;
  audioSource?: "elevenlabs";
  scriptSource?: "template" | "openai";
}

export interface UnlockQuiz {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  unlocksEpisodeNumber: number;
  attemptCount: number;
  passed: boolean;
  lastSelectedOptionIndex: number | null;
}

export interface NotificationPlan {
  channel: "daily-email";
  cadence: string;
  subject: string;
  preview: string;
  gate: string;
}

export interface WorkflowRuntime {
  pipelineInstanceId: string;
  pipelineStatus: string;
  reminderInstanceId: string | null;
  reminderStatus: string;
}

export interface StoryEvent {
  id: string;
  type:
    | "show-created"
    | "continuity-locked"
    | "episode-queued"
    | "episode-generated"
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
  narratorPresetId?: string;
  sourcePack: SourcePack;
  createdAt: string;
  episodes: Episode[];
  continuityAnchor: string;
  unlockQuiz: UnlockQuiz | null;
  notificationPlan: NotificationPlan | null;
  workflowRuntime: WorkflowRuntime | null;
  judgeNotes: {
    cloudflare: string[];
    elevenlabs: string[];
  };
  events: StoryEvent[];
}

export interface EnrichedShowResponse extends Show {
  audioStack: {
    headline: string;
    steps: Array<{
      name: string;
      provider: string;
      purpose: string;
    }>;
  };
  workflowDemo: import("./services/workflow-demo").WorkflowDemo;
}
