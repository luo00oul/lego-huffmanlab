export type BrickColorIndex = 0 | 1 | 2 | 3;

export type AlgorithmMode = 'min' | 'max';

export type StrategyId =
  | 'min-huffman'
  | 'min-binary'
  | 'min-naive-k'
  | 'max-binary'
  | 'max-naive-k'
  | 'random'
  | 'exhaustive';

export interface PileItem {
  id: string;
  weight: bigint;
  colorIndex: BrickColorIndex;
  isVirtual?: boolean;
  mergedCount: number;
  sourceLeafIds: string[];
  originalIndex?: number;
}

export interface PureRunResult {
  totalCost: bigint;
  mergeCount: number;
  virtualZeroCount: number;
  firstMergeCount: number;
}

export interface TreeNodeData {
  id: string;
  weight: bigint;
  isLeaf: boolean;
  isVirtual: boolean;
  childrenIds: string[];
  parentId: string | null;
  depth: number;
  code: string;
  createdAtStep: number;
  colorIndex: BrickColorIndex;
  originalIndex?: number;
}

export interface MergeStep {
  stepIndex: number;
  selectedItems: PileItem[];
  mergedItem: PileItem;
  stepCost: bigint;
  cumulativeCost: bigint;
  remainingCount: number;
  heapBefore: PileItem[];
  heapAfter: PileItem[];
  activePseudoLines: number[];
  explanation: string;
  isFirstAdjustedMerge: boolean;
}

export interface WplEntry {
  nodeId: string;
  originalIndex: number;
  weight: bigint;
  depth: number;
  contribution: bigint;
  code: string;
}

export interface SimulationTrace {
  mode: AlgorithmMode;
  k: number;
  initialPiles: PileItem[];
  steps: MergeStep[];
  totalCost: bigint;
  virtualZeroCount: number;
  firstMergeCount: number;
  nodes: Record<string, TreeNodeData>;
  rootId: string | null;
  wplEntries: WplEntry[];
  internalNodeSum: bigint;
  usedVirtualPadding: boolean;
  truncatedForVisual: boolean;
}

export interface StrategyStepSummary {
  stepIndex: number;
  selectedWeights: bigint[];
  mergedWeight: bigint;
  cumulativeCost: bigint;
}

export interface StrategyEvaluation {
  strategyId: StrategyId;
  name: string;
  goal: 'min' | 'max' | 'both' | 'explore';
  totalCost: bigint;
  maxExhaustiveCost?: bigint;
  mergeCount: number;
  gapFromMin: bigint;
  gapFromMax: bigint;
  isMinOptimal: boolean;
  isMaxOptimal: boolean;
  stepsSummary: StrategyStepSummary[];
  timeComplexity: string;
  applicableCondition: string;
  correctnessNote: string;
  status: 'ok' | 'limit-exceeded';
  exploredStates?: number;
}

export interface ExhaustiveResult {
  status: 'ok' | 'limit-exceeded';
  minCost: bigint;
  maxCost: bigint;
  minSteps: StrategyStepSummary[];
  maxSteps: StrategyStepSummary[];
  exploredStates: number;
}

export type DistributionType =
  | 'uniform'
  | 'skewed'
  | 'exponential'
  | 'equal'
  | 'duplicates'
  | 'huge';

export type ParseInputResult =
  | {
      ok: true;
      n: number;
      k: number;
      weights: bigint[];
      rawText: string;
    }
  | {
      ok: false;
      error: string;
    };

export interface ChallengeMove {
  stepIndex: number;
  selectedIds: string[];
  selectedWeights: bigint[];
  mergedId: string;
  mergedWeight: bigint;
  stepCost: bigint;
  cumulativeCost: bigint;
  remainingWeightsBefore: bigint[];
  remainingWeightsAfter: bigint[];
}

export interface ChallengeDeviation {
  stepIndex: number;
  selectedWeights: bigint[];
  bestAchievableBefore: bigint;
  bestAchievableAfter: bigint;
  penalty: bigint;
  recommendedWeights: bigint[];
  reason: string;
}

export interface ChallengeAnalysis {
  goal: AlgorithmMode;
  userTotalCost: bigint;
  optimalTotalCost: bigint;
  diff: bigint;
  isOptimal: boolean;
  stars: 1 | 2 | 3;
  score: number;
  deviations: ChallengeDeviation[];
  firstDeviation: ChallengeDeviation | null;
  usedAlternativeOptimalPath: boolean;
}

export interface BenchmarkPoint {
  n: number;
  k: number;
  distribution: DistributionType;
  minTimeMs: number;
  maxTimeMs: number;
  naiveKTimeMs: number;
  minMergeCount: number;
  maxMergeCount: number;
  minCostStr: string;
  maxCostStr: string;
  naiveKCostStr: string;
  minBinaryCostStr: string;
  runs: number;
}

export type PageRoute =
  | 'workshop'
  | 'lab'
  | 'tree'
  | 'challenge'
  | 'strategy'
  | 'benchmark'
  | 'docs';
