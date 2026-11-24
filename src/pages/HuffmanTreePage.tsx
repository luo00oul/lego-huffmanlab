import React, {useEffect, useMemo, useState} from 'react';
import {Pause, Play, RotateCcw, SkipBack, SkipForward} from 'lucide-react';
import {DatasetToolbar} from '../components/DatasetToolbar';
import {MathFormula} from '../components/lego/MathFormula';
import {LegoTreeCanvas} from '../visualizations/LegoTreeCanvas';
import {formatBigIntFull} from '../algorithms/parser';
import {useDataset} from '../hooks/useDataset';
import type {AlgorithmMode} from '../types/algorithm';

interface HuffmanTreePageProps {
  presentationMode?: boolean;
}

export const HuffmanTreePage: React.FC<HuffmanTreePageProps> = ({
  presentationMode = false,
}) => {
  const {k, weights, minTrace, minTracePadded, maxTrace} = useDataset();
  const [treeMode, setTreeMode] = useState<AlgorithmMode>('min');
  const [showVirtualPadding, setShowVirtualPadding] = useState(false);
  const [step, setStep] = useState(minTrace.steps.length);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const activeTrace = useMemo(() => {
    if (treeMode === 'max') return maxTrace;
    return showVirtualPadding ? minTracePadded : minTrace;
  }, [treeMode, showVirtualPadding, minTrace, minTracePadded, maxTrace]);

  useEffect(() => {
    setStep(activeTrace.steps.length);
    setSelectedNodeId(activeTrace.rootId);
    setIsPlaying(false);
  }, [activeTrace]);

  useEffect(() => {
    if (!isPlaying) return;
    if (step >= activeTrace.steps.length) {
      setIsPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setStep((s) => Math.min(activeTrace.steps.length, s + 1));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [isPlaying, step, activeTrace.steps.length]);

  const selectedNode = selectedNodeId
    ? activeTrace.nodes[selectedNodeId] ?? null
    : null;

  const wplTotal = useMemo(
    () => activeTrace.wplEntries.reduce((acc, e) => acc + e.contribution, 0n),
    [activeTrace.wplEntries],
  );

  return (
    <div className="space-y-5">
      {!presentationMode && <DatasetToolbar compact />}

      {/* Mode Switch & Tree Build Controls */}
      <section className="lego-panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border-2 border-[#25262a] bg-[#f4f1e9] p-1">
            <button
              type="button"
              onClick={() => setTreeMode('min')}
              className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-extrabold cursor-pointer transition-colors ${
                treeMode === 'min'
                  ? 'bg-[#2f79c3] text-white'
                  : 'text-[#53535a] hover:text-[#25262a]'
              }`}
            >
              最小费用 · 多元 Huffman 树
            </button>
            <button
              type="button"
              onClick={() => setTreeMode('max')}
              className={`min-h-[38px] rounded-md px-3.5 py-1.5 text-xs font-extrabold cursor-pointer transition-colors ${
                treeMode === 'max'
                  ? 'bg-[#e74636] text-white'
                  : 'text-[#53535a] hover:text-[#25262a]'
              }`}
            >
              最大费用 · 二叉链式合并树
            </button>
          </div>

          {treeMode === 'min' && (
            <button
              type="button"
              onClick={() => setShowVirtualPadding((v) => !v)}
              className={`lego-btn text-xs ${
                showVirtualPadding ? 'lego-btn-yellow' : 'lego-btn-neutral'
              }`}
            >
              {showVirtualPadding
                ? `补零满 ${k} 叉教学视图（补 ${minTrace.virtualZeroCount} 个 0）`
                : `不补零首轮调整视图（r = ${minTrace.firstMergeCount}）`}
            </button>
          )}
        </div>

        {/* Progressive Tree Construction Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (step >= activeTrace.steps.length) setStep(0);
              setIsPlaying((v) => !v);
            }}
            disabled={activeTrace.steps.length === 0}
            className={`lego-btn text-xs ${isPlaying ? 'lego-btn-yellow' : 'lego-btn-green'}`}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isPlaying ? '暂停生长' : '动态建树'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setStep((s) => Math.max(0, s - 1));
            }}
            disabled={step === 0}
            className="lego-btn lego-btn-neutral text-xs"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setStep((s) => Math.min(activeTrace.steps.length, s + 1));
            }}
            disabled={step >= activeTrace.steps.length}
            className="lego-btn lego-btn-neutral text-xs"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setStep(0);
            }}
            className="lego-btn lego-btn-neutral text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-xs font-bold text-[#25262a] tabular-nums">
            步骤 {step}/{activeTrace.steps.length}
          </span>
        </div>
      </section>

      {/* Terminological accuracy callout for Max Tree */}
      {treeMode === 'max' && (
        <div className="rounded-lg border-2 border-[#a62824] bg-[#fdf0ee] px-4 py-3 text-xs font-medium leading-6 text-[#25262a]">
          <strong className="text-[#a62824]">术语严谨提示：</strong>
          最大费用对应的是<strong>最大费用二叉链式合并树</strong>，其目标是让大权值叶子深度最大化，
          <strong>并非</strong>信息论最优压缩意义上的 Huffman 编码树。
        </div>
      )}

      {/* Main Split: Tree Canvas + Node Inspector */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {activeTrace.truncatedForVisual ? (
            <div className="lego-panel p-8 text-center text-sm text-[#53535a]">
              当前数据规模 n = {weights.length} 超过交互树画布渲染上限（120 堆），请缩减规模后查看树拓扑。
            </div>
          ) : (
            <LegoTreeCanvas
              trace={activeTrace}
              visibleStep={step}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          )}
        </div>

        {/* Node Detail Inspector */}
        <aside className="lego-panel flex flex-col justify-between p-5 lg:col-span-4">
          <div>
            <h3 className="text-base font-extrabold text-[#25262a]">
              积木节点详情检视
            </h3>
            {!selectedNode ? (
              <p className="mt-3 text-xs text-[#6e6c73]">
                点击左侧积木树中的任意节点，查看其权值、深度、父子关系与多元编码。
              </p>
            ) : (
              <dl className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-[#25262a]/10 pb-2">
                  <dt className="font-semibold text-[#53535a]">节点类型</dt>
                  <dd className="font-bold text-[#25262a]">
                    {selectedNode.isVirtual
                      ? '虚拟零权值叶子节点'
                      : selectedNode.isLeaf
                        ? `原始石子堆（叶子 #${(selectedNode.originalIndex ?? 0) + 1}）`
                        : `合并内部节点（第 ${selectedNode.createdAtStep} 轮生成）`}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-[#25262a]/10 pb-2">
                  <dt className="font-semibold text-[#53535a]">节点权值</dt>
                  <dd className="font-mono text-sm font-extrabold text-[#25262a] tabular-nums">
                    {formatBigIntFull(selectedNode.weight)}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-[#25262a]/10 pb-2">
                  <dt className="font-semibold text-[#53535a]">树中深度 d</dt>
                  <dd className="font-mono font-bold text-[#25262a] tabular-nums">
                    {selectedNode.depth}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-[#25262a]/10 pb-2">
                  <dt className="font-semibold text-[#53535a]">
                    {treeMode === 'min' ? `${k} 进制 Huffman 编码` : '合并路径编码'}
                  </dt>
                  <dd className="font-mono font-bold text-[#1c508d]">
                    {selectedNode.code || '(根节点)'}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-[#25262a]/10 pb-2">
                  <dt className="font-semibold text-[#53535a]">父节点</dt>
                  <dd className="font-mono font-semibold text-[#25262a]">
                    {selectedNode.parentId
                      ? `权值 ${formatBigIntFull(activeTrace.nodes[selectedNode.parentId].weight)}`
                      : '无（当前为根）'}
                  </dd>
                </div>
                <div className="flex justify-between border-b border-[#25262a]/10 pb-2">
                  <dt className="font-semibold text-[#53535a]">子节点数量</dt>
                  <dd className="font-mono font-semibold text-[#25262a]">
                    {selectedNode.childrenIds.length === 0
                      ? '无（叶子节点）'
                      : `${selectedNode.childrenIds.length} 个（${selectedNode.childrenIds
                          .map((cid) => activeTrace.nodes[cid]?.weight.toString() ?? '')
                          .join(', ')}）`}
                  </dd>
                </div>
                {selectedNode.isLeaf && !selectedNode.isVirtual && (
                  <div className="flex justify-between pt-1">
                    <dt className="font-semibold text-[#53535a]">WPL 贡献 w · d</dt>
                    <dd className="font-mono font-extrabold text-[#1e613d] tabular-nums">
                      {formatBigIntFull(selectedNode.weight)} × {selectedNode.depth} ={' '}
                      {formatBigIntFull(selectedNode.weight * BigInt(selectedNode.depth))}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          <div className="mt-5 rounded-lg border border-[#25262a]/20 bg-[#f7f4ec] p-3.5 text-xs leading-6 text-[#25262a]">
            <div className="font-extrabold">为什么总合并费用 = WPL？</div>
            <MathFormula
              display
              tex={`\\text{WPL} = \\sum_{i=1}^{n} w_i d_i = \\sum_{u \\in \\text{内部节点}} w(u)`}
            />
            <p className="text-[#53535a]">
              每片原始叶子 <MathFormula tex="w_i" /> 从底向上合并到根节点恰好经过{' '}
              <MathFormula tex="d_i" /> 个祖先内部节点，因此被累加到合并费用中恰好{' '}
              <MathFormula tex="d_i" /> 次。
            </p>
          </div>
        </aside>
      </div>

      {/* WPL Breakdown Table */}
      {!activeTrace.truncatedForVisual && (
        <section className="lego-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-extrabold text-[#25262a]">
              带权路径长度（WPL）与编码明细核对表
            </h3>
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs font-bold tabular-nums">
              <span className="text-[#1c508d]">
                Σ wᵢ·dᵢ = {formatBigIntFull(wplTotal)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-[#1e613d]">
                内部节点权值和 = {formatBigIntFull(activeTrace.internalNodeSum)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-[#25262a]">
                完全一致：{wplTotal === activeTrace.totalCost ? '验证通过' : '不匹配'}
              </span>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b-2 border-[#25262a] bg-[#f7f4ec] font-bold text-[#25262a]">
                  <th className="px-3 py-2">原始序号</th>
                  <th className="px-3 py-2">石子堆权值 wᵢ</th>
                  <th className="px-3 py-2">叶子深度 dᵢ</th>
                  <th className="px-3 py-2">
                    {treeMode === 'min' ? `${k} 进制 Huffman 编码` : '路径编码'}
                  </th>
                  <th className="px-3 py-2 text-right">费用贡献 wᵢ × dᵢ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#25262a]/10 font-mono tabular-nums">
                {activeTrace.wplEntries.map((entry) => (
                  <tr
                    key={entry.nodeId}
                    onClick={() => setSelectedNodeId(entry.nodeId)}
                    className={`cursor-pointer transition-colors ${
                      selectedNodeId === entry.nodeId
                        ? 'bg-[#ffe899]/60 font-bold'
                        : 'hover:bg-[#f7f4ec]'
                    }`}
                  >
                    <td className="px-3 py-2">#{entry.originalIndex + 1}</td>
                    <td className="px-3 py-2 font-bold">
                      {formatBigIntFull(entry.weight)}
                    </td>
                    <td className="px-3 py-2">{entry.depth}</td>
                    <td className="px-3 py-2 text-[#1c508d] font-bold">
                      {entry.code}
                    </td>
                    <td className="px-3 py-2 text-right font-bold">
                      {formatBigIntFull(entry.contribution)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
