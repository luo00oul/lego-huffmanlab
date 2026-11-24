import React, {useState} from 'react';
import {CodeBlock} from '../components/lego/CodeBlock';
import {MathFormula} from '../components/lego/MathFormula';

const CPP_SOURCE = `#include <algorithm>
#include <cstdint>
#include <fstream>
#include <functional>
#include <iostream>
#include <queue>
#include <string>
#include <vector>

#ifdef __SIZEOF_INT128__
using i128 = __int128_t;
#else
using i128 = long long;
#endif

static std::string toStringI128(i128 value) {
    if (value == 0) return "0";
    std::string out;
    while (value > 0) {
        out.push_back(static_cast<char>('0' + static_cast<int>(value % 10)));
        value /= 10;
    }
    std::reverse(out.begin(), out.end());
    return out;
}

static i128 computeMinCost(const std::vector<i128>& weights, long long k) {
    const std::size_t n = weights.size();
    if (n <= 1) return 0;

    std::priority_queue<i128, std::vector<i128>, std::greater<i128>> minHeap(
        weights.begin(), weights.end()
    );

    i128 totalCost = 0;
    std::size_t r = static_cast<std::size_t>(
        2 + ((static_cast<long long>(n) - 2) % (k - 1))
    );
    r = std::min(r, n);

    i128 firstSum = 0;
    for (std::size_t i = 0; i < r; ++i) {
        firstSum += minHeap.top();
        minHeap.pop();
    }
    totalCost += firstSum;
    minHeap.push(firstSum);

    while (minHeap.size() > 1) {
        std::size_t count = std::min(static_cast<std::size_t>(k), minHeap.size());
        i128 merged = 0;
        for (std::size_t i = 0; i < count; ++i) {
            merged += minHeap.top();
            minHeap.pop();
        }
        totalCost += merged;
        minHeap.push(merged);
    }
    return totalCost;
}

static i128 computeMaxCost(const std::vector<i128>& weights) {
    if (weights.size() <= 1) return 0;
    std::priority_queue<i128> maxHeap(weights.begin(), weights.end());
    i128 totalCost = 0;
    while (maxHeap.size() > 1) {
        i128 a = maxHeap.top(); maxHeap.pop();
        i128 b = maxHeap.top(); maxHeap.pop();
        i128 merged = a + b;
        totalCost += merged;
        maxHeap.push(merged);
    }
    return totalCost;
}

int main() {
    std::ifstream fin("input.txt");
    std::ofstream fout("output.txt");
    long long n, k;
    fin >> n >> k;
    std::vector<i128> w(n);
    for (long long i = 0; i < n; ++i) {
        long long x;
        fin >> x;
        w[i] = x;
    }
    fout << toStringI128(computeMaxCost(w)) << " "
         << toStringI128(computeMinCost(w, k)) << "\\n";
    return 0;
}`;

const TS_SOURCE = `// 纯算法核心：O(n log n) 时间，O(n) 空间，全程 BigInt 无损精度
export function computeFirstMergeCount(n: number, k: number): number {
  if (n <= 1) return 0;
  if (k >= n) return n;
  if (k <= 2) return 2;
  return 2 + ((n - 2) % (k - 1));
}

export function solveMinCostPure(weights: readonly bigint[], k: number): bigint {
  const n = weights.length;
  if (n <= 1) return 0n;
  const heap = new BigIntHeap(true, weights);
  let totalCost = 0n;

  // 首次合并 r 堆（不实际补零，避免 k >> n 时冗余开销）
  const r = Math.min(computeFirstMergeCount(n, k), heap.size);
  let firstSum = 0n;
  for (let i = 0; i < r; i++) firstSum += heap.pop();
  totalCost += firstSum;
  heap.push(firstSum);

  // 后续每轮稳定合并 k 堆
  while (heap.size > 1) {
    const take = Math.min(k, heap.size);
    let sum = 0n;
    for (let i = 0; i < take; i++) sum += heap.pop();
    totalCost += sum;
    heap.push(sum);
  }
  return totalCost;
}

export function solveMaxCostPure(weights: readonly bigint[]): bigint {
  if (weights.length <= 1) return 0n;
  const heap = new BigIntHeap(false, weights);
  let totalCost = 0n;
  while (heap.size > 1) {
    const sum = heap.pop() + heap.pop();
    totalCost += sum;
    heap.push(sum);
  }
  return totalCost;
}`;

const TOC_GROUPS = [
  {id: 'sec-problem', label: '1–2. 题意与贪心思想'},
  {id: 'sec-heap', label: '3–5. 优先队列与多元编码'},
  {id: 'sec-design', label: '6–7. 最小/最大算法设计'},
  {id: 'sec-proof', label: '8–12. 严格数学证明'},
  {id: 'sec-complexity', label: '13–16. 复杂度、边界与反例'},
  {id: 'sec-code', label: '17–19. 源码与样例下载'},
  {id: 'sec-script', label: '附录：课堂展示讲稿'},
];

export const DocumentationPage: React.FC = () => {
  const [activeAnchor, setActiveAnchor] = useState('sec-problem');

  const jumpTo = (id: string) => {
    setActiveAnchor(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({behavior: 'smooth', block: 'start'});
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Sticky Left Directory */}
      <aside className="lg:col-span-3">
        <div className="lego-panel sticky top-20 p-4">
          <h2 className="text-sm font-extrabold text-[#25262a]">
            算法百科目录（19 讲）
          </h2>
          <nav className="mt-3 space-y-1">
            {TOC_GROUPS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => jumpTo(item.id)}
                className={`block min-h-[38px] w-full rounded-md px-3 py-1.5 text-left text-xs font-bold transition-colors cursor-pointer ${
                  activeAnchor === item.id
                    ? 'bg-[#25262a] text-white'
                    : 'text-[#53535a] hover:bg-[#f4f1e9] hover:text-[#25262a]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Encyclopedia Content */}
      <article className="space-y-6 lg:col-span-9">
        {/* 1-2 */}
        <section id="sec-problem" className="lego-panel space-y-4 p-6">
          <h1 className="text-2xl font-extrabold text-[#25262a]">
            实现题 4-14：多元 Huffman 编码问题严谨讲义
          </h1>

          <div className="space-y-2">
            <h2 className="text-lg font-extrabold text-[#25262a]">
              01. 原始问题描述
            </h2>
            <p className="text-sm leading-7 text-[#53535a]">
              在一个操场的四周摆放着 <MathFormula tex="n" /> 堆石子，每堆石子数为正整数{' '}
              <MathFormula tex="w_1, w_2, \dots, w_n" />。现要将石子有次序地合并成一堆。规定每次
              <strong className="text-[#25262a]">至少选 2 堆、最多选 <MathFormula tex="k" /> 堆</strong>
              合并成新的一堆，本次合并的费用为新堆石子数。要求计算合并成一堆的
              <strong className="text-[#a62824]">最大总费用</strong>与
              <strong className="text-[#1c508d]">最小总费用</strong>。
              注意：本题允许<strong>任意选择</strong>石子堆（非相邻约束），因此属于全局集合归并问题，而非区间动态规划问题。
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-extrabold text-[#25262a]">
              02. 贪心算法核心思想与 WPL 映射
            </h2>
            <p className="text-sm leading-7 text-[#53535a]">
              任意合法的合并过程都唯一对应一棵有根树：原始 <MathFormula tex="n" /> 堆石子是叶子，每次把{' '}
              <MathFormula tex="c \in [2, k]" /> 堆合并成新堆对应生成一个拥有 <MathFormula tex="c" />{' '}
              个子节点的内部节点。若第 <MathFormula tex="i" /> 堆叶子在树中的深度为 <MathFormula tex="d_i" />，
              则它从下至上恰好被累加到 <MathFormula tex="d_i" /> 个祖先内部节点中，故：
            </p>
            <MathFormula
              display
              tex="\text{总合并费用} = \sum_{u \in \text{内部节点}} w(u) = \sum_{i=1}^{n} w_i d_i = \text{WPL}"
            />
            <p className="text-sm leading-7 text-[#53535a]">
              因此，<strong>最小总费用</strong>等价于最小化 <MathFormula tex="k" /> 叉树的带权路径长度（大权值浅放、小权值深放、尽量满{' '}
              <MathFormula tex="k" /> 叉压低树高）；<strong>最大总费用</strong>等价于最大化合并树的{' '}
              <MathFormula tex="\sum w_i d_i" />（每次仅合 2 堆拉高树高，并让大权值处于最深层）。
            </p>
          </div>
        </section>

        {/* 3-5 */}
        <section id="sec-heap" className="lego-panel space-y-4 p-6">
          <h2 className="text-lg font-extrabold text-[#25262a]">
            03. 优先队列与大小根堆
          </h2>
          <p className="text-sm leading-7 text-[#53535a]">
            为了在每一步快速取出当前权值最小或最大的若干堆并插回合并后的新堆，使用基于完全二叉树数组实现的
            <strong>二叉堆（Binary Heap）</strong>：建堆耗时 <MathFormula tex="O(n)" />，单次{' '}
            <code className="font-mono">push</code> 与 <code className="font-mono">pop</code> 均为{' '}
            <MathFormula tex="O(\log n)" />。最小费用维护<strong>小根堆</strong>，最大费用维护<strong>大根堆</strong>。
          </p>

          <h2 className="text-lg font-extrabold text-[#25262a]">
            04. 二元 Huffman 编码（<MathFormula tex="k = 2" />）
          </h2>
          <p className="text-sm leading-7 text-[#53535a]">
            当 <MathFormula tex="k = 2" /> 时，每次只能合并 2 堆，总计恰好进行 <MathFormula tex="n - 1" /> 次合并。
            为左右分支分别标记字符 <code className="font-mono">0</code> 和 <code className="font-mono">1</code>，
            从根到各叶子的路径即构成最优二元前缀码（任意码字都不是另一码字的前缀）。
          </p>

          <h2 className="text-lg font-extrabold text-[#25262a]">
            05. 多元 Huffman 编码（<MathFormula tex="k \ge 2" />）
          </h2>
          <p className="text-sm leading-7 text-[#53535a]">
            推广至 <MathFormula tex="k" /> 进制字母表 <MathFormula tex="\{0, 1, \dots, k-1\}" /> 时，
            每合并一次 <MathFormula tex="k" /> 个节点，森林中节点总数减少 <MathFormula tex="k - 1" />。
            要使最终恰好归并为一棵<strong>满 <MathFormula tex="k" /> 叉树</strong>（根节点与所有中间节点均满度，不浪费浅层槽位），
            叶子总数 <MathFormula tex="N" /> 必须满足同余条件：
          </p>
          <MathFormula display tex="(N - 1) \bmod (k - 1) = 0" />
        </section>

        {/* 6-7 */}
        <section id="sec-design" className="lego-panel space-y-4 p-6">
          <h2 className="text-lg font-extrabold text-[#25262a]">
            06. 最小费用算法设计（不实际补零的首次调整法）
          </h2>
          <p className="text-sm leading-7 text-[#53535a]">
            若直接向堆中补充 <MathFormula tex="m" /> 个零权值虚节点，当 <MathFormula tex="k \gg n" />（例如{' '}
            <MathFormula tex="n = 5, k = 10^6" />）时会平白插入近百万个无效零节点。注意到所有零权值虚节点必在<strong>第 1 轮</strong>全部被弹出，
            且不贡献任何合并费用，因此可以直接跳过补零，仅在 <MathFormula tex="n > 1" /> 时调整首轮合并堆数为：
          </p>
          <MathFormula display tex="r = 2 + (n - 2) \bmod (k - 1)" />
          <p className="text-sm leading-7 text-[#53535a]">
            验证：首轮合并 <MathFormula tex="r" /> 堆后剩余 <MathFormula tex="n - r + 1" /> 堆，满足{' '}
            <MathFormula tex="(n - r + 1) - 1 = (n - 2) - ((n - 2)\bmod(k-1)) \equiv 0 \pmod{k-1}" />，
            此后每轮严格合并最小的 <MathFormula tex="k" /> 堆直至剩 1 堆；当 <MathFormula tex="k \ge n" /> 时直接一步合并全部{' '}
            <MathFormula tex="n" /> 堆（<MathFormula tex="r = n" />）。
          </p>

          <h2 className="text-lg font-extrabold text-[#25262a]">
            07. 最大费用算法设计（大根堆二元链）
          </h2>
          <p className="text-sm leading-7 text-[#53535a]">
            无论题目给出的 <MathFormula tex="k" /> 有多大，只要 <MathFormula tex="n > 1" />，求最大总费用时每轮都
            <strong>仅从大根堆弹出最大的 2 堆</strong>合并并压回，共执行 <MathFormula tex="n - 1" /> 轮。
            生成的是一棵左/右退化的<strong>二叉链式最大费用合并树</strong>（注意：它不是压缩意义上的 Huffman 树）。
          </p>
        </section>

        {/* 8-12 Rigorous Proofs */}
        <section id="sec-proof" className="lego-panel space-y-4 p-6">
          <h2 className="text-lg font-extrabold text-[#25262a]">
            08–10. 最小费用的贪心选择性质、最优子结构与交换论证
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-[#53535a]">
            <li>
              <strong className="text-[#25262a]">最优子结构（Optimal Substructure）：</strong>
              若在最优满 <MathFormula tex="k" /> 叉树 <MathFormula tex="T^*" /> 中将某最深内部节点{' '}
              <MathFormula tex="u" />（其子节点为 <MathFormula tex="c_1,\dots,c_k" />，权值和{' '}
              <MathFormula tex="W_u" />）收缩为单叶节点 <MathFormula tex="u'" /> 得到树 <MathFormula tex="T'" />，
              则 <MathFormula tex="\text{WPL}(T^*) = \text{WPL}(T') + W_u" />。若 <MathFormula tex="T'" />{' '}
              不是子问题的最优解，替换后将导出比 <MathFormula tex="T^*" /> 更优的树，矛盾。
            </li>
            <li>
              <strong className="text-[#25262a]">贪心选择性质与交换论证（Exchange Argument）：</strong>
              设补齐虚拟零节点后所有叶子按权值升序排列为 <MathFormula tex="w_1 \le w_2 \le \dots \le w_N" />。
              在任意最优满 <MathFormula tex="k" /> 叉树 <MathFormula tex="T^*" /> 中，取深度最大（<MathFormula tex="d_{\max}" />）
              的一个内部节点 <MathFormula tex="u" />，它恰有 <MathFormula tex="k" /> 个同深度兄弟叶节点{' '}
              <MathFormula tex="a_1, \dots, a_k" />。将最小的 <MathFormula tex="k" /> 个权值{' '}
              <MathFormula tex="w_1, \dots, w_k" /> 逐一与 <MathFormula tex="a_1, \dots, a_k" /> 交换位置。
              每次交换（设 <MathFormula tex="w_j \le a_j" /> 且原深度 <MathFormula tex="d(w_j) \le d_{\max}" />）引起的 WPL 变化为：
              <MathFormula
                display
                tex="\Delta \text{WPL} = (w_j - a_j)(d_{\max} - d(w_j)) \le 0"
              />
              因此存在一棵最优树，其最深内部节点的 <MathFormula tex="k" /> 个子节点恰好就是当前最小的{' '}
              <MathFormula tex="k" /> 个节点！
            </li>
          </ul>

          <h2 className="text-lg font-extrabold text-[#25262a]">
            11. 虚拟节点补零原理与等价性证明
          </h2>
          <p className="text-sm leading-7 text-[#53535a]">
            需补充的零权值虚拟节点数为：
          </p>
          <MathFormula
            display
            tex="m = \big((k - 1) - (n - 1) \bmod (k - 1)\big) \bmod (k - 1)"
          />
          <p className="text-sm leading-7 text-[#53535a]">
            因为所有正权值都大于 0，补入的 <MathFormula tex="m" /> 个零权值节点必然位于升序最前端，与最小的{' '}
            <MathFormula tex="k - m = r" /> 个真实节点在最深层一同合并，且{' '}
            <MathFormula tex="0 \cdot d_{\max} = 0" /> 不改变任何一轮合并费用与最终 WPL。
          </p>

          <h2 className="text-lg font-extrabold text-[#25262a]">
            12. 最大费用算法的严格两步证明
          </h2>
          <div className="space-y-2 rounded-lg border border-[#25262a]/20 bg-[#f7f4ec] p-4 text-sm leading-7 text-[#25262a]">
            <p>
              <strong>引理 1（多堆合并必可拆分为更优的二元合并）：</strong>
              假设某合法方案中存在一次同时合并 <MathFormula tex="c \ge 3" /> 堆（权值{' '}
              <MathFormula tex="x_1, x_2, \dots, x_c > 0" />），其单步费用为{' '}
              <MathFormula tex="S = \sum_{j=1}^{c} x_j" />。若改为先合并 <MathFormula tex="x_1, x_2" />，
              再依次与 <MathFormula tex="x_3, \dots, x_c" /> 二元合并，最终同样得到权值为 <MathFormula tex="S" /> 的单一新堆（不影响后续任何步骤），
              但该局部总费用变为：
            </p>
            <MathFormula
              display
              tex="(x_1+x_2) + (x_1+x_2+x_3) + \dots + S > S \quad (\text{因 } c \ge 3, x_j > 0)"
            />
            <p>
              反复应用引理 1，任意合法方案总可严格增大费用直至所有合并均为<strong>二元合并</strong>。
              故最大总费用必定能由某棵二叉树实现。
            </p>
            <p>
              <strong>引理 2（二元合并的最大值必由每次合最大 2 堆取得）：</strong>
              对含 <MathFormula tex="n" /> 个叶子的任意二元合并树，其叶子深度降序重排 <MathFormula tex="d_{(1)} \ge d_{(2)} \ge \dots \ge d_{(n)}" />{' '}
              满足：深度最高的两个叶子至少共享一个父亲，且每层至少消耗 1 个节点，故对所有{' '}
              <MathFormula tex="j = 1, \dots, n-1" /> 均有上界：
            </p>
            <MathFormula
              display
              tex="d_{(1)} \le n-1,\quad d_{(2)} \le n-1,\quad d_{(3)} \le n-2,\ \dots,\ d_{(n)} \le 1"
            />
            <p>
              由<strong>排序不等式</strong>，当权值降序排列 <MathFormula tex="w_{(1)} \ge w_{(2)} \ge \dots \ge w_{(n)}" /> 时，
              <MathFormula tex="\sum w_i d_i" /> 的理论最大上界为：
            </p>
            <MathFormula
              display
              tex="w_{(1)}(n-1) + w_{(2)}(n-1) + w_{(3)}(n-2) + \dots + w_{(n)}\cdot 1"
            />
            <p>
              而<strong>大根堆每次合并最大 2 堆</strong>生成的正是深度序列恰好取等{' '}
              <MathFormula tex="(n-1, n-1, n-2, \dots, 1)" /> 的二叉链！因为最大 2 堆合并后的新堆权值{' '}
              <MathFormula tex="w_{(1)} + w_{(2)}" /> 严格大于其余任意堆，它必在下一轮继续与{' '}
              <MathFormula tex="w_{(3)}" /> 合并，如此递推精确达到理论最大值。证毕。
            </p>
          </div>
        </section>

        {/* 13-16 Complexity, Edge Cases, Counterexamples */}
        <section id="sec-complexity" className="lego-panel space-y-4 p-6">
          <h2 className="text-lg font-extrabold text-[#25262a]">
            13. 时间复杂度分析：<MathFormula tex="O(n \log n)" />
          </h2>
          <p className="text-sm leading-7 text-[#53535a]">
            建堆耗时 <MathFormula tex="O(n)" />。最大费用算法共执行 <MathFormula tex="n - 1" /> 轮，每轮 2 次{' '}
            <code className="font-mono">pop</code> 与 1 次 <code className="font-mono">push</code>；
            最小费用算法每轮净减少 <MathFormula tex="k - 1" /> 堆，最多执行{' '}
            <MathFormula tex="\lceil (n-1)/(k-1) \rceil" /> 轮，整个过程总计最多弹出{' '}
            <MathFormula tex="n + \lceil (n-1)/(k-1) \rceil \le 2n" /> 次、压入最多 <MathFormula tex="n" /> 次。
            每次堆操作耗时 <MathFormula tex="O(\log n)" />，因此总时间复杂度严格为{' '}
            <MathFormula tex="O(n \log n)" />（与 <MathFormula tex="k" /> 无关！）。
          </p>

          <h2 className="text-lg font-extrabold text-[#25262a]">
            14. 空间复杂度分析（纯算法 vs 可视化历史）
          </h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-7 text-[#53535a]">
            <li>
              <strong className="text-[#25262a]">纯算法空间复杂度：<MathFormula tex="O(n)" />。</strong>
              优先队列中元素个数单调递减，始终不超过初始堆数 <MathFormula tex="n" />（因采用首轮调整法，不插入多余虚拟零节点）。
            </li>
            <li>
              <strong className="text-[#25262a]">网站可视化追踪空间：</strong>
              为了支持实验室任意步回退与堆状态回放，轨迹构建器仅在小规模（<MathFormula tex="n \le 120" />）下保存每步堆快照，
              而性能分析模块直接调用无快照纯引擎，避免 <MathFormula tex="O(n^2)" /> 内存占用污染实测。
            </li>
          </ul>

          <h2 className="text-lg font-extrabold text-[#25262a]">
            15–16. 边界条件、溢出防护与常见错误反例
          </h2>
          <div className="grid grid-cols-1 gap-3 text-xs leading-6 md:grid-cols-2">
            <div className="rounded-lg border border-[#25262a]/20 bg-[#f7f4ec] p-3.5">
              <strong className="text-[#25262a]">必须覆盖的边界条件</strong>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[#53535a]">
                <li><code className="font-mono">n = 1</code>：0 次合并，最大与最小费用均为 0。</li>
                <li><code className="font-mono">k = 2</code>：退化为经典二元 Huffman。</li>
                <li><code className="font-mono">k ≥ n</code>：最小费用 1 步全合并，最大费用仍需 <code className="font-mono">n-1</code> 步。</li>
                <li>全同/重复权值：节点必须绑定唯一 ID，避免动画键冲突。</li>
                <li>数值溢出：C++ 使用 <code className="font-mono">__int128</code>，TS 从文本解析起全程 <code className="font-mono">BigInt</code>。</li>
              </ul>
            </div>
            <div className="rounded-lg border border-[#a62824]/40 bg-[#fdf0ee] p-3.5">
              <strong className="text-[#a62824]">两大经典错误反例</strong>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[#25262a]">
                <li>
                  <strong>错误 1（最小费用直接合 k 堆）：</strong>
                  <code className="font-mono">n=4, k=3, [1,2,3,4]</code> → 朴素法 <code className="font-mono">(1+2+3)+(6+4)=16</code>，
                  正确首轮调为 2 堆得 <code className="font-mono">(1+2)+(3+3+4)=13</code>。
                </li>
                <li>
                  <strong>错误 2（最大费用直接合 k 堆）：</strong>
                  <code className="font-mono">n=4, k=3, [1,2,3,4]</code> → 合并最大 3 堆 <code className="font-mono">(4+3+2)+(9+1)=19</code>，
                  而正确二元合并得 <code className="font-mono">(4+3)+(7+2)+(9+1)=26</code>。
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 17-19 Source Code & Sample Files */}
        <section id="sec-code" className="lego-panel space-y-5 p-6">
          <h2 className="text-lg font-extrabold text-[#25262a]">
            17. 完整 C++17 源代码（含 128 位防溢出保护）
          </h2>
          <CodeBlock
            code={CPP_SOURCE}
            language="cpp"
            filename="main.cpp"
            title="C++17 · O(n log n)"
          />

          <h2 className="text-lg font-extrabold text-[#25262a]">
            18. TypeScript 核心引擎源码（全程 BigInt）
          </h2>
          <CodeBlock
            code={TS_SOURCE}
            language="ts"
            filename="huffman-core.ts"
            title="TypeScript · 纯计算核心"
          />

          <h2 className="text-lg font-extrabold text-[#25262a]">
            19. 标准输入输出文件示例
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CodeBlock
              code={`7 3\n45 13 12 16 9 5 22\n`}
              language="text"
              filename="input.txt"
              title="题目官方输入样例"
            />
            <CodeBlock
              code={`593 199\n`}
              language="text"
              filename="output.txt"
              title="最大费用 593 · 最小费用 199"
            />
          </div>
        </section>

        {/* Classroom Presentation Script */}
        <section id="sec-script" className="lego-panel space-y-4 p-6">
          <h2 className="text-lg font-extrabold text-[#25262a]">
            附录：5 至 10 分钟课堂展示标准讲稿
          </h2>
          <p className="text-xs text-[#53535a]">
            提示：点击页面右上角「演示模式」后，可随时展开悬浮「讲稿提词卡」边演示边对照。
          </p>
          <ol className="space-y-3 text-sm leading-7 text-[#25262a]">
            <li>
              <strong>【0:00–1:20 题意引入（积木工坊）】</strong>
              各位老师、同学大家好！我们今天展示的是《算法设计与分析》实现题 4-14——多元 Huffman 编码问题。
              题目给定 n 堆石子，允许<strong>任意选取 2 到 k 堆</strong>合并，费用为新堆石子数，求最大和最小总费用。
              和大家熟悉的“相邻石子合并”不同，本题不限制相邻，因此可以用贪心算法在 O(n log n) 内求得精确解。
              请看经典样例 7 堆石子、k=3：最小总费用是 199，最大总费用高达 593。
            </li>
            <li>
              <strong>【1:20–3:30 双策略对比（算法实验室）】</strong>
              进入「算法实验室」，左侧用小根堆求最小费用，右侧用大根堆求最大费用。点击同步播放：
              左侧优先把最小的 5、9、12 拼成 26，再把 13、16、22 拼成 51，最后才把最大的 45 合并进去，仅 3 轮就完成，费用 199；
              而右侧坚持每轮只挑最大的 2 块积木滚雪球，45 参与了全部 6 轮合并，总费用达到 593。
            </li>
            <li>
              <strong>【3:30–5:00 树与 WPL（积木树）】</strong>
              切换到「积木树」，每一轮合并都会长出一个父积木节点。容易发现，第 i 堆石子在合并过程中被加了几次，
              就等于它在树里的深度 d_i，因此总合并费用严格等于带权路径长度 WPL = Σ w_i d_i = 所有内部节点权值之和。
              特别说明：最小费用对应最优 k 叉 Huffman 树，而最大费用对应的是二叉链式最大费用合并树。
            </li>
            <li>
              <strong>【5:00–6:40 易错反例与首轮调整（策略研究）】</strong>
              很多同学第一直觉会想：“最小费用每次直接合并最小的 k 堆不就行了吗？”
              我们在「策略研究」载入反例 n=4, k=3, [1,2,3,4]：直接合 3 堆得到 16，但先合 1+2=3，再合 3+3+4=10 总费用只有 13！
              原因是满 k 叉树要求 (n-1) mod (k-1) = 0；通过补零或等价地调整首次合并堆数 r = 2 + (n-2) mod (k-1)，
              既保证根节点满 k 叉，又避免了 k 远大于 n 时插入大量无用零节点。
            </li>
            <li>
              <strong>【6:40–8:20 最大费用证明与课堂互动（积木挑战）】</strong>
              至于最大费用为什么绝不能一次合 3 堆：把任意一次 c≥3 堆合并拆成连续二元合并，中间和会被多算，费用严格增大；
              再由排序不等式，大权值必须配最大深度，大根堆每次合最大 2 堆恰达理论上界。
              下面邀请一位同学上台在「积木挑战」里亲手拼出 199 或 593！
            </li>
            <li>
              <strong>【8:20–9:30 性能实测与总结（性能分析）】</strong>
              最后在「性能分析」中，我们在 Web Worker 中实测了不同 n、k 与分布的纯算法耗时，曲线贴合 O(n log n)，
              并且全程使用 BigInt / C++ __int128 杜绝大数溢出。我们的展示到此结束，欢迎老师和同学提问！
            </li>
          </ol>
        </section>
      </article>
    </div>
  );
};
