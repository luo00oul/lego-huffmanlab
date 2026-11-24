import React, {useState} from 'react';
import {
  BookOpen,
  Maximize2,
  Minimize2,
  RotateCcw,
  X,
} from 'lucide-react';
import type {PageRoute} from '../types/algorithm';

interface PresentationBarProps {
  activeRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  onExit: () => void;
  onLoadClassic: () => void;
}

const SCRIPT_SECTIONS = [
  {
    id: 'intro',
    duration: '0:00 – 1:20',
    title: '1. 破题与乐高直觉',
    route: 'workshop' as PageRoute,
    bullets: [
      '介绍实现题 4-14：操场四周 n 堆石子，允许任意选取 2 ~ k 堆合并，费用为新堆石子总数，求最大总费用与最小总费用。',
      '强调与“相邻石子合并（区间 DP）”的核心区别：本题不限相邻，因此具备全局贪心选择结构。',
      '展示经典样例 n=7, k=3, [45, 13, 12, 16, 9, 5, 22]：同样 7 块乐高积木，不同合并顺序费用悬殊（199 vs 593）。',
    ],
  },
  {
    id: 'lab',
    duration: '1:20 – 3:30',
    title: '2. 双策略同步动态演示',
    route: 'lab' as PageRoute,
    bullets: [
      '切换到「算法实验室」，一键开始同步对比演示：左路小根堆优先把小块埋在深层，右路大根堆每轮仅挑最大 2 块反复滚雪球。',
      '指明关键现象：左侧 3 轮就合并结束（费用 199），右侧需要 6 轮才结束（费用 593），说明最大费用本质上要让大权值经历最多的合并轮次。',
      '展开伪代码与优先队列视图，说明每次操作仅做常数次堆弹出/压入，时间复杂度 O(n log n)，算法空间 O(n)。',
    ],
  },
  {
    id: 'tree',
    duration: '3:30 – 5:00',
    title: '3. 积木树与 WPL 等价关系',
    route: 'tree' as PageRoute,
    bullets: [
      '打开「积木树」，将合并过程映射为树结构：每堆石子被合并的次数 = 它在树中的叶子深度 d_i。',
      '重点推导核心等式：总合并费用 = 所有内部节点权值之和 = Σ w_i · d_i = WPL。',
      '明确术语区分：最小费用对应最优 k 叉 Huffman 树（给出合法 k 进制前缀码），而最大费用对应二叉链式最大费用合并树，不能称为压缩意义上的 Huffman 树。',
    ],
  },
  {
    id: 'counterexample',
    duration: '5:00 – 6:40',
    title: '4. 易错反例与补零/首轮调整证明',
    route: 'strategy' as PageRoute,
    bullets: [
      '提出课堂问题：“如果每次直接合并最小的 k 堆，一定最优吗？”',
      '进入「策略研究」，载入 n=4, k=3, [1, 2, 3, 4]：直接合并最小 3 堆得到 (1+2+3)+(6+4)=16；而先合并 1+2=3，再合并 3+3+4=10，总费用仅为 13！',
      '解释原因：满 k 叉树要求 (n-1) mod (k-1) = 0；若不满足，根节点出现“空位”，相当于浪费了浅层位置。通过补 m 个零权值虚节点，或等价地调整首次合并数 r = 2 + (n-2) mod (k-1)，即可严格消除空位且避免 k ≫ n 时的多余虚节点开销。',
    ],
  },
  {
    id: 'proof',
    duration: '6:40 – 8:20',
    title: '5. 最大费用严格证明与课堂互动',
    route: 'challenge' as PageRoute,
    bullets: [
      '最大费用两步证明：① 任意一次 c≥3 堆的合并，拆成连续 c-1 次二元合并后，前序中间和被重复计入，费用严格更大；② 对二元合并树，深度序列单调递增，由排序不等式，大权值必须配最大深度，即每次合并最大 2 堆最优。',
      '现场邀请 1 位同学在「积木挑战」点击积木尝试拼出 199 或 593，系统即时展示偏离步骤并兼容等价最优路径。',
    ],
  },
  {
    id: 'bench',
    duration: '8:20 – 9:30',
    title: '6. 真实性能实测与总结',
    route: 'benchmark' as PageRoute,
    bullets: [
      '在「性能分析」展示 Web Worker 中真实测得的 n-耗时曲线，验证 O(n log n) 增长趋势，并说明纯算法耗时与动画渲染耗时的分离。',
      '展示 k 增大时最小费用单调下降趋势及不同权值分布的影响，最后总结贪心选择性质、最优子结构与工程精度保障（BigInt / C++ __int128）。',
    ],
  },
];

const QUICK_ROUTES: Array<{id: PageRoute; label: string}> = [
  {id: 'workshop', label: '工坊'},
  {id: 'lab', label: '实验室'},
  {id: 'tree', label: '积木树'},
  {id: 'challenge', label: '挑战'},
  {id: 'strategy', label: '策略'},
  {id: 'benchmark', label: '性能'},
  {id: 'docs', label: '百科'},
];

export const PresentationBar: React.FC<PresentationBarProps> = ({
  activeRoute,
  onNavigate,
  onExit,
  onLoadClassic,
}) => {
  const [showScript, setShowScript] = useState(false);
  const [activeSec, setActiveSec] = useState(0);
  const [isFs, setIsFs] = useState(Boolean(document.fullscreenElement));

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFs(true);
      } else {
        await document.exitFullscreen();
        setIsFs(false);
      }
    } catch {
      // Fullscreen may be restricted inside embedded iframes
    }
  };

  return (
    <>
      <div className="sticky top-0 z-40 border-b-2 border-[#25262a] bg-[#25262a] px-4 py-2.5 text-white">
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#f6c823] whitespace-nowrap">
              课堂展示模式
            </span>
            <span className="text-white/30" aria-hidden="true">|</span>
            <div className="flex flex-wrap items-center gap-1">
              {QUICK_ROUTES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onNavigate(r.id)}
                  className={`min-h-[38px] rounded px-3 py-1 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    activeRoute === r.id
                      ? 'bg-[#e74636] text-white'
                      : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onLoadClassic}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded border border-[#f6c823] bg-[#f6c823] px-3 py-1 text-xs font-bold text-[#2b271e] hover:bg-[#e5b817] cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              载入经典样例 (S)
            </button>
            <button
              type="button"
              onClick={() => setShowScript((v) => !v)}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded border px-3 py-1 text-xs font-bold cursor-pointer whitespace-nowrap ${
                showScript
                  ? 'border-[#35925b] bg-[#35925b] text-white'
                  : 'border-white/30 bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              讲稿提词卡
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded border border-white/30 bg-white/10 px-3 py-1 text-xs font-bold text-white hover:bg-white/20 cursor-pointer whitespace-nowrap"
            >
              {isFs ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              {isFs ? '退出全屏' : '全屏 (F)'}
            </button>
            <button
              type="button"
              onClick={onExit}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded border border-white/30 bg-[#e74636] px-3 py-1 text-xs font-bold text-white hover:bg-[#d3392a] cursor-pointer whitespace-nowrap"
            >
              <X className="h-3.5 w-3.5" />
              退出演示 (Esc)
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Classroom Speaker Notes Drawer */}
      {showScript && (
        <aside
          aria-label="5 至 10 分钟课堂展示讲稿提词卡"
          className="fixed right-4 bottom-4 z-50 w-[min(92vw,460px)] rounded-xl border-2 border-[#25262a] bg-[#fffdf8] p-4 shadow-[6px_6px_0_#25262a]"
        >
          <div className="flex items-center justify-between border-b border-[#25262a]/15 pb-2.5">
            <div>
              <h3 className="text-sm font-extrabold text-[#25262a]">
                课堂展示讲稿提词卡（5–10 分钟）
              </h3>
              <p className="text-xs text-[#6e6c73]">
                点击章节可一键跳转对应演示页面
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowScript(false)}
              aria-label="关闭讲稿提词卡"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[#25262a]/30 hover:bg-[#f4f1e9] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {SCRIPT_SECTIONS.map((sec, idx) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  setActiveSec(idx);
                  onNavigate(sec.route);
                }}
                className={`min-h-[34px] rounded border px-2.5 py-1 text-xs font-bold cursor-pointer transition-colors ${
                  activeSec === idx
                    ? 'border-[#25262a] bg-[#f6c823] text-[#2b271e]'
                    : 'border-[#25262a]/25 bg-[#f7f4ec] text-[#53535a] hover:border-[#25262a]'
                }`}
              >
                {idx + 1}. {sec.duration}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-[#25262a]/20 bg-[#f7f4ec] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-extrabold text-[#25262a]">
                {SCRIPT_SECTIONS[activeSec].title}
              </h4>
              <span className="font-mono text-xs font-semibold text-[#53535a]">
                {SCRIPT_SECTIONS[activeSec].duration}
              </span>
            </div>
            <ul className="mt-2.5 space-y-2 text-xs leading-relaxed text-[#25262a]">
              {SCRIPT_SECTIONS[activeSec].bullets.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono font-bold text-[#e74636]">
                    {i + 1}.
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}
    </>
  );
};
