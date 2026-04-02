import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Compass,
  Globe,
  HelpCircle,
  Lightbulb,
  Mic,
  Play,
  Sparkles,
  Star,
  Wand2,
  X,
} from "lucide-react";

interface NarratorPreset {
  id: string;
  label: string;
  subtitle: string;
  tone: string;
  sampleLine: string;
  browserVoiceHints: string[];
  sampleUrl?: string;
}

interface SourcePackOption {
  id: string;
  label: string;
  subject: string;
}

interface ConfigResponse {
  durations: number[];
  modes: Array<{ id: string; label: string }>;
  sourcePacks: SourcePackOption[];
  narratorPresets: NarratorPreset[];
  elevenLabsReady: boolean;
}

interface UnlockQuiz {
  question: string;
  options: string[];
  explanation: string;
  passed: boolean;
  lastSelectedOptionIndex: number | null;
}

interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  status: string;
  durationTargetSec: number;
  continuitySummary: string;
  citationLabel: string;
  script: string;
  audioUrl: string | null;
}

interface ShowResponse {
  id: string;
  mode: string;
  ages: number[];
  storyType: string;
  narratorPresetId?: string;
  continuityAnchor: string;
  sourcePack: {
    provider: string;
    topic: string;
  };
  episodes: Episode[];
  unlockQuiz: UnlockQuiz | null;
}

interface FormState {
  kidName: string;
  kidAge: string;
  episodeLength: string;
  mode: string;
  sourcePackId: string;
  storyStyle: string;
  question: string;
  narratorPresetId: string;
}

const whyQuestions = [
  "Why is the sky blue?",
  "Why do cats purr?",
  "Why is the ocean salty?",
  "Why do stars twinkle?",
  "Why do leaves change color?",
  "Why does the moon change shape?",
];

const storyStyleOptions = [
  { value: "Adventure", label: "Epic Adventure" },
  { value: "Mystery", label: "Mystery Detective" },
  { value: "Whimsical", label: "Whimsical Dreamscape" },
  { value: "Documentary", label: "Mini Documentary" },
];

const floatingGlyphs = [
  { icon: Mic, x: "8%", y: "12%", rotate: -14, color: "#f4a11a", size: 34, delay: 0 },
  { icon: Compass, x: "29%", y: "10%", rotate: 10, color: "#8b76d6", size: 42, delay: 0.12 },
  { icon: Star, x: "84%", y: "13%", rotate: -10, color: "#e4a746", size: 30, delay: 0.2 },
  { icon: Lightbulb, x: "32%", y: "44%", rotate: -8, color: "#db9b62", size: 30, delay: 0.3 },
  { icon: Globe, x: "50%", y: "47%", rotate: 6, color: "#c5b18a", size: 34, delay: 0.4 },
  { icon: Wand2, x: "69%", y: "45%", rotate: 22, color: "#d7a57e", size: 36, delay: 0.5 },
  { icon: Mic, x: "10%", y: "72%", rotate: -24, color: "#d99c50", size: 40, delay: 0.62 },
  { icon: Play, x: "86%", y: "72%", rotate: 8, color: "#b0bf5a", size: 28, delay: 0.7 },
];

const cornerPieces = [
  "absolute left-0 top-0 h-28 w-28 bg-[#d9b183] [clip-path:polygon(0_0,100%_0,0_100%)]",
  "absolute right-0 top-0 h-20 w-32 bg-[#5ea0ee] [clip-path:polygon(18%_0,100%_0,100%_100%)]",
  "absolute right-0 top-0 h-28 w-20 bg-[#b7c95b] [clip-path:polygon(100%_0,100%_100%,0_0)]",
  "absolute bottom-0 left-0 h-28 w-28 bg-[#e6ddd0] [clip-path:polygon(0_100%,0_22%,100%_100%)]",
  "absolute bottom-0 right-0 h-24 w-72 bg-[linear-gradient(135deg,#b78ff1,#8d63ef)] [clip-path:polygon(32%_100%,100%_62%,100%_100%,0_100%)] opacity-90",
];

function PaperSticker(props: {
  icon: typeof Mic;
  color: string;
  size: number;
  rotate: number;
  className?: string;
}) {
  const Icon = props.icon;

  return (
    <div
      className={`relative inline-flex items-center justify-center bg-[#fffaf1] shadow-[0_14px_28px_rgba(106,70,35,0.12)] ${props.className ?? ""}`}
      style={{
        transform: `rotate(${props.rotate}deg)`,
        clipPath: "polygon(4% 2%, 98% 0, 100% 8%, 99% 96%, 95% 100%, 3% 98%, 0 94%, 1% 5%)",
        boxShadow: "0 0 0 6px #f8d3a4, 0 14px 30px rgba(94, 58, 24, 0.12)",
      }}
    >
      <Icon size={props.size} color={props.color} strokeWidth={1.7} />
    </div>
  );
}

function speakFallbackSample(preset: NarratorPreset) {
  if (!("speechSynthesis" in window)) {
    return;
  }

  const voices = window.speechSynthesis.getVoices();
  const selected =
    preset.browserVoiceHints
      .map((hint) => voices.find((voice) => voice.name.includes(hint)))
      .find(Boolean) ?? voices[0];

  const utterance = new SpeechSynthesisUtterance(preset.sampleLine);
  if (selected) {
    utterance.voice = selected;
  }
  utterance.rate = preset.id === "mac-playful-spark" ? 1.03 : 0.95;
  utterance.pitch = preset.id === "mac-bedtime-deep" ? 0.92 : 1.02;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function SelectField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-700">
      <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">
        {props.label}
      </span>
      <div className="relative">
        <select
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          className="w-full appearance-none rounded-2xl border-2 border-amber-200 bg-white/85 px-4 py-3 text-sm font-semibold text-stone-700 outline-none transition focus:border-violet-400"
        >
          {props.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={18}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
        />
      </div>
    </label>
  );
}

function ResultPanel(props: {
  show: ShowResponse;
  narratorLabel: string;
  isGeneratingLive: boolean;
  isRenderingAudio: boolean;
  onGenerateLive: () => Promise<void>;
  onRenderAudio: () => Promise<void>;
  onQuizAnswer: (index: number) => Promise<void>;
}) {
  return (
    <section className="mx-auto mt-12 w-full max-w-6xl">
      <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white/85 shadow-paper">
        <div className="grid gap-8 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-violet-700">
                {props.show.mode} mode
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-amber-700">
                {props.show.sourcePack.provider}
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                {props.narratorLabel}
              </span>
            </div>
            <h2 className="font-display text-3xl font-extrabold text-stone-900 md:text-4xl">
              {props.show.episodes[0]?.title}
            </h2>
            <p className="mt-3 max-w-2xl text-stone-600">
              Your first episode is ready. Rewrite it, render the audio, and keep going.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void props.onGenerateLive()}
                disabled={props.isGeneratingLive}
                className="rounded-full bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-75"
              >
                {props.isGeneratingLive ? "Generating..." : "Generate live script"}
              </button>
              <button
                type="button"
                onClick={() => void props.onRenderAudio()}
                disabled={props.isRenderingAudio}
                className="rounded-full bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-75"
              >
                {props.isRenderingAudio ? "Rendering..." : "Render studio audio"}
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              {props.show.episodes.map((episode) => (
                <article
                  key={episode.id}
                  className="rounded-[1.4rem] border border-stone-200 bg-stone-50/90 p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">
                      {episode.status} · {Math.round(episode.durationTargetSec / 60)} min
                    </p>
                    <p className="text-xs text-stone-400">{episode.citationLabel}</p>
                  </div>
                  <h3 className="text-lg font-bold text-stone-800">{episode.title}</h3>
                  <p className="mt-1 text-sm text-stone-500">{episode.continuitySummary}</p>
                  <p className="line-clamp-2 mt-3 text-sm leading-6 text-stone-700">
                    {episode.script}
                  </p>
                  {episode.audioUrl ? (
                    <div className="mt-4 space-y-3">
                      <audio className="w-full" controls src={episode.audioUrl} />
                      <a
                        href={episode.audioUrl}
                        className="inline-flex rounded-full border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 transition hover:border-violet-300"
                      >
                        Download audio
                      </a>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[1.5rem] border border-stone-200 bg-white/75 p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">
                Series note
              </p>
              <p className="mt-3 text-sm leading-6 text-stone-700">{props.show.continuityAnchor}</p>
              <div className="mt-4 space-y-2 text-sm text-stone-600">
                <p>
                  <span className="font-semibold text-stone-800">Source:</span>{" "}
                  {props.show.sourcePack.provider} - {props.show.sourcePack.topic}
                </p>
                <p>
                  <span className="font-semibold text-stone-800">Voice:</span> {props.narratorLabel}
                </p>
              </div>
            </div>
            {props.show.unlockQuiz && !props.show.unlockQuiz.passed ? (
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">
                  Unlock episode 2
                </p>
                <p className="mt-3 text-sm font-semibold text-stone-800">
                  {props.show.unlockQuiz.question}
                </p>
                <div className="mt-4 grid gap-2">
                  {props.show.unlockQuiz.options.map((option, index) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => void props.onQuizAnswer(index)}
                      className="rounded-2xl border border-emerald-200 bg-white/90 px-4 py-3 text-left text-sm font-semibold text-stone-700 transition hover:border-emerald-400"
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {props.show.unlockQuiz.lastSelectedOptionIndex !== null ? (
                  <p className="mt-3 text-sm text-stone-500">{props.show.unlockQuiz.explanation}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function CreateModal(props: {
  isOpen: boolean;
  onClose: () => void;
  config: ConfigResponse | null;
  form: FormState;
  setForm: (updater: (current: FormState) => FormState) => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  onPlaySample: (preset: NarratorPreset) => Promise<void>;
}) {
  const sourceOptions =
    props.config?.sourcePacks.map((sourcePack) => ({
      value: sourcePack.id,
      label: `${sourcePack.label} (${sourcePack.subject})`,
    })) ?? [];

  const narratorOptions =
    props.config?.narratorPresets.map((preset) => ({
      value: preset.id,
      label: preset.label,
    })) ?? [];

  return (
    <AnimatePresence>
      {props.isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/35 backdrop-blur-md"
            onClick={props.onClose}
            aria-label="Close modal"
          />
          <motion.div
            className="paper-noise relative z-10 my-3 w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-amber-200 bg-[#fbf3e8] shadow-paper max-h-[calc(100vh-1.5rem)] sm:max-h-[min(92vh,920px)]"
            initial={{ y: 36, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
          >
            <div className="absolute left-0 top-0 h-24 w-24 bg-violet-200/70 [clip-path:polygon(0_0,100%_0,0_100%)]" />
            <div className="absolute bottom-0 right-0 h-24 w-24 bg-amber-300/50 [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
            <div className="relative p-6 md:p-8">
              <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-violet-700">
                    <Sparkles size={18} />
                    <span className="text-xs font-extrabold uppercase tracking-[0.18em]">
                      Create your WhyCast
                    </span>
                  </div>
                  <h2 className="font-display text-4xl font-extrabold text-stone-900 md:text-5xl">
                    Build the show in under a minute.
                  </h2>
                  <p className="mt-2 max-w-xl text-sm text-stone-500 md:text-base">
                    Pick the question, choose the voice, and make the first episode.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={props.onClose}
                  className="rounded-full border border-stone-200 bg-white/80 p-2 text-stone-500 transition hover:text-stone-900"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-5">
                <label className="grid gap-2 text-sm font-semibold text-stone-700">
                  <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">
                    Question
                  </span>
                  <div className="relative">
                    <HelpCircle
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-400"
                    />
                    <input
                      value={props.form.question}
                      onChange={(event) =>
                        props.setForm((current) => ({ ...current, question: event.target.value }))
                      }
                      placeholder="Why is the sky blue?"
                      className="w-full rounded-2xl border-2 border-violet-200 bg-white/90 py-3 pl-11 pr-4 text-base font-semibold text-stone-800 outline-none transition focus:border-violet-400"
                    />
                  </div>
                </label>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-stone-700">
                    <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">
                      Kid name
                    </span>
                    <input
                      value={props.form.kidName}
                      onChange={(event) =>
                        props.setForm((current) => ({ ...current, kidName: event.target.value }))
                      }
                      placeholder="Luna"
                      className="w-full rounded-2xl border-2 border-amber-200 bg-white/85 px-4 py-3 text-sm font-semibold text-stone-700 outline-none transition focus:border-violet-400"
                    />
                  </label>
                  <SelectField
                    label="Kid age"
                    value={props.form.kidAge}
                    onChange={(value) =>
                      props.setForm((current) => ({ ...current, kidAge: value }))
                    }
                    options={Array.from({ length: 9 }, (_, index) => index + 4).map((age) => ({
                      value: String(age),
                      label: `${age} years old`,
                    }))}
                  />
                  <SelectField
                    label="Episode length"
                    value={props.form.episodeLength}
                    onChange={(value) =>
                      props.setForm((current) => ({ ...current, episodeLength: value }))
                    }
                    options={props.config?.durations.map((duration) => ({
                      value: String(duration),
                      label: `${duration} minutes`,
                    })) ?? []}
                  />
                  <SelectField
                    label="Show mode"
                    value={props.form.mode}
                    onChange={(value) =>
                      props.setForm((current) => ({ ...current, mode: value }))
                    }
                    options={props.config?.modes.map((mode) => ({
                      value: mode.id,
                      label: mode.label,
                    })) ?? []}
                  />
                  <SelectField
                    label="Trusted source"
                    value={props.form.sourcePackId}
                    onChange={(value) =>
                      props.setForm((current) => ({ ...current, sourcePackId: value }))
                    }
                    options={sourceOptions}
                  />
                  <SelectField
                    label="Story style"
                    value={props.form.storyStyle}
                    onChange={(value) =>
                      props.setForm((current) => ({ ...current, storyStyle: value }))
                    }
                    options={storyStyleOptions}
                  />
                  <div className="md:col-span-2">
                    <SelectField
                      label="Narrator voice"
                      value={props.form.narratorPresetId}
                      onChange={(value) =>
                        props.setForm((current) => ({
                          ...current,
                          narratorPresetId: value,
                        }))
                      }
                      options={narratorOptions}
                    />
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-stone-200 bg-white/70 p-4">
                  <div className="mb-3">
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">
                      Voice samples
                    </p>
                    <p className="text-sm text-stone-500">
                      Pick the one that feels right.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {props.config?.narratorPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => void props.onPlaySample(preset)}
                        className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-300"
                      >
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <span className="font-bold text-stone-800">{preset.label}</span>
                          <Play size={16} className="text-violet-600" />
                        </div>
                        <p className="text-sm text-stone-500">{preset.subtitle}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <motion.button
                  type="button"
                  onClick={() => void props.onSubmit()}
                  disabled={props.isSubmitting}
                  className="relative overflow-hidden rounded-[1.6rem] bg-[linear-gradient(135deg,#7c3aed_0%,#a855f7_28%,#ec4899_72%,#f59e0b_100%)] px-8 py-5 text-lg font-black text-white shadow-paper disabled:opacity-80"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {props.isSubmitting ? <Sparkles className="animate-spin" size={20} /> : <Wand2 size={20} />}
                    {props.isSubmitting ? "Crafting your WhyCast..." : "Generate show"}
                  </span>
                  <motion.span
                    className="absolute inset-0 bg-[linear-gradient(105deg,transparent_35%,rgba(255,255,255,0.26)_50%,transparent_65%)]"
                    animate={{ x: ["-100%", "180%"] }}
                    transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1 }}
                  />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function WhyCastLanding() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [show, setShow] = useState<ShowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingLive, setIsGeneratingLive] = useState(false);
  const [isRenderingAudio, setIsRenderingAudio] = useState(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);
  const [form, setForm] = useState<FormState>({
    kidName: "",
    kidAge: "7",
    episodeLength: "5",
    mode: "serialized",
    sourcePackId: "",
    storyStyle: "Adventure",
    question: "Why is the sky blue?",
    narratorPresetId: "",
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentQuestionIndex((current) => (current + 1) % whyQuestions.length);
    }, 2800);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadConfig() {
      const response = await fetch("/api/config");
      const data = (await response.json()) as ConfigResponse;
      setConfig(data);
      setForm((current) => ({
        ...current,
        episodeLength: current.episodeLength || String(data.durations[0] ?? 5),
        mode: current.mode || data.modes[0]?.id || "serialized",
        sourcePackId: current.sourcePackId || data.sourcePacks[0]?.id || "",
        narratorPresetId: current.narratorPresetId || data.narratorPresets[0]?.id || "",
      }));
    }

    void loadConfig().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Could not load the site config.");
    });
  }, []);

  const narratorLabel = useMemo(() => {
    return (
      config?.narratorPresets.find((preset) => preset.id === show?.narratorPresetId)?.label ??
      "Narrator"
    );
  }, [config, show?.narratorPresetId]);

  async function playSample(preset: NarratorPreset) {
    try {
      if (preset.sampleUrl && config?.elevenLabsReady) {
        audioElementRef.current?.pause();
        const audio = new Audio(preset.sampleUrl);
        audioElementRef.current = audio;
        await audio.play();
        return;
      }
      speakFallbackSample(preset);
    } catch {
      setError("Could not play the narrator sample.");
    }
  }

  async function generateShow() {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/shows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ages: [Number(form.kidAge)],
          durationMinutes: Number(form.episodeLength),
          mode: form.mode,
          sourcePackId: form.sourcePackId,
          narratorPresetId: form.narratorPresetId,
          storyType: `${form.storyStyle}: ${form.question}`.slice(0, 80),
          characters: `${form.kidName.trim() || "Luna"} and Mac`,
        }),
      });

      const data = (await response.json()) as ShowResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not generate the show.");
      }

      setShow(data);
      setIsModalOpen(false);
      window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not generate the show.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function refreshShow(path: string) {
    if (!show) {
      return;
    }

    const response = await fetch(path, {
      method: "POST",
    });
    const data = (await response.json()) as { error?: string; show: ShowResponse };
    if (!response.ok) {
      throw new Error(data.error ?? "Request failed.");
    }
    setShow(data.show);
  }

  async function handleGenerateLive() {
    if (!show) {
      return;
    }

    setIsGeneratingLive(true);
    setError(null);
    try {
      await refreshShow(`/api/shows/${show.id}/generate-live`);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not regenerate the live script.");
    } finally {
      setIsGeneratingLive(false);
    }
  }

  async function handleRenderAudio() {
    if (!show) {
      return;
    }

    setIsRenderingAudio(true);
    setError(null);
    try {
      await refreshShow(`/api/shows/${show.id}/render-audio`);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not render the audio.");
    } finally {
      setIsRenderingAudio(false);
    }
  }

  async function handleQuizAnswer(index: number) {
    if (!show) {
      return;
    }

    const response = await fetch(`/api/shows/${show.id}/quiz/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ selectedOptionIndex: index }),
    });

    const data = (await response.json()) as { error?: string; show: ShowResponse };
    if (!response.ok) {
      setError(data.error ?? "Could not submit the quiz.");
      return;
    }

    setShow(data.show);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5efe5] text-stone-900">
      {cornerPieces.map((className) => (
        <div key={className} className={className} />
      ))}
      {floatingGlyphs.map((glyph, index) => {
        const Icon = glyph.icon;
        return (
          <motion.div
            key={`${glyph.x}-${glyph.y}`}
            className="pointer-events-none absolute"
            style={{ left: glyph.x, top: glyph.y }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.22, scale: 1 }}
            transition={{ duration: 0.7, delay: glyph.delay }}
          >
            <motion.div
              animate={{
                y: [0, -7, 0, 4, 0],
                rotate: [glyph.rotate, glyph.rotate + 3, glyph.rotate],
              }}
              transition={{ duration: 5 + index * 0.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <PaperSticker
                icon={Icon}
                color={glyph.color}
                size={glyph.size}
                rotate={glyph.rotate}
                className="h-16 w-16 md:h-20 md:w-20"
              />
            </motion.div>
          </motion.div>
        );
      })}

      <main className="relative z-10 px-4 py-10 md:px-6 md:py-14">
        <section className="mx-auto max-w-6xl">
          <div className="relative min-h-[70vh] overflow-hidden rounded-[2rem] bg-[#fbf8f2] px-5 py-8 shadow-paper md:min-h-[760px] md:px-10 md:py-10">
            <div className="pointer-events-none absolute inset-x-0 top-7 flex items-center justify-center gap-10 text-stone-900">
              <span className="font-display text-3xl italic tracking-tight md:text-5xl">Explore</span>
              <span className="text-2xl font-black uppercase tracking-[0.12em] md:text-5xl">YOUR</span>
            </div>

            <div className="flex min-h-[60vh] flex-col items-center justify-end pb-20 text-center md:min-h-[680px] md:pb-10">
              <div className="mb-6 flex min-h-[2rem] items-center gap-2 text-base italic text-stone-500 md:text-xl">
                <HelpCircle size={18} className="text-violet-500" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={whyQuestions[currentQuestionIndex]}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35 }}
                  >
                    “{whyQuestions[currentQuestionIndex]}”
                  </motion.span>
                </AnimatePresence>
              </div>
            <motion.h1
                className="font-display text-6xl font-extrabold leading-[0.9] text-stone-900 md:text-[8.5rem]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
                Curiosity
            </motion.h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600 md:text-lg">
                Ask one good why. We turn it into a short story your kid will actually listen to.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
              <motion.button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="rounded-[1.6rem] bg-[linear-gradient(135deg,#7c3aed_0%,#a855f7_28%,#ec4899_72%,#f59e0b_100%)] px-8 py-5 text-lg font-black text-white shadow-paper"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.99 }}
              >
                <span className="flex items-center gap-3">
                  <Play size={20} fill="white" />
                  Create your WhyCast
                </span>
              </motion.button>
              <a
                href="#live-demo"
                className="rounded-[1.6rem] border border-stone-200 bg-white/80 px-8 py-5 text-lg font-bold text-stone-700 transition hover:border-violet-300"
              >
                  See one in action
              </a>
              </div>

              <p className="mt-6 text-sm font-medium text-stone-400">
                Free to try. No account needed. Made for ages 4-12.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-4xl text-center">
          <p className="text-sm uppercase tracking-[0.22em] text-stone-400">How it works</p>
          <p className="mt-4 text-lg leading-8 text-stone-600 md:text-xl">
            Ask the question. Pick the mood. Get a short episode. If they love it,
            unlock the next one.
          </p>
        </section>

        <section
          id="live-demo"
          ref={resultRef}
          className="mx-auto mt-16 max-w-6xl rounded-[2rem] border border-stone-200 bg-white/65 p-6 shadow-paper md:p-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-stone-500">
                Demo
              </p>
              <h2 className="mt-2 font-display text-4xl font-extrabold text-stone-900">
                Make one.
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="rounded-full bg-stone-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700"
            >
              Open the creator
            </button>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          {show ? (
            <ResultPanel
              show={show}
              narratorLabel={narratorLabel}
              isGeneratingLive={isGeneratingLive}
              isRenderingAudio={isRenderingAudio}
              onGenerateLive={handleGenerateLive}
              onRenderAudio={handleRenderAudio}
              onQuizAnswer={handleQuizAnswer}
            />
          ) : (
            <div className="mt-8 rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-6 text-center">
              <p className="text-lg leading-8 text-stone-600">
                Start with one question and make the first episode in under a minute.
              </p>
            </div>
          )}
        </section>
      </main>

      <CreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        config={config}
        form={form}
        setForm={(updater) => setForm((current) => updater(current))}
        onSubmit={generateShow}
        isSubmitting={isSubmitting}
        onPlaySample={playSample}
      />
    </div>
  );
}
