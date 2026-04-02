import { afterEach, describe, expect, it, vi } from "vitest";
import { createShow } from "../src/services/story-generator";
import { synthesizeEpisodeAudio, synthesizeNarratorSample } from "../src/services/elevenlabs-audio";

describe("elevenlabs audio service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the selected narrator voice to render episode audio", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3, 4]).buffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const show = createShow({
      ages: [7, 5],
      durationMinutes: 3,
      mode: "serialized",
      sourcePackId: "khan-hist-ancient-egypt",
      storyType: "Adventure",
      characters: "Savannah and Kenzo",
      narratorPresetId: "mac-campfire",
    });

    const artifact = await synthesizeEpisodeAudio(
      {
        ELEVENLABS_API_KEY: "test-key",
      },
      show,
      show.episodes[0]!,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/text-to-speech/ErXwobaYiN019PkySvjV");
    expect(url).toContain("output_format=mp3_22050_32");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "xi-api-key": "test-key",
    });

    const payload = JSON.parse(String(init.body));
    expect(payload.model_id).toBe("eleven_multilingual_v2");
    expect(payload.text).toContain("Welcome to why-cast");
    expect(payload.voice_settings.use_speaker_boost).toBe(true);
    expect(artifact.mimeType).toBe("audio/mpeg");
    expect(artifact.fileExtension).toBe("mp3");
    expect(artifact.voiceId).toBe("ErXwobaYiN019PkySvjV");
  });

  it("trims oversized live scripts before sending them to ElevenLabs", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3, 4]).buffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const show = createShow({
      ages: [7],
      durationMinutes: 3,
      mode: "serialized",
      sourcePackId: "khan-hist-ancient-egypt",
      storyType: "Adventure",
      characters: "Luna and Mac",
      narratorPresetId: "mac-campfire",
    });
    show.episodes[0] = {
      ...show.episodes[0],
      script: `${"Ancient Egypt is full of clues. ".repeat(120)}Final sentence.`,
    };

    await synthesizeEpisodeAudio(
      {
        ELEVENLABS_API_KEY: "test-key",
      },
      show,
      show.episodes[0]!,
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body));
    expect(payload.text.length).toBeGreaterThan(1800);
    expect(payload.text.length).toBeLessThanOrEqual(5000);
  });

  it("renders the selected episode instead of always using episode one", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3, 4]).buffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
        },
      }),
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
      status: "ready",
      script:
        "Episode two begins at the glass tower. Luna and Mac hear the roots clicking beneath the floor and follow the clue deeper into the mystery.",
    };

    await synthesizeEpisodeAudio(
      {
        ELEVENLABS_API_KEY: "test-key",
      },
      show,
      show.episodes[1]!,
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body));
    expect(payload.text).toContain("Episode two begins at the glass tower");
    expect(payload.text).not.toContain("Welcome to why-cast");
  });

  it("renders narrator samples with the preset sample line", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([9, 8, 7]).buffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const artifact = await synthesizeNarratorSample(
      {
        ELEVENLABS_API_KEY: "test-key",
      },
      "mac-bedtime-deep",
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body));
    expect(payload.text).toContain("Close your eyes for a moment");
    expect(artifact.voiceId).toBe("pNInz6obpgDQGcFmaJgB");
  });

  it("throws when the ElevenLabs key is missing", async () => {
    const show = createShow({
      ages: [7],
      durationMinutes: 3,
      mode: "one-off",
      sourcePackId: "khan-sci-photosynthesis",
      storyType: "Mystery",
      characters: "Ada",
    });

    await expect(synthesizeEpisodeAudio({}, show, show.episodes[0]!)).rejects.toThrow(
      "ELEVENLABS_API_KEY is not configured.",
    );
  });
});
