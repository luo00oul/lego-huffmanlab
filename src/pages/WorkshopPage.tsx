import React, {useEffect, useState} from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  FlaskConical,
  Gamepad2,
  GitBranch,
  Pause,
  Play,
  Sliders,
} from 'lucide-react';
import {motion, AnimatePresence} from 'motion/react';
import {LegoBrick} from '../components/lego/LegoBrick';
import {LegoMinifig} from '../components/lego/LegoMinifig';
import {MathFormula} from '../components/lego/MathFormula';
import {CLASSIC_SAMPLE} from '../algorithms/parser';
import {useDataset} from '../hooks/useDataset';
import type {BrickColorIndex, PageRoute} from '../types/algorithm';

interface WorkshopPageProps {
  onNavigate: (route: PageRoute) => void;
}

interface IntroFrame {
  label: string;
  note: string;
  piles: Array<{id: string; w: bigint; c: BrickColorIndex; merged?: number; hl?: boolean}>;
  minCostSoFar: number;
}

const INTRO_FRAMES: IntroFrame[] = [
  {
    label: '初始 7 堆石子积木',
    note: '将 [45, 13, 12, 16, 9, 5, 22] 摆上工坊底板，每轮最多选 k = 3 堆合并。',
    piles: [
      {id: 'a', w: 5n, c: 2, hl: true},
      {id: 'b', w: 9n, c: 1, hl: true},
      {id: 'c', w: 12n, c: 3, hl: true},
      {id: 'd', w: 13n, c: 0},
      {id: 'e', w: 16n, c: 2},
      {id: 'f', w: 22n, c: 1},
      {id: 'g', w: 45n, c: 0},
    ],
    minCostSoFar: 0,
  },
  {
    label: '第 1 轮最小贪心：5 + 9 + 12 → 26',
    note: '挑出最小的 3 块积木拼装，新块权值 26，累计费用 26。',
    piles: [
      {id: 'd', w: 13n, c: 0, hl: true},
      {id: 'e', w: 16n, c: 2, hl: true},
      {id: 'f', w: 22n, c: 1, hl: true},
      {id: 'm1', w: 26n, c: 3, merged: 3},
      {id: 'g', w: 45n, c: 0},
    ],
    minCostSoFar: 26,
  },
  {
    label: '第 2 轮最小贪心：13 + 16 + 22 → 51',
    note: '继续挑最小的 3 块拼装，新块权值 51，累计费用 26 + 51 = 77。',
    piles: [
      {id: 'm1', w: 26n, c: 3, merged: 3, hl: true},
      {id: 'g', w: 45n, c: 0, hl: true},
      {id: 'm2', w: 51n, c: 2, merged: 3, hl: true},
    ],
    minCostSoFar: 77,
  },
  {
    label: '第 3 轮收官：26 + 45 + 51 → 122',
    note: '最大积木 45 仅在最后一轮参与 1 次合并！最小总费用 = 199，而最大费用方案高达 593。',
    piles: [{id: 'm3', w: 122n, c: 3, merged: 7, hl: true}],
    minCostSoFar: 199,
  },
];

export const WorkshopPage: React.FC<WorkshopPageProps> = ({onNavigate}) => {
  const {loadClassic} = useDataset();
  const [frameIdx, setFrameIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = window.setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % INTRO_FRAMES.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, [autoPlay]);

  const frame = INTRO_FRAMES[frameIdx];

  const handleLaunchLab = () => {
    loadClassic();
    onNavigate('lab');
  };

  return (
    <div className="space-y-8">
      {/* Hero Split Section */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
        <div className="flex flex-col justify-between space-y-6 lg:col-span-6">
          <div className="space-y-4">
            <p className="text-xs font-bold tracking-wide text-[#53535a]">
              湖南大学 · 计算机科学与技术 · 《算法设计与分析》实现题 4-14
            </p>
            <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-[#25262a] sm:text-5xl">
              用搭乐高的方式
              <br />
              看懂<span className="text-[#e74636]">多元 Huffman</span> 贪心
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[#53535a]">
              把操场四周的 <strong className="text-[#25262a]">n 堆石子</strong>变成带权值的乐高积木，
              允许每次任意选取 <strong className="text-[#25262a]">2 至 k 堆</strong>拼装合并。
              同一组 7 块积木，为什么最省只需 <strong className="font-mono text-[#1c508d]">199</strong>，
              最费却高达 <strong className="font-mono text-[#a62824]">593</strong>？在这里亲手拼装、推演并验证答案。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleLaunchLab}
              className="lego-btn lego-btn-red px-5 py-3 text-base"
            >
              进入算法实验室
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('challenge')}
              className="lego-btn lego-btn-yellow px-4 py-3 text-sm"
            >
              <Gamepad2 className="h-4 w-4" />
              先试一局积木挑战
            </button>
            <button
              type="button"
              onClick={() => onNavigate('docs')}
              className="lego-btn lego-btn-neutral px-4 py-3 text-sm"
            >
              阅读算法证明
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#25262a]/15 pt-4 text-xs font-medium text-[#53535a]">
            <span>默认样例：n = 7, k = 3</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              weights = [45, 13, 12, 16, 9, 5, 22]
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-bold text-[#25262a] tabular-nums">
              output.txt = 593 199
            </span>
          </div>
        </div>

        {/* Right Auto-Assembling LEGO Studded Baseplate Showcase */}
        <div className="lego-baseplate relative flex flex-col justify-between p-5 shadow-[6px_6px_0_#25262a] lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#25262a]">
              <span className="rounded border-2 border-[#25262a] bg-[#fffdf8] px-2.5 py-1">
                工坊实景演示 · 步 {frameIdx + 1}/{INTRO_FRAMES.length}
              </span>
              <span className="text-[#53535a]">{frame.label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAutoPlay((v) => !v)}
                aria-label={autoPlay ? '暂停开场动画' : '播放开场动画'}
                className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-[#25262a] bg-[#fffdf8] text-[#25262a] hover:bg-[#ffe899] cursor-pointer"
              >
                {autoPlay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              {INTRO_FRAMES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAutoPlay(false);
                    setFrameIdx(idx);
                  }}
                  aria-label={`切换到开场演示第 ${idx + 1} 步`}
                  className={`h-9 w-8 rounded-md border-2 border-[#25262a] font-mono text-xs font-bold cursor-pointer ${
                    frameIdx === idx
                      ? 'bg-[#e74636] text-white'
                      : 'bg-[#fffdf8] text-[#25262a] hover:bg-[#f4f1e9]'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Animated Brick Assembly Track */}
          <div className="my-5 flex min-h-[168px] flex-wrap items-end justify-center gap-3 border-b-[8px] border-[#25262a] px-2 pb-4">
            <AnimatePresence mode="popLayout">
              {frame.piles.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{opacity: 0, y: -22, scale: 0.9}}
                  animate={{opacity: 1, y: 0, scale: 1}}
                  exit={{opacity: 0, y: 16, scale: 0.85}}
                  transition={{duration: 0.28, ease: [0.16, 1, 0.3, 1]}}
                >
                  <LegoBrick
                    weight={p.w}
                    colorIndex={p.c}
                    minWeight={5n}
                    maxWeight={122n}
                    mergedCount={p.merged ?? 1}
                    selected={Boolean(p.hl)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <LegoMinifig size={48} mood={frameIdx === 3 ? 'celebrate' : 'happy'} />
              <p className="max-w-sm text-xs font-medium leading-relaxed text-[#25262a]">
                {frame.note}
              </p>
            </div>
            <div className="rounded-md border-2 border-[#25262a] bg-[#f6c823] px-3 py-1.5 font-mono text-sm font-extrabold text-[#2b271e] tabular-nums">
              最小累计：{frame.minCostSoFar}
            </div>
          </div>
        </div>
      </section>

      {/* Intuitive Cost Contrast + Problem Statement */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lego-panel p-6 lg:col-span-5">
          <h2 className="text-xl font-extrabold text-[#25262a]">
            原始题目：实现题 4-14
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#53535a]">
            在一个操场的四周摆放着 <MathFormula tex="n" /> 堆石子。现要将石子有次序地合并成一堆。
            规定每次<strong className="text-[#25262a]">至少选 2 堆、最多选 <MathFormula tex="k" /> 堆</strong>石子合并成新的一堆，
            合并的费用为新的一堆的石子数。试设计一个算法，计算出将 <MathFormula tex="n" /> 堆石子合并成一堆的
            <strong className="text-[#a62824]">最大总费用</strong>和
            <strong className="text-[#1c508d]">最小总费用</strong>。
          </p>
          <p className="mt-2 text-xs font-semibold text-[#53535a]">
            题意关键约束：允许任意选择石子堆合并，不要求相邻。
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="rounded-lg border-2 border-[#25262a] bg-[#f7f4ec] p-3">
              <div className="font-bold text-[#53535a]">输入示例 input.txt</div>
              <pre className="mt-1.5 text-sm font-bold text-[#25262a] tabular-nums">
{`7 3
45 13 12 16 9 5 22`}
              </pre>
            </div>
            <div className="rounded-lg border-2 border-[#25262a] bg-[#f7f4ec] p-3">
              <div className="font-bold text-[#53535a]">输出示例 output.txt</div>
              <pre className="mt-1.5 text-sm font-bold text-[#25262a] tabular-nums">
{`593 199`}
              </pre>
              <div className="mt-1 text-[11px] text-[#53535a]">
                先输出最大费用，再输出最小费用
              </div>
            </div>
          </div>
        </div>

        {/* Max vs Min Intuitive Comparison */}
        <div className="lego-panel p-6 lg:col-span-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-extrabold text-[#25262a]">
              为什么同一组积木，费用相差近 3 倍？
            </h2>
            <span className="font-mono text-xs font-semibold text-[#53535a]">
              核心等价式：总费用 = Σ wᵢ · dᵢ
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border-2 border-[#1c508d] bg-[#eef5fc] p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-extrabold text-[#1c508d]">
                  最小总费用策略（小根堆）
                </span>
                <span className="font-mono text-2xl font-extrabold text-[#1c508d] tabular-nums">
                  {CLASSIC_SAMPLE.expectedMin.toString()}
                </span>
              </div>
              <p className="mt-2 text-xs leading-6 text-[#25262a]">
                <strong>核心思想：</strong>让<strong>最小</strong>的积木最早合并（被重复累加多次），让最大的
                45 晚到最后 1 步才参与合并；并且每次尽量合并满 <MathFormula tex="k=3" /> 堆以压低树高。
              </p>
              <div className="mt-3 font-mono text-xs text-[#1c508d] tabular-nums">
                合并轮次：3 轮 · 45 的深度仅为 1
              </div>
            </div>

            <div className="rounded-lg border-2 border-[#a62824] bg-[#fdf0ee] p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-extrabold text-[#a62824]">
                  最大总费用策略（大根堆）
                </span>
                <span className="font-mono text-2xl font-extrabold text-[#a62824] tabular-nums">
                  {CLASSIC_SAMPLE.expectedMax.toString()}
                </span>
              </div>
              <p className="mt-2 text-xs leading-6 text-[#25262a]">
                <strong>核心思想：</strong>每次只选<strong>最大</strong>的 <strong>2 堆</strong>合并（绝不一次合 3 堆！），
                让最大的 45 和 22 像滚雪球一样在每一步都被反复累加。
              </p>
              <div className="mt-3 font-mono text-xs text-[#a62824] tabular-nums">
                合并轮次：6 轮 · 45 的深度高达 6
              </div>
            </div>
          </div>

          {/* Visual cost comparison bar */}
          <div className="mt-5 space-y-2.5">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#1c508d]">最小费用 · 多元 Huffman 树</span>
                <span className="font-mono tabular-nums text-[#1c508d]">199 (33.6%)</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded border-2 border-[#25262a] bg-[#f4f1e9]">
                <div className="h-full bg-[#2f79c3]" style={{width: '33.6%'}} />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#a62824]">最大费用 · 二叉链式合并树</span>
                <span className="font-mono tabular-nums text-[#a62824]">593 (100%)</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded border-2 border-[#25262a] bg-[#f4f1e9]">
                <div className="h-full bg-[#e74636]" style={{width: '100%'}} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Module Navigation Grid */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-extrabold text-[#25262a]">
            六大核心实验台
          </h2>
          <span className="text-xs font-semibold text-[#53535a]">
            全部计算在浏览器本地完成 · 全程 BigInt 精确计算
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              id: 'lab' as PageRoute,
              title: '01. 双策略算法实验室',
              desc: '左侧最小费用小根堆与右侧最大费用大根堆同步拼装，联动优先队列与伪代码逐行高亮。',
              icon: FlaskConical,
              accent: 'bg-[#e74636]',
            },
            {
              id: 'tree' as PageRoute,
              title: '02. 多元 Huffman 积木树',
              desc: '将合并过程映射为可缩放、可点击的乐高树，验证 WPL = 内部节点之和，切换补零教学视图。',
              icon: GitBranch,
              accent: 'bg-[#2f79c3]',
            },
            {
              id: 'challenge' as PageRoute,
              title: '03. 课堂互动积木挑战',
              desc: '亲手挑选合法数量积木挑战 199 或 593，兼容多最优路径，精准定位偏离步。',
              icon: Gamepad2,
              accent: 'bg-[#f6c823] text-[#2b271e]',
            },
            {
              id: 'strategy' as PageRoute,
              title: '04. 贪心策略研究室',
              desc: '7 种合并策略横向对比，小规模记忆化穷举验证，一键自动搜索“朴素最小 k 堆”反例。',
              icon: Sliders,
              accent: 'bg-[#35925b]',
            },
            {
              id: 'benchmark' as PageRoute,
              title: '05. 真实性能基准测试',
              desc: 'Web Worker 隔离运行纯 O(n log n) 算法，实测 n-耗时、k-费用及分布影响并导出 CSV。',
              icon: BarChart3,
              accent: 'bg-[#2f79c3]',
            },
            {
              id: 'docs' as PageRoute,
              title: '06. 严谨算法百科与源码',
              desc: '19 节 KaTeX 数学推导（交换论证、补零等价、最大费用证明）及可下载 C++/TS 源码。',
              icon: BookOpen,
              accent: 'bg-[#e74636]',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className="lego-panel group flex flex-col justify-between p-5 text-left transition-transform hover:-translate-y-1 cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[#25262a] text-white ${item.accent}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <ArrowRight className="h-4 w-4 text-[#53535a] transition-transform group-hover:translate-x-1" />
                  </div>
                  <h3 className="mt-4 text-base font-extrabold text-[#25262a]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-6 text-[#53535a]">
                    {item.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Course & Team Info Footer Card */}
      <section className="lego-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="space-y-1">
          <h3 className="text-sm font-extrabold text-[#25262a]">
            关于课程展示与系列延续
          </h3>
          <p className="text-xs leading-6 text-[#53535a]">
            湖南大学信息科学与工程学院《算法设计与分析》小班展示作品 · 延续 LEGO BatchLab 原创乐高积木视觉体系。
            所有积木元素均由代码原创绘制，不包含任何未经授权的第三方商标素材。
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono font-semibold text-[#53535a]">
          <span>纯静态前端</span>
          <span aria-hidden="true">·</span>
          <span>O(n log n) 引擎</span>
          <span aria-hidden="true">·</span>
          <span>GitHub Pages 就绪</span>
        </div>
      </section>
    </div>
  );
};
