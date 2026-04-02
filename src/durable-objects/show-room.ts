import { applyQuizAnswer } from "../services/feedback-loop";
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
      const body = (await request.json()) as { showId: string; request: ShowRequest };
      const show = createShow(body.request, body.showId);
      const hydrated = hydrateShow(
        show,
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

    if (request.method === "POST" && url.pathname.endsWith("/quiz/submit")) {
      const show = await this.readShow();

      if (!show) {
        return Response.json({ error: "Show not found" }, { status: 404 });
      }

      const body = (await request.json()) as { selectedOptionIndex: number };
      const result = applyQuizAnswer(show, body.selectedOptionIndex);
      const event = createEvent(
        "episode-reviewed",
        result.passed
          ? `Family quiz passed. Episode ${result.unlockedEpisodeNumber} is unlocked for generation.`
          : "Family quiz attempted but not yet passed.",
      );
      const updated = hydrateShow(result.show, [...result.show.events, event]);
      await this.writeShow(updated);
      return Response.json({
        passed: result.passed,
        unlockedEpisodeNumber: result.unlockedEpisodeNumber,
        show: updated,
      });
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
