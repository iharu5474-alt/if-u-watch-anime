import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

export const FlameIcon: React.FC<IconProps & { streakLevel?: number }> = ({
  className = '',
  size = 24,
  strokeWidth = 2.5,
  streakLevel = 1,
}) => {
  // Color shifting: 1-2 = vermilion, 3-4 = bright vermilion orange, 5-9 = fiery vermilion gold, 10+ = blazing
  const flameColor =
    streakLevel >= 10
      ? '#ff3b1f'
      : streakLevel >= 5
      ? '#ff5e3a'
      : streakLevel >= 3
      ? '#e8412c'
      : '#e8412c';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
    >
      <path
        d="M12 2C10.5 4.5 11 6.5 9 8C6.5 9.8 4 12 4 15.5C4 19.5 7.5 22 12 22C16.5 22 20 19.5 20 15.5C20 11.5 16 8.5 16 5C14 7 13 8 12 8C11 7 11.5 4 12 2Z"
        fill={flameColor}
        fillOpacity={streakLevel >= 5 ? '0.35' : '0.2'}
        stroke={flameColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 12C11 13.5 10 14.5 10 16C10 17.5 11 19 12 19C13 19 14 17.5 14 16C14 14.5 13 13.5 12 12Z"
        fill="#f4ecd8"
        stroke="#f4ecd8"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {streakLevel >= 5 && (
        <path
          d="M7 14L5 12M17 14L19 12M12 5V3"
          stroke={flameColor}
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
};

export const SoundIcon: React.FC<IconProps & { isMuted: boolean }> = ({
  className = '',
  size = 24,
  strokeWidth = 2.4,
  isMuted,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
    >
      {/* Speaker body with brush style */}
      <path
        d="M3 9.5H7.5L13 5V19L7.5 14.5H3V9.5Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.15"
      />
      {!isMuted ? (
        <g className="transition-all duration-200">
          <path
            d="M16.5 8C17.8 9.2 18.5 10.6 18.5 12C18.5 13.4 17.8 14.8 16.5 16"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d="M19.5 5.5C21.3 7.3 22 9.5 22 12C22 14.5 21.3 16.7 19.5 18.5"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </g>
      ) : (
        <path
          d="M16 9L21 15M21 9L16 15"
          stroke="#e8412c"
          strokeWidth={strokeWidth + 0.5}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
};

export const BulbHintIcon: React.FC<IconProps & { isGlowing?: boolean }> = ({
  className = '',
  size = 24,
  strokeWidth = 2.4,
  isGlowing = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
    >
      {/* Bulb body */}
      <path
        d="M9 18H15M10 21H14M12 3C8.1 3 5 6.1 5 10C5 12.8 6.5 14.8 8 16H16C17.5 14.8 19 12.8 19 10C19 6.1 15.9 3 12 3Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={isGlowing ? '#e8412c' : 'none'}
        fillOpacity={isGlowing ? '0.25' : '0'}
      />
      {/* Filament */}
      <path
        d="M10 10L12 7L14 10"
        stroke={isGlowing ? '#e8412c' : 'currentColor'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isGlowing ? 'animate-filament' : ''}
      />
      {/* Sparkle rays */}
      {isGlowing && (
        <path
          d="M12 1V0M3 10H1M23 10H21M5 4L3.5 2.5M19 4L20.5 2.5"
          stroke="#e8412c"
          strokeWidth={2}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
};

export const SkipPageIcon: React.FC<IconProps> = ({
  className = '',
  size = 24,
  strokeWidth = 2.4,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
    >
      {/* Book pages turning */}
      <path
        d="M4 4.5C4 4.5 7.5 3.5 12 4.5C16.5 3.5 20 4.5 20 4.5V19.5C20 19.5 16.5 18.5 12 19.5C7.5 18.5 4 19.5 4 19.5V4.5Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 4.5V19.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Turn indicator arrow */}
      <path
        d="M15 10L18 12L15 14"
        stroke="#e8412c"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const SubmitArrowIcon: React.FC<IconProps & { isDashing?: boolean }> = ({
  className = '',
  size = 24,
  strokeWidth = 2.6,
  isDashing = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${isDashing ? 'animate-dash-arrow' : ''} ${className}`}
    >
      {/* Manga speed trailing dashes */}
      <path
        d="M2 12H5M1 8H4M1 16H4"
        stroke="#e8412c"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={isDashing ? 1 : 0.6}
      />
      {/* Heavy brush arrow */}
      <path
        d="M6 12H19M13 6L19.5 12L13 18"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const StarIcon: React.FC<IconProps & { isFilled?: boolean }> = ({
  className = '',
  size = 20,
  strokeWidth = 2.2,
  isFilled = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
    >
      <path
        d="M12 2.5L14.9 8.6L21.5 9.4L16.6 14.1L17.8 20.6L12 17.4L6.2 20.6L7.4 14.1L2.5 9.4L9.1 8.6L12 2.5Z"
        fill={isFilled ? '#e8412c' : 'none'}
        stroke={isFilled ? '#e8412c' : 'currentColor'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const HankoCheckIcon: React.FC<IconProps> = ({
  className = '',
  size = 24,
  strokeWidth = 3,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
    >
      <path
        d="M4.5 12.5L9.5 17.5L19.5 6.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const TrophyIcon: React.FC<IconProps> = ({
  className = '',
  size = 24,
  strokeWidth = 2.4,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
    >
      <path
        d="M6 4H18V10C18 13.3 15.3 16 12 16C8.7 16 6 13.3 6 10V4Z"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 7H3C2.4 7 2 7.4 2 8V9C2 11 3.5 12.5 5.5 12.8"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M18 7H21C21.6 7 22 7.4 22 8V9C22 11 20.5 12.5 18.5 12.8"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M12 16V19M8 21H16"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const ReloadIcon: React.FC<IconProps> = ({
  className = '',
  size = 20,
  strokeWidth = 2.4,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
    >
      <path
        d="M3 12C3 7 7 3 12 3C16.5 3 20.2 6.2 21 10.5M21 12C21 17 17 21 12 21C8 21 4.7 18.3 3.5 14.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M21 5V10.5H15.5M3 19V13.5H8.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const ResetIcon: React.FC<IconProps & { isSpinning?: boolean }> = ({
  className = '',
  size = 20,
  strokeWidth = 2.4,
  isSpinning = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block transition-transform duration-500 ${
        isSpinning ? 'rotate-[360deg]' : ''
      } ${className}`}
    >
      <path
        d="M20 12A8 8 0 1 1 17.65 6.35L20 8.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 4V8.5H15.5"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const SplatterIcon: React.FC<IconProps> = ({
  className = '',
  size = 100,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
    >
      <path
        d="M48 42C44 38 35 32 30 35C24 38 28 47 32 50C36 53 38 60 36 65C34 71 43 74 48 69C52 65 59 66 63 70C68 75 75 72 73 64C71 58 75 51 80 47C86 42 79 35 72 37C66 39 58 35 55 31C51 26 44 28 43 35C42 40 50 44 48 42Z"
        fill="#e8412c"
        fillOpacity="0.85"
      />
      <circle cx="20" cy="28" r="3.5" fill="#e8412c" />
      <circle cx="16" cy="62" r="2.5" fill="#e8412c" />
      <circle cx="84" cy="24" r="3" fill="#e8412c" />
      <circle cx="88" cy="68" r="4" fill="#e8412c" />
      <circle cx="58" cy="18" r="2.5" fill="#e8412c" />
      <circle cx="44" cy="85" r="3" fill="#e8412c" />
    </svg>
  );
};
