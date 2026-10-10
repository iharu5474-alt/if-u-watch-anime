import { Difficulty, GameMode, QuizQuestion } from '../types';
import { STOP } from './matcher';

const ANILIST_URL = 'https://graphql.anilist.co';

// Detect any Japanese characters (Hiragana, Katakana, Kanji)
export const JAPANESE_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
export function hasJapanese(text?: string | null): boolean {
  return Boolean(text && JAPANESE_REGEX.test(text));
}

// Clean title variants: remove subtitle after ':', remove "Season N / Part N / Cour N / The Final Season"
function generateAnimeAcceptedTitles(titles: { romaji?: string; english?: string; native?: string }, synonyms: string[] = []): string[] {
  const set = new Set<string>();

  const rawList = [
    titles.romaji,
    titles.english,
    titles.native,
    ...synonyms,
  ].filter((t): t is string => Boolean(t && t.trim().length > 0));

  for (const raw of rawList) {
    const clean = raw.trim();
    if (!clean) continue;
    set.add(clean);

    // Variant removing subtitle after ':' or '-'
    if (clean.includes(':')) {
      const beforeColon = clean.split(':')[0].trim();
      if (beforeColon.length >= 2) set.add(beforeColon);
    }

    // Variant removing "Season X", "Part X", "Cour X", "2nd Season", "The Final Season"
    const withoutSeason = clean
      .replace(/\s*(?:(?:The\s+)?Final\s+Season|Season\s+\d+|Part\s+\d+|Cour\s+\d+|\d+(?:st|nd|rd|th)\s+Season)\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (withoutSeason.length >= 2 && withoutSeason !== clean) {
      set.add(withoutSeason);
    }
  }

  return Array.from(set);
}

// Generate character accepted names:
// full, native, userPreferred, alternative names, swapped "Last, First", single name tokens of 3+ letters (excluding STOP)
function generateCharacterAcceptedNames(nameObj: {
  full?: string;
  native?: string;
  alternative?: string[];
  userPreferred?: string;
}): { accepted: string[]; display: string; alternativeList: string[] } {
  const set = new Set<string>();
  const alternativeList: string[] = [];

  const primaryNames = [nameObj.full, nameObj.userPreferred, nameObj.native].filter(
    (n): n is string => Boolean(n && n.trim().length > 0)
  );

  const alts = (nameObj.alternative || []).filter((n): n is string => Boolean(n && n.trim().length > 0));

  const allNames = [...primaryNames, ...alts];
  for (const n of allNames) {
    const clean = n.trim();
    if (!clean) continue;
    set.add(clean);

    // Only include in visible alternative list if it contains no Japanese characters
    if (!primaryNames.includes(clean) && !hasJapanese(clean)) {
      alternativeList.push(clean);
    }

    // Handle "Last, First" format
    if (clean.includes(',')) {
      const parts = clean.split(',').map((p) => p.trim());
      if (parts.length === 2 && parts[0] && parts[1]) {
        const swapped = `${parts[1]} ${parts[0]}`;
        set.add(swapped);
      }
    }
  }

  // Add individual name tokens of 3+ letters for characters only
  for (const n of primaryNames) {
    const tokens = n
      .replace(/[,.-]/g, ' ')
      .split(/\s+/)
      .map((t) => t.trim().toLowerCase());

    for (const token of tokens) {
      if (token.length >= 3 && !STOP.has(token)) {
        set.add(token);
      }
    }
  }

  // Display only non-Japanese Romaji/English
  const display =
    (!hasJapanese(nameObj.userPreferred) ? nameObj.userPreferred : '') ||
    (!hasJapanese(nameObj.full) ? nameObj.full : '') ||
    'Unknown Character';

  return { accepted: Array.from(set), display, alternativeList };
}

// Helper to compute hints
function computeHints(answer: string, context?: { series?: string; genres?: string[] }): { hint1: string; hint2: string } {
  const clean = answer.trim();
  const firstLetter = clean.charAt(0).toUpperCase();
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const hint1 = `Starts with "${firstLetter}" · ${wordCount} ${wordCount === 1 ? 'word' : 'words'}`;

  let hint2 = '';
  if (context?.series) {
    const topGenre = context.genres && context.genres.length > 0 ? context.genres[0] : 'Anime';
    hint2 = `From ${context.series} · Genre: ${topGenre}`;
  } else if (context?.genres && context.genres.length > 0) {
    hint2 = `Genre: ${context.genres.slice(0, 2).join(' / ')}`;
  } else {
    hint2 = `Length: ${clean.length} characters`;
  }

  return { hint1, hint2 };
}

// Session-level tracking so questions are never repeated
const seenQuestionIds = new Set<string>();

export function resetSeenQuestions(): void {
  seenQuestionIds.clear();
}

interface PageRange {
  min: number;
  max: number;
}

function getPageRange(diff: Difficulty): PageRange {
  switch (diff) {
    case 'easy':
      return { min: 1, max: 2 };
    case 'medium':
      return { min: 1, max: 10 };
    case 'hard':
      return { min: 1, max: 40 };
  }
}

// AniList GraphQL queries
const CHARACTER_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    characters(sort: FAVOURITES_DESC) {
      id
      name {
        full
        native
        alternative
        userPreferred
      }
      image {
        large
        medium
      }
      media(type: ANIME, sort: POPULARITY_DESC, perPage: 1) {
        nodes {
          id
          isAdult
          title {
            romaji
            english
            native
          }
          genres
          synonyms
          coverImage {
            extraLarge
            large
            medium
          }
        }
      }
    }
  }
}
`;

const ANIME_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
      id
      title {
        romaji
        english
        native
      }
      synonyms
      genres
      coverImage {
        extraLarge
        large
        medium
      }
    }
  }
}
`;

// Session cache helpers
function getSessionPoolKey(mode: GameMode, diff: Difficulty, page: number): string {
  return `anilist_pool_v1_${mode}_${diff}_p${page}`;
}

async function fetchWithRetry(query: string, variables: Record<string, unknown>, attempt = 0): Promise<any> {
  try {
    const res = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (res.status === 429) {
      const retryAfterHeader = res.headers.get('Retry-After');
      const waitMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : 3500;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        return fetchWithRetry(query, variables, attempt + 1);
      }
      throw new Error('AniList rate limited (HTTP 429). Please wait a moment.');
    }

    if (!res.ok) {
      throw new Error(`AniList returned HTTP status ${res.status}`);
    }

    const json = await res.json();
    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors[0]?.message || 'GraphQL query error');
    }
    return json.data;
  } catch (err) {
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return fetchWithRetry(query, variables, attempt + 1);
    }
    throw err;
  }
}

export async function fetchCharacterBatch(difficulty: Difficulty, specificPage?: number): Promise<QuizQuestion[]> {
  const range = getPageRange(difficulty);
  const page = specificPage ?? Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  const cacheKey = getSessionPoolKey('characters', difficulty, page);

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed: QuizQuestion[] = JSON.parse(cached);
      const filtered = parsed.filter((q) => !seenQuestionIds.has(q.id));
      if (filtered.length >= 5) {
        return filtered;
      }
    }
  } catch {}

  const data = await fetchWithRetry(CHARACTER_QUERY, { page, perPage: 50 });
  const rawChars = data?.Page?.characters || [];

  const questions: QuizQuestion[] = [];

  for (const char of rawChars) {
    const qId = `char-${char.id}`;
    if (seenQuestionIds.has(qId)) continue;

    const imgLarge = char.image?.large;
    const imgMedium = char.image?.medium || imgLarge;
    if (!imgLarge || imgLarge.includes('default')) continue;

    const mediaList = char.media?.nodes || [];
    if (mediaList.length === 0) continue;

    const primaryAnime = mediaList[0];
    if (primaryAnime.isAdult) continue;

    const { accepted, display, alternativeList } = generateCharacterAcceptedNames(char.name);
    const seriesTitle =
      (!hasJapanese(primaryAnime.title?.english) ? primaryAnime.title?.english : '') ||
      (!hasJapanese(primaryAnime.title?.romaji) ? primaryAnime.title?.romaji : '') ||
      'Anime';
    const hints = computeHints(display, { series: seriesTitle, genres: primaryAnime.genres });

    questions.push({
      id: qId,
      type: 'character',
      imageUrl: imgLarge,
      placeholderUrl: imgMedium,
      accepted,
      displayAnswer: display,
      subtitle: seriesTitle,
      genres: primaryAnime.genres || [],
      hint1: hints.hint1,
      hint2: hints.hint2,
      sourceTitle: seriesTitle,
      alternativeNames: alternativeList.slice(0, 4),
    });
  }

  // Shuffle questions
  questions.sort(() => Math.random() - 0.5);

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(questions));
  } catch {}

  return questions;
}

export async function fetchAnimeBatch(difficulty: Difficulty, specificPage?: number): Promise<QuizQuestion[]> {
  const range = getPageRange(difficulty);
  const page = specificPage ?? Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  const cacheKey = getSessionPoolKey('anime', difficulty, page);

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed: QuizQuestion[] = JSON.parse(cached);
      const filtered = parsed.filter((q) => !seenQuestionIds.has(q.id));
      if (filtered.length >= 5) {
        return filtered;
      }
    }
  } catch {}

  const data = await fetchWithRetry(ANIME_QUERY, { page, perPage: 50 });
  const rawMedia = data?.Page?.media || [];

  const questions: QuizQuestion[] = [];

  for (const anime of rawMedia) {
    const qId = `anime-${anime.id}`;
    if (seenQuestionIds.has(qId)) continue;

    const imgExtra = anime.coverImage?.extraLarge || anime.coverImage?.large;
    const imgMed = anime.coverImage?.medium || imgExtra;
    if (!imgExtra || imgExtra.includes('default')) continue;

    const accepted = generateAnimeAcceptedTitles(anime.title, anime.synonyms);
    const display =
      (!hasJapanese(anime.title?.english) ? anime.title?.english : '') ||
      (!hasJapanese(anime.title?.romaji) ? anime.title?.romaji : '') ||
      'Anime';
    const sub =
      anime.title?.english && anime.title.english !== display && !hasJapanese(anime.title.english)
        ? anime.title.english
        : anime.title?.romaji && anime.title.romaji !== display && !hasJapanese(anime.title.romaji)
        ? anime.title.romaji
        : '';
    const hints = computeHints(display, { genres: anime.genres });

    questions.push({
      id: qId,
      type: 'anime',
      imageUrl: imgExtra,
      placeholderUrl: imgMed,
      accepted,
      displayAnswer: display,
      subtitle: sub,
      genres: anime.genres || [],
      hint1: hints.hint1,
      hint2: hints.hint2,
      alternativeNames: accepted.filter((a) => a !== display && !hasJapanese(a)).slice(0, 4),
    });
  }

  questions.sort(() => Math.random() - 0.5);

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(questions));
  } catch {}

  return questions;
}

// Preloader cache for images
const preloadedImageUrls = new Set<string>();

export async function preloadImage(url: string, timeoutMs = 6000): Promise<boolean> {
  if (preloadedImageUrls.has(url)) return true;

  return new Promise<boolean>((resolve) => {
    let resolved = false;
    const img = new Image();

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    }, timeoutMs);

    img.onload = async () => {
      if (resolved) return;
      try {
        if ('decode' in img) {
          await img.decode();
        }
      } catch {}
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        preloadedImageUrls.add(url);
        resolve(true);
      }
    };

    img.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(false);
      }
    };

    img.src = url;
  });
}

export function preloadNextImages(questions: QuizQuestion[], count = 3): void {
  const targets = questions.slice(0, count);
  targets.forEach((q) => {
    preloadImage(q.imageUrl, 5000).catch(() => {});
  });
}

export function markQuestionAsSeen(id: string): void {
  seenQuestionIds.add(id);
}
