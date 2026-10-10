import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { SplatterIcon, HankoCheckIcon } from './Icons';

interface MangaPanelProps {
  question: QuizQuestion;
  revealState: 'idle' | 'correct' | 'wrong';
  userTypedAnswer?: string;
  canReport?: boolean;
  hasReported?: boolean;
  onReportAnswer?: () => void;
  onNext?: () => void;
}

export const MangaPanel: React.FC<MangaPanelProps> = ({
  question,
  revealState,
  userTypedAnswer = '',
  canReport = true,
  hasReported = false,
  onReportAnswer,
  onNext,
}) => {
  const [isLargeLoaded, setIsLargeLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Reset image loading states whenever question.id changes
  useEffect(() => {
    setIsLargeLoaded(false);
    setLoadError(false);

    const img = new Image();
    img.src = question.imageUrl;
    img.onload = () => {
      setIsLargeLoaded(true);
    };
    img.onerror = () => {
      setLoadError(true);
    };
  }, [question.id, question.imageUrl]);

  return (
    <div className="relative h-full max-h-full aspect-[2/3] max-w-[min(90vw,calc(100vh*0.5))] flex items-center justify-center select-none">
      {/* Outer Manga-Panel Frame: thick cream border, -1deg rotation, frosted glass container */}
      <div
        className={`relative w-full h-full p-2 sm:p-2.5 border-3 sm:border-4 border-[#f4ecd8] bg-[#f4ecd8]/[0.08] backdrop-blur-[6px] shadow-[5px_5px_0px_#0e0d0d] -rotate-1 transition-transform duration-200 flex flex-col ${
          revealState === 'idle' ? 'panel-slap' : ''
        } ${revealState === 'wrong' ? 'animate-manga-shake' : ''}`}
      >
        {/* Subtle Panel Corner Registration Marks */}
        <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-[#f4ecd8]" />
        <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-[#f4ecd8]" />
        <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-[#f4ecd8]" />
        <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-[#f4ecd8]" />

        {/* Panel Type Kicker Badge (Zero Japanese) */}
        <div className="absolute -top-3.5 right-3 z-20 px-2 py-0.5 bg-[#0e0d0d] border border-[#f4ecd8] text-[10px] font-heading text-[#f4ecd8] uppercase shadow-[2px_2px_0px_#e8412c]">
          {question.type === 'character' ? 'CHARACTER' : 'ANIME COVER'}
        </div>

        {/* Fixed 2:3 Aspect Ratio Image Frame with contain */}
        <div className="relative w-full h-full overflow-hidden bg-[#181616] border border-[#f4ecd8]/40 flex items-center justify-center">
          {/* Shimmer skeleton while loading */}
          {!isLargeLoaded && !loadError && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#f4ecd8]/10 to-transparent animate-pulse z-10 pointer-events-none" />
          )}

          {/* Low-res blurred placeholder */}
          {question.placeholderUrl && !isLargeLoaded && (
            <img
              src={question.placeholderUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover filter blur-md scale-105 opacity-80"
            />
          )}

          {/* High-res Main Image */}
          <img
            key={question.id}
            src={loadError ? question.placeholderUrl : question.imageUrl}
            alt="Manga quiz target"
            fetchPriority="high"
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLargeLoaded || loadError ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Halftone halftone-dot screen overlay for authentic manga print texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle, #000 1.2px, transparent 1.2px)',
              backgroundSize: '8px 8px',
            }}
          />

          {/* CORRECT Reveal Overlay: Appears INSIDE the image panel */}
          {revealState === 'correct' && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-3 bg-black/60 backdrop-blur-[3px] text-center">
              {/* Sakura Petals Burst */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 14 }).map((_, idx) => {
                  const angle = (idx * 360) / 14;
                  const distance = 70 + (idx % 3) * 25;
                  const x = Math.cos((angle * Math.PI) / 180) * distance;
                  const y = Math.sin((angle * Math.PI) / 180) * distance;
                  return (
                    <span
                      key={idx}
                      className="absolute left-1/2 top-1/2 text-[#ff8070] text-sm animate-ping"
                      style={{
                        transform: `translate(${x}px, ${y}px) rotate(${idx * 45}deg)`,
                        animationDuration: `${0.6 + (idx % 4) * 0.2}s`,
                      }}
                    >
                      🌸
                    </span>
                  );
                })}
              </div>

              {/* Red Hanko Stamp (No Japanese) */}
              <div className="relative animate-hanko-stamp p-2.5 sm:p-3 bg-[#e8412c]/95 text-[#f4ecd8] border-3 border-[#f4ecd8] shadow-[0_0_20px_rgba(232,65,44,0.6)] -rotate-3 mb-2">
                <div className="border border-dashed border-[#f4ecd8] px-3 py-1 flex flex-col items-center">
                  <span className="font-heading text-xl sm:text-2xl tracking-widest uppercase">
                    CORRECT
                  </span>
                  <span className="text-[9px] tracking-wider font-bold mt-0.5">
                    PERFECT HIT
                  </span>
                </div>
              </div>

              {/* Revealed Answer Box */}
              <div className="w-full max-w-[280px] p-2.5 bg-[#181616]/95 border-2 border-[#f4ecd8] shadow-[3px_3px_0px_#0e0d0d] mt-1">
                <p className="text-[10px] uppercase tracking-widest text-[#e8412c] font-bold">
                  ANSWER CONFIRMED
                </p>
                <h3 className="font-heading text-sm sm:text-base text-[#f4ecd8] mt-0.5 leading-snug">
                  {question.displayAnswer}
                </h3>
                {question.subtitle && (
                  <p className="text-[11px] text-[#f4ecd8]/70 mt-0.5 line-clamp-1">
                    {question.subtitle}
                  </p>
                )}
              </div>

              {/* Next Question Button (Min 44px Touch Target) */}
              {onNext && (
                <button
                  type="button"
                  onClick={onNext}
                  className="mt-3 w-full max-w-[280px] min-h-[44px] py-2.5 px-4 bg-[#f4ecd8] text-[#0e0d0d] font-heading text-xs tracking-wider uppercase border-2 border-[#0e0d0d] sticker-btn hover:bg-white flex items-center justify-center cursor-pointer"
                >
                  NEXT QUESTION ➔
                </button>
              )}
            </div>
          )}

          {/* WRONG Reveal Overlay: Appears INSIDE the image panel */}
          {revealState === 'wrong' && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-3 bg-black/65 backdrop-blur-[3px] text-center">
              {/* Ink Splatter */}
              <div className="absolute top-3 pointer-events-none opacity-80 scale-75">
                <SplatterIcon size={80} />
              </div>

              {/* Torn-paper Banner for Answer Reveal (Inside panel, Zero Japanese) */}
              <div className="relative z-10 w-full max-w-[300px] torn-edge p-3 bg-[#f4ecd8] text-[#0e0d0d] border-2 border-[#0e0d0d] shadow-[4px_4px_0px_#e8412c]">
                <div className="flex items-center justify-between border-b border-[#0e0d0d]/20 pb-1 mb-1.5">
                  <span className="font-heading text-[10px] tracking-wider text-[#e8412c] uppercase">
                    WRONG ANSWER
                  </span>
                  <span className="text-[9px] font-bold tracking-wider text-[#0e0d0d]/70">
                    CORRECT:
                  </span>
                </div>

                <h3 className="font-heading text-sm sm:text-base text-[#0e0d0d] leading-snug">
                  {question.displayAnswer}
                </h3>

                {question.subtitle && (
                  <p className="text-[10px] text-[#0e0d0d]/80 mt-0.5 font-medium line-clamp-1">
                    {question.subtitle}
                  </p>
                )}

                {/* List alternative accepted spellings without Japanese */}
                {question.alternativeNames && question.alternativeNames.length > 0 && (
                  <div className="mt-1.5 pt-1 border-t border-[#0e0d0d]/15">
                    <p className="text-[9px] uppercase font-bold tracking-wider text-[#0e0d0d]/60 mb-0.5">
                      Also Accepted:
                    </p>
                    <div className="flex flex-wrap justify-center gap-1 text-[10px] text-[#0e0d0d]/85">
                      {question.alternativeNames.slice(0, 3).map((alt, i) => (
                        <span
                          key={i}
                          className="inline-block px-1.5 py-0.5 bg-[#0e0d0d]/10 font-medium text-[9px]"
                        >
                          {alt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Report Answer Button & Next Question Button (Min 44px Touch Targets) */}
                <div className="mt-2.5 pt-1.5 border-t border-[#0e0d0d]/20 flex flex-col gap-1.5">
                  {hasReported ? (
                    <div className="w-full min-h-[38px] py-1.5 px-3 bg-[#0e0d0d] text-[#f4ecd8] border border-[#f4ecd8]/40 flex items-center justify-center gap-1.5 -rotate-1 shadow-[2px_2px_0px_#0e0d0d]">
                      <span className="font-heading text-[10px] tracking-wider text-[#e8412c] uppercase">
                        THANKS, NOTED
                      </span>
                    </div>
                  ) : canReport && onReportAnswer && userTypedAnswer.trim().length > 0 ? (
                    <button
                      type="button"
                      onClick={onReportAnswer}
                      className="w-full min-h-[44px] py-2 px-3 bg-[#0e0d0d] text-[#f4ecd8] hover:bg-[#1a1717] text-[11px] font-bold tracking-wider uppercase border border-[#0e0d0d] sticker-btn flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Report my answer</span>
                    </button>
                  ) : null}

                  {onNext && (
                    <button
                      type="button"
                      onClick={onNext}
                      className="w-full min-h-[44px] py-2 px-3 bg-[#0e0d0d] text-[#f4ecd8] font-heading text-[11px] tracking-wider uppercase border border-[#f4ecd8] sticker-btn hover:bg-[#1a1717] flex items-center justify-center cursor-pointer"
                    >
                      NEXT QUESTION ➔
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
