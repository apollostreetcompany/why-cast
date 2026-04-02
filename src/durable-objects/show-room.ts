import { createShow, hydrateShow } from "../services/story-generator";
import type { Show, ShowRequest, StoryEvent } from "../types";

interface Env {}

function createEvent(type: StoryEvent["type"], detail: string): StoryEvent {
  return {
    id: crypto.randomUUID(),
    type,
    detail,
    timestamp: new Date().toISOString(),
  };
}

export class ShowRoom {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env,
  ) {
    void this.env;
  }

  private async readShow(): Promise<Show | null> {
    return (await this.state.storage.get<Show>("show")) ?? null;
  }

  private async writeShow(show: Show): Promise<Show> {
    await this.state.storage.put("show", show);
    return show;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname.endsWith("/initialize")) {
      const requestBody = (await request.json()) as ShowRequest;
      const show = createShow(requestBody);
      const hydrated = hydrateShow(
        {
          ...show,
          id: this.state.id.toString(),
        },
        [
        createEvent("show-created", "Show request accepted by the Durable Object."),
        createEvent(
          "continuity-locked",
          show.mode === "serialized"
            ? "Serialized continuity has been pinned to this show room."
            : "One-off episode locked with self-contained continuity."
        ),
      ],
      );

      await this.writeShow(hydrated);
      return Response.json(hydrated, { status: 201 });
    }

    if (request.method === "POST" && url.pathname.endsWith("/event")) {
      const show = await this.readShow();

      if (!show) {
        return Response.json({ error: "Show not found" }, { status: 404 });
      }

      const body = (await request.json()) as { type: StoryEvent["type"]; detail: string };
      const updated = hydrateShow(show, [...show.events, createEvent(body.type, body.detail)]);
      await this.writeShow(updated);
      return Response.json(updated);
    }

    if (request.method === "GET" && url.pathname.endsWith("/show")) {
      const show = await this.readShow();

      if (!show) {
        return Response.json({ error: "Show not found" }, { status: 404 });
      }

      return Response.json(show);
    }

    return Response.json({ error: "Unsupported operation" }, { status: 405 });
  }
}
