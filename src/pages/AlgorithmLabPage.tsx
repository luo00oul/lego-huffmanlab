import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  CheckCircle2,
  GitBranch,
  Link2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Unlink2,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {DatasetToolbar} from '../components/DatasetToolbar';
import {LegoBrick} from '../components/lego/LegoBrick';
import {
  MAX_PSEUDOCODE,
  MIN_PSEUDOCODE,
} from '../algorithms/trace';
import {formatBigIntFull} from '../algorithms/parser';
import {useDataset} from '../hooks/useDataset';
import type {
  MergeStep,
  PageRoute,
  PileItem,
  SimulationTrace,
} from '../types/algorithm';

interface AlgorithmLabPageProps {
  onNavigate: (route: PageRoute) => void;
  presentationMode?: boolean;
}

type AnimSubPhase = 'idle' | 'select' | 'snap' | 'settled';
type InspectorTab = 'heap' | 'history' | 'code';

interface StagePanelProps {
  trace: SimulationTrace;
  step: number;
  subPhase: AnimSubPhase;
  syncMode: boolean;
  onStepChange: (next: number) => void;
  inspectorTab: InspectorTab;
  onInspectorTabChange: (tab: InspectorTab) => void;
  minWeight: bigint;
  maxWeight: bigint;
}

const StagePanel: React.FC<StagePanelProps> = ({
  trace,
  step,
  subPhase,
  syncMode,
  onStepChange,
  inspectorTab,
  onInspectorTabChange,
  minWeight,
  maxWeight,
}) => {
  const isMin = trace.mode === 'min';
  const totalSteps = trace.steps.length;
  const clampedStep = Math.max(0, Math.min(step, totalSteps));
  const isFinished = totalSteps === 0 || (clampedStep === totalSteps && subPhase === 'settled');

  const activeMerge: MergeStep | null =
    clampedStep > 0 ? trace.steps[clampedStep - 1] : null;

  // Determine which piles are currently displayed on the main baseplate
  const currentPiles: PileItem[] = useMemo(() => {
    if (trace.truncatedForVisual) return [];
    if (clampedStep === 0) return trace.initialPiles;
    if (!activeMerge) return trace.initialPiles;
    if (subPhase === 'select' || subPhase === 'snap') {
      return activeMerge.heapBefore;
    }
    return activeMerge.heapAfter;
  }, [trace, clampedStep, activeMerge, subPhase]);

  const selectedIdSet = useMemo(() => {
    if (!activeMerge || (subPhase !== 'select' && subPhase !== 'snap')) {
      return new Set<string>();
    }
    return new Set(activeMerge.selectedItems.map((s) => s.id));
  }, [activeMerge, subPhase]);

  const newlyMergedId =
    activeMerge && subPhase === 'settled' ? activeMerge.mergedItem.id : null;

  // Current cumulative cost reflects completion of current merge once snapped/settled
  const displayCumulative = useMemo(() => {
    if (clampedStep === 0) return 0n;
    if (!activeMerge) return 0n;
    if (subPhase === 'select') {
      return activeMerge.cumulativeCost - activeMerge.stepCost;
    }
    return activeMerge.cumulativeCost;
  }, [clampedStep, activeMerge, subPhase]);

  const displayHeap: PileItem[] = useMemo(() => {
    if (trace.truncatedForVisual) return [];
    if (clampedStep === 0) return trace.initialPiles;
    if (!activeMerge) return trace.initialPiles;
    return subPhase === 'select' ? activeMerge.heapBefore : activeMerge.heapAfter;
  }, [trace, clampedStep, activeMerge, subPhase]);

  const pseudocode = isMin ? MIN_PSEUDOCODE : MAX_PSEUDOCODE;
  const activeLines = useMemo(() => {
    if (totalSteps === 0) return new Set([1]);
    if (clampedStep === 0) return new Set([2]);
    if (isFinished) return new Set([pseudocode.length]);
    return new Set(activeMerge?.activePseudoLines ?? []);
  }, [totalSteps, clampedStep, isFinished, activeMerge, pseudocode.length]);

  const themeAccent = isMin
    ? {
        title: '最小费用算法 · 小根堆（多元 Huffman）',
        text: 'text-[#1c508d]',
        border: 'border-[#1c508d]',
        softBg: 'bg-[#eef5fc]',
        btn: 'lego-btn-blue',
      }
    : {
        title: '最大费用算法 · 大根堆（二元链式合并）',
        text: 'text-[#a62824]',
        border: 'border-[#a62824]',
        softBg: 'bg-[#fdf0ee]',
        btn: 'lego-btn-red',
      };

  return (
    <div className="lego-panel flex flex-col justify-between p-4 md:p-5">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#25262a]/15 pb-3">
          <div>
            <h2 className={`text-base font-extrabold ${themeAccent.text}`}>
              {themeAccent.title}
            </h2>
            <p className="mt-0.5 text-xs text-[#53535a]">
              {isMin
                ? `首轮合并 r = ${trace.firstMergeCount} 堆，后续每次合并最小的 k = ${trace.k} 堆`
                : '每次仅弹出最大的 2 堆合并，共需 n - 1 轮'}
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs font-bold tabular-nums">
            {isFinished ? (
              <span className="inline-flex items-center gap-1 text-[#1e613d]">
                <CheckCircle2 className="h-4 w-4" />
                已完成
              </span>
            ) : (
              <span className="text-[#53535a]">
                第 {clampedStep} / {totalSteps} 轮
              </span>
            )}
          </div>
        </div>

        {/* Metrics Strip */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-[#25262a]/25 bg-[#f7f4ec] px-3 py-2">
            <div className="text-[11px] font-semibold text-[#53535a]">本轮费用</div>
            <div className="mt-0.5 font-mono text-base font-extrabold text-[#25262a] tabular-nums">
              {activeMerge ? formatBigIntFull(activeMerge.stepCost) : '0'}
            </div>
          </div>
          <div className={`rounded-lg border-2 ${themeAccent.border} ${themeAccent.softBg} px-3 py-2`}>
            <div className={`text-[11px] font-bold ${themeAccent.text}`}>累计总费用</div>
            <div className={`mt-0.5 font-mono text-base font-extrabold tabular-nums ${themeAccent.text}`}>
              {formatBigIntFull(displayCumulative)}
            </div>
          </div>
          <div className="rounded-lg border border-[#25262a]/25 bg-[#f7f4ec] px-3 py-2">
            <div className="text-[11px] font-semibold text-[#53535a]">剩余堆数</div>
            <div className="mt-0.5 font-mono text-base font-extrabold text-[#25262a] tabular-nums">
              {trace.truncatedForVisual
                ? isFinished
                  ? 1
                  : '—'
                : currentPiles.length}
            </div>
          </div>
          <div className="rounded-lg border border-[#25262a]/25 bg-[#f7f4ec] px-3 py-2">
            <div className="text-[11px] font-semibold text-[#53535a]">理论最终值</div>
            <div className="mt-0.5 font-mono text-base font-extrabold text-[#25262a] tabular-nums">
              {formatBigIntFull(trace.totalCost)}
            </div>
          </div>
        </div>

        {trace.truncatedForVisual ? (
          <div className="mt-4 rounded-lg border-2 border-dashed border-[#25262a] bg-[#f7f4ec] p-5 text-center text-sm text-[#53535a]">
            当前石子堆数超过可视化动画上限（120 堆），已自动切换为纯 O(n log n) 算法引擎精确求解：
            <strong className="mt-1 block font-mono text-lg text-[#25262a] tabular-nums">
              最终总费用 = {formatBigIntFull(trace.totalCost)}
            </strong>
          </div>
        ) : (
          <>
            {/* Main Studded LEGO Baseplate Stage */}
            <div className="lego-baseplate mt-4 p-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#53535a]">
                <span>当前石子堆底板</span>
                <span className="font-mono">
                  {subPhase === 'select'
                    ? '阶段 1/3：选中待合并积木'
                    : subPhase === 'snap'
                      ? '阶段 2/3：吸附拼装生成新块'
                      : clampedStep === 0
                        ? '待机准备就绪'
                        : '阶段 3/3：新积木归入堆中'}
                </span>
              </div>

              {/* Active Piles Area */}
              <div className="flex min-h-[104px] flex-wrap items-end justify-center gap-2.5 pb-2">
                <AnimatePresence mode="popLayout">
                  {currentPiles.map((pile) => {
                    const isSelected = selectedIdSet.has(pile.id);
                    const isNew = pile.id === newlyMergedId;
                    return (
                      <motion.div
                        key={pile.id}
                        layout
                        initial={{opacity: 0, scale: 0.82, y: -16}}
                        animate={{
                          opacity: isSelected && subPhase === 'snap' ? 0.25 : 1,
                          scale: isSelected ? 1.04 : 1,
                          y: isSelected ? -6 : 0,
                        }}
                        exit={{opacity: 0, scale: 0.78, y: 12}}
                        transition={{duration: 0.24, ease: [0.16, 1, 0.3, 1]}}
                      >
                        <LegoBrick
                          weight={pile.weight}
                          colorIndex={pile.colorIndex}
                          minWeight={minWeight}
                          maxWeight={maxWeight}
                          mergedCount={pile.mergedCount}
                          isVirtual={pile.isVirtual}
                          selected={isSelected}
                          highlighted={isNew}
                          compact={currentPiles.length > 14}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Dedicated Merge Assembly Bay */}
              <div className="mt-3 rounded-lg border-2 border-dashed border-[#25262a]/45 bg-[#fffdf8]/90 px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#53535a]">
                  <span>乐高拼装台（本轮合并区）</span>
                  {activeMerge && (
                    <span className="font-mono text-[#25262a] tabular-nums">
                      {activeMerge.selectedItems
                        .map((s) => s.weight.toString())
                        .join(' + ')}{' '}
                      = {activeMerge.stepCost.toString()}
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex min-h-[76px] flex-wrap items-center justify-center gap-2">
                  {!activeMerge ? (
                    <span className="text-xs text-[#6e6c73]">
                      点击「播放」或「单步」观察选中的积木移入拼装台并吸附合并
                    </span>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {activeMerge.selectedItems.map((item, idx) => (
                          <React.Fragment key={item.id}>
                            <motion.div
                              initial={{opacity: 0, y: -12, scale: 0.9}}
                              animate={{
                                opacity: 1,
                                y: 0,
                                scale: subPhase === 'snap' ? 0.96 : 1,
                              }}
                              transition={{duration: 0.2}}
                            >
                              <LegoBrick
                                weight={item.weight}
                                colorIndex={item.colorIndex}
                                minWeight={minWeight}
                                maxWeight={maxWeight}
                                mergedCount={item.mergedCount}
                                compact
                                selected={subPhase === 'select'}
                              />
                            </motion.div>
                            {idx < activeMerge.selectedItems.length - 1 && (
                              <span className="font-mono text-base font-extrabold text-[#53535a]">
                                +
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      <span className="mx-1 font-mono text-base font-extrabold text-[#25262a]">
                        →
                      </span>

                      <motion.div
                        key={`${activeMerge.mergedItem.id}-${subPhase}`}
                        initial={{scale: 0.72, opacity: 0.35}}
                        animate={{
                          scale: subPhase === 'snap' ? 1.08 : 1,
                          opacity: subPhase === 'select' ? 0.45 : 1,
                        }}
                        transition={{duration: 0.22, ease: [0.16, 1, 0.3, 1]}}
                      >
                        <LegoBrick
                          weight={activeMerge.mergedItem.weight}
                          colorIndex={activeMerge.mergedItem.colorIndex}
                          minWeight={minWeight}
                          maxWeight={maxWeight}
                          mergedCount={activeMerge.mergedItem.mergedCount}
                          compact
                          highlighted={subPhase === 'snap' || subPhase === 'settled'}
                        />
                      </motion.div>
                    </>
                  )}
                </div>

                {activeMerge && (
                  <p className="mt-2 border-t border-[#25262a]/10 pt-2 text-xs font-medium text-[#25262a]">
                    {activeMerge.explanation}
                  </p>
                )}
              </div>
            </div>

            {/* Independent Step Controls (shown when Independent mode is active) */}
            {!syncMode && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#25262a]/20 bg-[#f7f4ec] px-3 py-2">
                <span className="text-xs font-bold text-[#53535a]">
                  独立步进控制
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onStepChange(0)}
                    disabled={clampedStep === 0}
                    className="lego-btn lego-btn-neutral min-h-[36px] px-2.5 py-1 text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onStepChange(Math.max(0, clampedStep - 1))}
                    disabled={clampedStep === 0}
                    className="lego-btn lego-btn-neutral min-h-[36px] px-2.5 py-1 text-xs"
                  >
                    <SkipBack className="h-3.5 w-3.5" />
                    上一步
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onStepChange(Math.min(totalSteps, clampedStep + 1))
                    }
                    disabled={clampedStep >= totalSteps}
                    className={`lego-btn ${themeAccent.btn} min-h-[36px] px-2.5 py-1 text-xs`}
                  >
                    下一步
                    <SkipForward className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Inspector Tabs: Priority Queue / History / Pseudocode */}
            <div className="mt-4">
              <div className="flex items-center gap-1 rounded-lg border border-[#25262a]/25 bg-[#f4f1e9] p-1">
                {(
                  [
                    {id: 'heap', label: `优先队列 (${displayHeap.length})`},
                    {id: 'history', label: `合并记录 (${clampedStep}/${totalSteps})`},
                    {id: 'code', label: '伪代码同步'},
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onInspectorTabChange(t.id)}
                    className={`min-h-[36px] flex-1 rounded-md px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      inspectorTab === t.id
                        ? 'bg-[#25262a] text-white'
                        : 'text-[#53535a] hover:text-[#25262a]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="mt-2.5 min-h-[160px] rounded-lg border border-[#25262a]/20 bg-[#fffdf8] p-3">
                {inspectorTab === 'heap' && (
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs text-[#53535a]">
                      <span>
                        {isMin ? '小根堆数组（索引 0 为当前最小值）' : '大根堆数组（索引 0 为当前最大值）'}
                      </span>
                      <span className="font-mono">完全二叉树层序</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {displayHeap.map((item, idx) => (
                        <div
                          key={`${item.id}-${idx}`}
                          className={`flex flex-col items-center rounded border-2 px-2.5 py-1 font-mono text-xs tabular-nums ${
                            idx === 0
                              ? isMin
                                ? 'border-[#1c508d] bg-[#eef5fc] font-extrabold text-[#1c508d]'
                                : 'border-[#a62824] bg-[#fdf0ee] font-extrabold text-[#a62824]'
                              : 'border-[#25262a]/30 bg-[#f7f4ec] font-semibold text-[#25262a]'
                          }`}
                        >
                          <span className="text-[10px] text-[#6e6c73]">[{idx}]</span>
                          <span>{item.weight.toString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {inspectorTab === 'history' && (
                  <div className="max-h-[180px] space-y-1.5 overflow-y-auto pr-1">
                    {trace.steps.length === 0 ? (
                      <p className="text-xs text-[#6e6c73]">当前 n = 1，无需执行合并。</p>
                    ) : (
                      trace.steps.map((s) => {
                        const isCur = s.stepIndex === clampedStep;
                        const isPast = s.stepIndex <= clampedStep;
                        return (
                          <button
                            key={s.stepIndex}
                            type="button"
                            onClick={() => onStepChange(s.stepIndex)}
                            className={`flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left font-mono text-xs tabular-nums cursor-pointer transition-colors ${
                              isCur
                                ? 'border-[#25262a] bg-[#ffe899] font-bold text-[#25262a]'
                                : isPast
                                  ? 'border-[#25262a]/20 bg-[#f7f4ec] text-[#25262a] hover:bg-[#efe9da]'
                                  : 'border-transparent bg-transparent text-[#6e6c73] hover:bg-[#f7f4ec]'
                            }`}
                          >
                            <span>
                              #{s.stepIndex}:{' '}
                              {s.selectedItems.map((x) => x.weight.toString()).join('+')} →{' '}
                              <strong>{s.stepCost.toString()}</strong>
                            </span>
                            <span>累计 {s.cumulativeCost.toString()}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                {inspectorTab === 'code' && (
                  <div className="space-y-1 font-mono text-xs">
                    {pseudocode.map((line, i) => {
                      const lineNo = i + 1;
                      const isActive = activeLines.has(lineNo);
                      return (
                        <div
                          key={lineNo}
                          className={`rounded px-2 py-1 transition-colors ${
                            isActive
                              ? 'bg-[#ffe899] font-bold text-[#25262a]'
                              : 'text-[#53535a]'
                          }`}
                        >
                          {line}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const AlgorithmLabPage: React.FC<AlgorithmLabPageProps> = ({
  onNavigate,
  presentationMode = false,
}) => {
  const {weights, minTrace, maxTrace} = useDataset();

  const [syncMode, setSyncMode] = useState(true);
  const [minStep, setMinStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [subPhase, setSubPhase] = useState<AnimSubPhase>('settled');
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(1100);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('heap');

  const maxTotalSteps = Math.max(minTrace.steps.length, maxTrace.steps.length);
  const currentSyncStep = Math.max(minStep, maxStep);

  const {minWeight, maxWeight} = useMemo(() => {
    let mn = weights[0] ?? 1n;
    let mx = weights[0] ?? 1n;
    for (const w of weights) {
      if (w < mn) mn = w;
      if (w > mx) mx = w;
    }
    const maxFinal = maxTrace.steps[maxTrace.steps.length - 1]?.mergedItem.weight ?? mx;
    return {minWeight: mn, maxWeight: maxFinal > mx ? maxFinal : mx};
  }, [weights, maxTrace]);

  const resetPlayback = useCallback(() => {
    setIsPlaying(false);
    setMinStep(0);
    setMaxStep(0);
    setSubPhase('settled');
  }, []);

  // Reset steps whenever dataset changes
  useEffect(() => {
    resetPlayback();
  }, [minTrace, maxTrace, resetPlayback]);

  // Trigger 3-stage tactile merge animation whenever step advances
  const animateToStep = useCallback(
    (nextMin: number, nextMax: number) => {
      const clampedMin = Math.max(0, Math.min(minTrace.steps.length, nextMin));
      const clampedMax = Math.max(0, Math.min(maxTrace.steps.length, nextMax));
      setMinStep(clampedMin);
      setMaxStep(clampedMax);
      if (clampedMin === 0 && clampedMax === 0) {
        setSubPhase('settled');
        return;
      }
      setSubPhase('select');
    },
    [minTrace.steps.length, maxTrace.steps.length],
  );

  // Sub-phase progression timer: select -> snap -> settled
  useEffect(() => {
    if (subPhase === 'select') {
      const t = window.setTimeout(
        () => setSubPhase('snap'),
        Math.max(180, Math.round(speedMs * 0.34)),
      );
      return () => window.clearTimeout(t);
    }
    if (subPhase === 'snap') {
      const t = window.setTimeout(
        () => setSubPhase('settled'),
        Math.max(180, Math.round(speedMs * 0.34)),
      );
      return () => window.clearTimeout(t);
    }
  }, [subPhase, speedMs]);

  const stepForwardSync = useCallback(() => {
    const next = currentSyncStep + 1;
    if (next > maxTotalSteps) {
      setIsPlaying(false);
      return;
    }
    animateToStep(
      Math.min(next, minTrace.steps.length),
      Math.min(next, maxTrace.steps.length),
    );
  }, [currentSyncStep, maxTotalSteps, animateToStep, minTrace.steps.length, maxTrace.steps.length]);

  const stepBackSync = useCallback(() => {
    setIsPlaying(false);
    const prev = Math.max(0, currentSyncStep - 1);
    setMinStep(Math.min(prev, minTrace.steps.length));
    setMaxStep(Math.min(prev, maxTrace.steps.length));
    setSubPhase('settled');
  }, [currentSyncStep, minTrace.steps.length, maxTrace.steps.length]);

  // Auto-play loop
  useEffect(() => {
    if (!isPlaying || subPhase !== 'settled') return;
    if (currentSyncStep >= maxTotalSteps) {
      setIsPlaying(false);
      return;
    }
    const t = window.setTimeout(() => {
      stepForwardSync();
    }, Math.max(220, Math.round(speedMs * 0.38)));
    return () => window.clearTimeout(t);
  }, [isPlaying, subPhase, currentSyncStep, maxTotalSteps, speedMs, stepForwardSync]);

  // Keyboard shortcuts (Space play/pause, Left/Right step, R reset) — mirrored by visible touch buttons!
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (currentSyncStep >= maxTotalSteps) {
          resetPlayback();
          setIsPlaying(true);
        } else {
          setIsPlaying((v) => !v);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        stepForwardSync();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepBackSync();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetPlayback();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentSyncStep, maxTotalSteps, resetPlayback, stepForwardSync, stepBackSync]);

  return (
    <div className="space-y-5">
      {!presentationMode && (
        <DatasetToolbar compact onDataApplied={resetPlayback} />
      )}

      {/* Playback Control Deck */}
      <section
        aria-label="动画播放与同步控制台"
        className="lego-panel flex flex-wrap items-center justify-between gap-3 p-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (currentSyncStep >= maxTotalSteps) {
                animateToStep(0, 0);
                setIsPlaying(true);
              } else {
                setIsPlaying((v) => !v);
              }
            }}
            disabled={maxTotalSteps === 0}
            className={`lego-btn ${isPlaying ? 'lego-btn-yellow' : 'lego-btn-red'}`}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? '暂停播放' : currentSyncStep >= maxTotalSteps ? '重播对比' : '开始对比演示'}
          </button>

          <button
            type="button"
            onClick={stepBackSync}
            disabled={currentSyncStep === 0}
            className="lego-btn lego-btn-neutral"
          >
            <SkipBack className="h-4 w-4" />
            上一步
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              stepForwardSync();
            }}
            disabled={currentSyncStep >= maxTotalSteps}
            className="lego-btn lego-btn-blue"
          >
            单步执行
            <SkipForward className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={resetPlayback}
            className="lego-btn lego-btn-neutral"
          >
            <RotateCcw className="h-4 w-4" />
            重置
          </button>
        </div>

        {/* Scrubber + Speed + Sync Mode */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-bold text-[#53535a]">
            <span>进度</span>
            <input
              type="range"
              min={0}
              max={maxTotalSteps}
              value={currentSyncStep}
              onChange={(e) => {
                setIsPlaying(false);
                const val = Number(e.target.value);
                setMinStep(Math.min(val, minTrace.steps.length));
                setMaxStep(Math.min(val, maxTrace.steps.length));
                setSubPhase('settled');
              }}
              className="h-2 w-28 accent-[#e74636] cursor-pointer sm:w-36"
            />
            <span className="font-mono text-[#25262a] tabular-nums">
              {currentSyncStep}/{maxTotalSteps}
            </span>
          </label>

          <div className="flex items-center gap-1 rounded-lg border border-[#25262a]/25 bg-[#f4f1e9] p-1">
            {[
              {label: '慢速', ms: 1600},
              {label: '标准', ms: 1050},
              {label: '快速', ms: 580},
            ].map((sp) => (
              <button
                key={sp.ms}
                type="button"
                onClick={() => setSpeedMs(sp.ms)}
                className={`min-h-[34px] rounded px-2.5 text-xs font-bold cursor-pointer ${
                  speedMs === sp.ms
                    ? 'bg-[#25262a] text-white'
                    : 'text-[#53535a] hover:text-[#25262a]'
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSyncMode((v) => !v)}
            className="lego-btn lego-btn-neutral text-xs"
            title="切换左右双侧同步演示或独立单侧步进"
          >
            {syncMode ? <Link2 className="h-3.5 w-3.5" /> : <Unlink2 className="h-3.5 w-3.5" />}
            {syncMode ? '同步演示' : '独立演示'}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('tree')}
            className="lego-btn lego-btn-green text-xs"
          >
            <GitBranch className="h-3.5 w-3.5" />
            查看积木树
          </button>
        </div>
      </section>

      {/* Dual Strategy Split Stage */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <StagePanel
          trace={minTrace}
          step={minStep}
          subPhase={minStep > 0 ? subPhase : 'settled'}
          syncMode={syncMode}
          onStepChange={(next) => {
            setIsPlaying(false);
            if (syncMode) {
              animateToStep(
                Math.min(next, minTrace.steps.length),
                Math.min(next, maxTrace.steps.length),
              );
            } else {
              setMinStep(next);
              setSubPhase('select');
            }
          }}
          inspectorTab={inspectorTab}
          onInspectorTabChange={setInspectorTab}
          minWeight={minWeight}
          maxWeight={maxWeight}
        />

        <StagePanel
          trace={maxTrace}
          step={maxStep}
          subPhase={maxStep > 0 ? subPhase : 'settled'}
          syncMode={syncMode}
          onStepChange={(next) => {
            setIsPlaying(false);
            if (syncMode) {
              animateToStep(
                Math.min(next, minTrace.steps.length),
                Math.min(next, maxTrace.steps.length),
              );
            } else {
              setMaxStep(next);
              setSubPhase('select');
            }
          }}
          inspectorTab={inspectorTab}
          onInspectorTabChange={setInspectorTab}
          minWeight={minWeight}
          maxWeight={maxWeight}
        />
      </section>
    </div>
  );
};
