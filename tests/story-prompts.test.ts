import { describe, expect, it } from "vitest";
import { createShow } from "../src/services/story-generator";
import {
  buildContinuityPrompt,
  buildStoryEditorPrompt,
  buildStoryWriterPrompt,
} from "../src/prompts/story-prompts";

describe("story prompt builders", () => {
  const show = createShow({
    ages: [7, 5],
    durationMinutes: 3,
    mode: "serialized",
    sourcePackId: "khan-hist-ancient-egypt",
    storyType: "Adventure",
    characters: "Savannah and Kenzo",
  });

  const context = {
    children: [
      { name: "Savannah", age: 7, interests: ["mysteries", "maps"] },
      { name: "Kenzo", age: 5, interests: ["mummies", "boats"] },
    ],
    show,
    sourcePack: show.sourcePack,
    episodeNumber: 1,
    additionalPreferences: ["Keep it warm, brave, and wonder-filled."],
  };

  it("keeps the requested prompt structure for the writer", () => {
    const prompt = buildStoryWriterPrompt(context);

    expect(prompt).toContain("You are Mac, tutor and storyteller for Savannah and Kenzo.");
    expect(prompt).toContain("### Identity / tone");
    expect(prompt).toContain("### User context");
    expect(prompt).toContain("### Show Context");
    expect(prompt).toContain("### Behavioral rules");
    expect(prompt).toContain("### Lesson");
    expect(prompt).toContain("### Output instructions");
    expect(prompt).toContain("Khan Academy - Ancient Egypt and the Nile");
  });

  it("creates a distinct editor prompt", () => {
    const prompt = buildStoryEditorPrompt(context);

    expect(prompt).toContain("### Editor mission");
    expect(prompt).toContain("Edited Script");
    expect(prompt).toContain("Factual Integrity Notes");
  });

  it("creates a distinct continuity prompt", () => {
    const prompt = buildContinuityPrompt(context);

    expect(prompt).toContain("### Continuity mission");
    expect(prompt).toContain("Character State");
    expect(prompt).toContain("Next Episode Setup");
  });
});
