import type {ExhaustiveResult, StrategyStepSummary} from '../types/algorithm';
import {solveMinCostPure, solveNaiveMinKPure} from './core';
import {createSeededRng} from './parser';

export const EXHAUSTIVE_MAX_N = 8;
export const EXHAUSTIVE_MAX_STATES = 60000;

interface MemoEntry {
  minCost: bigint;
  maxCost: bigint;
  minChoice: bigint[];
  maxChoice: bigint[];
  minNextKey: string;
  maxNextKey: string;
}

function sortBigIntsAsc(arr: readonly bigint[]): bigint[] {
  return [...arr].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function stateKey(sorted: readonly bigint[]): string {
  return sorted.map((v) => v.toString()).join(',');
}

/**
 * Generates all distinct subsets of indices of size `chooseCount` from a sorted multiset,
 * skipping duplicate value combinations for exponential symmetry pruning.
 */
function generateUniqueValueSubsets(
  sorted: readonly bigint[],
  chooseCount: number,
  onSubset: (chosenValues: bigint[], remainingValues: bigint[]) => void,
): void {
  const n = sorted.length;
  const chosenIdx: number[] = [];
  const chosenFlag = new Uint8Array(n);

  function backtrack(start: number, depth: number): void {
    if (depth === chooseCount) {
      const chosen: bigint[] = [];
      const remaining: bigint[] = [];
      for (let i = 0; i < n; i++) {
        if (chosenFlag[i]) chosen.push(sorted[i]);
        else remaining.push(sorted[i]);
      }
      onSubset(chosen, remaining);
      return;
    }

    const limit = n - (chooseCount - depth);
    for (let i = start; i <= limit; i++) {
      // Skip duplicate value at the same recursion level
      if (i > start && sorted[i] === sorted[i - 1]) continue;
      chosenFlag[i] = 1;
      chosenIdx.push(i);
      backtrack(i + 1, depth + 1);
      chosenIdx.pop();
      chosenFlag[i] = 0;
    }
  }

  backtrack(0, 0);
}

/**
 * Memoized Exhaustive Search over ALL legal merge sequences (2 <= c <= min(k, remaining)).
 * Strictly bounded by n <= EXHAUSTIVE_MAX_N and maxStates to prevent combinatorial explosion.
 */
export function solveExhaustiveMemoized(
  weights: readonly bigint[],
  k: number,
  maxStates: number = EXHAUSTIVE_MAX_STATES,
): ExhaustiveResult {
  const n = weights.length;
  if (n <= 1) {
    return {
      status: 'ok',
      minCost: 0n,
      maxCost: 0n,
      minSteps: [],
      maxSteps: [],
      exploredStates: 1,
    };
  }
  if (n > EXHAUSTIVE_MAX_N) {
    return {
      status: 'limit-exceeded',
      minCost: 0n,
      maxCost: 0n,
      minSteps: [],
      maxSteps: [],
      exploredStates: 0,
    };
  }

  const memo = new Map<string, MemoEntry>();
  let limitHit = false;
  const initialSorted = sortBigIntsAsc(weights);

  function dfs(sorted: readonly bigint[]): MemoEntry | null {
    const key = stateKey(sorted);
    const cached = memo.get(key);
    if (cached) return cached;

    if (sorted.length === 1) {
      const leaf: MemoEntry = {
        minCost: 0n,
        maxCost: 0n,
        minChoice: [],
        maxChoice: [],
        minNextKey: '',
        maxNextKey: '',
      };
      memo.set(key, leaf);
      return leaf;
    }

    if (memo.size >= maxStates) {
      limitHit = true;
      return null;
    }

    let bestMin: bigint | null = null;
    let bestMax: bigint | null = null;
    let bestMinChoice: bigint[] = [];
    let bestMaxChoice: bigint[] = [];
    let bestMinNextKey = '';
    let bestMaxNextKey = '';

    const upper = Math.min(k, sorted.length);
    for (let c = 2; c <= upper; c++) {
      if (limitHit) return null;
      generateUniqueValueSubsets(sorted, c, (chosen, remaining) => {
        if (limitHit) return;
        let merged = 0n;
        for (let i = 0; i < chosen.length; i++) merged += chosen[i];

        const nextSorted = sortBigIntsAsc([...remaining, merged]);
        const sub = dfs(nextSorted);
        if (!sub) return;

        const candMin = merged + sub.minCost;
        if (bestMin === null || candMin < bestMin) {
          bestMin = candMin;
          bestMinChoice = chosen;
          bestMinNextKey = stateKey(nextSorted);
        }

        const candMax = merged + sub.maxCost;
        if (bestMax === null || candMax > bestMax) {
          bestMax = candMax;
          bestMaxChoice = chosen;
          bestMaxNextKey = stateKey(nextSorted);
        }
      });
    }

    if (limitHit || bestMin === null || bestMax === null) {
      return null;
    }

    const entry: MemoEntry = {
      minCost: bestMin,
      maxCost: bestMax,
      minChoice: bestMinChoice,
      maxChoice: bestMaxChoice,
      minNextKey: bestMinNextKey,
      maxNextKey: bestMaxNextKey,
    };
    memo.set(key, entry);
    return entry;
  }

  const root = dfs(initialSorted);
  if (limitHit || !root) {
    return {
      status: 'limit-exceeded',
      minCost: 0n,
      maxCost: 0n,
      minSteps: [],
      maxSteps: [],
      exploredStates: memo.size,
    };
  }

  const reconstruct = (kind: 'min' | 'max'): StrategyStepSummary[] => {
    const steps: StrategyStepSummary[] = [];
    let curKey = stateKey(initialSorted);
    let cumulative = 0n;
    let idx = 1;
    while (curKey) {
      const entry = memo.get(curKey);
      if (!entry) break;
      const choice = kind === 'min' ? entry.minChoice : entry.maxChoice;
      const nextKey = kind === 'min' ? entry.minNextKey : entry.maxNextKey;
      if (choice.length === 0) break;
      let merged = 0n;
      for (const w of choice) merged += w;
      cumulative += merged;
      steps.push({
        stepIndex: idx++,
        selectedWeights: choice,
        mergedWeight: merged,
        cumulativeCost: cumulative,
      });
      curKey = nextKey;
    }
    return steps;
  };

  return {
    status: 'ok',
    minCost: root.minCost,
    maxCost: root.maxCost,
    minSteps: reconstruct('min'),
    maxSteps: reconstruct('max'),
    exploredStates: memo.size,
  };
}

export interface CounterexampleReport {
  n: number;
  k: number;
  weights: bigint[];
  optimalMinCost: bigint;
  naiveMinKCost: bigint;
  penalty: bigint;
  attempts: number;
}

/**
 * Automatically searches for a clean, small counterexample where naive "always merge smallest k"
 * fails to achieve the optimal minimum cost.
 */
export function searchNaiveKCounterexample(
  targetK: number = 3,
  seed: number = 42,
): CounterexampleReport {
  const k = Math.max(3, Math.min(8, Math.floor(targetK)));
  const rand = createSeededRng(seed);

  // Try randomized small instances where (n - 1) mod (k - 1) !== 0
  for (let attempt = 1; attempt <= 400; attempt++) {
    const n = k + 1 + Math.floor(rand() * Math.min(6, k + 2));
    if ((n - 1) % (k - 1) === 0) continue;

    const weights: bigint[] = [];
    for (let i = 0; i < n; i++) {
      weights.push(BigInt(1 + Math.floor(rand() * 20)));
    }
    const opt = solveMinCostPure(weights, k).totalCost;
    const naive = solveNaiveMinKPure(weights, k).totalCost;
    if (naive > opt) {
      return {
        n,
        k,
        weights,
        optimalMinCost: opt,
        naiveMinKCost: naive,
        penalty: naive - opt,
        attempts: attempt,
      };
    }
  }

  // Deterministic canonical fallback for any k >= 3: [1, 2, ..., k+1]
  const fallbackWeights: bigint[] = [];
  for (let i = 1; i <= k + 1; i++) {
    fallbackWeights.push(BigInt(i));
  }
  const opt = solveMinCostPure(fallbackWeights, k).totalCost;
  const naive = solveNaiveMinKPure(fallbackWeights, k).totalCost;
  return {
    n: fallbackWeights.length,
    k,
    weights: fallbackWeights,
    optimalMinCost: opt,
    naiveMinKCost: naive,
    penalty: naive - opt,
    attempts: 401,
  };
}
