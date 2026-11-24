import type {DistributionType, ParseInputResult} from '../types/algorithm';

export const CLASSIC_SAMPLE = {
  name: '题目经典样例 (input.txt)',
  n: 7,
  k: 3,
  weights: [45n, 13n, 12n, 16n, 9n, 5n, 22n] as bigint[],
  expectedMax: 593n,
  expectedMin: 199n,
};

export interface PresetDataset {
  id: string;
  label: string;
  description: string;
  k: number;
  weights: bigint[];
}

export const PRESET_DATASETS: PresetDataset[] = [
  {
    id: 'classic',
    label: '经典样例 (n=7, k=3)',
    description: '实现题 4-14 官方样例，最大费用 593，最小费用 199',
    k: 3,
    weights: [45n, 13n, 12n, 16n, 9n, 5n, 22n],
  },
  {
    id: 'counterexample',
    label: '朴素 k 堆反例 (n=4, k=3)',
    description: '揭示补零/首轮调整必要性：正确最小 13，直接合并 3 堆得 16',
    k: 3,
    weights: [1n, 2n, 3n, 4n],
  },
  {
    id: 'k-ge-n',
    label: '一步全合并 (n=5, k=7)',
    description: '边界条件 k ≥ n：最小费用一步合完，最大费用仍拆成 4 次二元合并',
    k: 7,
    weights: [8n, 14n, 6n, 20n, 11n],
  },
  {
    id: 'binary',
    label: '二元退化 (n=6, k=2)',
    description: '经典二元 Huffman 编码退化情形',
    k: 2,
    weights: [5n, 9n, 12n, 13n, 16n, 45n],
  },
  {
    id: 'equal',
    label: '全同权值 (n=6, k=3)',
    description: '验证同权值节点唯一 ID 与多最优路径兼容性',
    k: 3,
    weights: [10n, 10n, 10n, 10n, 10n, 10n],
  },
  {
    id: 'single',
    label: '单堆边界 (n=1, k=3)',
    description: '无需合并，最大费用与最小费用均为 0',
    k: 3,
    weights: [42n],
  },
  {
    id: 'huge-bigint',
    label: '超大整数精度 (BigInt)',
    description: '超越 JS 2^53 安全整数上限，验证全程 BigInt 无损精度',
    k: 3,
    weights: [
      90071992547409931n,
      45035996273704967n,
      123456789012345678n,
      250000000000000003n,
      77777777777777777n,
    ],
  },
];

/**
 * Strictly parses a positive integer string directly into BigInt
 * without ever routing through IEEE-754 Number.
 */
export function parsePositiveBigInt(token: string): bigint | null {
  const trimmed = token.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  try {
    const val = BigInt(trimmed);
    return val > 0n ? val : null;
  } catch {
    return null;
  }
}

/**
 * Parses comma / whitespace / newline separated positive integers directly into BigInt[].
 */
export function parseWeightList(
  text: string,
): {ok: true; weights: bigint[]} | {ok: false; error: string} {
  const tokens = text
    .trim()
    .split(/[\s,，;；]+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return {ok: false, error: '请输入至少 1 个正整数权值（用空格或逗号分隔）。'};
  }

  const weights: bigint[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const parsed = parsePositiveBigInt(tokens[i]);
    if (parsed === null) {
      return {
        ok: false,
        error: `第 ${i + 1} 项「${tokens[i]}」不是合法的正整数（权值必须为大于 0 的纯整数）。`,
      };
    }
    weights.push(parsed);
  }
  return {ok: true, weights};
}

/**
 * Strictly parses input.txt format:
 * Line 1: n k
 * Line 2 (or remaining tokens): w_1 w_2 ... w_n
 */
export function parseInputTxt(content: string): ParseInputResult {
  const cleaned = content.replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    return {ok: false, error: '文件内容为空，请提供有效的 input.txt 数据。'};
  }

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) {
    return {
      ok: false,
      error: '格式错误：第 1 行需包含正整数 n 和 k（k ≥ 2），第 2 行包含 n 个正整数权值。',
    };
  }

  const nBig = parsePositiveBigInt(tokens[0]);
  const kBig = parsePositiveBigInt(tokens[1]);

  if (nBig === null || nBig > 500000n) {
    return {
      ok: false,
      error: `堆数 n 非法（「${tokens[0]}」），应为 1 到 500000 之间的正整数。`,
    };
  }
  if (kBig === null || kBig < 2n || kBig > 1000000000n) {
    return {
      ok: false,
      error: `最大合并数 k 非法（「${tokens[1]}」），应为不小于 2 的正整数。`,
    };
  }

  const n = Number(nBig);
  const k = Number(kBig);
  const weightTokens = tokens.slice(2);

  if (weightTokens.length !== n) {
    return {
      ok: false,
      error: `权值数量不匹配：第 1 行声明 n = ${n}，但实际读取到 ${weightTokens.length} 个权值。`,
    };
  }

  const weights: bigint[] = [];
  for (let i = 0; i < n; i++) {
    const w = parsePositiveBigInt(weightTokens[i]);
    if (w === null) {
      return {
        ok: false,
        error: `第 ${i + 1} 堆石子权值「${weightTokens[i]}」非法，必须为正整数。`,
      };
    }
    weights.push(w);
  }

  return {
    ok: true,
    n,
    k,
    weights,
    rawText: cleaned,
  };
}

export function formatInputTxt(weights: readonly bigint[], k: number): string {
  return `${weights.length} ${k}\n${weights.map((w) => w.toString()).join(' ')}\n`;
}

export function formatOutputTxt(maxCost: bigint, minCost: bigint): string {
  return `${maxCost.toString()} ${minCost.toString()}\n`;
}

/**
 * Formats BigInt with thousands separators for readability while keeping full precision.
 */
export function formatBigIntFull(val: bigint): string {
  const s = val.toString();
  const neg = s.startsWith('-');
  const digits = neg ? s.slice(1) : s;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return neg ? `-${grouped}` : grouped;
}

/**
 * Compact label for tight brick face plates; tooltips always expose full BigInt string.
 */
export function formatBigIntBrick(val: bigint): string {
  const s = val.toString();
  if (s.length <= 7) return s;
  return `${s.slice(0, 3)}…e${s.length - 1}`;
}

/**
 * Overflow-safe approximate log10(val) for BigInt visual sizing only (never used for math).
 */
export function approxLog10BigInt(val: bigint): number {
  if (val <= 0n) return 0;
  const s = val.toString();
  const lead = Number(s.slice(0, Math.min(6, s.length)));
  const scale = Math.max(0, s.length - Math.min(6, s.length));
  return Math.log10(lead) + scale;
}

/**
 * Maps a pile weight to a normalized visual tier [0, 1] safely even for 100-digit BigInts.
 */
export function getNormalizedVisualScale(
  val: bigint,
  minVal: bigint,
  maxVal: bigint,
): number {
  if (val <= 0n) return 0;
  if (maxVal <= minVal) return 0.5;
  const lv = approxLog10BigInt(val);
  const lmin = approxLog10BigInt(minVal > 0n ? minVal : 1n);
  const lmax = approxLog10BigInt(maxVal > 0n ? maxVal : 1n);
  if (Math.abs(lmax - lmin) < 1e-9) return 0.5;
  return Math.max(0, Math.min(1, (lv - lmin) / (lmax - lmin)));
}

/**
 * Deterministic PRNG (Mulberry32) for reproducible random generation and benchmarks.
 */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateWeights(
  n: number,
  distribution: DistributionType,
  seed: number,
): bigint[] {
  const rand = createSeededRng(seed);
  const result: bigint[] = new Array(n);

  for (let i = 0; i < n; i++) {
    switch (distribution) {
      case 'uniform': {
        result[i] = BigInt(1 + Math.floor(rand() * 99));
        break;
      }
      case 'skewed': {
        // Power-law / Zipf-like skewed weights
        const u = Math.max(0.01, rand());
        const val = Math.min(500, Math.max(1, Math.floor(Math.pow(1 / u, 1.35) * 2)));
        result[i] = BigInt(val);
        break;
      }
      case 'exponential': {
        const exp = Math.min(16, Math.floor(rand() * 14));
        const jitter = Math.floor(rand() * 5);
        result[i] = (1n << BigInt(exp)) + BigInt(jitter);
        break;
      }
      case 'equal': {
        result[i] = 15n;
        break;
      }
      case 'duplicates': {
        const pool = [4n, 7n, 12n, 12n, 20n, 35n];
        result[i] = pool[Math.floor(rand() * pool.length)];
        break;
      }
      case 'huge': {
        const base = 100000000000000000n; // 1e17 (> Number.MAX_SAFE_INTEGER)
        const offset = BigInt(1 + Math.floor(rand() * 900000000)) * 100000007n;
        result[i] = base + offset;
        break;
      }
    }
  }
  return result;
}
