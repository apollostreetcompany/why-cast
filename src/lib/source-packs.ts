import type { SourcePack } from "../types";

export const sourcePacks: SourcePack[] = [
  {
    id: "khan-sci-photosynthesis",
    provider: "Khan Academy",
    topic: "Photosynthesis",
    subject: "science",
    citationLabel: "Khan Academy - Photosynthesis",
    concept: "how plants make food from sunlight, water, and carbon dioxide",
    transcriptExcerpt:
      "Photosynthesis is the process plants use to turn sunlight into chemical energy. Plants take in carbon dioxide from the air and water from the soil. Using light energy, they build glucose and release oxygen."
  },
  {
    id: "khan-math-fractions",
    provider: "Khan Academy",
    topic: "Fractions",
    subject: "math",
    citationLabel: "Khan Academy - Intro to Fractions",
    concept: "how fractions describe parts of a whole",
    transcriptExcerpt:
      "Fractions help us describe equal parts of a whole. The numerator tells us how many parts we have, and the denominator tells us how many equal parts make the whole."
  },
  {
    id: "khan-hist-ancient-egypt",
    provider: "Khan Academy",
    topic: "Ancient Egypt",
    subject: "history",
    citationLabel: "Khan Academy - Ancient Egypt and the Nile",
    concept: "how the Nile shaped daily life and civilization in Ancient Egypt",
    transcriptExcerpt:
      "Ancient Egyptian civilization depended on the Nile River. The Nile provided water, fertile soil, and transportation, which allowed farming, trade, and large cities to grow."
  }
];

export function getSourcePack(id: string): SourcePack {
  const sourcePack = sourcePacks.find((item) => item.id === id);

  if (!sourcePack) {
    throw new Error(`Unknown source pack: ${id}`);
  }

  return sourcePack;
}
