import { Hono } from "hono";
import { z } from "zod";
import { createShow } from "./services/story-generator";
import { saveShow, getShow } from "./lib/demo-store";
import { sourcePacks } from "./lib/source-packs";
import type { ShowRequest } from "./types";

interface Env {
  ASSETS?: Fetcher;
}

const app = new Hono<{ Bindings: Env }>();

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
    timestamp: new Date().toISOString()
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
    }))
  }),
);

app.post("/api/shows", async (c) => {
  const body = await c.req.json();
  const request = requestSchema.parse(body) as ShowRequest;
  const show = saveShow(createShow(request));

  return c.json(show, 201);
});

app.get("/api/shows/:showId", (c) => {
  const show = getShow(c.req.param("showId"));

  if (!show) {
    return c.json({ error: "Show not found" }, 404);
  }

  return c.json(show);
});

app.notFound((c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }

  return c.text("Asset not found", 404);
});

export default app;
