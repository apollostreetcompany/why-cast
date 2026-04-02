import type { Show } from "../types";

const shows = new Map<string, Show>();

export function saveShow(show: Show): Show {
  shows.set(show.id, show);
  return show;
}

export function getShow(showId: string): Show | undefined {
  return shows.get(showId);
}
