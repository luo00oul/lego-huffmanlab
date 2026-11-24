import React, {useEffect, useRef, useState} from 'react';
import {
  Download,
  FileUp,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
} from 'lucide-react';
import {
  PRESET_DATASETS,
  formatBigIntFull,
  formatInputTxt,
} from '../algorithms/parser';
import {useDataset} from '../hooks/useDataset';
import type {DistributionType} from '../types/algorithm';

interface DatasetToolbarProps {
  compact?: boolean;
  onDataApplied?: () => void;
}

export const DatasetToolbar: React.FC<DatasetToolbarProps> = ({
  compact = false,
  onDataApplied,
}) => {
  const {
    k,
    weights,
    presetLabel,
    weightsText,
    error,
    pureMin,
    pureMax,
    loadClassic,
    loadPreset,
    applyManualInput,
    randomizeDataset,
    importInputTxt,
    downloadOutputTxt,
    clearError,
  } = useDataset();

  const [expanded, setExpanded] = useState(!compact);
  const [draftWeights, setDraftWeights] = useState(weightsText);
  const [draftK, setDraftK] = useState(String(k));
  const [randN, setRandN] = useState(Math.min(16, Math.max(4, weights.length)));
  const [randDist, setRandDist] = useState<DistributionType>('uniform');
  const [randSeed, setRandSeed] = useState(42);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftWeights(weightsText);
    setDraftK(String(k));
  }, [weightsText, k]);

  const notify = (msg: string) => {
    setStatusMsg(msg);
    window.setTimeout(() => setStatusMsg(null), 3200);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedK = Number.parseInt(draftK, 10);
    const ok = applyManualInput(draftWeights, parsedK);
    if (ok) {
      notify('已更新石子堆数据与合并上限 k');
      onDataApplied?.();
    }
  };

  const handleRandomize = () => {
    const nextSeed = (randSeed * 1664525 + 1013904223) % 100000;
    setRandSeed(nextSeed);
    const parsedK = Math.max(2, Number.parseInt(draftK, 10) || 3);
    randomizeDataset(randN, parsedK, randDist, nextSeed);
    notify(`已按随机种子 ${nextSeed} 生成 ${randN} 堆数据`);
    onDataApplied?.();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importInputTxt(String(reader.result ?? ''));
      if (res.ok) {
        notify(res.message);
        onDataApplied?.();
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleDownloadInput = () => {
    const blob = new Blob([formatInputTxt(weights, k)], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'input.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section
      aria-label="实验数据控制面板"
      className="lego-panel p-4 md:p-5"
    >
      {/* Top summary row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-bold text-[#25262a]">{presetLabel}</span>
          <span className="text-[#6e6c73]" aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-[#53535a]">
            n = <strong className="text-[#25262a]">{weights.length}</strong>
          </span>
          <span className="text-[#6e6c73]" aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-[#53535a]">
            k = <strong className="text-[#25262a]">{k}</strong>
          </span>
          <span className="text-[#6e6c73]" aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-[#1c508d]">
            最小费用 <strong>{formatBigIntFull(pureMin.totalCost)}</strong>
          </span>
          <span className="text-[#6e6c73]" aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-[#a62824]">
            最大费用 <strong>{formatBigIntFull(pureMax.totalCost)}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              loadClassic();
              notify('已载入官方经典样例 (593 / 199)');
              onDataApplied?.();
            }}
            className="lego-btn lego-btn-yellow text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            经典样例
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            onChange={handleFileImport}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="lego-btn lego-btn-neutral text-xs"
          >
            <FileUp className="h-3.5 w-3.5" />
            导入 input.txt
          </button>

          <button
            type="button"
            onClick={downloadOutputTxt}
            className="lego-btn lego-btn-neutral text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            导出 output.txt
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="lego-btn lego-btn-neutral text-xs"
            aria-expanded={expanded}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {expanded ? '收起数据编辑' : '自定义数据'}
          </button>
        </div>
      </div>

      {statusMsg && (
        <p className="mt-3 rounded-md border border-[#1e613d] bg-[#e9f7ef] px-3 py-2 text-xs font-semibold text-[#1e613d]">
          {statusMsg}
        </p>
      )}

      {error && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-md border-2 border-[#a62824] bg-[#fdecea] px-3 py-2 text-xs font-semibold text-[#a62824]">
          <span>输入错误：{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="underline cursor-pointer"
          >
            关闭
          </button>
        </div>
      )}

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-[#25262a]/15 pt-4">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#53535a]">快捷样例：</span>
            {PRESET_DATASETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  loadPreset(p.id);
                  notify(`已载入：${p.label}`);
                  onDataApplied?.();
                }}
                title={p.description}
                className="min-h-[36px] rounded-md border border-[#25262a]/35 bg-[#f7f4ec] px-2.5 py-1 text-xs font-semibold text-[#25262a] hover:border-[#25262a] hover:bg-[#ffe899] cursor-pointer transition-colors whitespace-nowrap"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Manual Input Form */}
          <form
            onSubmit={handleApply}
            className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-end"
          >
            <div className="lg:col-span-2">
              <label
                htmlFor="dataset-k"
                className="mb-1 block text-xs font-bold text-[#53535a]"
              >
                最大合并数 k (≥ 2)
              </label>
              <input
                id="dataset-k"
                type="number"
                min={2}
                max={1000000}
                value={draftK}
                onChange={(e) => setDraftK(e.target.value)}
                className="lego-input w-full font-mono tabular-nums"
              />
            </div>

            <div className="lg:col-span-7">
              <label
                htmlFor="dataset-weights"
                className="mb-1 block text-xs font-bold text-[#53535a]"
              >
                各堆石子权值（正整数，支持超大 BigInt，用空格或逗号分隔）
              </label>
              <input
                id="dataset-weights"
                type="text"
                value={draftWeights}
                onChange={(e) => setDraftWeights(e.target.value)}
                placeholder="例如：45 13 12 16 9 5 22"
                className="lego-input w-full font-mono tabular-nums"
              />
            </div>

            <div className="flex flex-wrap gap-2 lg:col-span-3 lg:justify-end">
              <button type="submit" className="lego-btn lego-btn-blue flex-1 lg:flex-none">
                应用数据
              </button>
              <button
                type="button"
                onClick={handleDownloadInput}
                className="lego-btn lego-btn-neutral text-xs"
              >
                下载 input.txt
              </button>
            </div>
          </form>

          {/* Random Generator Row */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#25262a]/20 bg-[#f7f4ec] px-3.5 py-2.5 text-xs">
            <span className="font-bold text-[#25262a]">随机生成：</span>
            <label className="flex items-center gap-2 font-semibold text-[#53535a]">
              堆数 n = <span className="w-6 font-mono font-bold text-[#25262a] tabular-nums">{randN}</span>
              <input
                type="range"
                min={2}
                max={24}
                value={randN}
                onChange={(e) => setRandN(Number(e.target.value))}
                className="h-2 w-28 accent-[#e74636] cursor-pointer"
              />
            </label>

            <label className="flex items-center gap-1.5 font-semibold text-[#53535a]">
              分布
              <select
                value={randDist}
                onChange={(e) => setRandDist(e.target.value as DistributionType)}
                className="rounded border border-[#25262a] bg-white px-2 py-1 text-xs font-semibold text-[#25262a]"
              >
                <option value="uniform">均匀随机</option>
                <option value="skewed">长尾偏态</option>
                <option value="exponential">指数差距</option>
                <option value="duplicates">重复权值</option>
                <option value="equal">全同权值</option>
              </select>
            </label>

            <button
              type="button"
              onClick={handleRandomize}
              className="lego-btn lego-btn-green min-h-[36px] px-3 py-1 text-xs"
            >
              <Shuffle className="h-3.5 w-3.5" />
              生成新数据
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
