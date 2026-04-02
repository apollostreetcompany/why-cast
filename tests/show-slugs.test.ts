import { describe, expect, it } from "vitest";
import { buildCastPath, generateShowSlug } from "../src/lib/show-slugs";

describe("show slugs", () => {
  it("creates a four-word human-readable slug", () => {
    const slug = generateShowSlug(new Uint32Array([0, 1, 2, 3]));

    expect(slug).toMatch(/^[a-z]+(?:-[a-z]+){3}$/);
    expect(slug.split("-")).toHaveLength(4);
  });

  it("builds the public cast path from the slug", () => {
    expect(buildCastPath("amber-river-paper-lantern")).toBe(
      "/casts/amber-river-paper-lantern",
    );
  });
});
