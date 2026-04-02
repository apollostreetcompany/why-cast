import { Hono } from "hono";
import { z } from "zod";
import { sourcePacks } from "./lib/source-packs";
import type { Show, ShowRequest } from "./types";
import { buildAudioStackPlan } from "./lib/audio-stack";
import { ShowRoom } from "./durable-objects/show-room";
import { buildWorkflowDemo } from "./services/workflow-demo";

interface Env {
  ASSETS?: Fetcher;
  SHOW_ROOMS: DurableObjectNamespace;
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
  characters: z.string().min(2).max(160)
});

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    product: "why-cast",
    timestamp: new Date().toISOString(),
    architecture: {
      cloudflare: ["Workers", "Durable Objects", "Workflows (planned)", "D1 (next)", "R2 (next)", "KV (next)"],
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
  const room = c.env.SHOW_ROOMS.get(roomId);
  const response = await room.fetch("https://show-room/initialize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const show = (await response.json()) as Show;

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

app.notFound((c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }

  return c.text("Asset not found", 404);
});

export default app;
export { ShowRoom };
