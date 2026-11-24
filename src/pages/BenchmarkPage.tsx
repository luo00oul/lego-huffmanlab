import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Download, Play, RefreshCw} from 'lucide-react';
import type {EChartsOption} from 'echarts';
import {LegoChart} from '../visualizations/LegoChart';
import {formatBigIntFull} from '../algorithms/parser';
import type {BenchmarkPoint, DistributionType} from '../types/algorithm';

interface KSweepRow {
  k: number;
  minCostStr: string;
  naiveKCostStr: string;
  maxCostStr: string;
  mergeCount: number;
  timeMs: number;
}

interface DistRow {
  distribution: DistributionType;
  minTimeMs: number;
  maxTimeMs: number;
  minCostStr: string;
  maxCostStr: string;
  ratio: number;
}

const SCALE_PRESETS: Record<string, {label: string; sizes: number[]}> = {
  quick: {
    label: '快速课堂档 (200 ~ 4,000)',
    sizes: [200, 500, 1000, 2000, 3000, 4000],
  },
  standard: {
    label: '标准实测档 (500 ~ 12,000)',
    sizes: [500, 1500, 3000, 6000, 9000, 12000],
  },
  heavy: {
    label: '高负载档 (1,000 ~ 30,000)',
    sizes: [1000, 4000, 8000, 14000, 22000, 30000],
  },
};

const DIST_LABELS: Record<DistributionType, string> = {
  uniform: '均匀分布',
  skewed: '长尾偏态',
  exponential: '指数差距',
  equal: '全同权值',
  duplicates: '高频重复',
  huge: '超大整数',
};

export const BenchmarkPage: React.FC = () => {
  const [scalePreset, setScalePreset] = useState<string>('quick');
  const [k, setK] = useState(3);
  const [distribution, setDistribution] = useState<DistributionType>('uniform');
  const [seed, setSeed] = useState(2026);
  const [repeats, setRepeats] = useState(5);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({completed: 0, total: 0});
  const [suitePoints, setSuitePoints] = useState<BenchmarkPoint[]>([]);
  const [kSweepRows, setKSweepRows] = useState<KSweepRow[]>([]);
  const [distRows, setDistRows] = useState<DistRow[]>([]);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);
  const pendingJobsRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/compute.worker.ts', import.meta.url),
      {type: 'module'},
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        setProgress({completed: msg.completed, total: msg.total});
      } else if (msg.type === 'benchmark-suite-result') {
        setSuitePoints(msg.points);
        pendingJobsRef.current = Math.max(0, pendingJobsRef.current - 1);
        if (pendingJobsRef.current === 0) {
          setRunning(false);
          setLastRunAt(new Date().toLocaleTimeString());
        }
      } else if (msg.type === 'benchmark-k-sweep-result') {
        setKSweepRows(msg.rows);
        pendingJobsRef.current = Math.max(0, pendingJobsRef.current - 1);
        if (pendingJobsRef.current === 0) {
          setRunning(false);
          setLastRunAt(new Date().toLocaleTimeString());
        }
      } else if (msg.type === 'benchmark-distributions-result') {
        setDistRows(msg.rows);
        pendingJobsRef.current = Math.max(0, pendingJobsRef.current - 1);
        if (pendingJobsRef.current === 0) {
          setRunning(false);
          setLastRunAt(new Date().toLocaleTimeString());
        }
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const runRealBenchmark = useCallback(() => {
    if (!workerRef.current) return;
    const sizes = SCALE_PRESETS[scalePreset]?.sizes ?? SCALE_PRESETS.quick.sizes;
    setRunning(true);
    setProgress({completed: 0, total: sizes.length});
    pendingJobsRef.current = 3;

    workerRef.current.postMessage({
      type: 'benchmark-suite',
      id: ++reqIdRef.current,
      sizes,
      k,
      distribution,
      seed,
      repeats,
    });

    workerRef.current.postMessage({
      type: 'benchmark-k-sweep',
      id: ++reqIdRef.current,
      n: Math.min(2000, sizes[sizes.length - 1]),
      kValues: [2, 3, 4, 5, 6, 8, 10, 12, 16],
      distribution,
      seed,
    });

    workerRef.current.postMessage({
      type: 'benchmark-distributions',
      id: ++reqIdRef.current,
      n: Math.min(2500, sizes[Math.floor(sizes.length / 2)]),
      k,
      seed,
      repeats,
    });
  }, [scalePreset, k, distribution, seed, repeats]);

  // Run one real initial quick benchmark automatically on first visit so charts show genuine measurements
  useEffect(() => {
    const t = window.setTimeout(() => {
      runRealBenchmark();
    }, 120);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportCsv = () => {
    if (suitePoints.length === 0) return;
    const header = [
      'n',
      'k',
      'distribution',
      'seed',
      'repeats',
      'min_median_ms',
      'max_median_ms',
      'naive_k_median_ms',
      'min_merges',
      'max_merges',
      'min_cost',
      'max_cost',
      'naive_k_cost',
      'min_binary_cost',
    ].join(',');
    const rows = suitePoints.map((p) =>
      [
        p.n,
        p.k,
        p.distribution,
        seed,
        p.runs,
        p.minTimeMs.toFixed(4),
        p.maxTimeMs.toFixed(4),
        p.naiveKTimeMs.toFixed(4),
        p.minMergeCount,
        p.maxMergeCount,
        p.minCostStr,
        p.maxCostStr,
        p.naiveKCostStr,
        p.minBinaryCostStr,
      ].join(','),
    );
    const csv = [header, ...rows].join('\n') + '\n';
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lego-huffmanlab-benchmark-k${k}-seed${seed}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Chart 1: n vs real runtime + theoretical O(n log n) fitted curve
  const timeChartOption: EChartsOption = useMemo(() => {
    const xs = suitePoints.map((p) => p.n);
    const minYs = suitePoints.map((p) => Number(p.minTimeMs.toFixed(3)));
    const maxYs = suitePoints.map((p) => Number(p.maxTimeMs.toFixed(3)));

    // Fit c * n * log2(n) to the largest measured maxTimeMs point for theoretical trend overlay
    let fitted: number[] = [];
    if (suitePoints.length > 0) {
      const last = suitePoints[suitePoints.length - 1];
      const denom = last.n * Math.log2(Math.max(2, last.n));
      const coeff = denom > 0 ? last.maxTimeMs / denom : 0;
      fitted = suitePoints.map((p) =>
        Number((coeff * p.n * Math.log2(Math.max(2, p.n))).toFixed(3)),
      );
    }

    return {
      tooltip: {trigger: 'axis'},
      legend: {bottom: 0, textStyle: {color: '#25262a', fontWeight: 700}},
      grid: {left: 56, right: 20, top: 24, bottom: 48},
      xAxis: {
        type: 'category',
        name: 'n',
        data: xs,
        axisLine: {lineStyle: {color: '#25262a', width: 2}},
      },
      yAxis: {
        type: 'value',
        name: '耗时 (ms)',
        axisLine: {lineStyle: {color: '#25262a', width: 2}},
        splitLine: {lineStyle: {color: '#dcd8cd', type: 'dashed'}},
      },
      series: [
        {
          name: '最小费用 (多元 Huffman)',
          type: 'line',
          data: minYs,
          smooth: false,
          symbolSize: 8,
          itemStyle: {color: '#2f79c3'},
          lineStyle: {width: 3},
        },
        {
          name: '最大费用 (大根堆二元)',
          type: 'line',
          data: maxYs,
          smooth: false,
          symbolSize: 8,
          itemStyle: {color: '#e74636'},
          lineStyle: {width: 3},
        },
        {
          name: '理论 O(n log n) 趋势线',
          type: 'line',
          data: fitted,
          symbol: 'none',
          itemStyle: {color: '#35925b'},
          lineStyle: {width: 2, type: 'dashed'},
        },
      ],
    };
  }, [suitePoints]);

  // Chart 2: k vs minimum merge cost
  const kSweepOption: EChartsOption = useMemo(() => {
    return {
      tooltip: {trigger: 'axis'},
      legend: {bottom: 0, textStyle: {color: '#25262a', fontWeight: 700}},
      grid: {left: 68, right: 54, top: 24, bottom: 48},
      xAxis: {
        type: 'category',
        data: kSweepRows.map((r) => `k=${r.k}`),
        axisLine: {lineStyle: {color: '#25262a', width: 2}},
      },
      yAxis: [
        {
          type: 'value',
          name: '最小总费用',
          axisLine: {lineStyle: {color: '#25262a', width: 2}},
          splitLine: {lineStyle: {color: '#dcd8cd', type: 'dashed'}},
        },
        {
          type: 'value',
          name: '合并次数',
          axisLine: {lineStyle: {color: '#b2820d', width: 2}},
          splitLine: {show: false},
        },
      ],
      series: [
        {
          name: '最优最小费用',
          type: 'bar',
          data: kSweepRows.map((r) => Number(r.minCostStr)),
          itemStyle: {
            color: '#2f79c3',
            borderColor: '#25262a',
            borderWidth: 2,
            borderRadius: [4, 4, 0, 0],
          },
        },
        {
          name: '合并次数',
          type: 'line',
          yAxisIndex: 1,
          data: kSweepRows.map((r) => r.mergeCount),
          symbolSize: 8,
          itemStyle: {color: '#e74636'},
          lineStyle: {width: 3},
        },
      ],
    };
  }, [kSweepRows]);

  // Chart 3: Strategy cost comparison at largest measured n
  const strategyCostOption: EChartsOption = useMemo(() => {
    const sample = suitePoints[suitePoints.length - 1];
    const items = sample
      ? [
          {
            name: `最优最小 (${k}叉)`,
            val: Number(sample.minCostStr),
            color: '#35925b',
          },
          {
            name: `朴素最小 (${k}堆)`,
            val: Number(sample.naiveKCostStr),
            color: '#f6c823',
          },
          {
            name: '二元 Huffman',
            val: Number(sample.minBinaryCostStr),
            color: '#2f79c3',
          },
          {
            name: '最优最大 (二元)',
            val: Number(sample.maxCostStr),
            color: '#e74636',
          },
        ]
      : [];

    return {
      tooltip: {trigger: 'axis'},
      grid: {left: 72, right: 20, top: 24, bottom: 44},
      xAxis: {
        type: 'category',
        data: items.map((i) => i.name),
        axisLine: {lineStyle: {color: '#25262a', width: 2}},
      },
      yAxis: {
        type: 'value',
        name: '总费用',
        axisLine: {lineStyle: {color: '#25262a', width: 2}},
        splitLine: {lineStyle: {color: '#dcd8cd', type: 'dashed'}},
      },
      series: [
        {
          type: 'bar',
          barWidth: '48%',
          data: items.map((i) => ({
            value: i.val,
            itemStyle: {
              color: i.color,
              borderColor: '#25262a',
              borderWidth: 2,
              borderRadius: [5, 5, 0, 0],
            },
          })),
        },
      ],
    };
  }, [suitePoints, k]);

  // Chart 4: Distribution impact
  const distChartOption: EChartsOption = useMemo(() => {
    return {
      tooltip: {trigger: 'axis'},
      legend: {bottom: 0, textStyle: {color: '#25262a', fontWeight: 700}},
      grid: {left: 56, right: 54, top: 24, bottom: 48},
      xAxis: {
        type: 'category',
        data: distRows.map((d) => DIST_LABELS[d.distribution]),
        axisLine: {lineStyle: {color: '#25262a', width: 2}},
      },
      yAxis: [
        {
          type: 'value',
          name: '耗时 (ms)',
          axisLine: {lineStyle: {color: '#25262a', width: 2}},
          splitLine: {lineStyle: {color: '#dcd8cd', type: 'dashed'}},
        },
        {
          type: 'value',
          name: '最大/最小倍率',
          axisLine: {lineStyle: {color: '#a62824', width: 2}},
          splitLine: {show: false},
        },
      ],
      series: [
        {
          name: '最小算法耗时',
          type: 'bar',
          data: distRows.map((d) => Number(d.minTimeMs.toFixed(3))),
          itemStyle: {
            color: '#2f79c3',
            borderColor: '#25262a',
            borderWidth: 2,
          },
        },
        {
          name: '最大算法耗时',
          type: 'bar',
          data: distRows.map((d) => Number(d.maxTimeMs.toFixed(3))),
          itemStyle: {
            color: '#f6c823',
            borderColor: '#25262a',
            borderWidth: 2,
          },
        },
        {
          name: 'Max/Min 费用倍率',
          type: 'line',
          yAxisIndex: 1,
          data: distRows.map((d) => d.ratio),
          symbolSize: 8,
          itemStyle: {color: '#e74636'},
          lineStyle: {width: 3},
        },
      ],
    };
  }, [distRows]);

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <section className="lego-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-[#25262a]">
              真实算法性能测试平台（Web Worker 隔离计时）
            </h1>
            <p className="mt-1 text-xs text-[#53535a]">
              调用独立纯算法引擎（O(n log n) 时间 / O(n) 空间，无动画与堆快照开销），以多轮中位数记录真实执行耗时。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runRealBenchmark}
              disabled={running}
              className="lego-btn lego-btn-red"
            >
              {running ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {running
                ? `真实运行中 (${progress.completed}/${progress.total})…`
                : '运行真实性能测试'}
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={suitePoints.length === 0}
              className="lego-btn lego-btn-neutral"
            >
              <Download className="h-4 w-4" />
              导出实验 CSV
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-bold text-[#53535a]">
            测试规模档位
            <select
              value={scalePreset}
              onChange={(e) => setScalePreset(e.target.value)}
              className="lego-input mt-1 w-full font-semibold"
            >
              {Object.entries(SCALE_PRESETS).map(([id, cfg]) => (
                <option key={id} value={id}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold text-[#53535a]">
            最大合并数 k
            <input
              type="number"
              min={2}
              max={64}
              value={k}
              onChange={(e) => setK(Math.max(2, Number(e.target.value) || 2))}
              className="lego-input mt-1 w-full font-mono tabular-nums"
            />
          </label>

          <label className="text-xs font-bold text-[#53535a]">
            权值数据分布
            <select
              value={distribution}
              onChange={(e) =>
                setDistribution(e.target.value as DistributionType)
              }
              className="lego-input mt-1 w-full font-semibold"
            >
              {(['uniform', 'skewed', 'exponential', 'equal', 'duplicates'] as DistributionType[]).map(
                (d) => (
                  <option key={d} value={d}>
                    {DIST_LABELS[d]}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="text-xs font-bold text-[#53535a]">
            固定随机种子
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value) || 1)}
              className="lego-input mt-1 w-full font-mono tabular-nums"
            />
          </label>

          <label className="text-xs font-bold text-[#53535a]">
            每规模重复轮次（取中位数）
            <select
              value={repeats}
              onChange={(e) => setRepeats(Number(e.target.value))}
              className="lego-input mt-1 w-full font-mono"
            >
              <option value={3}>3 轮中位数</option>
              <option value={5}>5 轮中位数</option>
              <option value={9}>9 轮中位数</option>
            </select>
          </label>
        </div>

        {lastRunAt && (
          <p className="mt-3 text-xs font-mono text-[#53535a]">
            最近实测完成时间：{lastRunAt} · 种子：{seed} · 分布：{DIST_LABELS[distribution]}
          </p>
        )}
      </section>

      {/* 4 Interactive LEGO Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="lego-panel p-5">
          <h2 className="text-base font-extrabold text-[#25262a]">
            1. 规模 n 与纯算法耗时（对比 O(n log n) 趋势）
          </h2>
          <p className="mt-0.5 text-xs text-[#53535a]">
            实测最小/最大费用算法纯运行耗时（毫秒，中位数），虚线为拟合的 c·n·log₂n 理论曲线
          </p>
          <div className="mt-3">
            <LegoChart
              option={timeChartOption}
              ariaLabel="规模 n 与算法运行耗时关系图"
            />
          </div>
        </section>

        <section className="lego-panel p-5">
          <h2 className="text-base font-extrabold text-[#25262a]">
            2. 最大合并数 k 与最小总费用及合并次数关系
          </h2>
          <p className="mt-0.5 text-xs text-[#53535a]">
            同一组固定种子数据下，随 k 增大，k 叉树高度降低，最小合并费用与轮次单调递减
          </p>
          <div className="mt-3">
            <LegoChart
              option={kSweepOption}
              ariaLabel="k 与最小合并费用关系图"
            />
          </div>
        </section>

        <section className="lego-panel p-5">
          <h2 className="text-base font-extrabold text-[#25262a]">
            3. 四种策略总费用对比（最大测试规模点）
          </h2>
          <p className="mt-0.5 text-xs text-[#53535a]">
            直观展示最优 k 叉、朴素 k 堆、二元 Huffman 与最大二元链在同一输入上的费用跨度
          </p>
          <div className="mt-3">
            <LegoChart
              option={strategyCostOption}
              ariaLabel="不同策略总费用对比柱状图"
            />
          </div>
        </section>

        <section className="lego-panel p-5">
          <h2 className="text-base font-extrabold text-[#25262a]">
            4. 不同权值分布对耗时与 Max/Min 倍率的影响
          </h2>
          <p className="mt-0.5 text-xs text-[#53535a]">
            比较均匀、偏态、指数、全同与重复权值分布下堆操作耗时及最大/最小费用比值
          </p>
          <div className="mt-3">
            <LegoChart
              option={distChartOption}
              ariaLabel="不同数据分布对算法表现影响图"
            />
          </div>
        </section>
      </div>

      {/* Measured Data Table */}
      <section className="lego-panel p-5">
        <h2 className="text-base font-extrabold text-[#25262a]">
          实测明细数据表（纯算法执行时间，不含 DOM/动画渲染）
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left font-mono text-xs tabular-nums">
            <thead>
              <tr className="border-b-2 border-[#25262a] bg-[#f7f4ec] font-bold text-[#25262a]">
                <th className="px-3 py-2">n</th>
                <th className="px-3 py-2 text-right">最小算法 (ms)</th>
                <th className="px-3 py-2 text-right">最大算法 (ms)</th>
                <th className="px-3 py-2 text-right">最小合并次数</th>
                <th className="px-3 py-2 text-right">最大合并次数</th>
                <th className="px-3 py-2 text-right">最小费用</th>
                <th className="px-3 py-2 text-right">最大费用</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#25262a]/10">
              {suitePoints.map((p) => (
                <tr key={p.n} className="hover:bg-[#f7f4ec]">
                  <td className="px-3 py-2 font-bold">{p.n}</td>
                  <td className="px-3 py-2 text-right text-[#1c508d] font-bold">
                    {p.minTimeMs.toFixed(3)}
                  </td>
                  <td className="px-3 py-2 text-right text-[#a62824] font-bold">
                    {p.maxTimeMs.toFixed(3)}
                  </td>
                  <td className="px-3 py-2 text-right">{p.minMergeCount}</td>
                  <td className="px-3 py-2 text-right">{p.maxMergeCount}</td>
                  <td className="px-3 py-2 text-right">
                    {formatBigIntFull(BigInt(p.minCostStr))}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatBigIntFull(BigInt(p.maxCostStr))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Scientific Methodology Note */}
        <div className="mt-4 rounded-lg border border-[#25262a]/20 bg-[#f7f4ec] p-4 text-xs leading-6 text-[#53535a]">
          <strong className="text-[#25262a]">实验计时方法学说明：</strong>
          （1）本页面调用独立纯计算模块（仅维护一维 <code className="font-mono">BigIntHeap</code>，不保留任何历史快照或 DOM 节点），与「算法实验室」的动画渲染耗时完全隔离；
          （2）每次正式计时前执行 1 次预热调用以缓解 JavaScript 引擎 JIT 冷启动抖动，随后取多轮中位数；
          （3）由于浏览器安全策略对 <code className="font-mono">performance.now()</code> 施加约 0.05–0.1ms 计时粒度粗糙化，且受 CPU 睿频、GC 与标签页调度影响，极小规模点可能出现轻微波动，建议结合中大规模档位观察稳健的 <code className="font-mono">O(n log n)</code> 趋势。
        </div>
      </section>
    </div>
  );
};
