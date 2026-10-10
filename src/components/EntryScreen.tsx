import React, { useState, useEffect } from 'react';
import { soundManager } from '../services/sound';

interface EntryScreenProps {
  onEnter: () => void;
}

export const EntryScreen: React.FC<EntryScreenProps> = ({ onEnter }) => {
  const [isExiting, setIsExiting] = useState(false);

  // Preload audio files early on mount while context is suspended
  useEffect(() => {
    soundManager.preload();
  }, []);

  const handleTap = async () => {
    if (isExiting) return;
    setIsExiting(true);
    // Unlock AudioContext and wait for preload before playing open sound
    await soundManager.unlockAudio();
    soundManager.playOpen();

    setTimeout(() => {
      onEnter();
    }, 450);
  };

  return (
    <div
      onClick={handleTap}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 cursor-pointer select-none manga-halftone-bg transition-opacity duration-500 ${
        isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      {/* Manga Speed Lines radiating in background with parallax drift */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <svg
          viewBox="0 0 800 800"
          className="w-[160vw] h-[160vw] max-w-[1200px] max-h-[1200px] animate-speed-lines opacity-20"
        >
          {Array.from({ length: 36 }).map((_, i) => {
            const angle = (i * 360) / 36;
            return (
              <line
                key={i}
                x1="400"
                y1="400"
                x2={400 + 420 * Math.cos((angle * Math.PI) / 180)}
                y2={400 + 420 * Math.sin((angle * Math.PI) / 180)}
                stroke="#f4ecd8"
                strokeWidth={i % 2 === 0 ? '3.5' : '1.5'}
                strokeDasharray="140 180"
              />
            );
          })}
        </svg>
      </div>

      {/* Floating Petals & Ink Specks (Parallax Drifting) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => {
          const leftPercent = (i * 7 + 5) % 95;
          const duration = 6 + (i % 5) * 1.5;
          const delay = (i % 6) * 1.1;
          const size = i % 3 === 0 ? 12 : i % 2 === 0 ? 8 : 6;
          const isPetal = i % 2 === 0;

          return (
            <div
              key={i}
              className="absolute animate-float-drift pointer-events-none"
              style={{
                left: `${leftPercent}%`,
                bottom: '-20px',
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
              }}
            >
              {isPetal ? (
                <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 0 C15 5 18 12 10 20 C2 12 5 5 10 0 Z"
                    fill="#e8412c"
                    fillOpacity="0.45"
                  />
                </svg>
              ) : (
                <div
                  className="rounded-full bg-[#f4ecd8]/40"
                  style={{ width: `${size}px`, height: `${size}px` }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">
        {/* Manga English Header Badge (Zero Japanese) */}
        <div className="mb-4 inline-block px-3 py-1 bg-[#181616] border-2 border-[#f4ecd8] -rotate-2 shadow-[3px_3px_0px_#0e0d0d]">
          <span className="text-xs font-bold tracking-widest text-[#f4ecd8] uppercase">
            OFFICIAL OTAKU EVALUATION · ISSUE 10
          </span>
        </div>

        {/* Ink-Brush Logo SVG Drawing with Breathing Glow */}
        <div className="w-full max-w-[420px] my-4 animate-logo-glow">
          <svg
            viewBox="0 0 500 130"
            className="w-full h-auto"
          >
            <defs>
              <linearGradient id="brushGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f4ecd8" />
                <stop offset="70%" stopColor="#f4ecd8" />
                <stop offset="100%" stopColor="#e8412c" />
              </linearGradient>
            </defs>

            {/* Background speed slash */}
            <path
              d="M20 100 L480 30"
              stroke="#e8412c"
              strokeWidth="4"
              strokeDasharray="500"
              strokeDashoffset="0"
              className="transition-all duration-1000"
              opacity="0.8"
            />

            {/* Stylized English Lettering */}
            <text
              x="50%"
              y="60"
              textAnchor="middle"
              className="font-heading"
              fill="#f4ecd8"
              fontSize="44"
              fontWeight="900"
              letterSpacing="2"
            >
              IF U WATCH
            </text>
            <text
              x="50%"
              y="114"
              textAnchor="middle"
              className="font-heading"
              fill="#e8412c"
              fontSize="48"
              fontWeight="900"
              letterSpacing="3"
            >
              ANIME
            </text>
          </svg>
        </div>

        {/* Magazine Sub-tag (Zero Japanese) */}
        <p className="text-sm font-medium text-[#f4ecd8]/70 tracking-wider mb-10 max-w-xs mx-auto">
          LATE-NIGHT MANGA QUIZ · THE ULTIMATE TEST
        </p>

        {/* "TAP TO ENTER" Pulsing Ink Stamp */}
        <div className="relative group animate-stamp-pulse">
          <div className="px-8 py-4 bg-[#e8412c] text-[#f4ecd8] border-3 border-[#f4ecd8] shadow-[6px_6px_0px_#000] group-hover:scale-105 transition-all duration-200">
            <div className="flex items-center gap-3">
              <span className="font-heading text-lg md:text-xl tracking-widest uppercase">
                TAP TO ENTER
              </span>
              <span className="text-xs px-2 py-0.5 bg-[#0e0d0d] text-[#f4ecd8] border border-[#f4ecd8] tracking-widest font-bold">
                ENTER
              </span>
            </div>
          </div>
        </div>

        <p className="mt-8 text-xs text-[#f4ecd8]/40 tracking-widest uppercase">
          [ UNLOCKS AUDIO & SPEED ENGINE ]
        </p>
      </div>

      {/* Decorative Japanese Corner Watermark */}
      <div className="absolute bottom-4 right-4 text-[10px] text-[#f4ecd8]/30 font-mono tracking-widest pointer-events-none">
        VOL. 2026 // ISSUE 10
      </div>
    </div>
  );
};
