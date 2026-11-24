import {BinaryHeap} from './heap';
import {
  computeFirstMergeCount,
  computeVirtualZeroCount,
  solveMaxCostPure,
  solveMinCostPure,
} from './core';
import {solveExhaustiveMemoized} from './exhaustive';
import {createSeededRng} from './parser';
import type {
  AlgorithmMode,
  BrickColorIndex,
  ChallengeAnalysis,
  ChallengeDeviation,
  ChallengeMove,
  MergeStep,
  PileItem,
  SimulationTrace,
  StrategyEvaluation,
  StrategyStepSummary,
  TreeNodeData,
  WplEntry,
} from '../types/algorithm';

/** Cap visual snapshot trace at 120 piles to keep DOM/history lightweight while pure solver supports 100k+. */
export const MAX_VISUAL_TRACE_N = 120;

export const MIN_PSEUDOCODE = [
  '1. 若 n ≤ 1，返回总费用 0',
  '2. 将所有石子堆构建为小根堆 MinHeap',
  '3. 计算首次合并堆数 r = 2 + (n - 2) mod (k - 1)',
  '4. 弹出最小的 r 堆，合并为新堆并累加费用',
  '5. 将新堆压回 MinHeap',
  '6. while MinHeap.size > 1:',
  '7.     弹出堆顶最小的 k 堆（不足则全弹出）',
  '8.     合并为新堆，累加费用并压回 MinHeap',
  '9. 返回累计最小总费用',
];

export const MAX_PSEUDOCODE = [
  '1. 若 n ≤ 1，返回总费用 0',
  '2. 将所有石子堆构建为大根堆 MaxHeap',
  '3. while MaxHeap.size > 1:',
  '4.     弹出堆顶最大的第 1 堆 a',
  '5.     弹出堆顶最大的第 2 堆 b',
  '6.     新堆权值 w = a + b，累加至总费用',
  '7.     将新堆 w 压回 MaxHeap',
  '8. 返回累计最大总费用',
];

function comparePileAsc(a: PileItem, b: PileItem): number {
  if (a.weight !== b.weight) return a.weight < b.weight ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function comparePileDesc(a: PileItem, b: PileItem): number {
  if (a.weight !== b.weight) return a.weight > b.weight ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function buildInitialPiles(weights: readonly bigint[]): PileItem[] {
  return weights.map((w, index) => ({
    id: `leaf-${index}`,
    weight: w,
    colorIndex: (index % 4) as BrickColorIndex,
    isVirtual: false,
    mergedCount: 1,
    sourceLeafIds: [`leaf-${index}`],
    originalIndex: index,
  }));
}

function annotateTreeDepthsAndCodes(
  nodes: Record<string, TreeNodeData>,
  rootId: string | null,
): {wplEntries: WplEntry[]; internalNodeSum: bigint} {
  if (!rootId || !nodes[rootId]) {
    return {wplEntries: [], internalNodeSum: 0n};
  }

  const wplEntries: WplEntry[] = [];
  let internalNodeSum = 0n;

  const visit = (id: string, depth: number, code: string) => {
    const node = nodes[id];
    if (!node) return;
    node.depth = depth;
    node.code = code;

    if (node.isLeaf) {
      if (!node.isVirtual) {
        wplEntries.push({
          nodeId: node.id,
          originalIndex: node.originalIndex ?? 0,
          weight: node.weight,
          depth,
          contribution: node.weight * BigInt(depth),
          code: code || '0',
        });
      }
    } else {
      internalNodeSum += node.weight;
      node.childrenIds.forEach((childId, edgeIdx) => {
        const digit = edgeIdx < 10 ? String(edgeIdx) : `[${edgeIdx}]`;
        visit(childId, depth + 1, code + digit);
      });
    }
  };

  visit(rootId, 0, '');
  wplEntries.sort((a, b) => a.originalIndex - b.originalIndex);
  return {wplEntries, internalNodeSum};
}

/**
 * Generates unified SimulationTrace for visualization (Lab, Tree, Heap, Pseudocode sync).
 * For n > MAX_VISUAL_TRACE_N, returns pure exact cost with `truncatedForVisual: true`
 * to protect browser memory and maintain O(n) space discipline on huge inputs.
 */
export function buildSimulationTrace(
  weights: readonly bigint[],
  k: number,
  mode: AlgorithmMode,
  options?: {includeVirtualZeros?: boolean},
): SimulationTrace {
  const n = weights.length;
  const virtualZeroCount = mode === 'min' ? computeVirtualZeroCount(n, k) : 0;
  const firstMergeCount =
    mode === 'min' ? computeFirstMergeCount(n, k) : n > 1 ? 2 : 0;
  const includeVirtualZeros =
    mode === 'min' && Boolean(options?.includeVirtualZeros) && virtualZeroCount > 0;

  if (n > MAX_VISUAL_TRACE_N) {
    const pure =
      mode === 'min' ? solveMinCostPure(weights, k) : solveMaxCostPure(weights);
    return {
      mode,
      k,
      initialPiles: [],
      steps: [],
      totalCost: pure.totalCost,
      virtualZeroCount: pure.virtualZeroCount,
      firstMergeCount: pure.firstMergeCount,
      nodes: {},
      rootId: null,
      wplEntries: [],
      internalNodeSum: pure.totalCost,
      usedVirtualPadding: false,
      truncatedForVisual: true,
    };
  }

  const basePiles = buildInitialPiles(weights);
  const virtualPiles: PileItem[] = [];
  // Cap physical virtual-zero items in trace to 64; UI collapses counts > 6 gracefully.
  const actualVirtualRenderCount = includeVirtualZeros
    ? Math.min(virtualZeroCount, 64)
    : 0;
  const usePhysicalVirtualPadding =
    includeVirtualZeros && virtualZeroCount <= 64;

  if (usePhysicalVirtualPadding) {
    for (let i = 0; i < actualVirtualRenderCount; i++) {
      virtualPiles.push({
        id: `vz-${i}`,
        weight: 0n,
        colorIndex: 1,
        isVirtual: true,
        mergedCount: 0,
        sourceLeafIds: [],
      });
    }
  }

  const initialPiles = [...virtualPiles, ...basePiles];
  const nodes: Record<string, TreeNodeData> = {};
  for (const item of initialPiles) {
    nodes[item.id] = {
      id: item.id,
      weight: item.weight,
      isLeaf: true,
      isVirtual: Boolean(item.isVirtual),
      childrenIds: [],
      parentId: null,
      depth: 0,
      code: '',
      createdAtStep: 0,
      colorIndex: item.colorIndex,
      originalIndex: item.originalIndex,
    };
  }

  if (n <= 1) {
    const rootId = basePiles[0]?.id ?? null;
    const {wplEntries, internalNodeSum} = annotateTreeDepthsAndCodes(nodes, rootId);
    return {
      mode,
      k,
      initialPiles: basePiles,
      steps: [],
      totalCost: 0n,
      virtualZeroCount: 0,
      firstMergeCount: 0,
      nodes,
      rootId,
      wplEntries,
      internalNodeSum,
      usedVirtualPadding: false,
      truncatedForVisual: false,
    };
  }

  const heap = new BinaryHeap<PileItem>(
    mode === 'min' ? comparePileAsc : comparePileDesc,
    initialPiles,
  );

  const steps: MergeStep[] = [];
  let cumulativeCost = 0n;
  let stepCounter = 0;

  while (heap.size > 1) {
    stepCounter++;
    const heapBefore = heap.toHeapArray();
    let takeCount: number;
    let isFirstAdjustedMerge = false;

    if (mode === 'max') {
      takeCount = 2;
    } else if (usePhysicalVirtualPadding) {
      takeCount = Math.min(k, heap.size);
    } else if (stepCounter === 1) {
      takeCount = Math.min(firstMergeCount, heap.size);
      isFirstAdjustedMerge = takeCount < k && n > k;
    } else {
      takeCount = Math.min(k, heap.size);
    }

    const selectedItems: PileItem[] = [];
    let stepCost = 0n;
    let mergedCount = 0;
    const sourceLeafIds: string[] = [];

    for (let i = 0; i < takeCount; i++) {
      const popped = heap.pop()!;
      selectedItems.push(popped);
      stepCost += popped.weight;
      mergedCount += popped.mergedCount;
      sourceLeafIds.push(...popped.sourceLeafIds);
    }

    cumulativeCost += stepCost;
    const mergedId = `${mode}-m${stepCounter}`;
    const mergedColor: BrickColorIndex =
      mode === 'min' ? (stepCounter % 2 === 0 ? 2 : 3) : 0;

    const mergedItem: PileItem = {
      id: mergedId,
      weight: stepCost,
      colorIndex: mergedColor,
      isVirtual: false,
      mergedCount,
      sourceLeafIds,
    };

    nodes[mergedId] = {
      id: mergedId,
      weight: stepCost,
      isLeaf: false,
      isVirtual: false,
      childrenIds: selectedItems.map((s) => s.id),
      parentId: null,
      depth: 0,
      code: '',
      createdAtStep: stepCounter,
      colorIndex: mergedColor,
    };
    for (const child of selectedItems) {
      if (nodes[child.id]) {
        nodes[child.id].parentId = mergedId;
      }
    }

    heap.push(mergedItem);
    const heapAfter = heap.toHeapArray();

    const weightsStr = selectedItems
      .map((item) => (item.isVirtual ? '0(虚)' : item.weight.toString()))
      .join(' + ');

    let explanation: string;
    let activePseudoLines: number[];

    if (mode === 'min') {
      if (stepCounter === 1 && !usePhysicalVirtualPadding) {
        explanation =
          isFirstAdjustedMerge
            ? `首轮调整：为保证后续满 ${k} 叉合并，先弹出最小的 r = ${takeCount} 堆（${weightsStr}），合并为 ${stepCost}。`
            : `首轮弹出最小的 ${takeCount} 堆（${weightsStr}），合并生成新积木组 ${stepCost}，累计费用 ${cumulativeCost}。`;
        activePseudoLines = [3, 4, 5];
      } else {
        explanation = `第 ${stepCounter} 轮：从小根堆弹出最小的 ${takeCount} 堆（${weightsStr}），合并为 ${stepCost}，累计费用 ${cumulativeCost}。`;
        activePseudoLines = [6, 7, 8];
      }
    } else {
      explanation = `第 ${stepCounter} 轮：从大根堆弹出最大的 2 堆（${weightsStr}），合并为 ${stepCost}，累计费用 ${cumulativeCost}。`;
      activePseudoLines = [3, 4, 5, 6, 7];
    }

    steps.push({
      stepIndex: stepCounter,
      selectedItems,
      mergedItem,
      stepCost,
      cumulativeCost,
      remainingCount: heap.size,
      heapBefore,
      heapAfter,
      activePseudoLines,
      explanation,
      isFirstAdjustedMerge,
    });
  }

  const rootItem = heap.peek() ?? null;
  const rootId = rootItem?.id ?? null;
  const {wplEntries, internalNodeSum} = annotateTreeDepthsAndCodes(nodes, rootId);

  return {
    mode,
    k,
    initialPiles,
    steps,
    totalCost: cumulativeCost,
    virtualZeroCount,
    firstMergeCount,
    nodes,
    rootId,
    wplEntries,
    internalNodeSum,
    usedVirtualPadding: usePhysicalVirtualPadding,
    truncatedForVisual: false,
  };
}

/**
 * Evaluates all 7 strategies for the Strategy Research Lab.
 */
export function evaluateAllStrategies(
  weights: readonly bigint[],
  k: number,
  randomSeed: number = 2026,
  includeExhaustive: boolean = true,
): StrategyEvaluation[] {
  const optimalMin = solveMinCostPure(weights, k).totalCost;
  const optimalMax = solveMaxCostPure(weights).totalCost;

  const runHeapStrategy = (
    isMin: boolean,
    takeCountFn: (step: number, remaining: number) => number,
  ): {totalCost: bigint; stepsSummary: StrategyStepSummary[]} => {
    if (weights.length <= 1) return {totalCost: 0n, stepsSummary: []};
    const heap = new BinaryHeap<{id: number; w: bigint}>(
      (a, b) => {
        if (a.w !== b.w) {
          return isMin ? (a.w < b.w ? -1 : 1) : a.w > b.w ? -1 : 1;
        }
        return a.id - b.id;
      },
      weights.map((w, i) => ({id: i, w})),
    );
    let nextId = weights.length;
    let totalCost = 0n;
    let step = 0;
    const stepsSummary: StrategyStepSummary[] = [];

    while (heap.size > 1) {
      step++;
      const take = Math.min(takeCountFn(step, heap.size), heap.size);
      const selectedWeights: bigint[] = [];
      let sum = 0n;
      for (let i = 0; i < take; i++) {
        const item = heap.pop()!;
        selectedWeights.push(item.w);
        sum += item.w;
      }
      totalCost += sum;
      heap.push({id: nextId++, w: sum});
      stepsSummary.push({
        stepIndex: step,
        selectedWeights,
        mergedWeight: sum,
        cumulativeCost: totalCost,
      });
    }
    return {totalCost, stepsSummary};
  };

  const runRandomValid = (): {
    totalCost: bigint;
    stepsSummary: StrategyStepSummary[];
  } => {
    const arr = [...weights];
    const rand = createSeededRng(randomSeed);
    let totalCost = 0n;
    let step = 0;
    const stepsSummary: StrategyStepSummary[] = [];

    while (arr.length > 1) {
      step++;
      const maxTake = Math.min(k, arr.length);
      const take = 2 + Math.floor(rand() * (maxTake - 1));
      const selectedWeights: bigint[] = [];
      let sum = 0n;
      for (let i = 0; i < take; i++) {
        const pickIdx = Math.floor(rand() * arr.length);
        const [val] = arr.splice(pickIdx, 1);
        selectedWeights.push(val);
        sum += val;
      }
      totalCost += sum;
      arr.push(sum);
      stepsSummary.push({
        stepIndex: step,
        selectedWeights,
        mergedWeight: sum,
        cumulativeCost: totalCost,
      });
    }
    return {totalCost, stepsSummary};
  };

  const firstR = computeFirstMergeCount(weights.length, k);

  const sMinBinary = runHeapStrategy(true, () => 2);
  const sNaiveMinK = runHeapStrategy(true, () => k);
  const sMinHuffman = runHeapStrategy(true, (step) => (step === 1 ? firstR : k));
  const sMaxBinary = runHeapStrategy(false, () => 2);
  const sNaiveMaxK = runHeapStrategy(false, () => k);
  const sRandom = runRandomValid();

  const makeEntry = (
    strategyId: StrategyEvaluation['strategyId'],
    name: string,
    goal: StrategyEvaluation['goal'],
    run: {totalCost: bigint; stepsSummary: StrategyStepSummary[]},
    timeComplexity: string,
    applicableCondition: string,
    correctnessNote: string,
  ): StrategyEvaluation => ({
    strategyId,
    name,
    goal,
    totalCost: run.totalCost,
    mergeCount: run.stepsSummary.length,
    gapFromMin: run.totalCost - optimalMin,
    gapFromMax: optimalMax - run.totalCost,
    isMinOptimal: run.totalCost === optimalMin,
    isMaxOptimal: run.totalCost === optimalMax,
    stepsSummary: run.stepsSummary,
    timeComplexity,
    applicableCondition,
    correctnessNote,
    status: 'ok',
  });

  const results: StrategyEvaluation[] = [
    makeEntry(
      'min-huffman',
      '首次调整多元 Huffman（理论最优最小）',
      'min',
      sMinHuffman,
      'O(n log n)',
      '任意 n ≥ 1, k ≥ 2',
      '严格最优。通过调整首轮合并数 r = 2 + (n-2) mod (k-1)，保证根节点满 k 叉，深层节点权值最小。',
    ),
    makeEntry(
      'min-naive-k',
      '直接每次合并最小 k 堆（未补零）',
      'min',
      sNaiveMinK,
      'O(n log n)',
      '仅当 (n-1) mod (k-1) = 0 时保证最优',
      '易错陷阱：若最后一步不足 k 堆，大权值堆被提前推入更深层，导致总费用严格偏大。',
    ),
    makeEntry(
      'min-binary',
      '每次合并最小的 2 堆（二元 Huffman）',
      'min',
      sMinBinary,
      'O(n log n)',
      '仅当 k = 2 时保证最优',
      '当 k > 2 时未利用多路合并降低树高，导致叶子深度偏大、总费用高于多元最优。',
    ),
    makeEntry(
      'max-binary',
      '每次合并最大的 2 堆（理论最优最大）',
      'max',
      sMaxBinary,
      'O(n log n)',
      '任意 n ≥ 1, k ≥ 2',
      '严格最优。任意多元合并均可拆分为费用严格更大的二元链，大根堆贪心令大权值深度最大化。',
    ),
    makeEntry(
      'max-naive-k',
      '直接每次合并最大 k 堆',
      'max',
      sNaiveMaxK,
      'O(n log n)',
      '仅当 k = 2 或 n ≤ 2 时最优',
      '错误贪心：单次合并超过 2 堆会减少合并轮次，使大权值少被重复累加，总费用远低于最大值。',
    ),
    makeEntry(
      'random',
      '随机合法合并（对照组）',
      'explore',
      sRandom,
      'O(n²)',
      '仅作合法可行解参照',
      '每次随机选取 2 ~ k 堆合并，费用介于最小与最大理论边界之间，无最优保证。',
    ),
  ];

  if (includeExhaustive) {
    const ex = solveExhaustiveMemoized(weights, k);
    if (ex.status === 'ok') {
      results.push({
        strategyId: 'exhaustive',
        name: '小规模记忆化穷举搜索（全局基准）',
        goal: 'both',
        totalCost: ex.minCost,
        maxExhaustiveCost: ex.maxCost,
        mergeCount: ex.minSteps.length,
        gapFromMin: ex.minCost - optimalMin,
        gapFromMax: optimalMax - ex.maxCost,
        isMinOptimal: ex.minCost === optimalMin,
        isMaxOptimal: ex.maxCost === optimalMax,
        stepsSummary: ex.minSteps,
        timeComplexity: '指数级（状态记忆化剪枝）',
        applicableCondition: 'n ≤ 8（防止组合爆炸）',
        correctnessNote: `遍历 ${ex.exploredStates} 个等价多重集状态，实证最小=${ex.minCost}、最大=${ex.maxCost} 与贪心完全一致。`,
        status: 'ok',
        exploredStates: ex.exploredStates,
      });
    } else {
      results.push({
        strategyId: 'exhaustive',
        name: '小规模记忆化穷举搜索（全局基准）',
        goal: 'both',
        totalCost: optimalMin,
        maxExhaustiveCost: optimalMax,
        mergeCount: 0,
        gapFromMin: 0n,
        gapFromMax: 0n,
        isMinOptimal: true,
        isMaxOptimal: true,
        stepsSummary: [],
        timeComplexity: '指数级（已触发安全保护）',
        applicableCondition: '仅支持 n ≤ 8',
        correctnessNote: `当前 n = ${weights.length} 超过小规模穷举上限（n ≤ 8），已自动保护浏览器避免组合爆炸。`,
        status: 'limit-exceeded',
        exploredStates: ex.exploredStates,
      });
    }
  }

  return results;
}

/**
 * Recommends one optimal next move (weights to pick) for the Challenge hint system.
 */
export function getRecommendedNextMove(
  currentPiles: readonly PileItem[],
  k: number,
  goal: AlgorithmMode,
): {selectedIds: string[]; selectedWeights: bigint[]; reason: string} | null {
  const n = currentPiles.length;
  if (n <= 1) return null;

  const sorted = [...currentPiles].sort(
    goal === 'min' ? comparePileAsc : comparePileDesc,
  );

  if (goal === 'min') {
    const r = computeFirstMergeCount(n, k);
    const chosen = sorted.slice(0, r);
    const isAdjusted = r < k && n > k;
    return {
      selectedIds: chosen.map((c) => c.id),
      selectedWeights: chosen.map((c) => c.weight),
      reason: isAdjusted
        ? `当前剩 ${n} 堆，按首轮调整公式 r = 2 + (${n}-2) mod (${k}-1) = ${r}，建议选最小的 ${r} 堆（${chosen.map((c) => c.weight.toString()).join('、')}），确保后续每轮恰好满 ${k} 叉。`
        : `当前剩 ${n} 堆，建议合并最小的 ${r} 堆（${chosen.map((c) => c.weight.toString()).join('、')}），让较小权值处于树更深层。`,
    };
  } else {
    const chosen = sorted.slice(0, 2);
    return {
      selectedIds: chosen.map((c) => c.id),
      selectedWeights: chosen.map((c) => c.weight),
      reason: `求最大费用时只选最大的 2 堆（${chosen.map((c) => c.weight.toString()).join('、')}）进行二元合并，最大化大权值参与后续累加的次数。`,
    };
  }
}

/**
 * Exact Challenge Analyzer:
 * NEVER marks an alternative optimal path wrong!
 * For each step t, compares the best achievable total cost BEFORE step t vs AFTER step t:
 *   bestBefore = cumulativeBefore + solveOptimal(remainingBefore, k)
 *   bestAfter  = cumulativeAfter  + solveOptimal(remainingAfter, k)
 * A step deviates if and only if bestAfter strictly worsens relative to bestBefore.
 */
export function analyzeChallengeAttempt(
  initialWeights: readonly bigint[],
  k: number,
  goal: AlgorithmMode,
  moves: readonly ChallengeMove[],
): ChallengeAnalysis {
  const optimalTotalCost =
    goal === 'min'
      ? solveMinCostPure(initialWeights, k).totalCost
      : solveMaxCostPure(initialWeights).totalCost;

  const userTotalCost =
    moves.length > 0 ? moves[moves.length - 1].cumulativeCost : 0n;
  const diff =
    goal === 'min'
      ? userTotalCost - optimalTotalCost
      : optimalTotalCost - userTotalCost;
  const isOptimal = userTotalCost === optimalTotalCost;

  const deviations: ChallengeDeviation[] = [];
  let differedFromCanonicalChoice = false;

  for (const move of moves) {
    const cumBefore = move.cumulativeCost - move.stepCost;
    const remOptBefore =
      goal === 'min'
        ? solveMinCostPure(move.remainingWeightsBefore, k).totalCost
        : solveMaxCostPure(move.remainingWeightsBefore).totalCost;
    const remOptAfter =
      goal === 'min'
        ? solveMinCostPure(move.remainingWeightsAfter, k).totalCost
        : solveMaxCostPure(move.remainingWeightsAfter).totalCost;

    const bestBefore = cumBefore + remOptBefore;
    const bestAfter = move.cumulativeCost + remOptAfter;

    // Check if multiset of chosen weights differs from canonical greedy recommendation
    const sortedBefore = [...move.remainingWeightsBefore].sort((a, b) =>
      goal === 'min' ? (a < b ? -1 : a > b ? 1 : 0) : a > b ? -1 : a < b ? 1 : 0,
    );
    const recCount =
      goal === 'min'
        ? computeFirstMergeCount(move.remainingWeightsBefore.length, k)
        : 2;
    const recWeights = sortedBefore.slice(0, recCount);

    const chosenSorted = [...move.selectedWeights].sort((a, b) =>
      goal === 'min' ? (a < b ? -1 : a > b ? 1 : 0) : a > b ? -1 : a < b ? 1 : 0,
    );
    if (
      chosenSorted.length !== recWeights.length ||
      chosenSorted.some((w, idx) => w !== recWeights[idx])
    ) {
      differedFromCanonicalChoice = true;
    }

    const penalty =
      goal === 'min' ? bestAfter - bestBefore : bestBefore - bestAfter;

    if (penalty > 0n) {
      const reason =
        goal === 'min'
          ? `第 ${move.stepIndex} 步选择了 [${move.selectedWeights.map((w) => w.toString()).join(', ')}]，导致可达最小总费用从 ${bestBefore} 恶化至 ${bestAfter}（多付出 ${penalty}）。建议改为合并最小的 ${recCount} 堆 [${recWeights.map((w) => w.toString()).join(', ')}]。`
          : `第 ${move.stepIndex} 步选择了 [${move.selectedWeights.map((w) => w.toString()).join(', ')}]，导致可达最大总费用从 ${bestBefore} 下降至 ${bestAfter}（损失 ${penalty}）。建议改为仅合并最大的 2 堆 [${recWeights.map((w) => w.toString()).join(', ')}]。`;

      deviations.push({
        stepIndex: move.stepIndex,
        selectedWeights: move.selectedWeights,
        bestAchievableBefore: bestBefore,
        bestAchievableAfter: bestAfter,
        penalty,
        recommendedWeights: recWeights,
        reason,
      });
    }
  }

  let stars: 1 | 2 | 3 = 1;
  let score = 60;

  if (isOptimal) {
    stars = 3;
    score = 100;
  } else if (optimalTotalCost > 0n) {
    // Compute relative gap safely via scaled BigInt division
    const gapPermille = Number((diff * 1000n) / optimalTotalCost);
    if (gapPermille <= 80) {
      stars = 2;
      score = Math.max(80, Math.min(96, Math.round(98 - gapPermille * 0.22)));
    } else if (gapPermille <= 220) {
      stars = 2;
      score = Math.max(68, Math.round(84 - (gapPermille - 80) * 0.1));
    } else {
      stars = 1;
      score = Math.max(40, Math.round(66 - Math.min(26, (gapPermille - 220) * 0.05)));
    }
  }

  return {
    goal,
    userTotalCost,
    optimalTotalCost,
    diff,
    isOptimal,
    stars,
    score,
    deviations,
    firstDeviation: deviations[0] ?? null,
    usedAlternativeOptimalPath: isOptimal && differedFromCanonicalChoice,
  };
}
