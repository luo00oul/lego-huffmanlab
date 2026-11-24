import {BigIntHeap} from './heap';
import type {PureRunResult} from '../types/algorithm';

/**
 * Pure Algorithm Core — STRICTLY decoupled from UI / animation snapshots.
 * Time complexity: O(n log n)
 * Space complexity: O(n)
 * Precision: Full end-to-end BigInt arithmetic (zero Number precision loss).
 */

export function computeVirtualZeroCount(n: number, k: number): number {
  if (n <= 1 || k <= 2) return 0;
  const mod = (n - 1) % (k - 1);
  return ((k - 1) - mod) % (k - 1);
}

export function computeFirstMergeCount(n: number, k: number): number {
  if (n <= 1) return 0;
  if (k >= n) return n;
  if (k <= 2) return 2;
  return 2 + ((n - 2) % (k - 1));
}

function assertValidInput(weights: readonly bigint[], k: number): void {
  if (!Number.isInteger(k) || k < 2) {
    throw new Error(`参数 k 必须为不小于 2 的整数，当前为 ${k}`);
  }
  if (weights.length < 1) {
    throw new Error('至少需要 1 堆石子');
  }
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] <= 0n) {
      throw new Error(`第 ${i + 1} 堆石子权值必须为正整数`);
    }
  }
}

/**
 * Optimal Minimum Cost — k-ary Huffman without physically inserting virtual zeros.
 * First merge takes r = 2 + (n - 2) mod (k - 1) smallest piles;
 * every subsequent merge takes k smallest piles.
 */
export function solveMinCostPure(
  weights: readonly bigint[],
  k: number,
): PureRunResult {
  assertValidInput(weights, k);
  const n = weights.length;
  const virtualZeroCount = computeVirtualZeroCount(n, k);
  const firstMergeCount = computeFirstMergeCount(n, k);

  if (n <= 1) {
    return {
      totalCost: 0n,
      mergeCount: 0,
      virtualZeroCount: 0,
      firstMergeCount: 0,
    };
  }

  const heap = new BigIntHeap(true, weights);
  let totalCost = 0n;
  let mergeCount = 0;

  // First adjusted merge: r piles
  let firstSum = 0n;
  const firstCount = Math.min(firstMergeCount, heap.size);
  for (let i = 0; i < firstCount; i++) {
    firstSum += heap.pop();
  }
  totalCost += firstSum;
  heap.push(firstSum);
  mergeCount++;

  // Subsequent merges: k piles each
  while (heap.size > 1) {
    const take = Math.min(k, heap.size);
    let sum = 0n;
    for (let i = 0; i < take; i++) {
      sum += heap.pop();
    }
    totalCost += sum;
    heap.push(sum);
    mergeCount++;
  }

  return {
    totalCost,
    mergeCount,
    virtualZeroCount,
    firstMergeCount,
  };
}

/**
 * Optimal Maximum Cost — Max-heap binary merge.
 * Always merge the 2 largest piles until 1 pile remains.
 */
export function solveMaxCostPure(weights: readonly bigint[]): PureRunResult {
  assertValidInput(weights, 2);
  const n = weights.length;
  if (n <= 1) {
    return {
      totalCost: 0n,
      mergeCount: 0,
      virtualZeroCount: 0,
      firstMergeCount: 0,
    };
  }

  const heap = new BigIntHeap(false, weights);
  let totalCost = 0n;
  let mergeCount = 0;

  while (heap.size > 1) {
    const a = heap.pop();
    const b = heap.pop();
    const sum = a + b;
    totalCost += sum;
    heap.push(sum);
    mergeCount++;
  }

  return {
    totalCost,
    mergeCount,
    virtualZeroCount: 0,
    firstMergeCount: 2,
  };
}

/**
 * Naive Greedy (Incorrect for Min when (n-1) mod (k-1) != 0):
 * Always merges min(k, remaining) smallest piles without first-merge adjustment.
 */
export function solveNaiveMinKPure(
  weights: readonly bigint[],
  k: number,
): PureRunResult {
  assertValidInput(weights, k);
  const n = weights.length;
  if (n <= 1) {
    return {
      totalCost: 0n,
      mergeCount: 0,
      virtualZeroCount: 0,
      firstMergeCount: 0,
    };
  }

  const heap = new BigIntHeap(true, weights);
  let totalCost = 0n;
  let mergeCount = 0;

  while (heap.size > 1) {
    const take = Math.min(k, heap.size);
    let sum = 0n;
    for (let i = 0; i < take; i++) {
      sum += heap.pop();
    }
    totalCost += sum;
    heap.push(sum);
    mergeCount++;
  }

  return {
    totalCost,
    mergeCount,
    virtualZeroCount: 0,
    firstMergeCount: Math.min(k, n),
  };
}

/**
 * Always merges the 2 smallest piles (Binary Huffman, ignores k > 2).
 */
export function solveMinBinaryPure(weights: readonly bigint[]): PureRunResult {
  return solveMinCostPure(weights, 2);
}

/**
 * Always merges min(k, remaining) largest piles (Suboptimal for Max when k > 2).
 */
export function solveNaiveMaxKPure(
  weights: readonly bigint[],
  k: number,
): PureRunResult {
  assertValidInput(weights, k);
  const n = weights.length;
  if (n <= 1) {
    return {
      totalCost: 0n,
      mergeCount: 0,
      virtualZeroCount: 0,
      firstMergeCount: 0,
    };
  }

  const heap = new BigIntHeap(false, weights);
  let totalCost = 0n;
  let mergeCount = 0;

  while (heap.size > 1) {
    const take = Math.min(k, heap.size);
    let sum = 0n;
    for (let i = 0; i < take; i++) {
      sum += heap.pop();
    }
    totalCost += sum;
    heap.push(sum);
    mergeCount++;
  }

  return {
    totalCost,
    mergeCount,
    virtualZeroCount: 0,
    firstMergeCount: Math.min(k, n),
  };
}

/**
 * Convenience dual solver returning exact [maxCost, minCost] matching output.txt order.
 */
export function solveProblem414(
  weights: readonly bigint[],
  k: number,
): {maxCost: bigint; minCost: bigint} {
  return {
    maxCost: solveMaxCostPure(weights).totalCost,
    minCost: solveMinCostPure(weights, k).totalCost,
  };
}
