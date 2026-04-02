import { describe, expect, it } from "vitest";
import { createShow } from "../src/services/story-generator";
import { buildWorkflowDemo } from "../src/services/workflow-demo";

describe("buildWorkflowDemo", () => {
  it("returns prompt, draft, editor, continuity, and workflow artifacts", () => {
    const show = createShow({
      ages: [7, 5],
      durationMinutes: 3,
      mode: "serialized",
      sourcePackId: "khan-hist-ancient-egypt",
      storyType: "Adventure",
      characters: "Savannah and Kenzo",
    });

    const workflow = buildWorkflowDemo(show);

    expect(workflow.promptBundle.writer).toContain("You are Mac, tutor and storyteller");
    expect(workflow.generatedDraft.title).toContain("Ancient Egypt");
    expect(workflow.editorPass.editedScript).toContain("Savannah");
    expect(workflow.continuityMemory.nextEpisodeSetup).toContain("next episode");
    expect(workflow.quizGate?.question).toContain("Nile");
    expect(workflow.reminderPreview?.subject).toContain("unlock Episode 2");
    expect(workflow.aiProduction.voiceCasting.voiceRole).toContain("Mac");
    expect(workflow.aiProduction.qaChecklist[0]).toContain("Transcribe");
    expect(workflow.workflowSteps.some((step) => step.stage === "durable-object")).toBe(true);
    expect(workflow.workflowSteps.some((step) => step.stage === "audio-qa")).toBe(true);
  });
});
