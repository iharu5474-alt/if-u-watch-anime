export type GameMode = 'characters' | 'anime' | 'mixed';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuizQuestion {
  id: string; // Unique e.g. "char-1234" or "anime-5678"
  type: 'character' | 'anime';
  imageUrl: string;
  placeholderUrl: string;
  accepted: string[];
  displayAnswer: string;
  subtitle: string;
  genres: string[];
  hint1: string; // first letter + word count
  hint2: string; // anime top genre or source title
  sourceTitle?: string;
  alternativeNames?: string[];
}

export interface SoundConfig {
  open?: string;
  correct?: string;
  wrong?: string;
  hint?: string;
  click?: string;
  milestone?: string;
}
