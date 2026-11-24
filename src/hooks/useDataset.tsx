import React, {createContext, useContext, useMemo, useState} from 'react';
import {solveMaxCostPure, solveMinCostPure} from '../algorithms/core';
import {
  CLASSIC_SAMPLE,
  PRESET_DATASETS,
  formatOutputTxt,
  generateWeights,
  parseInputTxt,
  parseWeightList,
} from '../algorithms/parser';
import {buildSimulationTrace} from '../algorithms/trace';
import type {
  DistributionType,
  PureRunResult,
  SimulationTrace,
} from '../types/algorithm';

interface DatasetContextValue {
  k: number;
  weights: bigint[];
  presetLabel: string;
  weightsText: string;
  error: string | null;
  pureMin: PureRunResult;
  pureMax: PureRunResult;
  minTrace: SimulationTrace;
  maxTrace: SimulationTrace;
  minTracePadded: SimulationTrace;
  loadClassic: () => void;
  loadPreset: (presetId: string) => void;
  applyManualInput: (weightsInput: string, nextK: number) => boolean;
  setDatasetDirect: (weights: bigint[], nextK: number, label: string) => void;
  randomizeDataset: (
    n: number,
    nextK: number,
    dist: DistributionType,
    seed: number,
  ) => void;
  importInputTxt: (content: string) => {ok: boolean; message: string};
  downloadOutputTxt: () => void;
  clearError: () => void;
}

const DatasetContext = createContext<DatasetContextValue | null>(null);

export const DatasetProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [weights, setWeights] = useState<bigint[]>(CLASSIC_SAMPLE.weights);
  const [k, setK] = useState<number>(CLASSIC_SAMPLE.k);
  const [presetLabel, setPresetLabel] = useState<string>(CLASSIC_SAMPLE.name);
  const [error, setError] = useState<string | null>(null);

  const pureMin = useMemo(() => solveMinCostPure(weights, k), [weights, k]);
  const pureMax = useMemo(() => solveMaxCostPure(weights), [weights]);

  const minTrace = useMemo(
    () => buildSimulationTrace(weights, k, 'min', {includeVirtualZeros: false}),
    [weights, k],
  );
  const minTracePadded = useMemo(
    () => buildSimulationTrace(weights, k, 'min', {includeVirtualZeros: true}),
    [weights, k],
  );
  const maxTrace = useMemo(
    () => buildSimulationTrace(weights, k, 'max'),
    [weights, k],
  );

  const weightsText = useMemo(
    () => weights.map((w) => w.toString()).join(' '),
    [weights],
  );

  const loadClassic = () => {
    setWeights(CLASSIC_SAMPLE.weights);
    setK(CLASSIC_SAMPLE.k);
    setPresetLabel(CLASSIC_SAMPLE.name);
    setError(null);
  };

  const loadPreset = (presetId: string) => {
    const found = PRESET_DATASETS.find((p) => p.id === presetId);
    if (!found) return;
    setWeights(found.weights);
    setK(found.k);
    setPresetLabel(found.label);
    setError(null);
  };

  const setDatasetDirect = (
    nextWeights: bigint[],
    nextK: number,
    label: string,
  ) => {
    if (nextWeights.length < 1 || !Number.isInteger(nextK) || nextK < 2) {
      setError('参数非法：需满足 n ≥ 1 且 k ≥ 2。');
      return;
    }
    setWeights(nextWeights);
    setK(nextK);
    setPresetLabel(label);
    setError(null);
  };

  const applyManualInput = (weightsInput: string, nextK: number): boolean => {
    if (!Number.isInteger(nextK) || nextK < 2 || nextK > 1000000000) {
      setError('最大合并数 k 必须为不小于 2 的整数。');
      return false;
    }
    const parsed = parseWeightList(weightsInput);
    if (!parsed.ok) {
      setError(parsed.error);
      return false;
    }
    if (parsed.weights.length > 50000) {
      setError('交互工作台单次建议不超过 50,000 堆（大规模压测请前往「性能分析」模块）。');
      return false;
    }
    setWeights(parsed.weights);
    setK(nextK);
    setPresetLabel(`自定义输入 (n=${parsed.weights.length}, k=${nextK})`);
    setError(null);
    return true;
  };

  const randomizeDataset = (
    n: number,
    nextK: number,
    dist: DistributionType,
    seed: number,
  ) => {
    const clampedN = Math.max(1, Math.min(40, Math.floor(n)));
    const clampedK = Math.max(2, Math.min(20, Math.floor(nextK)));
    const nextWeights = generateWeights(clampedN, dist, seed);
    setWeights(nextWeights);
    setK(clampedK);
    setPresetLabel(`随机生成 (n=${clampedN}, k=${clampedK}, 种子=${seed})`);
    setError(null);
  };

  const importInputTxt = (content: string): {ok: boolean; message: string} => {
    const parsed = parseInputTxt(content);
    if (!parsed.ok) {
      setError(parsed.error);
      return {ok: false, message: parsed.error};
    }
    setWeights(parsed.weights);
    setK(parsed.k);
    setPresetLabel(`导入 input.txt (n=${parsed.n}, k=${parsed.k})`);
    setError(null);
    return {
      ok: true,
      message: `成功导入 ${parsed.n} 堆石子（k = ${parsed.k}）。`,
    };
  };

  const downloadOutputTxt = () => {
    const content = formatOutputTxt(pureMax.totalCost, pureMin.totalCost);
    const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const value: DatasetContextValue = {
    k,
    weights,
    presetLabel,
    weightsText,
    error,
    pureMin,
    pureMax,
    minTrace,
    maxTrace,
    minTracePadded,
    loadClassic,
    loadPreset,
    applyManualInput,
    setDatasetDirect,
    randomizeDataset,
    importInputTxt,
    downloadOutputTxt,
    clearError: () => setError(null),
  };

  return (
    <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>
  );
};

export function useDataset(): DatasetContextValue {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error('useDataset must be used inside DatasetProvider');
  return ctx;
}
