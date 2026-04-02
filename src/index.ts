import { Hono } from "hono";
import { WorkflowEntrypoint } from "cloudflare:workers";
import { z } from "zod";
import { sourcePacks } from "./lib/source-packs";
import type { Show, ShowRequest } from "./types";
import { buildAudioStackPlan } from "./lib/audio-stack";
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

function enrichShow(show: Show) {
  return {
    ...show,
    audioStack: buildAudioStackPlan(show),
    workflowDemo: buildWorkflowDemo(show),
  };
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
  const roomId = c.env.SHOW_ROOMS.newUniqueId();
  const showId = roomId.toString();
  const room = c.env.SHOW_ROOMS.get(roomId);
  const response = await room.fetch("https://show-room/initialize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      showId,
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

app.post("/api/shows/:showId/generate-live", async (c) => {
  const roomId = c.env.SHOW_ROOMS.idFromString(c.req.param("showId"));
  const room = c.env.SHOW_ROOMS.get(roomId);
  const response = await room.fetch("https://show-room/show");

  if (response.status !== 200) {
    return c.json({ error: "Show not found" }, 404);
  }

  if (!c.env.OPENAI_API_KEY) {
    return c.json(
      {
        error: "OPENAI_API_KEY is not configured in the deployed worker.",
      },
      503,
    );
  }

  const show = (await response.json()) as Show;
  const generated = await generateLiveEpisode(c.env, show);
  const updateResponse = await room.fetch("https://show-room/episode/live", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: generated.episode.title,
      script: generated.episode.script,
    }),
  });
  const updatedShow = (await updateResponse.json()) as Show;

  return c.json({
    show: enrichShow(updatedShow),
    editor: generated.editor,
    generationMode: "openai-live",
  });
});

app.post("/api/shows/:showId/render-audio", async (c) => {
  const roomId = c.env.SHOW_ROOMS.idFromString(c.req.param("showId"));
  const room = c.env.SHOW_ROOMS.get(roomId);
  const response = await room.fetch("https://show-room/show");

  if (response.status !== 200) {
    return c.json({ error: "Show not found" }, 404);
  }

  if (!c.env.ELEVENLABS_API_KEY) {
    return c.json(
      {
        error: "ELEVENLABS_API_KEY is not configured in the deployed worker.",
      },
      503,
    );
  }

  const show = (await response.json()) as Show;
  const episode = show.episodes.find((item) => item.episodeNumber === 1) ?? show.episodes[0];
  try {
    const artifact = await synthesizeEpisodeAudio(c.env, show);
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
});

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
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }

  return c.text("Asset not found", 404);
});

export default app;
export { ShowRoom };
export { ShowPipelineWorkflow, DailyReminderWorkflow };
