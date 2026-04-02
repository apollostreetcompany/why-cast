export type DurationCompliance = "pass" | "short" | "long";

export interface ScriptTimingAnalysis {
  wordCount: number;
  estimatedDurationSec: number;
  targetWordCount: number;
  minWordCount: number;
  maxWordCount: number;
  durationCompliance: DurationCompliance;
}

export function countWords(text: string): number {
  return (text.trim().match(/\b[\w'-]+\b/g) ?? []).length;
}

export function estimateDurationSec(wordCount: number, wordsPerMinute: number): number {
  return Math.round((wordCount / wordsPerMinute) * 60);
}

export function analyzeScriptTiming(
  text: string,
  durationMinutes: number,
  wordsPerMinute: number,
): ScriptTimingAnalysis {
  const wordCount = countWords(text);
  const targetWordCount = Math.round(durationMinutes * wordsPerMinute);
  const minWordCount = Math.round(targetWordCount * 0.88);
  const maxWordCount = Math.round(targetWordCount * 1.16);
  const estimatedDurationSec = estimateDurationSec(wordCount, wordsPerMinute);
  const durationCompliance =
    wordCount < minWordCount ? "short" : wordCount > maxWordCount ? "long" : "pass";

  return {
    wordCount,
    estimatedDurationSec,
    targetWordCount,
    minWordCount,
    maxWordCount,
    durationCompliance,
  };
}
