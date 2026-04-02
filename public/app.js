const form = document.querySelector("#show-form");
const result = document.querySelector("#result");
const sourcePackSelect = document.querySelector("#sourcePackId");
const narratorPresetSelect = document.querySelector("#narratorPresetId");
const voiceSamples = document.querySelector("#voice-samples");
let narratorPresets = [];
let elevenLabsReady = false;
let currentAudio = null;

async function playAudioUrl(url) {
  if (currentAudio) {
    currentAudio.pause();
  }

  const audio = new Audio(url);
  currentAudio = audio;
  await audio.play();
}

function pickBrowserVoice(preset) {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  for (const hint of preset.browserVoiceHints ?? []) {
    const match = voices.find((voice) => voice.name.includes(hint));
    if (match) {
      return match;
    }
  }
  return voices[0] ?? null;
}

function playNarratorSample(preset) {
  if (elevenLabsReady && preset.sampleUrl) {
    playAudioUrl(preset.sampleUrl).catch(() => {
      speakFallbackNarratorSample(preset);
    });
    return;
  }

  speakFallbackNarratorSample(preset);
}

function speakFallbackNarratorSample(preset) {
  if (!("speechSynthesis" in window)) {
    window.alert("Speech synthesis is not available in this browser.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(preset.sampleLine);
  const voice = pickBrowserVoice(preset);
  if (voice) {
    utterance.voice = voice;
  }
  utterance.rate = preset.id === "mac-playful-spark" ? 1.03 : 0.94;
  utterance.pitch = preset.id === "mac-bedtime-deep" ? 0.92 : 1.02;
  window.speechSynthesis.speak(utterance);
}

function renderNarratorSamples() {
  voiceSamples.innerHTML = narratorPresets
    .map(
      (preset) => `
        <article class="voice-sample">
          <strong>${preset.label}</strong>
          <p>${preset.subtitle}</p>
          <p>${preset.tone}</p>
          <button type="button" class="secondary" data-sample-id="${preset.id}">Play sample</button>
        </article>
      `,
    )
    .join("");

  for (const preset of narratorPresets) {
    voiceSamples
      .querySelector(`[data-sample-id="${preset.id}"]`)
      .addEventListener("click", () => playNarratorSample(preset));
  }
}

async function loadConfig() {
  const response = await fetch("/api/config");
  const config = await response.json();

  sourcePackSelect.innerHTML = config.sourcePacks
    .map(
      (sourcePack) =>
        `<option value="${sourcePack.id}">${sourcePack.label} (${sourcePack.subject})</option>`,
    )
    .join("");

  narratorPresets = config.narratorPresets ?? [];
  elevenLabsReady = Boolean(config.elevenLabsReady);
  narratorPresetSelect.innerHTML = narratorPresets
    .map(
      (preset) =>
        `<option value="${preset.id}">${preset.label} - ${preset.subtitle}</option>`,
    )
    .join("");
  renderNarratorSamples();
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
  const audioActions = isReady && episode.audioUrl
    ? `
      <button class="secondary" data-play-audio="${episode.id}">Play audio</button>
      <button class="secondary" data-download-audio="${episode.id}">Download audio</button>
    `
    : "";
  const actions = isReady
    ? `
      <div class="actions">
        ${audioActions}
        <button class="secondary" data-play="${episode.id}">${episode.audioUrl ? "Play script preview" : "Play preview"}</button>
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
  const narratorLabel =
    narratorPresets.find((preset) => preset.id === show.narratorPresetId)?.label ??
    show.narratorPresetId ??
    "Mac: Wonder Guide";
  const renderAudioAction = elevenLabsReady
    ? `<button class="secondary" data-render-audio="${show.id}">Render studio audio</button>`
    : "";
  result.classList.remove("hidden");
  result.innerHTML = `
    <h2>${show.mode === "serialized" ? "Serialized show ready" : "One-off episode ready"}</h2>
    <p>
      ${show.storyType} for ages ${show.ages.join(", ")} using ${show.sourcePack.provider} and the topic
      "${show.sourcePack.topic}".
    </p>
    <p><strong>Narrator:</strong> ${narratorLabel}</p>
    <p><strong>Continuity anchor:</strong> ${show.continuityAnchor}</p>
    <div class="architecture">
      <p class="section-title">Judge-facing stack</p>
      <p>${show.audioStack.headline}</p>
      <ul>
        ${show.judgeNotes.cloudflare.map((item) => `<li>${item}</li>`).join("")}
        ${show.judgeNotes.elevenlabs.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </div>
    <div class="episode-list">
      ${show.episodes.map(renderEpisode).join("")}
    </div>
    <div class="actions">
      <button class="primary" data-generate-live="${show.id}">Generate live script</button>
      ${renderAudioAction}
    </div>
  `;

  for (const episode of show.episodes) {
    if (episode.status !== "ready") {
      continue;
    }

    result
      .querySelector(`[data-play="${episode.id}"]`)
      .addEventListener("click", () => speakEpisode(episode.script));
    if (episode.audioUrl) {
      result
        .querySelector(`[data-play-audio="${episode.id}"]`)
        .addEventListener("click", () => {
          playAudioUrl(episode.audioUrl).catch(() => {
            window.alert("Could not play the rendered audio.");
          });
        });
      result
        .querySelector(`[data-download-audio="${episode.id}"]`)
        .addEventListener("click", () => {
          const link = document.createElement("a");
          link.href = episode.audioUrl;
          link.download = `${episode.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}.mp3`;
          link.click();
        });
    }
    result
      .querySelector(`[data-download="${episode.id}"]`)
      .addEventListener("click", () => downloadScript(episode.title, episode.script));
  }

  result
    .querySelector(`[data-generate-live="${show.id}"]`)
    .addEventListener("click", async () => {
      const response = await fetch(`/api/shows/${show.id}/generate-live`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) {
        window.alert(body.error ?? "Could not generate live script.");
        return;
      }
      renderShow(body.show);
    });

  if (elevenLabsReady) {
    result
      .querySelector(`[data-render-audio="${show.id}"]`)
      .addEventListener("click", async () => {
        const response = await fetch(`/api/shows/${show.id}/render-audio`, {
          method: "POST",
        });
        const body = await response.json();
        if (!response.ok) {
          window.alert(body.error ?? "Could not render audio.");
          return;
        }
        renderShow(body.show);
      });
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
    narratorPresetId: narratorPresetSelect.value,
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
