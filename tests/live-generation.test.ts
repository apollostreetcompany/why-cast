import { afterEach, describe, expect, it, vi } from "vitest";
import { createShow } from "../src/services/story-generator";
import { generateLiveEpisode } from "../src/services/live-generation";

function makeResponse(outputText: string) {
  return new Response(
    JSON.stringify({
      output_text: outputText,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

function repeatedSentence(sentence: string, count: number) {
  return Array.from({ length: count }, () => sentence).join(" ");
}

describe("generateLiveEpisode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("retries when the first draft is too short, then validates compelling without editing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeResponse(
          JSON.stringify({
            title: "Tiny draft",
            cold_open: "A lantern flickers.",
            full_script: "Too short to land the runtime.",
            lesson_recap: "Plants need sunlight.",
            next_episode_hook: "A leaf trembles.",
          }),
        ),
      )
      .mockResolvedValueOnce(
        makeResponse(
          JSON.stringify({
            title: "The Greenhouse Map",
            cold_open: "A greenhouse door hums open in the dark.",
            full_script: repeatedSentence(
              "Luna follows Mac past glowing leaves, asks brave questions, and discovers how sunlight, water, and carbon dioxide help a plant make food while the mystery deepens around them.",
              13,
            ),
            lesson_recap:
              "Plants use sunlight, water, and carbon dioxide to make food and release oxygen.",
            next_episode_hook: "Next, the map points toward a locked glass tower.",
          }),
        ),
      )
      .mockResolvedValueOnce(
        makeResponse(
          JSON.stringify({
            is_compelling: true,
            reason:
              "Yes. The script has a clear hook, real movement, and a memorable educational payoff.",
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const show = createShow({
      ages: [7],
      durationMinutes: 3,
      mode: "serialized",
      sourcePackId: "khan-sci-photosynthesis",
      storyType: "Adventure",
      characters: "Luna and Mac",
      narratorPresetId: "mac-wonder-guide",
    });

    const result = await generateLiveEpisode(
      {
        OPENAI_API_KEY: "test-key",
      },
      show,
      show.episodes[0]!.id,
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.attempts).toBe(2);
    expect(result.episode.durationCompliance).toBe("pass");
    expect(result.episode.wordCount).toBeGreaterThan(300);
    expect(result.validation.isCompelling).toBe(true);
    expect(result.validation.reason).toContain("clear hook");
  });

  it("builds a later episode with the selected episode context", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeResponse(
          JSON.stringify({
            title: "Episode Two Finds the Tower",
            cold_open: "The glass tower wakes up with a click.",
            full_script: repeatedSentence(
              "Luna and Mac revisit the last lesson, step deeper into the greenhouse world, and test a new clue that connects plant food to the glowing tower they have been chasing.",
              18,
            ),
            lesson_recap: "Plants still need light, water, and carbon dioxide to make food.",
            next_episode_hook: "A hidden key blinks beneath the roots.",
          }),
        ),
      )
      .mockResolvedValueOnce(
        makeResponse(
          JSON.stringify({
            is_compelling: true,
            reason: "Yes. The sequel continues the mystery and keeps the lesson active.",
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const show = createShow({
      ages: [7],
      durationMinutes: 4,
      mode: "serialized",
      sourcePackId: "khan-sci-photosynthesis",
      storyType: "Adventure",
      characters: "Luna and Mac",
      narratorPresetId: "mac-playful-spark",
    });
    show.episodes[1] = {
      ...show.episodes[1]!,
      status: "queued",
    };

    const result = await generateLiveEpisode(
      {
        OPENAI_API_KEY: "test-key",
      },
      show,
      show.episodes[1]!.id,
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body));
    expect(payload.instructions).toContain("Episode number: 2");
    expect(result.episode.title).toContain("Episode Two");
    expect(result.episode.durationCompliance).toBe("pass");
  });
});
