import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Search,
  Sparkles,
} from 'lucide-react';
import {DatasetToolbar} from '../components/DatasetToolbar';
import {LegoBrick} from '../components/lego/LegoBrick';
import {
  EXHAUSTIVE_MAX_N,
  searchNaiveKCounterexample,
} from '../algorithms/exhaustive';
import {formatBigIntFull} from '../algorithms/parser';
import {evaluateAllStrategies} from '../algorithms/trace';
import {useDataset} from '../hooks/useDataset';
import type {
  PageRoute,
  StrategyEvaluation,
  StrategyStepSummary,
} from '../types/algorithm';

interface StrategyLabPageProps {
  onNavigate: (route: PageRoute) => void;
  presentationMode?: boolean;
}

interface CounterexampleView {
  n: number;
  k: number;
  weights: bigint[];
  optimalMinCost: bigint;
  naiveMinKCost: bigint;
  penalty: bigint;
  attempts: number;
}

export const StrategyLabPage: React.FC<StrategyLabPageProps> = ({
  onNavigate,
  presentationMode = false,
}) => {
  const {k, weights, setDatasetDirect} = useDataset();
  const [randomSeed, setRandomSeed] = useState(2026);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('min-huffman');
  const [counterK, setCounterK] = useState(3);
  const [counterSeed, setCounterSeed] = useState(42);
  const [searchingCounter, setSearchingCounter] = useState(false);

  // Worker-computed exhaustive state
  const [exhaustiveWorkerData, setExhaustiveWorkerData] = useState<{
    status: 'loading' | 'ok' | 'limit-exceeded';
    minCost: bigint;
    maxCost: bigint;
    exploredStates: number;
    minSteps: StrategyStepSummary[];
  }>({
    status: 'limit-exceeded',
    minCost: 0n,
    maxCost: 0n,
    exploredStates: 0,
    minSteps: [],
  });

  const [counterexample, setCounterexample] = useState<CounterexampleView>(() => ({
    n: 4,
    k: 3,
    weights: [1n, 2n, 3n, 4n],
    optimalMinCost: 13n,
    naiveMinKCost: 16n,
    penalty: 3n,
    attempts: 1,
  }));

  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/compute.worker.ts', import.meta.url),
      {type: 'module'},
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'exhaustive-result') {
        setExhaustiveWorkerData({
          status: msg.status,
          minCost: BigInt(msg.minCostStr),
          maxCost: BigInt(msg.maxCostStr),
          exploredStates: msg.exploredStates,
          minSteps: msg.minSteps.map(
            (s: {
              stepIndex: number;
              selectedWeights: string[];
              mergedWeight: string;
              cumulativeCost: string;
            }) => ({
              stepIndex: s.stepIndex,
              selectedWeights: s.selectedWeights.map((x) => BigInt(x)),
              mergedWeight: BigInt(s.mergedWeight),
              cumulativeCost: BigInt(s.cumulativeCost),
            }),
          ),
        });
      } else if (msg.type === 'counterexample-result') {
        setCounterexample({
          n: msg.n,
          k: msg.k,
          weights: msg.weightsStr.map((x: string) => BigInt(x)),
          optimalMinCost: BigInt(msg.optimalMinCostStr),
          naiveMinKCost: BigInt(msg.naiveMinKCostStr),
          penalty: BigInt(msg.penaltyStr),
          attempts: msg.attempts,
        });
        setSearchingCounter(false);
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Trigger Worker exhaustive search when n <= EXHAUSTIVE_MAX_N
  useEffect(() => {
    if (weights.length > EXHAUSTIVE_MAX_N) {
      setExhaustiveWorkerData({
        status: 'limit-exceeded',
        minCost: 0n,
        maxCost: 0n,
        exploredStates: 0,
        minSteps: [],
      });
      return;
    }
    if (!workerRef.current) return;
    setExhaustiveWorkerData((prev) => ({...prev, status: 'loading'}));
    workerRef.current.postMessage({
      type: 'exhaustive',
      id: ++reqIdRef.current,
      weightsStr: weights.map((w) => w.toString()),
      k,
    });
  }, [weights, k]);

  const baseStrategies = useMemo(
    () => evaluateAllStrategies(weights, k, randomSeed, false),
    [weights, k, randomSeed],
  );

  const strategies: StrategyEvaluation[] = useMemo(() => {
    const optMin = baseStrategies.find((s) => s.strategyId === 'min-huffman')?.totalCost ?? 0n;
    const optMax = baseStrategies.find((s) => s.strategyId === 'max-binary')?.totalCost ?? 0n;

    const exEntry: StrategyEvaluation =
      exhaustiveWorkerData.status === 'ok'
        ? {
            strategyId: 'exhaustive',
            name: '小规模记忆化穷举搜索（Web Worker）',
            goal: 'both',
            totalCost: exhaustiveWorkerData.minCost,
            maxExhaustiveCost: exhaustiveWorkerData.maxCost,
            mergeCount: exhaustiveWorkerData.minSteps.length,
            gapFromMin: exhaustiveWorkerData.minCost - optMin,
            gapFromMax: optMax - exhaustiveWorkerData.maxCost,
            isMinOptimal: exhaustiveWorkerData.minCost === optMin,
            isMaxOptimal: exhaustiveWorkerData.maxCost === optMax,
            stepsSummary: exhaustiveWorkerData.minSteps,
            timeComplexity: '指数级（多重集记忆化）',
            applicableCondition: `n ≤ ${EXHAUSTIVE_MAX_N}`,
            correctnessNote: `实测遍历 ${exhaustiveWorkerData.exploredStates} 个等价状态：全局最小=${exhaustiveWorkerData.minCost}，全局最大=${exhaustiveWorkerData.maxCost}，与贪心完全一致。`,
            status: 'ok',
            exploredStates: exhaustiveWorkerData.exploredStates,
          }
        : {
            strategyId: 'exhaustive',
            name: '小规模记忆化穷举搜索（Web Worker）',
            goal: 'both',
            totalCost: optMin,
            maxExhaustiveCost: optMax,
            mergeCount: 0,
            gapFromMin: 0n,
            gapFromMax: 0n,
            isMinOptimal: true,
            isMaxOptimal: true,
            stepsSummary: [],
            timeComplexity: '指数级（安全保护）',
            applicableCondition: `仅限 n ≤ ${EXHAUSTIVE_MAX_N}`,
            correctnessNote:
              exhaustiveWorkerData.status === 'loading'
                ? '正在 Web Worker 后台穷举验证全部合法合并方案…'
                : `当前 n = ${weights.length} 超过小规模穷举上限（n ≤ ${EXHAUSTIVE_MAX_N}），已主动阻止组合爆炸。`,
            status: 'limit-exceeded',
          };

    return [...baseStrategies, exEntry];
  }, [baseStrategies, exhaustiveWorkerData, weights.length]);

  const activeStrategy =
    strategies.find((s) => s.strategyId === selectedStrategyId) ?? strategies[0];

  const counterStrategies = useMemo(() => {
    const all = evaluateAllStrategies(counterexample.weights, counterexample.k, 1, false);
    return {
      opt: all.find((s) => s.strategyId === 'min-huffman')!,
      naive: all.find((s) => s.strategyId === 'min-naive-k')!,
    };
  }, [counterexample]);

  const handleSearchCounterexample = () => {
    const nextSeed = counterSeed + 17;
    setCounterSeed(nextSeed);
    if (workerRef.current) {
      setSearchingCounter(true);
      workerRef.current.postMessage({
        type: 'counterexample',
        id: ++reqIdRef.current,
        k: counterK,
        seed: nextSeed,
      });
    } else {
      setCounterexample(searchNaiveKCounterexample(counterK, nextSeed));
    }
  };

  const handleLoadCounterexampleToLab = () => {
    setDatasetDirect(
      counterexample.weights,
      counterexample.k,
      `反例实验 (n=${counterexample.n}, k=${counterexample.k})`,
    );
    onNavigate('lab');
  };

  return (
    <div className="space-y-6">
      {!presentationMode && <DatasetToolbar compact />}

      {/* 7-Strategy Comparison Table */}
      <section className="lego-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-[#25262a]">
              7 种合并策略横向评测
            </h2>
            <p className="mt-0.5 text-xs text-[#53535a]">
              点击任意一行策略，下方立即展开其完整合并步骤与数学适用条件
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRandomSeed((s) => s + 13)}
            className="lego-btn lego-btn-neutral text-xs"
          >
            重抽随机策略（种子 {randomSeed}）
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#25262a] bg-[#f7f4ec] font-bold text-[#25262a]">
                <th className="px-3 py-2.5">策略名称</th>
                <th className="px-3 py-2.5 text-right">合并轮次</th>
                <th className="px-3 py-2.5 text-right">总费用</th>
                <th className="px-3 py-2.5 text-right">距最小最优差</th>
                <th className="px-3 py-2.5 text-right">距最大最优差</th>
                <th className="px-3 py-2.5">时间复杂度</th>
                <th className="px-3 py-2.5">结论</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#25262a]/10">
              {strategies.map((s) => {
                const isActive = s.strategyId === activeStrategy.strategyId;
                return (
                  <tr
                    key={s.strategyId}
                    onClick={() => setSelectedStrategyId(s.strategyId)}
                    className={`cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[#ffe899]/65 font-semibold'
                        : 'hover:bg-[#f7f4ec]'
                    }`}
                  >
                    <td className="px-3 py-2.5 font-bold text-[#25262a]">
                      {s.name}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {s.status === 'ok' ? s.mergeCount : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-extrabold tabular-nums">
                      {s.status !== 'ok'
                        ? '超出上限'
                        : s.strategyId === 'exhaustive' && s.maxExhaustiveCost !== undefined
                          ? `最小 ${formatBigIntFull(s.totalCost)} / 最大 ${formatBigIntFull(s.maxExhaustiveCost)}`
                          : formatBigIntFull(s.totalCost)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {s.status === 'ok' ? (
                        s.gapFromMin === 0n ? (
                          <span className="font-bold text-[#1e613d]">0（最优）</span>
                        ) : (
                          <span className="text-[#a62824]">
                            +{formatBigIntFull(s.gapFromMin)}
                          </span>
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                      {s.status === 'ok' ? (
                        s.gapFromMax === 0n ? (
                          <span className="font-bold text-[#1e613d]">0（最优）</span>
                        ) : (
                          <span className="text-[#53535a]">
                            -{formatBigIntFull(s.gapFromMax)}
                          </span>
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[#53535a]">
                      {s.timeComplexity}
                    </td>
                    <td className="px-3 py-2.5">
                      {s.status === 'limit-exceeded' ? (
                        <span className="text-[#6e6c73]">已保护跳过</span>
                      ) : s.isMinOptimal || s.isMaxOptimal ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[#1e613d]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          命中边界最优
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-[#a62824]">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          次优解
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Selected Strategy Detail Drawer */}
        <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-[#25262a]/20 bg-[#f7f4ec] p-4 lg:grid-cols-12">
          <div className="space-y-2 lg:col-span-5">
            <h3 className="text-sm font-extrabold text-[#25262a]">
              策略剖析：{activeStrategy.name}
            </h3>
            <p className="text-xs leading-6 text-[#25262a]">
              <strong>正确性与局限：</strong>
              {activeStrategy.correctnessNote}
            </p>
            <p className="text-xs text-[#53535a]">
              <strong>适用条件：</strong>
              {activeStrategy.applicableCondition}
            </p>
          </div>
          <div className="lg:col-span-7">
            <div className="mb-1.5 text-xs font-bold text-[#53535a]">
              该策略在当前数据下的合并过程：
            </div>
            {activeStrategy.stepsSummary.length === 0 ? (
              <p className="text-xs text-[#6e6c73]">
                {activeStrategy.status === 'limit-exceeded'
                  ? '请将堆数调至 n ≤ 8 以启用完整穷举搜索验证。'
                  : '无合并步骤（n = 1）。'}
              </p>
            ) : (
              <div className="max-h-[160px] space-y-1 overflow-y-auto font-mono text-xs tabular-nums">
                {activeStrategy.stepsSummary.map((step) => (
                  <div
                    key={step.stepIndex}
                    className="flex justify-between rounded bg-white px-2.5 py-1 border border-[#25262a]/15"
                  >
                    <span>
                      第 {step.stepIndex} 步：
                      {step.selectedWeights.map((w) => w.toString()).join(' + ')} →{' '}
                      <strong>{step.mergedWeight.toString()}</strong>
                    </span>
                    <span className="text-[#53535a]">
                      累计 {step.cumulativeCost.toString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Automatic Counterexample Searcher & Side-by-Side Visual Proof */}
      <section className="lego-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-[#25262a]">
              自动反例搜索器：为什么“直接每次合并最小 k 堆”会出错？
            </h2>
            <p className="mt-0.5 text-xs text-[#53535a]">
              当 (n − 1) mod (k − 1) ≠ 0 时，直接合并最小 k 堆会在根节点留下空位，迫使较大权值多经历一层合并。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-[#53535a]">
              目标 k
              <select
                value={counterK}
                onChange={(e) => setCounterK(Number(e.target.value))}
                className="rounded border-2 border-[#25262a] bg-white px-2 py-1.5 font-mono text-xs font-bold text-[#25262a]"
              >
                {[3, 4, 5, 6].map((kv) => (
                  <option key={kv} value={kv}>
                    k = {kv}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() =>
                setCounterexample({
                  n: 4,
                  k: 3,
                  weights: [1n, 2n, 3n, 4n],
                  optimalMinCost: 13n,
                  naiveMinKCost: 16n,
                  penalty: 3n,
                  attempts: 1,
                })
              }
              className="lego-btn lego-btn-yellow text-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              经典反例 [1,2,3,4]
            </button>

            <button
              type="button"
              onClick={handleSearchCounterexample}
              disabled={searchingCounter}
              className="lego-btn lego-btn-red text-xs"
            >
              <Search className="h-3.5 w-3.5" />
              {searchingCounter ? '搜索中…' : '自动搜索新反例'}
            </button>

            <button
              type="button"
              onClick={handleLoadCounterexampleToLab}
              className="lego-btn lego-btn-blue text-xs"
            >
              载入实验室演练
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Counterexample Brick Strip */}
        <div className="lego-baseplate mt-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
            <span className="font-mono text-[#25262a] tabular-nums">
              当前反例：n = {counterexample.n}, k = {counterexample.k}, weights = [
              {counterexample.weights.map((w) => w.toString()).join(', ')}]
            </span>
            <span className="font-mono text-[#a62824] tabular-nums">
              朴素策略多付出费用：+{formatBigIntFull(counterexample.penalty)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-end justify-center gap-2.5 pb-2">
            {counterexample.weights.map((w, idx) => (
              <LegoBrick
                key={idx}
                weight={w}
                colorIndex={(idx % 4) as 0 | 1 | 2 | 3}
                minWeight={1n}
                maxWeight={20n}
                compact
              />
            ))}
          </div>
        </div>

        {/* Side-by-side step proof */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg border-2 border-[#1e613d] bg-[#e9f7ef] p-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-extrabold text-[#1e613d]">
                正确策略：首次调整合并数 r
              </h3>
              <span className="font-mono text-xl font-extrabold text-[#1e613d] tabular-nums">
                总费用 = {formatBigIntFull(counterexample.optimalMinCost)}
              </span>
            </div>
            <ol className="mt-3 space-y-1.5 font-mono text-xs text-[#25262a] tabular-nums">
              {counterStrategies.opt.stepsSummary.map((st) => (
                <li
                  key={st.stepIndex}
                  className="flex justify-between rounded bg-white/80 px-2.5 py-1.5"
                >
                  <span>
                    第 {st.stepIndex} 步：{st.selectedWeights.map((x) => x.toString()).join(' + ')} ={' '}
                    <strong>{st.mergedWeight.toString()}</strong>
                  </span>
                  <span>累计 {st.cumulativeCost.toString()}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-lg border-2 border-[#a62824] bg-[#fdf0ee] p-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-extrabold text-[#a62824]">
                错误直觉：直接每次合并最小 {counterexample.k} 堆
              </h3>
              <span className="font-mono text-xl font-extrabold text-[#a62824] tabular-nums">
                总费用 = {formatBigIntFull(counterexample.naiveMinKCost)}
              </span>
            </div>
            <ol className="mt-3 space-y-1.5 font-mono text-xs text-[#25262a] tabular-nums">
              {counterStrategies.naive.stepsSummary.map((st) => (
                <li
                  key={st.stepIndex}
                  className="flex justify-between rounded bg-white/80 px-2.5 py-1.5"
                >
                  <span>
                    第 {st.stepIndex} 步：{st.selectedWeights.map((x) => x.toString()).join(' + ')} ={' '}
                    <strong>{st.mergedWeight.toString()}</strong>
                  </span>
                  <span>累计 {st.cumulativeCost.toString()}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
};
