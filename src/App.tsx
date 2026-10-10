import { useState, useEffect, useRef, useCallback } from 'react';
import { Difficulty, GameMode, QuizQuestion } from './types';
import { EntryScreen } from './components/EntryScreen';
import { MangaPanel } from './components/MangaPanel';
import { QuizInput } from './components/QuizInput';
import { StatsBar } from './components/StatsBar';
import { ReloadIcon } from './components/Icons';
import {
  fetchAnimeBatch,
  fetchCharacterBatch,
  preloadNextImages,
  preloadImage,
  markQuestionAsSeen,
  resetSeenQuestions,
} from './services/anilist';
import { checkWithOverrides, saveOverrideIfSimilar } from './services/matcher';
import { soundManager } from './services/sound';

export default function App() {
  const [hasEntered, setHasEntered] = useState(false);
  const [mode, setMode] = useState<GameMode>('mixed');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  // Stats state
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('manga_quiz_best_streak');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  // Question Queue State (Anti mix-up architecture)
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const queueRef = useRef<QuizQuestion[]>([]);
  const isFetchingRef = useRef<boolean>(false);

  // Reveal & Interaction State
  const [revealState, setRevealState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [lastUserTyped, setLastUserTyped] = useState<string>('');
  const [lastHintDeduction, setLastHintDeduction] = useState<number>(0);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState<boolean>(true);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Report counter (Max 3 reports per session)
  const [sessionReportCount, setSessionReportCount] = useState<number>(0);
  const [hasReportedCurrent, setHasReportedCurrent] = useState<boolean>(false);

  // Save best streak
  const updateStreak = useCallback((newStreak: number) => {
    setStreak(newStreak);
    setBestStreak((prevBest) => {
      if (newStreak > prevBest) {
        try {
          localStorage.setItem('manga_quiz_best_streak', newStreak.toString());
        } catch {}
        return newStreak;
      }
      return prevBest;
    });
  }, []);

  // Reset all stats (Requirement 5)
  const handleResetAll = useCallback(() => {
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setSessionReportCount(0);
    try {
      localStorage.removeItem('manga_quiz_best_streak');
      localStorage.removeItem('manga_quiz_score');
    } catch {}
  }, []);

  // Fetch a batch of questions for current mode/difficulty
  const fetchBatch = useCallback(
    async (selectedMode: GameMode, selectedDiff: Difficulty): Promise<QuizQuestion[]> => {
      if (selectedMode === 'characters') {
        return fetchCharacterBatch(selectedDiff);
      } else if (selectedMode === 'anime') {
        return fetchAnimeBatch(selectedDiff);
      } else {
        // Mixed mode: fetch both and interleave
        const [chars, anime] = await Promise.all([
          fetchCharacterBatch(selectedDiff),
          fetchAnimeBatch(selectedDiff),
        ]);
        const mixed: QuizQuestion[] = [];
        const maxLen = Math.max(chars.length, anime.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < chars.length) mixed.push(chars[i]);
          if (i < anime.length) mixed.push(anime[i]);
        }
        return mixed;
      }
    },
    []
  );

  // Advance to next question in queue
  const advanceToNext = useCallback(async () => {
    setRevealState('idle');
    setLastUserTyped('');
    setLastHintDeduction(0);
    setHasReportedCurrent(false);

    // If queue is running low (< 10), prefetch next batch in background
    if (queueRef.current.length < 10 && !isFetchingRef.current) {
      isFetchingRef.current = true;
      fetchBatch(mode, difficulty)
        .then((newBatch) => {
          queueRef.current.push(...newBatch);
          preloadNextImages(queueRef.current, 3);
        })
        .catch((err) => {
          console.warn('Background batch prefetch error:', err);
        })
        .finally(() => {
          isFetchingRef.current = false;
        });
    }

    if (queueRef.current.length === 0) {
      setIsLoadingQuestion(true);
      try {
        const fresh = await fetchBatch(mode, difficulty);
        queueRef.current = fresh;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Network error';
        setNetworkError(errorMsg);
        setIsLoadingQuestion(false);
        return;
      }
    }

    const nextQ = queueRef.current.shift();
    if (!nextQ) {
      setNetworkError('Failed to load anime question. Please retry.');
      return;
    }

    markQuestionAsSeen(nextQ.id);
    setCurrentQuestion(nextQ);
    setIsLoadingQuestion(false);
    preloadNextImages(queueRef.current, 3);

    // 6-second fallback check: if image doesn't load within 6s, skip silently
    preloadImage(nextQ.imageUrl, 6000).then((loaded) => {
      if (!loaded && currentQuestion?.id === nextQ.id && revealState === 'idle') {
        advanceToNext();
      }
    });
  }, [mode, difficulty, fetchBatch, currentQuestion?.id, revealState]);

  // Initial Load or Mode/Difficulty change
  useEffect(() => {
    let isCancelled = false;
    resetSeenQuestions();
    queueRef.current = [];
    setCurrentQuestion(null);
    setRevealState('idle');
    setIsLoadingQuestion(true);
    setNetworkError(null);

    fetchBatch(mode, difficulty)
      .then((batch) => {
        if (isCancelled) return;
        if (batch.length === 0) {
          throw new Error('No items returned for this difficulty.');
        }
        queueRef.current = batch;
        const first = queueRef.current.shift()!;
        markQuestionAsSeen(first.id);
        setCurrentQuestion(first);
        preloadNextImages(queueRef.current, 3);
        setIsLoadingQuestion(false);
      })
      .catch((err: unknown) => {
        if (isCancelled) return;
        const errorMsg = err instanceof Error ? err.message : 'Failed to load AniList data.';
        setNetworkError(errorMsg);
        setIsLoadingQuestion(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [mode, difficulty, fetchBatch]);

  // Handle Answer Submission (Requirement 6 Trigger points)
  const handleSubmitAnswer = (typedText: string, hintCount: number) => {
    if (!currentQuestion || revealState !== 'idle') return;

    setLastUserTyped(typedText);
    const hintCost = hintCount * 0.5;
    setLastHintDeduction(hintCost);

    const isMatch = checkWithOverrides(typedText, currentQuestion.accepted, currentQuestion.id);

    if (isMatch) {
      // CORRECT ANSWER
      setRevealState('correct');
      const earned = Math.max(0.5, 1 - hintCost);
      setScore((s) => Math.round((s + earned) * 10) / 10);
      const nextStreak = streak + 1;
      updateStreak(nextStreak);

      // Play correct sound
      if (nextStreak > 0 && nextStreak % 5 === 0) {
        soundManager.playMilestone();
      } else {
        soundManager.playCorrect();
      }

      // Auto-advance after 2.4s if not tapped
      const advanceTimer = setTimeout(() => {
        advanceToNext();
      }, 2400);

      return () => clearTimeout(advanceTimer);
    } else {
      // WRONG ANSWER
      setRevealState('wrong');
      const streakBeforeBreak = streak;
      updateStreak(0);
      // If broken streak of 3 or more, triggers wrong-streak.mp3
      soundManager.playWrong(streakBeforeBreak);
    }
  };

  // Handle "Report my answer" (Requirement 1, 2, 3, 4, 5)
  // Does NOT change score, streak, or best streak. Overrides only apply to this question id.
  const handleReportAnswer = () => {
    if (!currentQuestion || !lastUserTyped || sessionReportCount >= 3 || hasReportedCurrent) return;

    saveOverrideIfSimilar(
      currentQuestion.id,
      lastUserTyped,
      currentQuestion.accepted,
      currentQuestion.displayAnswer
    );

    setHasReportedCurrent(true);
    setSessionReportCount((prev) => prev + 1);
    soundManager.playClick();
  };

  // Handle Skip
  const handleSkip = () => {
    if (!currentQuestion || revealState !== 'idle') return;
    const streakBeforeBreak = streak;
    updateStreak(0);
    // If broken streak of 3 or more, triggers wrong-streak.mp3
    soundManager.playWrong(streakBeforeBreak);
    setRevealState('wrong');
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full overflow-hidden flex flex-col justify-between manga-halftone-bg paper-grain pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] select-none">
      {/* Opening Entry Screen */}
      {!hasEntered && (
        <EntryScreen
          onEnter={() => {
            setHasEntered(true);
          }}
        />
      )}

      {/* Main Single-Viewport Layout (Zero Scrolling) */}
      <main className="w-full max-w-[520px] mx-auto h-full flex flex-col justify-between px-3 py-2 sm:py-3 overflow-hidden">
        {/* Network Error Overlay */}
        {networkError && (
          <div className="m-auto w-full p-5 bg-[#181616] border-4 border-[#e8412c] text-center shadow-[6px_6px_0px_#0e0d0d] -rotate-1">
            <span className="font-heading text-xs tracking-widest text-[#e8412c] uppercase block mb-1">
              NETWORK INTERRUPTED
            </span>
            <h2 className="font-heading text-lg text-[#f4ecd8] mb-2">ANILIST SIGNAL LOST</h2>
            <p className="text-xs text-[#f4ecd8]/70 mb-4">{networkError}</p>
            <button
              onClick={() => {
                setNetworkError(null);
                setIsLoadingQuestion(true);
                fetchBatch(mode, difficulty)
                  .then((batch) => {
                    queueRef.current = batch;
                    const first = queueRef.current.shift()!;
                    markQuestionAsSeen(first.id);
                    setCurrentQuestion(first);
                    setIsLoadingQuestion(false);
                  })
                  .catch((err: unknown) => {
                    const errorMsg = err instanceof Error ? err.message : 'Retry failed';
                    setNetworkError(errorMsg);
                    setIsLoadingQuestion(false);
                  });
              }}
              className="px-5 py-2.5 bg-[#e8412c] text-[#f4ecd8] font-heading text-xs border border-[#0e0d0d] sticker-btn inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ReloadIcon size={14} />
              <span>RETRY CONNECTION</span>
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {!networkError && isLoadingQuestion && !currentQuestion && (
          <div className="m-auto flex flex-col items-center gap-2">
            <div className="w-10 h-10 border-3 border-[#f4ecd8] border-t-[#e8412c] animate-spin -rotate-6" />
            <span className="font-heading text-xs tracking-wider text-[#f4ecd8]/80 animate-pulse">
              LOADING MANGA BATCH...
            </span>
          </div>
        )}

        {/* Active Game View: Layout top to bottom */}
        {!networkError && currentQuestion && (
          <div className="w-full h-full flex flex-col justify-between overflow-hidden">
            {/* Top Zone: 1. Slim Header + 2. Stats Row */}
            <StatsBar
              score={score}
              streak={streak}
              bestStreak={bestStreak}
              mode={mode}
              difficulty={difficulty}
              onModeChange={(m) => setMode(m)}
              onDifficultyChange={(d) => setDifficulty(d)}
              onResetStats={handleResetAll}
            />

            {/* Middle Zone: 3. Image Panel (takes remaining space, flex-1 min-h-0) */}
            <div className="flex-1 min-h-0 w-full flex items-center justify-center py-1 sm:py-1.5 overflow-hidden">
              <MangaPanel
                key={currentQuestion.id}
                question={currentQuestion}
                revealState={revealState}
                userTypedAnswer={lastUserTyped}
                canReport={sessionReportCount < 3}
                hasReported={hasReportedCurrent}
                onReportAnswer={handleReportAnswer}
                onNext={advanceToNext}
              />
            </div>

            {/* Bottom Zone: 4. Question Text + 5. Answer Box & Buttons */}
            <QuizInput
              question={currentQuestion}
              isLocked={revealState !== 'idle'}
              onSubmit={handleSubmitAnswer}
              onSkip={handleSkip}
            />
          </div>
        )}
      </main>
    </div>
  );
}
