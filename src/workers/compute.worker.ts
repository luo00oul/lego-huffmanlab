import {
  solveMaxCostPure,
  solveMinBinaryPure,
  solveMinCostPure,
  solveNaiveMinKPure,
} from '../algorithms/core';
import {
  searchNaiveKCounterexample,
  solveExhaustiveMemoized,
} from '../algorithms/exhaustive';
import {generateWeights} from '../algorithms/parser';
import type {BenchmarkPoint, DistributionType} from '../types/algorithm';

export type WorkerRequest =
  | {
      type: 'benchmark-suite';
      id: number;
      sizes: number[];
      k: number;
      distribution: DistributionType;
      seed: number;
      repeats: number;
    }
  | {
      type: 'benchmark-k-sweep';
      id: number;
      n: number;
      kValues: number[];
      distribution: DistributionType;
      seed: number;
    }
  | {
      type: 'benchmark-distributions';
      id: number;
      n: number;
      k: number;
      seed: number;
      repeats: number;
    }
  | {
      type: 'exhaustive';
      id: number;
      weightsStr: string[];
      k: number;
    }
  | {
      type: 'counterexample';
      id: number;
      k: number;
      seed: number;
    };

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function measurePureMedian(fn: () => void, repeats: number): number {
  // Single warm-up outside measurement to reduce initial JIT cold-start skew
  fn();
  const samples: number[] = [];
  for (let i = 0; i < repeats; i++) {
    const t0 = performance.now();
    fn();
    const t1 = performance.now();
    samples.push(t1 - t0);
  }
  return median(samples);
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;

  if (req.type === 'benchmark-suite') {
    const points: BenchmarkPoint[] = [];
    for (let idx = 0; idx < req.sizes.length; idx++) {
      const n = req.sizes[idx];
      const weights = generateWeights(n, req.distribution, req.seed + n * 31);

      let minRes = solveMinCostPure(weights, req.k);
      let maxRes = solveMaxCostPure(weights);
      let naiveRes = solveNaiveMinKPure(weights, req.k);
      const binRes = solveMinBinaryPure(weights);

      const minTimeMs = measurePureMedian(() => {
        minRes = solveMinCostPure(weights, req.k);
      }, req.repeats);
      const maxTimeMs = measurePureMedian(() => {
        maxRes = solveMaxCostPure(weights);
      }, req.repeats);
      const naiveKTimeMs = measurePureMedian(() => {
        naiveRes = solveNaiveMinKPure(weights, req.k);
      }, req.repeats);

      points.push({
        n,
        k: req.k,
        distribution: req.distribution,
        minTimeMs,
        maxTimeMs,
        naiveKTimeMs,
        minMergeCount: minRes.mergeCount,
        maxMergeCount: maxRes.mergeCount,
        minCostStr: minRes.totalCost.toString(),
        maxCostStr: maxRes.totalCost.toString(),
        naiveKCostStr: naiveRes.totalCost.toString(),
        minBinaryCostStr: binRes.totalCost.toString(),
        runs: req.repeats,
      });

      self.postMessage({
        type: 'progress',
        id: req.id,
        completed: idx + 1,
        total: req.sizes.length,
      });
    }

    self.postMessage({
      type: 'benchmark-suite-result',
      id: req.id,
      points,
    });
    return;
  }

  if (req.type === 'benchmark-k-sweep') {
    const weights = generateWeights(req.n, req.distribution, req.seed);
    const maxCost = solveMaxCostPure(weights).totalCost;
    const rows = req.kValues.map((kVal) => {
      const t0 = performance.now();
      const opt = solveMinCostPure(weights, kVal);
      const t1 = performance.now();
      const naive = solveNaiveMinKPure(weights, kVal);
      return {
        k: kVal,
        minCostStr: opt.totalCost.toString(),
        naiveKCostStr: naive.totalCost.toString(),
        maxCostStr: maxCost.toString(),
        mergeCount: opt.mergeCount,
        timeMs: t1 - t0,
      };
    });

    self.postMessage({
      type: 'benchmark-k-sweep-result',
      id: req.id,
      rows,
    });
    return;
  }

  if (req.type === 'benchmark-distributions') {
    const dists: DistributionType[] = [
      'uniform',
      'skewed',
      'exponential',
      'equal',
      'duplicates',
    ];
    const rows = dists.map((dist) => {
      const weights = generateWeights(req.n, dist, req.seed);
      const minTimeMs = measurePureMedian(
        () => solveMinCostPure(weights, req.k),
        req.repeats,
      );
      const maxTimeMs = measurePureMedian(
        () => solveMaxCostPure(weights),
        req.repeats,
      );
      const minRes = solveMinCostPure(weights, req.k);
      const maxRes = solveMaxCostPure(weights);
      return {
        distribution: dist,
        minTimeMs,
        maxTimeMs,
        minCostStr: minRes.totalCost.toString(),
        maxCostStr: maxRes.totalCost.toString(),
        ratio:
          minRes.totalCost > 0n
            ? Number((maxRes.totalCost * 100n) / minRes.totalCost) / 100
            : 1,
      };
    });

    self.postMessage({
      type: 'benchmark-distributions-result',
      id: req.id,
      rows,
    });
    return;
  }

  if (req.type === 'exhaustive') {
    const weights = req.weightsStr.map((s) => BigInt(s));
    const res = solveExhaustiveMemoized(weights, req.k);
    self.postMessage({
      type: 'exhaustive-result',
      id: req.id,
      status: res.status,
      minCostStr: res.minCost.toString(),
      maxCostStr: res.maxCost.toString(),
      exploredStates: res.exploredStates,
      minSteps: res.minSteps.map((s) => ({
        stepIndex: s.stepIndex,
        selectedWeights: s.selectedWeights.map((w) => w.toString()),
        mergedWeight: s.mergedWeight.toString(),
        cumulativeCost: s.cumulativeCost.toString(),
      })),
      maxSteps: res.maxSteps.map((s) => ({
        stepIndex: s.stepIndex,
        selectedWeights: s.selectedWeights.map((w) => w.toString()),
        mergedWeight: s.mergedWeight.toString(),
        cumulativeCost: s.cumulativeCost.toString(),
      })),
    });
    return;
  }

  if (req.type === 'counterexample') {
    const report = searchNaiveKCounterexample(req.k, req.seed);
    self.postMessage({
      type: 'counterexample-result',
      id: req.id,
      n: report.n,
      k: report.k,
      weightsStr: report.weights.map((w) => w.toString()),
      optimalMinCostStr: report.optimalMinCost.toString(),
      naiveMinKCostStr: report.naiveMinKCost.toString(),
      penaltyStr: report.penalty.toString(),
      attempts: report.attempts,
    });
  }
};
