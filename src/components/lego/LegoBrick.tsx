import React from 'react';
import {
  formatBigIntBrick,
  formatBigIntFull,
  getNormalizedVisualScale,
} from '../../algorithms/parser';
import type {BrickColorIndex} from '../../types/algorithm';

export interface LegoBrickProps {
  weight: bigint;
  colorIndex: BrickColorIndex;
  minWeight?: bigint;
  maxWeight?: bigint;
  mergedCount?: number;
  isVirtual?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  compact?: boolean;
  subLabel?: string;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}

export const LegoBrick: React.FC<LegoBrickProps> = ({
  weight,
  colorIndex,
  minWeight = 1n,
  maxWeight = 100n,
  mergedCount = 1,
  isVirtual = false,
  selected = false,
  highlighted = false,
  dimmed = false,
  compact = false,
  subLabel,
  onClick,
  ariaLabel,
  className = '',
}) => {
  const ratio = isVirtual
    ? 0
    : getNormalizedVisualScale(weight, minWeight, maxWeight);

  // Map weight tier cleanly to stud count (2 to 4) & visual height without risking overflow
  const studCount = compact ? 2 : ratio > 0.72 ? 4 : ratio > 0.35 ? 3 : 2;
  const minWidthPx = compact ? 54 : 68 + Math.round(ratio * 34);
  const heightPx = compact ? 44 : 56 + Math.round(ratio * 24);
  const stackLayers = Math.min(3, Math.max(1, mergedCount));

  const interactive = Boolean(onClick);
  const Component = interactive ? 'button' : 'div';

  const fullWeightText = isVirtual ? '0 (虚拟节点)' : formatBigIntFull(weight);
  const displayWeight = isVirtual ? '0' : formatBigIntBrick(weight);

  const stateClasses = [
    selected
      ? '-translate-y-2 ring-4 ring-[#f6c823] ring-offset-2 ring-offset-[#e9e4d7]'
      : '',
    highlighted && !selected
      ? '-translate-y-1.5 ring-4 ring-[#25262a] ring-offset-2 ring-offset-[#e9e4d7]'
      : '',
    dimmed ? 'opacity-40' : '',
    interactive
      ? 'cursor-pointer hover:-translate-y-1 active:translate-y-0.5 focus-visible:outline-3 focus-visible:outline-[#2f79c3] focus-visible:outline-offset-2'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      title={
        isVirtual
          ? '虚拟零权值积木（用于补齐满 k 叉树，不增加任何费用）'
          : `权值：${fullWeightText}${mergedCount > 1 ? ` · 由 ${mergedCount} 堆拼装而成` : ''}`
      }
      aria-label={ariaLabel ?? `乐高积木 权值 ${fullWeightText}`}
      aria-pressed={interactive ? selected : undefined}
      style={{minWidth: `${minWidthPx}px`, height: `${heightPx}px`}}
      className={`lego-brick-shell mt-2.5 px-2.5 select-none ${
        isVirtual ? 'lego-brick-virtual' : `lego-brick-${colorIndex}`
      } ${stateClasses} ${className}`}
    >
      {/* Top LEGO Studs */}
      <span className="lego-stud-row" aria-hidden="true">
        {Array.from({length: studCount}).map((_, i) => (
          <i
            key={i}
            className={`lego-stud ${isVirtual ? 'lego-stud-virtual' : ''}`}
          />
        ))}
      </span>

      {/* Multi-layer seam lines for assembled/merged brick stacks */}
      {!isVirtual && stackLayers >= 2 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/3 border-t border-black/20"
        />
      )}
      {!isVirtual && stackLayers >= 3 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-2/3 border-t border-black/20"
        />
      )}

      {/* Weight Nameplate */}
      <span
        className={`relative z-10 font-mono font-bold tabular-nums leading-none ${
          compact ? 'text-sm' : 'text-lg'
        }`}
      >
        {displayWeight}
      </span>

      {(subLabel || isVirtual || (!compact && mergedCount > 1)) && (
        <span
          className="relative z-10 mt-1 rounded px-1 py-0.5 font-mono text-[10px] font-semibold leading-none tabular-nums"
          style={{
            backgroundColor: isVirtual
              ? 'rgba(37,38,42,0.08)'
              : 'var(--brick-plate-bg)',
          }}
        >
          {subLabel ?? (isVirtual ? '虚零' : `${mergedCount}合`)}
        </span>
      )}
    </Component>
  );
};
