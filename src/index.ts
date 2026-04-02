import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { WorkflowEntrypoint } from "cloudflare:workers";
import { z } from "zod";
import { sourcePacks } from "./lib/source-packs";
import type { Show, ShowRequest } from "./types";
import { buildAudioStackPlan } from "./lib/audio-stack";
import { generateShowSlug } from "./lib/show-slugs";
import { ShowRoom } from "./durable-objects/show-room";
import { buildWorkflowDemo } from "./services/workflow-demo";
import { DailyReminderWorkflow, ShowPipelineWorkflow } from "./workflows/show-pipeline";
import { generateLiveEpisode } from "./services/live-generation";
import { narratorPresets } from "./services/narrator-voices";
import { synthesizeEpisodeAudio, synthesizeNarratorSample } from "./services/elevenlabs-audio";

interface Env {
  ASSETS?: Fetcher;
  SHOW_ROOMS: DurableObjectNamespace;
  SHOW_PIPELINE: Workflow<{ showId: string }>;
  DAILY_REMINDER: Workflow<{ showId: string }>;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_MODEL?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors({ origin: "*" }));

function enrichShow(show: Show) {
  return {
    ...show,
    audioStack: buildAudioStackPlan(show),
    workflowDemo: buildWorkflowDemo(show),
  };
}

async function readShowFromRoom(room: DurableObjectStub): Promise<Show | null> {
  const response = await room.fetch("https://show-room/show");
  if (response.status === 404) {
    return null;
  }

  return (await response.json()) as Show;
}

async function findAvailableShowRoom(env: Env) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const slug = generateShowSlug();
    const roomId = env.SHOW_ROOMS.idFromName(slug);
    const room = env.SHOW_ROOMS.get(roomId);
    const existing = await readShowFromRoom(room);

    if (!existing) {
      return {
        slug,
        roomId,
        room,
      };
    }
  }

  throw new Error("Could not allocate a memorable show URL. Please try again.");
}

const requestSchema = z.object({
  ages: z.array(z.number().int().min(3).max(14)).min(1),
  durationMinutes: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  mode: z.union([z.literal("one-off"), z.literal("serialized")]),
  sourcePackId: z.string().min(1),
  storyType: z.string().min(2).max(80),
  characters: z.string().min(2).max(160),
  narratorPresetId: z.string().optional(),
});

async function loadShowFromId(env: Env, showId: string) {
  const roomId = env.SHOW_ROOMS.idFromString(showId);
  const room = env.SHOW_ROOMS.get(roomId);
  const show = await readShowFromRoom(room);

  return { room, show };
}

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    product: "why-cast",
    timestamp: new Date().toISOString(),
    architecture: {
      cloudflare: ["Workers", "Durable Objects", "Workflows", "D1 (next)", "R2 (next)", "KV (next)"],
      elevenlabs: ["Text to Speech", "Sound Effects", "Speech to Text"],
    },
  }),
);

app.get("/api/config", (c) =>
  c.json({
    durations: [3, 4, 5],
    modes: [
      { id: "one-off", label: "One-off" },
      { id: "serialized", label: "Serialized" }
    ],
    sourcePacks: sourcePacks.map((sourcePack) => ({
      id: sourcePack.id,
      label: `${sourcePack.provider} - ${sourcePack.topic}`,
      subject: sourcePack.subject
    })),
    narratorPresets: narratorPresets.map((preset) => ({
      ...preset,
      sampleUrl: `/api/narrators/${preset.id}/sample`,
    })),
    elevenLabsReady: Boolean(c.env.ELEVENLABS_API_KEY),
    architectureNotes: {
      serializedShows: "A Durable Object owns continuity, event history, and episode handoff for each show.",
      audioPipeline: "ElevenLabs Text to Speech + Sound Effects + Speech to Text are combined for narration, scene texture, and transcript QA.",
    },
  }),
);

app.post("/api/shows", async (c) => {
  const body = await c.req.json();
  const request = requestSchema.parse(body) as ShowRequest;
  const { slug, roomId, room } = await findAvailableShowRoom(c.env);
  const showId = roomId.toString();
  const response = await room.fetch("https://show-room/initialize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      showId,
      slug,
      request,
    }),
  });
  const show = (await response.json()) as Show;

  if (show.workflowRuntime) {
    await c.env.SHOW_PIPELINE.create({
      id: show.workflowRuntime.pipelineInstanceId,
      params: { showId: show.id },
    });

    if (show.workflowRuntime.reminderInstanceId) {
      await c.env.DAILY_REMINDER.create({
        id: show.workflowRuntime.reminderInstanceId,
        params: { showId: show.id },
      });
    }
  }

  return c.json(enrichShow(show), 201);
});

app.get("/api/casts/:slug", async (c) => {
  const roomId = c.env.SHOW_ROOMS.idFromName(c.req.param("slug"));
  const room = c.env.SHOW_ROOMS.get(roomId);
  const show = await readShowFromRoom(room);

  if (!show) {
    return c.json({ error: "Cast not found" }, 404);
  }

  return c.json(enrichShow(show));
});

app.get("/api/shows/:showId", async (c) => {
  const roomId = c.env.SHOW_ROOMS.idFromString(c.req.param("showId"));
  const room = c.env.SHOW_ROOMS.get(roomId);
  const response = await room.fetch("https://show-room/show");

  if (response.status === 404) {
    return c.json({ error: "Show not found" }, 404);
  }

  const show = (await response.json()) as Show;
  return c.json(enrichShow(show));
});

app.get("/api/shows/:showId/workflow-demo", async (c) => {
  const roomId = c.env.SHOW_ROOMS.idFromString(c.req.param("showId"));
  const room = c.env.SHOW_ROOMS.get(roomId);
  const response = await room.fetch("https://show-room/show");

  if (response.status === 404) {
    return c.json({ error: "Show not found" }, 404);
  }

  const show = (await response.json()) as Show;
  return c.json(buildWorkflowDemo(show));
});

app.get("/api/narrators", (c) =>
  c.json({
    narratorPresets: narratorPresets.map((preset) => ({
      ...preset,
      sampleUrl: `/api/narrators/${preset.id}/sample`,
    })),
    sampleMode: c.env.ELEVENLABS_API_KEY ? "elevenlabs" : "browser-speech-synthesis",
    elevenLabsReady: Boolean(c.env.ELEVENLABS_API_KEY),
  }),
);

app.get("/api/narrators/:narratorPresetId/sample", async (c) => {
  if (!c.env.ELEVENLABS_API_KEY) {
    return c.json(
      {
        error: "ELEVENLABS_API_KEY is not configured in the deployed worker.",
      },
      503,
    );
  }

  try {
    const artifact = await synthesizeNarratorSample(c.env, c.req.param("narratorPresetId"));
    return new Response(artifact.audioBuffer, {
      headers: {
        "Content-Type": artifact.mimeType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : "Could not render narrator sample.",
      },
      502,
    );
  }
});

app.post("/api/shows/:showId/quiz/submit", async (c) => {
  const roomId = c.env.SHOW_ROOMS.idFromString(c.req.param("showId"));
  const room = c.env.SHOW_ROOMS.get(roomId);
  const body = await c.req.json<{ selectedOptionIndex: number }>();
  const response = await room.fetch("https://show-room/quiz/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (response.status !== 200) {
    const error = await response.json();
    return c.json(error, response.status as 404 | 405);
  }

  const result = (await response.json()) as {
    passed: boolean;
    unlockedEpisodeNumber: number | null;
    show: Show;
  };

  return c.json({
    passed: result.passed,
    unlockedEpisodeNumber: result.unlockedEpisodeNumber,
    show: enrichShow(result.show),
  });
});

async function generateLiveForEpisode(c: Context<{ Bindings: Env }>, episodeId: string) {
  const showId = c.req.param("showId");
  if (!showId) {
    return c.json({ error: "Show id is required." }, 400);
  }

  const { room, show } = await loadShowFromId(c.env, showId);

  if (!show) {
    return c.json({ error: "Show not found" }, 404);
  }

  const episode = show.episodes.find((entry) => entry.id === episodeId);
  if (!episode) {
    return c.json({ error: "Episode not found" }, 404);
  }

  if (episode.status === "quiz-locked") {
    return c.json({ error: "Pass the quiz before generating this episode." }, 409);
  }

  if (!c.env.OPENAI_API_KEY) {
    return c.json(
      {
        error: "OPENAI_API_KEY is not configured in the deployed worker.",
      },
      503,
    );
  }

  try {
    const generated = await generateLiveEpisode(c.env, show, episode.id);
    const updateResponse = await room.fetch("https://show-room/episode/live", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        episodeId: episode.id,
        title: generated.episode.title,
        script: generated.episode.script,
        status: generated.episode.status,
        wordCount: generated.episode.wordCount,
        estimatedDurationSec: generated.episode.estimatedDurationSec,
        durationCompliance: generated.episode.durationCompliance,
        compelling: generated.episode.compelling,
        compellingReason: generated.episode.compellingReason,
      }),
    });
    const updatedShow = (await updateResponse.json()) as Show;

    return c.json({
      show: enrichShow(updatedShow),
      validation: generated.validation,
      attempts: generated.attempts,
      generationMode: "openai-live",
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : "Could not regenerate the live script.",
      },
      502,
    );
  }
}

async function renderAudioForEpisode(c: Context<{ Bindings: Env }>, episodeId: string) {
  const showId = c.req.param("showId");
  if (!showId) {
    return c.json({ error: "Show id is required." }, 400);
  }

  const { room, show } = await loadShowFromId(c.env, showId);

  if (!show) {
    return c.json({ error: "Show not found" }, 404);
  }

  const episode = show.episodes.find((entry) => entry.id === episodeId);
  if (!episode) {
    return c.json({ error: "Episode not found" }, 404);
  }

  if (episode.status === "quiz-locked") {
    return c.json({ error: "Pass the quiz before rendering this episode." }, 409);
  }

  if (!episode.script?.trim()) {
    return c.json({ error: "Generate the script before rendering audio." }, 409);
  }

  if (episode.durationCompliance && episode.durationCompliance !== "pass") {
    return c.json(
      {
        error: "This script is not long enough yet for the requested runtime. Regenerate it before rendering audio.",
      },
      409,
    );
  }

  if (!c.env.ELEVENLABS_API_KEY) {
    return c.json(
      {
        error: "ELEVENLABS_API_KEY is not configured in the deployed worker.",
      },
      503,
    );
  }

  try {
    const artifact = await synthesizeEpisodeAudio(c.env, show, episode);
    const storeResponse = await room.fetch(`https://show-room/audio/${encodeURIComponent(episode.id)}`, {
      method: "POST",
      headers: {
        "Content-Type": artifact.mimeType,
      },
      body: artifact.audioBuffer,
    });
    const updatedShow = (await storeResponse.json()) as Show;

    return c.json({
      show: enrichShow(updatedShow),
      audio: {
        source: "elevenlabs",
        voiceId: artifact.voiceId,
        modelId: artifact.modelId,
        mimeType: artifact.mimeType,
      },
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : "Could not render episode audio.",
      },
      502,
    );
  }
}

app.post("/api/shows/:showId/generate-live", async (c) => {
  const { show } = await loadShowFromId(c.env, c.req.param("showId"));
  if (!show) {
    return c.json({ error: "Show not found" }, 404);
  }

  const firstEpisodeId = show.episodes[0]?.id;
  if (!firstEpisodeId) {
    return c.json({ error: "Show has no episodes yet." }, 409);
  }

  return generateLiveForEpisode(c, firstEpisodeId);
});

app.post("/api/shows/:showId/episodes/:episodeId/generate-live", async (c) =>
  generateLiveForEpisode(c, c.req.param("episodeId")),
);

app.post("/api/shows/:showId/render-audio", async (c) => {
  const { show } = await loadShowFromId(c.env, c.req.param("showId"));
  if (!show) {
    return c.json({ error: "Show not found" }, 404);
  }

  const firstEpisodeId = show.episodes[0]?.id;
  if (!firstEpisodeId) {
    return c.json({ error: "Show has no episodes yet." }, 409);
  }

  return renderAudioForEpisode(c, firstEpisodeId);
});

app.post("/api/shows/:showId/episodes/:episodeId/render-audio", async (c) =>
  renderAudioForEpisode(c, c.req.param("episodeId")),
);

app.get("/api/shows/:showId/episodes/:episodeId/audio", async (c) => {
  const roomId = c.env.SHOW_ROOMS.idFromString(c.req.param("showId"));
  const room = c.env.SHOW_ROOMS.get(roomId);
  const response = await room.fetch(
    `https://show-room/audio/${encodeURIComponent(c.req.param("episodeId"))}`,
  );

  if (response.status !== 200) {
    const body = await response.json();
    return c.json(body, response.status as 404);
  }

  return new Response(await response.arrayBuffer(), {
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "audio/mpeg",
      "Cache-Control": response.headers.get("Cache-Control") ?? "private, max-age=3600",
      "Content-Disposition": response.headers.get("Content-Disposition") ?? "inline",
    },
  });
});

app.notFound((c) => {
  if (c.env.ASSETS && c.req.method === "GET") {
    const requestUrl = new URL(c.req.url);

    if (requestUrl.pathname.startsWith("/api/")) {
      return c.json({ error: "Not found" }, 404);
    }

    return c.env.ASSETS.fetch(c.req.raw).then((response) => {
      if (response.status !== 404) {
        return response;
      }

      return c.env.ASSETS!.fetch(new Request(new URL("/index.html", requestUrl), c.req.raw));
    });
  }

  return c.text("Asset not found", 404);
});

export default app;
export { ShowRoom };
export { ShowPipelineWorkflow, DailyReminderWorkflow };
