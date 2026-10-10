import React, { useState } from 'react';
import { Difficulty, GameMode } from '../types';
import { FlameIcon, ResetIcon, SoundIcon, StarIcon, TrophyIcon } from './Icons';
import { soundManager } from '../services/sound';

interface StatsBarProps {
  score: number;
  streak: number;
  bestStreak: number;
  mode: GameMode;
  difficulty: Difficulty;
  onModeChange: (m: GameMode) => void;
  onDifficultyChange: (d: Difficulty) => void;
  onResetStats: () => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  score,
  streak,
  bestStreak,
  mode,
  difficulty,
  onModeChange,
  onDifficultyChange,
  onResetStats,
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.getIsMuted());
  const [volume, setVolume] = useState(soundManager.getVolume());
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);

  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      soundManager.playClick();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    soundManager.setVolume(val);
  };

  const handleResetClick = () => {
    if (confirmReset) {
      setIsSpinning(true);
      soundManager.playClick();
      onResetStats();
      setConfirmReset(false);
      setTimeout(() => setIsSpinning(false), 550);
    } else {
      setConfirmReset(true);
      soundManager.playClick();
      setTimeout(() => {
        setConfirmReset(false);
      }, 3000);
    }
  };

  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
  const difficultyStarCount = {
    easy: 1,
    medium: 2,
    hard: 3,
  };

  const modes: { id: GameMode; label: string }[] = [
    { id: 'characters', label: 'Characters' },
    { id: 'anime', label: 'Covers' },
    { id: 'mixed', label: 'Mixed' },
  ];

  return (
    <div className="w-full max-w-[500px] flex flex-col gap-1.5 select-none shrink-0">
      {/* 1. Slim Header Row: Logo, Sound Controls, Reset Icon */}
      <div className="flex items-center justify-between gap-2 border-b border-[#f4ecd8]/20 pb-1.5">
        {/* Brand Wordmark (Zero Japanese) */}
        <div className="flex items-center gap-1.5">
          <div className="px-1.5 py-0.5 bg-[#e8412c] text-[#f4ecd8] font-heading text-[11px] -rotate-2 border border-[#f4ecd8] shadow-[1.5px_1.5px_0px_#0e0d0d]">
            WEEKLY
          </div>
          <span className="font-heading text-sm sm:text-base tracking-wider text-[#f4ecd8] truncate">
            IF U WATCH ANIME
          </span>
        </div>

        {/* Action Controls: Reset & Sound Toggle (Touch Target >= 44px) */}
        <div className="relative flex items-center gap-1.5">
          {/* Reset Icon Button with 3s "Sure?" Confirm Stamp */}
          <button
            type="button"
            onClick={handleResetClick}
            className={`min-h-[44px] min-w-[44px] px-2 py-1.5 flex items-center justify-center border transition-all cursor-pointer ${
              confirmReset
                ? 'bg-[#e8412c] text-[#f4ecd8] border-[#f4ecd8] -rotate-2 shadow-[2px_2px_0px_#0e0d0d]'
                : 'bg-[#181616] text-[#f4ecd8] border-[#f4ecd8]/40 hover:border-[#f4ecd8] sticker-btn'
            }`}
            title={confirmReset ? 'Tap again to confirm reset' : 'Reset score and streaks'}
            aria-label="Reset stats"
          >
            {confirmReset ? (
              <span className="font-heading text-[11px] uppercase tracking-wider animate-pulse">
                SURE?
              </span>
            ) : (
              <ResetIcon isSpinning={isSpinning} size={18} />
            )}
          </button>

          {/* Sound Toggle (Min 44px Touch Target) */}
          <button
            type="button"
            onClick={handleToggleSound}
            onMouseEnter={() => setShowVolumeSlider(true)}
            aria-label="Toggle Sound"
            className="min-h-[44px] min-w-[44px] p-2 bg-[#181616] text-[#f4ecd8] border border-[#f4ecd8]/40 hover:border-[#f4ecd8] sticker-btn flex items-center justify-center cursor-pointer"
          >
            <SoundIcon isMuted={isMuted} size={18} />
          </button>

          {/* Volume Slider Drawer */}
          {showVolumeSlider && (
            <div
              onMouseLeave={() => setShowVolumeSlider(false)}
              className="absolute right-0 top-12 z-40 p-2 bg-[#181616] border border-[#f4ecd8] shadow-[4px_4px_0px_#0e0d0d] flex items-center gap-2"
            >
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 accent-[#e8412c] cursor-pointer"
              />
              <span className="text-[10px] font-mono text-[#f4ecd8]">
                {Math.round(volume * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Stats Row: Score, Streak, Best Streak */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* Score Card */}
        <div className="py-1 px-1.5 bg-[#181616] border border-[#f4ecd8]/80 shadow-[2px_2px_0px_#0e0d0d] flex flex-col items-center justify-center">
          <span className="text-[9px] tracking-widest text-[#f4ecd8]/60 uppercase font-bold">
            SCORE
          </span>
          <span className="font-heading text-lg sm:text-xl text-[#f4ecd8] tabular-nums leading-none mt-0.5">
            {score}
          </span>
        </div>

        {/* Current Streak with dynamic flickering flame */}
        <div className="py-1 px-1.5 bg-[#181616] border border-[#f4ecd8]/80 shadow-[2px_2px_0px_#0e0d0d] flex flex-col items-center justify-center relative overflow-hidden">
          <div className="flex items-center gap-1">
            <span className="text-[9px] tracking-widest text-[#f4ecd8]/60 uppercase font-bold">
              STREAK
            </span>
            <div className={streak > 0 ? 'animate-flame' : ''}>
              <FlameIcon size={12} streakLevel={streak} />
            </div>
          </div>
          <span
            className={`font-heading text-lg sm:text-xl tabular-nums leading-none mt-0.5 ${
              streak >= 5 ? 'text-[#e8412c]' : 'text-[#f4ecd8]'
            }`}
          >
            {streak}
          </span>
        </div>

        {/* Best Streak */}
        <div className="py-1 px-1.5 bg-[#181616] border border-[#f4ecd8]/80 shadow-[2px_2px_0px_#0e0d0d] flex flex-col items-center justify-center">
          <div className="flex items-center gap-1">
            <span className="text-[9px] tracking-widest text-[#f4ecd8]/60 uppercase font-bold">
              BEST
            </span>
            <TrophyIcon size={11} />
          </div>
          <span className="font-heading text-lg sm:text-xl text-[#f4ecd8] tabular-nums leading-none mt-0.5">
            {bestStreak}
          </span>
        </div>
      </div>

      {/* 3. Mode Tabs & Difficulty Segmented Controls */}
      <div className="flex items-center justify-between gap-1.5">
        {/* Mode Tabs */}
        <div className="flex items-center gap-0.5 bg-[#181616] p-0.5 border border-[#f4ecd8]/30">
          {modes.map((m) => {
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onModeChange(m.id);
                }}
                className={`relative px-2 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  active ? 'text-[#f4ecd8]' : 'text-[#f4ecd8]/50 hover:text-[#f4ecd8]'
                }`}
              >
                <span className="relative z-10">{m.label}</span>
                {active && (
                  <span className="absolute bottom-0 left-0.5 right-0.5 h-0.5 bg-[#e8412c] shadow-[0_1px_3px_#e8412c]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Difficulty Stars */}
        <div className="flex items-center gap-0.5 bg-[#181616] p-0.5 border border-[#f4ecd8]/30">
          {difficulties.map((d) => {
            const active = difficulty === d;
            const count = difficultyStarCount[d];
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onDifficultyChange(d);
                }}
                className={`px-1.5 py-0.5 text-[10px] font-heading uppercase flex items-center gap-0.5 transition-all cursor-pointer ${
                  active
                    ? 'bg-[#e8412c] text-[#f4ecd8] shadow-[1px_1px_0px_#0e0d0d]'
                    : 'text-[#f4ecd8]/50 hover:text-[#f4ecd8]'
                }`}
              >
                <span>{d.charAt(0).toUpperCase()}</span>
                <div className="flex">
                  {Array.from({ length: count }).map((_, i) => (
                    <span key={i} className={active ? 'animate-star-pop' : ''}>
                      <StarIcon size={10} isFilled={active} />
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
