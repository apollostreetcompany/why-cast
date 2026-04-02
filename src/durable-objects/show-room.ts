import { applyQuizAnswer } from "../services/feedback-loop";
import { createShow, hydrateShow } from "../services/story-generator";
import type { Show, ShowRequest, StoryEvent } from "../types";

interface Env {}

function slugify(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

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

    if (request.method === "POST" && url.pathname.endsWith("/episode/live")) {
      const show = await this.readShow();

      if (!show) {
        return Response.json({ error: "Show not found" }, { status: 404 });
      }

      const body = (await request.json()) as {
        title: string;
        script: string;
      };
      const updatedEpisodes = show.episodes.map((episode) =>
        episode.episodeNumber === 1
          ? {
              ...episode,
              title: body.title,
              script: body.script,
              scriptSource: "openai" as const,
            }
          : episode,
      );
      const updated = hydrateShow(show, [
        ...show.events,
        createEvent(
          "episode-generated",
          "Episode 1 was regenerated with the live model path.",
        ),
      ]);
      const finalShow = {
        ...updated,
        episodes: updatedEpisodes,
      };
      await this.writeShow(finalShow);
      return Response.json(finalShow);
    }

    const audioMatch = url.pathname.match(/\/audio\/([^/]+)$/);

    if (audioMatch && request.method === "POST") {
      const show = await this.readShow();

      if (!show) {
        return Response.json({ error: "Show not found" }, { status: 404 });
      }

      const episodeId = decodeURIComponent(audioMatch[1] ?? "");
      const episode = show.episodes.find((item) => item.id === episodeId);
      if (!episode) {
        return Response.json({ error: "Episode not found" }, { status: 404 });
      }

      const audioBuffer = await request.arrayBuffer();
      if (audioBuffer.byteLength === 0) {
        return Response.json({ error: "Audio payload was empty" }, { status: 400 });
      }

      const mimeType = request.headers.get("Content-Type") ?? "audio/mpeg";
      await this.state.storage.put(`audio:${episodeId}`, audioBuffer);

      const finalShow = {
        ...hydrateShow(show, [
          ...show.events,
          createEvent(
            "audio-stack-planned",
            `Episode ${episode.episodeNumber} narration was rendered and stored for playback.`,
          ),
        ]),
        episodes: show.episodes.map((item) =>
          item.id === episodeId
            ? {
                ...item,
                audioUrl: `/api/shows/${show.id}/episodes/${episodeId}/audio`,
                audioMimeType: mimeType,
                audioSource: "elevenlabs" as const,
              }
            : item,
        ),
      };

      await this.writeShow(finalShow);
      return Response.json(finalShow);
    }

    if (audioMatch && request.method === "GET") {
      const show = await this.readShow();

      if (!show) {
        return Response.json({ error: "Show not found" }, { status: 404 });
      }

      const episodeId = decodeURIComponent(audioMatch[1] ?? "");
      const episode = show.episodes.find((item) => item.id === episodeId);
      if (!episode?.audioUrl) {
        return Response.json({ error: "Episode audio not found" }, { status: 404 });
      }

      const audioBuffer = await this.state.storage.get<ArrayBuffer>(`audio:${episodeId}`);
      if (!audioBuffer) {
        return Response.json({ error: "Episode audio bytes not found" }, { status: 404 });
      }

      return new Response(audioBuffer, {
        headers: {
          "Content-Type": episode.audioMimeType ?? "audio/mpeg",
          "Cache-Control": "private, max-age=3600",
          "Content-Disposition": `inline; filename="${slugify(episode.title) || "episode-audio"}.mp3"`,
        },
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
