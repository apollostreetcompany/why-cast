import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { buildWorkflowDemo } from "../services/workflow-demo";
import type { Show } from "../types";

interface WorkflowEnv {
  SHOW_ROOMS: DurableObjectNamespace;
}

async function loadShow(env: WorkflowEnv, showId: string): Promise<Show> {
  const roomId = env.SHOW_ROOMS.idFromString(showId);
  const room = env.SHOW_ROOMS.get(roomId);
  const response = await room.fetch("https://show-room/show");

  if (response.status !== 200) {
    throw new Error(`Show ${showId} not found for workflow.`);
  }

  return (await response.json()) as Show;
}

export class ShowPipelineWorkflow extends WorkflowEntrypoint<
  WorkflowEnv,
  { showId: string }
> {
  override async run(
    event: WorkflowEvent<{ showId: string }>,
    step: WorkflowStep,
  ) {
    const show = await step.do("load show", async () => loadShow(this.env, event.payload.showId));
    const demo = await step.do("build workflow demo", async () => buildWorkflowDemo(show));
    const editorSummary = await step.do("editor summary", async () => ({
      title: demo.generatedDraft.title,
      recap: demo.generatedDraft.lessonRecap,
      needsLiveGeneration: demo.editorPass.risksOrFixesStillNeeded.includes(
        "Replace deterministic draft text with live LLM generation before final submission.",
      ),
    }));

    return {
      showId: event.payload.showId,
      generatedTitle: editorSummary.title,
      recap: editorSummary.recap,
      status: "completed-demo-pipeline",
      nextStep: editorSummary.needsLiveGeneration
        ? "Swap deterministic writer/editor with live LLM calls."
        : "Ready for audio rendering.",
    };
  }
}

export class DailyReminderWorkflow extends WorkflowEntrypoint<
  WorkflowEnv,
  { showId: string }
> {
  override async run(
    event: WorkflowEvent<{ showId: string }>,
    step: WorkflowStep,
  ) {
    const show = await step.do("load show for reminder", async () =>
      loadShow(this.env, event.payload.showId),
    );
    const reminder = await step.do("compose reminder", async () => ({
      subject:
        show.notificationPlan?.subject ??
        `why-cast reminder for ${show.sourcePack.topic}`,
      preview:
        show.notificationPlan?.preview ??
        "A short family quiz unlocks the next episode.",
      gate:
        show.unlockQuiz && !show.unlockQuiz.passed
          ? `Pending quiz unlock for Episode ${show.unlockQuiz.unlocksEpisodeNumber}.`
          : "Quiz already passed or not required.",
    }));

    return {
      showId: event.payload.showId,
      reminder,
      status: "completed-reminder-plan",
    };
  }
}
