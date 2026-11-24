import React, {useEffect, useMemo, useState} from 'react';
import {
  CheckCircle2,
  Lightbulb,
  Merge,
  RotateCcw,
  Star,
  Undo2,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {DatasetToolbar} from '../components/DatasetToolbar';
import {LegoBrick} from '../components/lego/LegoBrick';
import {LegoMinifig} from '../components/lego/LegoMinifig';
import {formatBigIntFull} from '../algorithms/parser';
import {
  analyzeChallengeAttempt,
  getRecommendedNextMove,
} from '../algorithms/trace';
import {useDataset} from '../hooks/useDataset';
import type {
  AlgorithmMode,
  BrickColorIndex,
  ChallengeMove,
  PileItem,
} from '../types/algorithm';

interface ChallengePageProps {
  presentationMode?: boolean;
}

interface Snapshot {
  piles: PileItem[];
  moves: ChallengeMove[];
  cumulativeCost: bigint;
}

function makeInitialChallengePiles(weights: readonly bigint[]): PileItem[] {
  return weights.map((w, idx) => ({
    id: `ch-leaf-${idx}`,
    weight: w,
    colorIndex: (idx % 4) as BrickColorIndex,
    mergedCount: 1,
    sourceLeafIds: [`ch-leaf-${idx}`],
    originalIndex: idx,
  }));
}

export const ChallengePage: React.FC<ChallengePageProps> = ({
  presentationMode = false,
}) => {
  const {k, weights, pureMin, pureMax} = useDataset();
  const [goal, setGoal] = useState<AlgorithmMode>('min');
  const [piles, setPiles] = useState<PileItem[]>(() =>
    makeInitialChallengePiles(weights),
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moves, setMoves] = useState<ChallengeMove[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [cumulativeCost, setCumulativeCost] = useState<bigint>(0n);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [hintIds, setHintIds] = useState<string[]>([]);
  const [hintText, setHintText] = useState<string | null>(null);

  const resetChallenge = () => {
    setPiles(makeInitialChallengePiles(weights));
    setSelectedIds([]);
    setMoves([]);
    setHistory([]);
    setCumulativeCost(0n);
    setFeedback(null);
    setHintIds([]);
    setHintText(null);
  };

  useEffect(() => {
    resetChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weights, k, goal]);

  const maxAllowed = Math.min(k, piles.length);
  const isCompleted = piles.length <= 1;

  const {minWeight, maxWeight} = useMemo(() => {
    let mn = weights[0] ?? 1n;
    let mx = weights[0] ?? 1n;
    for (const p of piles) {
      if (p.weight < mn) mn = p.weight;
      if (p.weight > mx) mx = p.weight;
    }
    return {minWeight: mn, maxWeight: mx};
  }, [weights, piles]);

  const toggleSelect = (id: string) => {
    if (isCompleted) return;
    setFeedback(null);
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= maxAllowed) {
        setFeedback(`当前最多只能同时选择 k = ${maxAllowed} 堆积木合并。`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const selectedPiles = useMemo(
    () => piles.filter((p) => selectedIds.includes(p.id)),
    [piles, selectedIds],
  );

  const previewSum = useMemo(
    () => selectedPiles.reduce((acc, p) => acc + p.weight, 0n),
    [selectedPiles],
  );

  const handleConfirmMerge = () => {
    if (selectedPiles.length < 2) {
      setFeedback('合并规则要求：每次至少选择 2 堆积木！');
      return;
    }
    if (selectedPiles.length > k) {
      setFeedback(`合并规则要求：每次最多选择 ${k} 堆积木！`);
      return;
    }

    const remainingBefore = piles.map((p) => p.weight);
    const remainingPiles = piles.filter((p) => !selectedIds.includes(p.id));
    const nextStepIndex = moves.length + 1;
    const mergedId = `ch-merge-${nextStepIndex}`;
    const mergedPile: PileItem = {
      id: mergedId,
      weight: previewSum,
      colorIndex: goal === 'min' ? 3 : 0,
      mergedCount: selectedPiles.reduce((a, b) => a + b.mergedCount, 0),
      sourceLeafIds: selectedPiles.flatMap((p) => p.sourceLeafIds),
    };

    const nextPiles = [...remainingPiles, mergedPile];
    const nextCum = cumulativeCost + previewSum;
    const newMove: ChallengeMove = {
      stepIndex: nextStepIndex,
      selectedIds: [...selectedIds],
      selectedWeights: selectedPiles.map((p) => p.weight),
      mergedId,
      mergedWeight: previewSum,
      stepCost: previewSum,
      cumulativeCost: nextCum,
      remainingWeightsBefore: remainingBefore,
      remainingWeightsAfter: nextPiles.map((p) => p.weight),
    };

    setHistory((prev) => [...prev, {piles, moves, cumulativeCost}]);
    setPiles(nextPiles);
    setMoves((prev) => [...prev, newMove]);
    setCumulativeCost(nextCum);
    setSelectedIds([]);
    setHintIds([]);
    setHintText(null);
    setFeedback(null);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setPiles(last.piles);
    setMoves(last.moves);
    setCumulativeCost(last.cumulativeCost);
    setHistory((prev) => prev.slice(0, -1));
    setSelectedIds([]);
    setHintIds([]);
    setHintText(null);
    setFeedback(null);
  };

  const handleShowHint = () => {
    const rec = getRecommendedNextMove(piles, k, goal);
    if (!rec) return;
    setHintIds(rec.selectedIds);
    setSelectedIds(rec.selectedIds);
    setHintText(rec.reason);
    setFeedback(null);
  };

  const analysis = useMemo(() => {
    if (!isCompleted) return null;
    return analyzeChallengeAttempt(weights, k, goal, moves);
  }, [isCompleted, weights, k, goal, moves]);

  const targetOptimal = goal === 'min' ? pureMin.totalCost : pureMax.totalCost;

  return (
    <div className="space-y-5">
      {!presentationMode && <DatasetToolbar compact />}

      {/* Challenge Goal Header */}
      <section className="lego-panel flex flex-wrap items-center justify-between gap-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border-2 border-[#25262a] bg-[#f4f1e9] p-1">
            <button
              type="button"
              onClick={() => setGoal('min')}
              className={`min-h-[40px] rounded-md px-4 py-1.5 text-sm font-extrabold cursor-pointer ${
                goal === 'min'
                  ? 'bg-[#2f79c3] text-white'
                  : 'text-[#53535a] hover:text-[#25262a]'
              }`}
            >
              挑战最小总费用
            </button>
            <button
              type="button"
              onClick={() => setGoal('max')}
              className={`min-h-[40px] rounded-md px-4 py-1.5 text-sm font-extrabold cursor-pointer ${
                goal === 'max'
                  ? 'bg-[#e74636] text-white'
                  : 'text-[#53535a] hover:text-[#25262a]'
              }`}
            >
              挑战最大总费用
            </button>
          </div>
          <span className="text-xs font-semibold text-[#53535a]">
            每次点击选取 2 ~ {k} 块积木进行合并（支持触屏点选）
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 font-mono text-sm tabular-nums">
          <div>
            <span className="text-xs text-[#53535a]">当前累计：</span>
            <strong className="text-lg text-[#25262a]">
              {formatBigIntFull(cumulativeCost)}
            </strong>
          </div>
          <div>
            <span className="text-xs text-[#53535a]">剩余堆数：</span>
            <strong className="text-lg text-[#25262a]">{piles.length}</strong>
          </div>
        </div>
      </section>

      {/* Main Interactive Baseplate */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lego-baseplate flex flex-col justify-between p-5 lg:col-span-8">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-[#25262a]">
                课堂互动拼装台
              </h2>
              <span className="font-mono text-xs font-bold text-[#53535a] tabular-nums">
                已选中 {selectedIds.length} 堆（合法范围：2 ~ {maxAllowed}）
              </span>
            </div>

            {weights.length > 40 ? (
              <div className="my-8 rounded-lg border-2 border-dashed border-[#25262a] bg-[#fffdf8] p-5 text-center text-sm text-[#53535a]">
                当前堆数较多（n = {weights.length}），建议在上方切换到 4 ~ 12 堆的数据进行课堂互动挑战。
              </div>
            ) : (
              <div className="my-6 flex min-h-[180px] flex-wrap items-end justify-center gap-3.5 border-b-[8px] border-[#25262a] pb-5">
                <AnimatePresence mode="popLayout">
                  {piles.map((pile) => {
                    const isSel = selectedIds.includes(pile.id);
                    const isHinted = hintIds.includes(pile.id);
                    return (
                      <motion.div
                        key={pile.id}
                        layout
                        initial={{opacity: 0, scale: 0.85, y: -12}}
                        animate={{opacity: 1, scale: 1, y: 0}}
                        exit={{opacity: 0, scale: 0.78}}
                        transition={{duration: 0.2}}
                      >
                        <LegoBrick
                          weight={pile.weight}
                          colorIndex={pile.colorIndex}
                          minWeight={minWeight}
                          maxWeight={maxWeight}
                          mergedCount={pile.mergedCount}
                          selected={isSel}
                          highlighted={isHinted && !isSel}
                          onClick={() => toggleSelect(pile.id)}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {feedback && (
              <p className="mb-3 rounded-lg border-2 border-[#a62824] bg-[#fdecea] px-3.5 py-2 text-xs font-bold text-[#a62824]">
                {feedback}
              </p>
            )}

            {hintText && (
              <div className="mb-3 rounded-lg border-2 border-[#b2820d] bg-[#fff6d1] px-3.5 py-2.5 text-xs font-medium text-[#2b271e]">
                <strong>贪心提示：</strong>
                {hintText}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleConfirmMerge}
                disabled={isCompleted || selectedPiles.length < 2}
                className="lego-btn lego-btn-green min-h-[44px] px-5"
              >
                <Merge className="h-4 w-4" />
                确认合并
                {selectedPiles.length >= 2 && (
                  <span className="font-mono tabular-nums">
                    （+{formatBigIntFull(previewSum)}）
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleShowHint}
                disabled={isCompleted}
                className="lego-btn lego-btn-yellow min-h-[44px]"
              >
                <Lightbulb className="h-4 w-4" />
                下一步提示
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0}
                className="lego-btn lego-btn-neutral min-h-[44px]"
              >
                <Undo2 className="h-4 w-4" />
                撤销
              </button>
              <button
                type="button"
                onClick={resetChallenge}
                className="lego-btn lego-btn-neutral min-h-[44px]"
              >
                <RotateCcw className="h-4 w-4" />
                重来
              </button>
            </div>
          </div>
        </div>

        {/* Right Result / Move History Panel */}
        <aside className="lego-panel flex flex-col justify-between p-5 lg:col-span-4">
          {analysis ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-extrabold text-[#25262a]">
                    {analysis.isOptimal ? '达成理论最优解！' : '挑战完成 · 复盘报告'}
                  </h3>
                  <div className="mt-1 flex items-center gap-1">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`h-5 w-5 ${
                          s <= analysis.stars
                            ? 'fill-[#f6c823] text-[#25262a]'
                            : 'text-[#cfc6b1]'
                        }`}
                      />
                    ))}
                    <span className="ml-2 font-mono text-sm font-extrabold text-[#25262a] tabular-nums">
                      {analysis.score} 分
                    </span>
                  </div>
                </div>
                <LegoMinifig
                  size={56}
                  mood={analysis.isOptimal ? 'celebrate' : 'thinking'}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 font-mono text-xs tabular-nums">
                <div className="rounded-lg border border-[#25262a]/25 bg-[#f7f4ec] p-3">
                  <div className="text-[#53535a]">你的总费用</div>
                  <div className="mt-1 text-lg font-extrabold text-[#25262a]">
                    {formatBigIntFull(analysis.userTotalCost)}
                  </div>
                </div>
                <div className="rounded-lg border border-[#25262a]/25 bg-[#f7f4ec] p-3">
                  <div className="text-[#53535a]">理论最优解</div>
                  <div className="mt-1 text-lg font-extrabold text-[#1e613d]">
                    {formatBigIntFull(analysis.optimalTotalCost)}
                  </div>
                </div>
              </div>

              {analysis.isOptimal ? (
                <div className="rounded-lg border-2 border-[#1e613d] bg-[#e9f7ef] p-3.5 text-xs leading-6 text-[#1e613d]">
                  <div className="flex items-center gap-1.5 font-extrabold">
                    <CheckCircle2 className="h-4 w-4" />
                    费用差值：0（完全最优）
                  </div>
                  <p className="mt-1 text-[#25262a]">
                    {analysis.usedAlternativeOptimalPath
                      ? '你采用了一条与标准堆弹出顺序不同、但总费用完全等价的最优合并路径，同样获得满分认可！'
                      : '你的每一步选择都精准契合贪心最优决策！'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="rounded-lg border-2 border-[#a62824] bg-[#fdf0ee] p-3 text-xs font-bold text-[#a62824] tabular-nums">
                    与理论最优解相差：{formatBigIntFull(analysis.diff)}
                  </div>
                  {analysis.firstDeviation && (
                    <div className="rounded-lg border border-[#25262a]/25 bg-[#fff6d1] p-3 text-xs leading-6 text-[#25262a]">
                      <div className="font-extrabold">首次偏离步骤诊断：</div>
                      <p className="mt-1">{analysis.firstDeviation.reason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-base font-extrabold text-[#25262a]">
                操作记录（共 {moves.length} 步）
              </h3>
              <p className="mt-1 text-xs text-[#53535a]">
                完成后系统将与理论最优解（完成后揭晓，提示：当前目标为
                {goal === 'min' ? '最小化' : '最大化'}总费用）比对并支持等价最优路径判定。
              </p>
              <div className="mt-3 max-h-[260px] space-y-1.5 overflow-y-auto">
                {moves.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#25262a]/30 p-4 text-center text-xs text-[#6e6c73]">
                    尚未合并任何积木，点击左侧底板上的积木开始挑战。
                  </p>
                ) : (
                  moves.map((m) => (
                    <div
                      key={m.stepIndex}
                      className="flex items-center justify-between rounded-md border border-[#25262a]/20 bg-[#f7f4ec] px-3 py-2 font-mono text-xs tabular-nums"
                    >
                      <span>
                        #{m.stepIndex}:{' '}
                        {m.selectedWeights.map((w) => w.toString()).join('+')} →{' '}
                        <strong>{m.mergedWeight.toString()}</strong>
                      </span>
                      <span className="text-[#53535a]">
                        累计 {m.cumulativeCost.toString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="mt-4 border-t border-[#25262a]/15 pt-3 text-xs text-[#53535a]">
            {isCompleted ? (
              <button
                type="button"
                onClick={resetChallenge}
                className="lego-btn lego-btn-blue w-full"
              >
                再来一局
              </button>
            ) : (
              <div className="flex items-center justify-between font-mono">
                <span>理论参照（可盲打挑战）</span>
                <span className="text-[#6e6c73]">
                  {moves.length > 0 ? '合并全部后揭晓' : `目标：${goal === 'min' ? '最小' : '最大'}`}
                  <span className="sr-only">{targetOptimal.toString()}</span>
                </span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
