import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestion } from '../types';
import { BulbHintIcon, SkipPageIcon, SubmitArrowIcon } from './Icons';
import { soundManager } from '../services/sound';

interface QuizInputProps {
  question: QuizQuestion;
  isLocked: boolean;
  onSubmit: (answer: string, hintCount: number) => void;
  onSkip: () => void;
}

export const QuizInput: React.FC<QuizInputProps> = ({
  question,
  isLocked,
  onSubmit,
  onSkip,
}) => {
  const [typedAnswer, setTypedAnswer] = useState('');
  const [hintLevel, setHintLevel] = useState(0); // 0 = no hints, 1 = hint1, 2 = hint2
  const [isDashing, setIsDashing] = useState(false);
  const [isPageFlipping, setIsPageFlipping] = useState(false);
  const [isBulbGlowing, setIsBulbGlowing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and clear input on new question
  useEffect(() => {
    setTypedAnswer('');
    setHintLevel(0);
    setIsDashing(false);
    setIsPageFlipping(false);
    setIsBulbGlowing(false);
    if (!isLocked) {
      inputRef.current?.focus();
    }
  }, [question.id, isLocked]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLocked) return;

    const trimmed = typedAnswer.trim();
    if (!trimmed) return;

    setIsDashing(true);
    soundManager.playClick();
    setTimeout(() => {
      onSubmit(trimmed, hintLevel);
      setIsDashing(false);
    }, 120);
  };

  const handleSkip = () => {
    if (isLocked) return;
    setIsPageFlipping(true);
    soundManager.playClick();
    setTimeout(() => {
      onSkip();
      setIsPageFlipping(false);
    }, 180);
  };

  const handleHintClick = () => {
    if (isLocked) return;
    if (hintLevel < 2) {
      setHintLevel((prev) => prev + 1);
      setIsBulbGlowing(true);
      soundManager.playHint();
      setTimeout(() => setIsBulbGlowing(false), 600);
    }
  };

  return (
    <div className="w-full max-w-[500px] flex flex-col gap-1.5 select-none shrink-0">
      {/* 4. Question Text & Active Hint Bar */}
      <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-[#f4ecd8]/70 px-1">
        <span className="uppercase tracking-widest text-[#f4ecd8]/90 font-heading">
          {question.type === 'character' ? 'NAME THIS CHARACTER' : 'NAME THIS ANIME'}
        </span>
        {hintLevel > 0 && (
          <span className="text-[10px] text-[#e8412c] font-mono font-bold tracking-wider">
            HINT ACTIVE (-{hintLevel * 0.5} PTS)
          </span>
        )}
      </div>

      {/* Active Hint Dropdown Card if activated */}
      {hintLevel > 0 && (
        <div className="p-1.5 bg-[#181616] border border-[#e8412c] shadow-[2px_2px_0px_#0e0d0d] flex flex-col gap-0.5 text-[11px]">
          <p className="text-[#f4ecd8] font-medium leading-tight">{question.hint1}</p>
          {hintLevel >= 2 && question.hint2 && (
            <p className="text-[#f4ecd8]/90 font-medium pt-0.5 border-t border-[#f4ecd8]/20 leading-tight">
              {question.hint2}
            </p>
          )}
        </div>
      )}

      {/* 5. Answer Box + Buttons (Touch Targets >= 44px) */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            disabled={isLocked}
            value={typedAnswer}
            onChange={(e) => setTypedAnswer(e.target.value)}
            placeholder={
              question.type === 'character'
                ? 'Type character name...'
                : 'Type anime title...'
            }
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            className="w-full min-h-[44px] py-2 pl-3 pr-12 bg-[#181616] text-[#f4ecd8] placeholder-[#f4ecd8]/40 border-2 border-[#f4ecd8] focus:border-[#e8412c] focus:outline-none text-sm sm:text-base font-medium shadow-[3px_3px_0px_#0e0d0d] disabled:opacity-50"
          />

          {/* Submit Button (min 44px touch target) */}
          <button
            type="submit"
            disabled={isLocked || !typedAnswer.trim()}
            className="absolute right-1 top-1 bottom-1 min-w-[44px] min-h-[44px] px-2.5 bg-[#e8412c] text-[#f4ecd8] border border-[#0e0d0d] vermilion-sticker-btn flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Submit Answer"
          >
            <SubmitArrowIcon isDashing={isDashing} size={18} />
          </button>
        </div>

        {/* Utility Buttons: Hint and Skip (Both Min 44px Touch Targets) */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* Hint Button */}
          <button
            type="button"
            disabled={isLocked || hintLevel >= 2}
            onClick={handleHintClick}
            className={`min-h-[44px] py-2 px-3 bg-[#181616] text-[#f4ecd8] border border-[#f4ecd8]/60 hover:border-[#f4ecd8] sticker-btn flex items-center justify-center gap-1.5 text-xs font-bold uppercase disabled:opacity-40 cursor-pointer ${
              hintLevel > 0 ? 'border-[#e8412c]' : ''
            }`}
          >
            <BulbHintIcon isGlowing={isBulbGlowing || hintLevel > 0} size={16} />
            <span>
              {hintLevel === 0 ? 'HINT (-0.5)' : hintLevel === 1 ? 'MORE HINT' : 'MAX HINTS'}
            </span>
          </button>

          {/* Skip Button (Zero Japanese) */}
          <button
            type="button"
            disabled={isLocked}
            onClick={handleSkip}
            className={`min-h-[44px] py-2 px-3 bg-[#181616] text-[#f4ecd8] border border-[#f4ecd8]/60 hover:border-[#f4ecd8] sticker-btn flex items-center justify-center gap-1.5 text-xs font-bold uppercase disabled:opacity-40 cursor-pointer ${
              isPageFlipping ? 'animate-page-turn' : ''
            }`}
          >
            <SkipPageIcon size={16} />
            <span>SKIP</span>
          </button>
        </div>
      </form>
    </div>
  );
};
