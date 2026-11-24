import {describe, expect, it} from 'vitest';
import {
  computeFirstMergeCount,
  computeVirtualZeroCount,
  solveMaxCostPure,
  solveMinCostPure,
  solveNaiveMinKPure,
  solveProblem414,
} from '../src/algorithms/core';
import {
  searchNaiveKCounterexample,
  solveExhaustiveMemoized,
} from '../src/algorithms/exhaustive';
import {
  CLASSIC_SAMPLE,
  createSeededRng,
  formatOutputTxt,
  parseInputTxt,
  parsePositiveBigInt,
} from '../src/algorithms/parser';
import {
  analyzeChallengeAttempt,
  buildSimulationTrace,
} from '../src/algorithms/trace';
import type {ChallengeMove} from '../src/types/algorithm';

describe('实现题 4-14：核心算法正确性测试', () => {
  it('严格通过题目官方样例 (7 3 / 45 13 12 16 9 5 22 -> 593 199)', () => {
    const {maxCost, minCost} = solveProblem414(
      CLASSIC_SAMPLE.weights,
      CLASSIC_SAMPLE.k,
    );
    expect(maxCost).toBe(593n);
    expect(minCost).toBe(199n);
    expect(formatOutputTxt(maxCost, minCost)).toBe('593 199\n');
  });

  it('通过经典反例 n=4, k=3, [1,2,3,4]：最小费用 13 vs 朴素 k 堆 16', () => {
    const weights = [1n, 2n, 3n, 4n];
    expect(computeVirtualZeroCount(4, 3)).toBe(1);
    expect(computeFirstMergeCount(4, 3)).toBe(2);
    expect(solveMinCostPure(weights, 3).totalCost).toBe(13n);
    expect(solveNaiveMinKPure(weights, 3).totalCost).toBe(16n);
    expect(solveMaxCostPure(weights).totalCost).toBe(26n);
  });

  it('边界条件：n=1、k=2、k>=n、全同权值、重复权值、超大整数精度', () => {
    // n = 1
    expect(solveProblem414([42n], 3)).toEqual({maxCost: 0n, minCost: 0n});

    // k = 2: max merges 45+16=61, 61+13=74, 74+12=86, 86+9=95, 95+5=100 => 416
    const k2 = solveProblem414([5n, 9n, 12n, 13n, 16n, 45n], 2);
    expect(k2.minCost).toBe(224n);
    expect(k2.maxCost).toBe(416n);

    // k >= n (一步全合并)
    const kGeN = solveProblem414([8n, 14n, 6n, 20n, 11n], 100);
    expect(kGeN.minCost).toBe(59n);
    expect(solveMinCostPure([8n, 14n, 6n, 20n, 11n], 100).mergeCount).toBe(1);

    // 全同权值
    const equal = solveProblem414([10n, 10n, 10n, 10n, 10n, 10n], 3);
    expect(equal.minCost).toBe(110n);
    expect(equal.maxCost).toBe(200n);

    // 超越 Number.MAX_SAFE_INTEGER 的 BigInt 全程无损解析与计算
    const hugeStr =
      '3 2\n90071992547409931 90071992547409932 90071992547409933\n';
    const parsed = parseInputTxt(hugeStr);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.weights[0]).toBe(90071992547409931n);
      expect(parsed.weights[1]).toBe(90071992547409932n);
      expect(parsed.weights[2]).toBe(90071992547409933n);
      const res = solveProblem414(parsed.weights, parsed.k);
      expect(res.minCost).toBe(
        (90071992547409931n + 90071992547409932n) +
          (90071992547409931n + 90071992547409932n + 90071992547409933n),
      );
      expect(res.maxCost).toBe(
        (90071992547409933n + 90071992547409932n) +
          (90071992547409933n + 90071992547409932n + 90071992547409931n),
      );
    }
  });

  it('小规模随机数据与记忆化穷举交叉验证 (120 组随机用例)', () => {
    const rand = createSeededRng(20261124);
    for (let t = 0; t < 120; t++) {
      const n = 2 + Math.floor(rand() * 5); // n in [2, 6]
      const k = 2 + Math.floor(rand() * 6); // k in [2, 7]
      const weights: bigint[] = [];
      for (let i = 0; i < n; i++) {
        weights.push(BigInt(1 + Math.floor(rand() * 30)));
      }
      const greedy = solveProblem414(weights, k);
      const exhaustive = solveExhaustiveMemoized(weights, k);
      expect(exhaustive.status).toBe('ok');
      expect(greedy.minCost).toBe(exhaustive.minCost);
      expect(greedy.maxCost).toBe(exhaustive.maxCost);
    }
  });

  it('不补零算法与物理补零教学树 WPL 及总费用完全一致', () => {
    const cases: Array<{k: number; weights: bigint[]}> = [
      {k: 3, weights: [1n, 2n, 3n, 4n]},
      {k: 4, weights: [5n, 8n, 11n, 3n, 9n, 2n]},
      {k: 5, weights: [45n, 13n, 12n, 16n, 9n, 5n, 22n]},
    ];
    for (const c of cases) {
      const traceNoPad = buildSimulationTrace(c.weights, c.k, 'min', {
        includeVirtualZeros: false,
      });
      const tracePad = buildSimulationTrace(c.weights, c.k, 'min', {
        includeVirtualZeros: true,
      });
      const wplNoPad = traceNoPad.wplEntries.reduce(
        (acc, e) => acc + e.contribution,
        0n,
      );
      const wplPad = tracePad.wplEntries.reduce(
        (acc, e) => acc + e.contribution,
        0n,
      );
      expect(traceNoPad.totalCost).toBe(tracePad.totalCost);
      expect(wplNoPad).toBe(traceNoPad.totalCost);
      expect(wplPad).toBe(tracePad.totalCost);
      expect(traceNoPad.internalNodeSum).toBe(traceNoPad.totalCost);
    }
  });

  it('挑战模式兼容等价最优合并路径，不误判非标准顺序但费用相同的最优解', () => {
    // 权值 [10, 10, 10, 10], k = 2 -> 任意先合并两对 10+10=20 再 20+20=40 总费用都是 80（最优）
    // 但若先合并 10+10=20，再合并 20+10=30，再 30+10=40，总费用是 90（非最优）
    const weights = [10n, 10n, 10n, 10n];
    // 另一个更典型的例子：n=5, k=3, [2, 2, 2, 2, 2]
    // 或者 n=4, k=2, [1, 2, 3, 3]：
    // 标准最小堆：1+2=3 -> [3,3,3] -> 3+3=6 -> 6+3=9 => 总 18
    // 等价最优（先合并两个 3 不行？验证: 3+3=6 -> 1+2=3 -> 6+3=9 => 6+3+9 = 18! 完全等价最优！）
    const altWeights = [1n, 2n, 3n, 3n];
    const altOptimalMoves: ChallengeMove[] = [
      {
        stepIndex: 1,
        selectedIds: ['leaf-2', 'leaf-3'],
        selectedWeights: [3n, 3n],
        mergedId: 'u-1',
        mergedWeight: 6n,
        stepCost: 6n,
        cumulativeCost: 6n,
        remainingWeightsBefore: [1n, 2n, 3n, 3n],
        remainingWeightsAfter: [1n, 2n, 6n],
      },
      {
        stepIndex: 2,
        selectedIds: ['leaf-0', 'leaf-1'],
        selectedWeights: [1n, 2n],
        mergedId: 'u-2',
        mergedWeight: 3n,
        stepCost: 3n,
        cumulativeCost: 9n,
        remainingWeightsBefore: [1n, 2n, 6n],
        remainingWeightsAfter: [3n, 6n],
      },
      {
        stepIndex: 3,
        selectedIds: ['u-1', 'u-2'],
        selectedWeights: [6n, 3n],
        mergedId: 'u-3',
        mergedWeight: 9n,
        stepCost: 9n,
        cumulativeCost: 18n,
        remainingWeightsBefore: [3n, 6n],
        remainingWeightsAfter: [9n],
      },
    ];
    const analysis = analyzeChallengeAttempt(altWeights, 2, 'min', altOptimalMoves);
    expect(analysis.isOptimal).toBe(true);
    expect(analysis.stars).toBe(3);
    expect(analysis.deviations.length).toBe(0);
    expect(analysis.usedAlternativeOptimalPath).toBe(true);
    expect(weights.length).toBe(4);
  });

  it('反例搜索器能自动找到朴素最小 k 堆严格劣于多元 Huffman 的实例', () => {
    for (const k of [3, 4, 5]) {
      const report = searchNaiveKCounterexample(k, 100 + k);
      expect(report.naiveMinKCost > report.optimalMinCost).toBe(true);
      expect(report.penalty).toBe(report.naiveMinKCost - report.optimalMinCost);
    }
  });

  it('输入解析器正确拦截非法输入与格式错误', () => {
    expect(parsePositiveBigInt('0')).toBeNull();
    expect(parsePositiveBigInt('-5')).toBeNull();
    expect(parsePositiveBigInt('12.5')).toBeNull();
    expect(parsePositiveBigInt('1234567890123456789012345')).toBe(
      1234567890123456789012345n,
    );
    expect(parseInputTxt('')).toMatchObject({ok: false});
    expect(parseInputTxt('3 1\n1 2 3')).toMatchObject({ok: false});
    expect(parseInputTxt('3 2\n1 2')).toMatchObject({ok: false});
    expect(parseInputTxt('3 2\n1 -2 3')).toMatchObject({ok: false});
  });
});
