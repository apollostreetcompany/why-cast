import type { NotificationPlan, Show, ShowRequest, SourcePack, UnlockQuiz } from "../types";

function buildQuestionForSource(sourcePack: SourcePack): Omit<UnlockQuiz, "attemptCount" | "passed" | "lastSelectedOptionIndex"> {
  if (sourcePack.subject === "science") {
    return {
      question: "What do plants use to make food during photosynthesis?",
      options: [
        "Sunlight, water, and carbon dioxide",
        "Only moonlight and soil",
        "Rocks and shadows",
      ],
      correctOptionIndex: 0,
      explanation: "Plants use sunlight, water, and carbon dioxide to make glucose and release oxygen.",
      unlocksEpisodeNumber: 2,
    };
  }

  if (sourcePack.subject === "math") {
    return {
      question: "What does a fraction describe?",
      options: [
        "A random number with no meaning",
        "Equal parts of a whole",
        "Only very big numbers",
      ],
      correctOptionIndex: 1,
      explanation: "A fraction tells us how many equal parts we have out of the whole.",
      unlocksEpisodeNumber: 2,
    };
  }

  return {
    question: "Why was the Nile so important to Ancient Egypt?",
    options: [
      "It only made the weather colder",
      "It provided water, rich soil, and travel",
      "It moved the pyramids by itself",
    ],
    correctOptionIndex: 1,
    explanation: "The Nile helped Ancient Egypt grow by providing water, fertile soil, and transportation.",
    unlocksEpisodeNumber: 2,
  };
}

export function buildUnlockQuiz(request: ShowRequest, sourcePack: SourcePack): UnlockQuiz | null {
  if (request.mode !== "serialized") {
    return null;
  }

  return {
    ...buildQuestionForSource(sourcePack),
    attemptCount: 0,
    passed: false,
    lastSelectedOptionIndex: null,
  };
}

export function buildNotificationPlan(show: Show): NotificationPlan | null {
  if (show.mode !== "serialized") {
    return null;
  }

  return {
    channel: "daily-email",
    cadence: "daily",
    subject: `why-cast follow-up: unlock Episode 2 of ${show.sourcePack.topic}`,
    preview: `A short family quiz unlocks the next ${show.durationMinutes}-minute episode and keeps the series active without spam.`,
    gate: "Send the reminder only while the next episode is still quiz-locked or queued.",
  };
}

export function buildWorkflowRuntime(show: Show) {
  return {
    pipelineInstanceId: `show-pipeline-${show.id.slice(0, 24)}`,
    pipelineStatus: "queued",
    reminderInstanceId:
      show.mode === "serialized" ? `daily-reminder-${show.id.slice(0, 24)}` : null,
    reminderStatus: show.mode === "serialized" ? "queued" : "not-needed",
  };
}

export function applyQuizAnswer(show: Show, selectedOptionIndex: number): {
  show: Show;
  passed: boolean;
  unlockedEpisodeNumber: number | null;
} {
  if (!show.unlockQuiz) {
    return {
      show,
      passed: false,
      unlockedEpisodeNumber: null,
    };
  }

  const passed = selectedOptionIndex === show.unlockQuiz.correctOptionIndex;
  const updatedQuiz: UnlockQuiz = {
    ...show.unlockQuiz,
    attemptCount: show.unlockQuiz.attemptCount + 1,
    passed,
    lastSelectedOptionIndex: selectedOptionIndex,
  };

  const updatedEpisodes = show.episodes.map((episode) => {
    if (
      passed &&
      episode.episodeNumber === updatedQuiz.unlocksEpisodeNumber &&
      episode.status === "quiz-locked"
    ) {
      return {
        ...episode,
        status: "queued" as const,
      };
    }

    return episode;
  });

  return {
    show: {
      ...show,
      unlockQuiz: updatedQuiz,
      episodes: updatedEpisodes,
    },
    passed,
    unlockedEpisodeNumber: passed ? updatedQuiz.unlocksEpisodeNumber : null,
  };
}
