import React from 'react';

interface LegoMinifigProps {
  className?: string;
  mood?: 'happy' | 'thinking' | 'celebrate';
  size?: number;
}

/**
 * Original geometric SVG LEGO-style engineer figure (no third-party copyrighted assets).
 */
export const LegoMinifig: React.FC<LegoMinifigProps> = ({
  className = '',
  mood = 'happy',
  size = 76,
}) => {
  return (
    <svg
      width={size}
      height={size * 1.15}
      viewBox="0 0 80 92"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="乐高工坊算法工程师小人"
    >
      {/* Hard hat stud */}
      <rect
        x="32"
        y="4"
        width="16"
        height="7"
        rx="2"
        fill="#E74636"
        stroke="#25262A"
        strokeWidth="2.5"
      />
      {/* Hard hat dome */}
      <path
        d="M20 22C20 13 28 9 40 9C52 9 60 13 60 22H20Z"
        fill="#E74636"
        stroke="#25262A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Hard hat brim */}
      <rect
        x="16"
        y="20"
        width="48"
        height="5"
        rx="2.5"
        fill="#C63225"
        stroke="#25262A"
        strokeWidth="2.5"
      />
      {/* Head */}
      <rect
        x="24"
        y="25"
        width="32"
        height="24"
        rx="7"
        fill="#F6C823"
        stroke="#25262A"
        strokeWidth="2.5"
      />
      {/* Eyes */}
      <circle cx="34" cy="35" r="2.5" fill="#25262A" />
      <circle cx="46" cy="35" r="2.5" fill="#25262A" />
      {/* Glasses bridge for engineer look */}
      <rect
        x="29"
        y="31"
        width="10"
        height="8"
        rx="2"
        stroke="#25262A"
        strokeWidth="1.8"
      />
      <rect
        x="41"
        y="31"
        width="10"
        height="8"
        rx="2"
        stroke="#25262A"
        strokeWidth="1.8"
      />
      <line x1="39" y1="35" x2="41" y2="35" stroke="#25262A" strokeWidth="1.8" />
      {/* Mouth */}
      {mood === 'thinking' ? (
        <line
          x1="35"
          y1="43"
          x2="45"
          y2="42"
          stroke="#25262A"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M34 42C36 45 44 45 46 42"
          stroke="#25262A"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
      {/* Torso (Blue workshop jacket) */}
      <path
        d="M21 51H59L63 75H17L21 51Z"
        fill="#2F79C3"
        stroke="#25262A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Pocket badge */}
      <rect
        x="44"
        y="57"
        width="10"
        height="8"
        rx="1.5"
        fill="#F6C823"
        stroke="#25262A"
        strokeWidth="2"
      />
      {/* Left arm */}
      <path
        d="M19 54L10 66L16 70L22 61"
        fill="#2F79C3"
        stroke="#25262A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Right arm raised if celebrating */}
      {mood === 'celebrate' ? (
        <path
          d="M61 54L71 42L66 37L58 49"
          fill="#2F79C3"
          stroke="#25262A"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M61 54L70 66L64 70L58 61"
          fill="#2F79C3"
          stroke="#25262A"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      )}
      {/* C-Hands */}
      <circle
        cx="11"
        cy="69"
        r="4"
        fill="#F6C823"
        stroke="#25262A"
        strokeWidth="2.2"
      />
      <circle
        cx={mood === 'celebrate' ? 69 : 69}
        cy={mood === 'celebrate' ? 38 : 69}
        r="4"
        fill="#F6C823"
        stroke="#25262A"
        strokeWidth="2.2"
      />
      {/* Legs */}
      <rect
        x="22"
        y="75"
        width="16"
        height="13"
        rx="2"
        fill="#35925B"
        stroke="#25262A"
        strokeWidth="2.5"
      />
      <rect
        x="42"
        y="75"
        width="16"
        height="13"
        rx="2"
        fill="#35925B"
        stroke="#25262A"
        strokeWidth="2.5"
      />
    </svg>
  );
};
