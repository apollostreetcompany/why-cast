import type { Episode, ShowRequest, SourcePack } from "../types";

export function buildLearningGoal(sourcePack: SourcePack, ages: number[]): string {
  const youngest = Math.min(...ages);
  const band = youngest <= 6 ? "simple" : youngest <= 9 ? "curious" : "older";

  if (band === "simple") {
    return `Explain ${sourcePack.concept} in playful language with clear repetition.`;
  }

  if (band === "curious") {
    return `Teach ${sourcePack.concept} with a concrete example and a quick recap.`;
  }

  return `Teach ${sourcePack.concept} while preserving the trusted facts and a cause-and-effect explanation.`;
}

export function buildContinuitySummary(
  request: ShowRequest,
  sourcePack: SourcePack,
  episodeNumber: number,
): string {
  if (request.mode === "one-off") {
    return `Self-contained ${request.storyType} episode grounded in ${sourcePack.citationLabel}.`;
  }

  if (episodeNumber === 1) {
    return `Introduce ${request.characters}, establish the ${request.storyType} world, and land the first lesson about ${sourcePack.topic}.`;
  }

  return `Recap the previous lesson in one beat, then extend the story with one new idea about ${sourcePack.topic} while keeping ${request.characters} emotionally consistent.`;
}

export function buildEpisodeTitle(
  sourcePack: SourcePack,
  request: ShowRequest,
  episodeNumber: number,
): string {
  const prefix = request.mode === "serialized" ? `Episode ${episodeNumber}` : "Tonight's Story";
  return `${prefix}: ${sourcePack.topic} with ${request.characters.split(",")[0].trim()}`;
}

export function buildQueuedEpisodePreview(
  request: ShowRequest,
  sourcePack: SourcePack,
  episodeNumber: number,
  status: "queued" | "quiz-locked" = "queued",
): Episode {
  return {
    id: `ep-${episodeNumber}`,
    episodeNumber,
    title: buildEpisodeTitle(sourcePack, request, episodeNumber),
    subject: sourcePack.subject,
    status,
    durationTargetSec: request.durationMinutes * 60,
    learningGoal: buildLearningGoal(sourcePack, request.ages),
    continuitySummary: buildContinuitySummary(request, sourcePack, episodeNumber),
    script: "Queued for generation after the previous episode lands.",
    citationLabel: sourcePack.citationLabel,
    audioUrl: null
  };
}
