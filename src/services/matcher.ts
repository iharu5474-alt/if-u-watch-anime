/**
 * Answer Matching & Override Engine for Manga Quiz
 */

export const STOP = new Set(['the', 'of', 'no', 'and', 'san', 'kun', 'chan']);

export const norm = (s: string | undefined | null): string =>
  (s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function lev(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let p = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const c = [i];
    for (let j = 1; j <= n; j++) {
      c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    p = c;
  }
  return p[n];
}

export function isCorrect(input: string, accepted: string[]): boolean {
  const a = norm(input);
  if (!a) return false;
  const aSorted = a.split(' ').sort().join(' ');

  return accepted.some((raw) => {
    const c = norm(raw);
    if (!c) return false;
    if (a === c) return true;
    const cSorted = c.split(' ').sort().join(' ');
    if (aSorted === cSorted) return true; // word order doesn't matter
    const limit = c.length >= 12 ? 2 : c.length >= 5 ? 1 : 0; // typo tolerance
    return limit > 0 && (lev(a, c) <= limit || lev(aSorted, cSorted) <= limit);
  });
}

// Check if a reported answer is sufficiently similar to accepted answers:
// - Levenshtein distance <= 3 after normalization (or word-order sorted)
// - OR shares a name word of 3+ letters with an accepted answer
export function isSimilarAnswer(input: string, accepted: string[]): boolean {
  const a = norm(input);
  if (!a) return false;
  const aSorted = a.split(' ').sort().join(' ');
  const inputWords = a.split(' ').filter((w) => w.length >= 3 && !STOP.has(w));

  return accepted.some((raw) => {
    const c = norm(raw);
    if (!c) return false;

    // 1. Levenshtein distance <= 3
    if (lev(a, c) <= 3) return true;
    const cSorted = c.split(' ').sort().join(' ');
    if (lev(aSorted, cSorted) <= 3) return true;

    // 2. Shares a name word of 3+ letters
    const acceptedWords = c.split(' ').filter((w) => w.length >= 3 && !STOP.has(w));
    if (inputWords.some((w) => acceptedWords.includes(w))) {
      return true;
    }

    return false;
  });
}

// LocalStorage User Override Store
const OVERRIDES_KEY = 'manga_quiz_answer_overrides_v1';

export interface AnswerOverride {
  questionId: string;
  userAnswer: string;
  acceptedAnswer: string;
  timestamp: number;
}

export function getStoredOverrides(): AnswerOverride[] {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Only saves if similar, and overrides only ever apply to the same question id
export function saveOverrideIfSimilar(
  questionId: string,
  userAnswer: string,
  acceptedList: string[],
  acceptedDisplay: string
): boolean {
  const cleanUser = userAnswer.trim();
  if (!cleanUser) return false;

  if (!isSimilarAnswer(cleanUser, acceptedList)) {
    return false;
  }

  try {
    const current = getStoredOverrides();
    const exists = current.some(
      (o) => o.questionId === questionId && norm(o.userAnswer) === norm(cleanUser)
    );
    if (!exists) {
      current.push({
        questionId,
        userAnswer: cleanUser,
        acceptedAnswer: acceptedDisplay,
        timestamp: Date.now(),
      });
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(current));
    }
    return true;
  } catch (err) {
    console.error('Failed to save override:', err);
    return false;
  }
}

export function checkWithOverrides(
  input: string,
  accepted: string[],
  questionId: string
): boolean {
  if (isCorrect(input, accepted)) return true;

  // Overrides only ever apply to the same question id, never globally
  const overrides = getStoredOverrides();
  const normalizedInput = norm(input);
  if (!normalizedInput) return false;

  return overrides.some(
    (o) => o.questionId === questionId && norm(o.userAnswer) === normalizedInput
  );
}
