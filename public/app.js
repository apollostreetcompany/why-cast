const form = document.querySelector("#show-form");
const result = document.querySelector("#result");
const sourcePackSelect = document.querySelector("#sourcePackId");

async function loadConfig() {
  const response = await fetch("/api/config");
  const config = await response.json();

  sourcePackSelect.innerHTML = config.sourcePacks
    .map(
      (sourcePack) =>
        `<option value="${sourcePack.id}">${sourcePack.label} (${sourcePack.subject})</option>`,
    )
    .join("");
}

function parseAges(value) {
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
}

function speakEpisode(script) {
  if (!("speechSynthesis" in window)) {
    window.alert("Speech synthesis is not available in this browser.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(script);
  utterance.rate = 0.96;
  utterance.pitch = 1.02;
  window.speechSynthesis.speak(utterance);
}

function downloadScript(title, script) {
  const blob = new Blob([script], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

function renderEpisode(episode) {
  const isReady = episode.status === "ready";
  const actions = isReady
    ? `
      <div class="actions">
        <button class="secondary" data-play="${episode.id}">Play preview</button>
        <button class="secondary" data-download="${episode.id}">Download script</button>
      </div>
    `
    : "";

  return `
    <article class="episode" data-episode-id="${episode.id}">
      <div class="meta">${episode.status.toUpperCase()} • ${Math.round(episode.durationTargetSec / 60)} min</div>
      <h3>${episode.title}</h3>
      <p>${episode.continuitySummary}</p>
      <p class="citation">${episode.citationLabel}</p>
      <p>${episode.script}</p>
      ${actions}
    </article>
  `;
}

function renderShow(show) {
  result.classList.remove("hidden");
  result.innerHTML = `
    <h2>${show.mode === "serialized" ? "Serialized show ready" : "One-off episode ready"}</h2>
    <p>
      ${show.storyType} for ages ${show.ages.join(", ")} using ${show.sourcePack.provider} and the topic
      "${show.sourcePack.topic}".
    </p>
    <div class="episode-list">
      ${show.episodes.map(renderEpisode).join("")}
    </div>
  `;

  for (const episode of show.episodes) {
    if (episode.status !== "ready") {
      continue;
    }

    result
      .querySelector(`[data-play="${episode.id}"]`)
      .addEventListener("click", () => speakEpisode(episode.script));
    result
      .querySelector(`[data-download="${episode.id}"]`)
      .addEventListener("click", () => downloadScript(episode.title, episode.script));
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const storyPrompt = document.querySelector("#storyPrompt").value.trim();
  const firstSplit = storyPrompt.split(" with ");
  const storyType = firstSplit[0]?.trim() || "Adventure story";
  const characters = firstSplit[1]?.trim() || "Ada the fox and Jun the robot";

  const payload = {
    ages: parseAges(document.querySelector("#ages").value),
    durationMinutes: Number(document.querySelector("#durationMinutes").value),
    mode: document.querySelector("#mode").value,
    sourcePackId: sourcePackSelect.value,
    storyType,
    characters
  };

  const response = await fetch("/api/shows", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const show = await response.json();
  renderShow(show);
});

loadConfig().catch((error) => {
  console.error(error);
  result.classList.remove("hidden");
  result.textContent = "Could not load app configuration.";
});
