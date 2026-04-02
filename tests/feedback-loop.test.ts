import { describe, expect, it } from "vitest";
import { applyQuizAnswer } from "../src/services/feedback-loop";
import { createShow } from "../src/services/story-generator";

describe("applyQuizAnswer", () => {
  it("unlocks the next episode when the answer is correct", () => {
    const show = createShow({
      ages: [7, 5],
      durationMinutes: 3,
      mode: "serialized",
      sourcePackId: "khan-hist-ancient-egypt",
      storyType: "Adventure",
      characters: "Savannah and Kenzo",
    }, "show-test");

    const result = applyQuizAnswer(show, 1);

    expect(result.passed).toBe(true);
    expect(result.unlockedEpisodeNumber).toBe(2);
    expect(result.show.unlockQuiz?.passed).toBe(true);
    expect(result.show.episodes[1]?.status).toBe("queued");
  });
});
