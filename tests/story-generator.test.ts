import { describe, expect, it } from "vitest";
import { createShow } from "../src/services/story-generator";

describe("createShow", () => {
  it("creates a ready first episode for one-off mode", () => {
    const show = createShow({
      ages: [7],
      durationMinutes: 3,
      mode: "one-off",
      sourcePackId: "khan-sci-photosynthesis",
      storyType: "Mystery story",
      characters: "Ada the fox and Jun the robot"
    });

    expect(show.episodes).toHaveLength(1);
    expect(show.episodes[0]?.status).toBe("ready");
    expect(show.episodes[0]?.script).toContain("Khan Academy - Photosynthesis");
  });

  it("queues later episodes for serialized mode", () => {
    const show = createShow({
      ages: [8, 10],
      durationMinutes: 5,
      mode: "serialized",
      sourcePackId: "khan-hist-ancient-egypt",
      storyType: "Adventure story",
      characters: "Mina and Sol"
    });

    expect(show.episodes).toHaveLength(4);
    expect(show.episodes[1]?.status).toBe("queued");
    expect(show.episodes[3]?.continuitySummary).toContain("extend the story");
  });
});
