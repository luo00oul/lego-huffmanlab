# 🧱 LEGO HuffmanLab

**Build with Bricks. Think with Algorithms.**

用搭乐高的方式，看懂多元 Huffman 贪心算法。

一个融合乐高积木视觉设计、交互式算法可视化、贪心策略研究与真实性能测试的算法学习实验平台。

[在线体验](https://luo00oul.github.io/lego-huffmanlab/) · [源代码](https://github.com/luo00oul/lego-huffmanlab) · [系列项目 LEGO BatchLab](https://github.com/luo00oul/lego-batchlab) · [构建状态](https://github.com/luo00oul/lego-huffmanlab/actions)

---

## 📖 项目简介

LEGO HuffmanLab 是一个面向算法学习者的交互式教学与实验平台，围绕多元 Huffman 编码及石子合并问题展开。

项目延续 LEGO BatchLab 的积木视觉设计理念，将抽象的算法执行过程转化为直观的积木拼装过程，让学习者能够观察、操作、验证和理解算法，而不仅仅是阅读代码或记忆结论。

在这里，你可以：

- 观察贪心算法的每一步决策。
- 理解小根堆、大根堆与 Huffman 树之间的联系。
- 亲手选择积木，挑战最优合并策略。
- 通过反例与穷举验证探索贪心算法的适用边界。
- 通过真实性能测试理解算法复杂度。

整个项目采用纯前端架构，核心计算在浏览器本地完成，无需后端服务器、数据库或外部 AI API。

---

## 🎮 在线体验

访问地址：[LEGO HuffmanLab](https://luo00oul.github.io/lego-huffmanlab/)

无需安装、无需注册，打开浏览器即可使用。

支持桌面电脑、平板、触摸屏及课堂投影等使用场景。

---

## ✨ 核心功能

| 功能模块 | 功能介绍 |
| --- | --- |
| 🧱 积木工坊 | 乐高拼装动画、问题介绍与最大最小费用直觉对比 |
| ⚙️ 算法实验室 | 双策略动态演示、优先队列、单步执行、历史回退与伪代码高亮 |
| 🌳 Huffman 积木树 | 动态树形结构、节点检视、编码展示、WPL 计算与虚拟零节点 |
| 🎮 积木挑战 | 自主选择合并节点、挑战最优解、操作撤销与策略提示 |
| 🔬 贪心策略研究室 | 七种合并策略对比、记忆化穷举验证与自动反例搜索 |
| 📊 性能分析 | 真实算法耗时测试、交互式图表、数据分布研究与 CSV 导出 |
| 📚 算法百科 | 算法原理、数学推导、正确性证明、复杂度分析与参考源码 |
| 🖥️ 演示模式 | 全屏展示、键盘快捷键、触屏操作与课堂讲稿 |

---

## 🧩 算法问题

### 多元 Huffman 编码问题

给定 $n$ 堆石子，每次可以任意选择至少 2 堆、至多 $k$ 堆石子进行合并。

每次合并的费用等于新石子堆的重量。

目标是计算所有石子最终合并为一堆时的：

- 最大总合并费用。
- 最小总合并费用。

石子堆可以任意选择，不要求相邻。

### 示例

输入：

```text
7 3
45 13 12 16 9 5 22
```

输出：

```text
593 199
```

同一组输入数据，仅改变合并策略，总费用便会产生显著差异。

| 合并目标 | 核心数据结构 | 最优总费用 |
| --- | --- | ---: |
| 最小费用 | 小根堆 | 199 |
| 最大费用 | 大根堆 | 593 |

---

## 🧠 核心算法

### 1. 最小费用：多元 Huffman 贪心

不同于普通二元 Huffman 算法，多元合并需要考虑首次合并的节点数量。

当 $n>1$ 时，首次合并数量为：

$$
r=2+(n-2)\bmod(k-1)
$$

算法流程：

1. 将全部石子堆加入小根堆。
2. 首次取出权值最小的 $r$ 个节点进行合并。
3. 此后每次取出权值最小的 $k$ 个节点进行合并。
4. 将新节点重新加入小根堆。
5. 重复上述操作，直到仅剩一个节点。

该方法等价于经典多元 Huffman 算法中的虚拟零节点补齐策略，但无需实际创建额外的零权值节点。

补零数量为：

$$
m=((k-1)-(n-1)\bmod(k-1))\bmod(k-1)
$$

### 2. 最大费用：逆向贪心

为了使总合并费用最大，每次选择权值最大的两个节点进行合并。

使用大根堆维护当前所有节点，使较大的权值能够反复参与后续合并，从而形成最大费用的二叉链式结构。

### 3. 合并费用与带权路径长度

合并过程可以表示为一棵树，其总合并费用满足：

$$
C=\sum_{i=1}^{n}w_i d_i
$$

其中：

- $w_i$ 为第 $i$ 个叶子节点的权值。
- $d_i$ 为对应叶子节点的深度。

因此：

$$
\text{Total Cost}=\text{WPL}
$$

这一关系建立了石子合并问题与 Huffman 编码之间的数学联系。

### 4. 算法复杂度

| 算法 | 时间复杂度 | 辅助空间复杂度 |
| --- | --- | --- |
| 多元 Huffman 最小费用 | $O(n\log n)$ | $O(n)$ |
| 大根堆最大费用 | $O(n\log n)$ | $O(n)$ |

上述复杂度针对纯堆算法，以整数运算为单位成本，不包含动画轨迹存储、页面渲染与大整数运算的额外开销。

---

## 🔬 不只是算法可视化

### 反例驱动的算法学习

看似合理的贪心策略，并不一定能够得到全局最优解。

例如：

```text
n = 4
k = 3
weights = [1, 2, 3, 4]
```

直接合并最小的三个节点：

```text
1 + 2 + 3 = 6
4 + 6 = 10

Total Cost = 16
```

采用正确的首次合并调整策略：

```text
1 + 2 = 3
3 + 3 + 4 = 10

Total Cost = 13
```

LEGO HuffmanLab 内置自动反例搜索器与小规模记忆化穷举引擎，用于比较不同策略的结果。

通过这种方式，学习者不仅可以知道算法如何运行，还可以理解为什么某些策略会失败。

### 真实的性能实验

性能分析模块通过 Web Workers 执行独立的算法计算，避免动画渲染干扰算法计时。

支持：

- 不同输入规模的运行时间测试。
- 不同 $k$ 值对合并费用的影响分析。
- 多种算法策略的性能对比。
- 均匀、偏态、指数及相同权值分布。
- 固定随机种子与多轮实验。
- CSV 实验数据导出。

实验结果来源于浏览器实际运行数据，而非预设的模拟曲线。

---

## 🏗️ 工程设计

### 算法与可视化解耦

独立维护纯算法计算引擎与可视化轨迹生成器，使算法计算、动画播放、树形展示和性能分析拥有清晰的职责边界。

### 大整数精度

TypeScript 核心计算使用原生 `BigInt`，避免超过 JavaScript 安全整数范围时发生精度丢失。

C++17 参考实现则在编译器支持的情况下使用 `__int128_t` 扩大整数表示范围。

### 并行计算

通过 Web Workers 隔离穷举验证、反例搜索及大规模性能实验，降低计算任务对页面交互的影响。

### 自动化质量保障

项目包含 Vitest 自动化测试，覆盖：

- 经典输入输出样例。
- 边界条件与非法输入。
- 大整数计算。
- 120 组随机穷举交叉验证。
- 虚拟补零与首次调整策略的等价性。
- 不同最优合并路径的正确性。
- 自动反例搜索。

GitHub Actions 自动执行类型检查、单元测试、生产构建及网站部署。

---

## 🛠️ 技术栈

| 技术 | 用途 |
| --- | --- |
| React 19 | 交互式前端界面 |
| TypeScript | 类型安全与算法实现 |
| Vite 8 | 前端开发与构建 |
| Tailwind CSS 4 | 响应式布局与视觉设计 |
| Motion | 积木拼装动画 |
| Lucide React | 界面图标 |
| Apache ECharts | 交互式数据可视化 |
| KaTeX | 数学公式渲染 |
| Web Workers | 独立计算任务 |
| Vitest | 自动化单元测试 |
| Bun | 依赖管理与脚本执行 |
| GitHub Actions | 持续集成与自动部署 |
| GitHub Pages | 静态网站托管 |

---

## 🚀 快速开始

### 环境要求

- Node.js 22.12 或更高版本
- Bun
- Git

### 克隆项目

```bash
git clone https://github.com/luo00oul/lego-huffmanlab.git
cd lego-huffmanlab
```

### 安装依赖

```bash
bun install
```

### 启动开发服务器

```bash
bun run dev
```

默认访问地址：

```text
http://localhost:3000
```

### 运行测试

```bash
bun run test
```

### TypeScript 类型检查

```bash
bun run lint
```

### 构建生产版本

```bash
bun run build
```

构建产物将输出至 `dist/` 目录。

### 预览生产版本

```bash
bun run preview
```

---

## 💻 C++ 参考实现

项目同时提供独立于前端网站的 C++17 算法参考实现。

```bash
g++ -std=c++17 -O2 cpp/main.cpp -o huffman
```

运行程序：

```bash
./huffman cpp/input.txt result.txt
```

验证输出：

```bash
diff -u cpp/output.txt result.txt
```

预期输出：

```text
593 199
```

---

## 📁 项目结构

```text
lego-huffmanlab/
├── .github/
│   └── workflows/
│       └── pages.yml
├── cpp/
│   ├── main.cpp
│   ├── input.txt
│   └── output.txt
├── docs/
│   └── presentation-script.md
├── public/
├── src/
│   ├── algorithms/       # 算法核心与模拟轨迹
│   ├── components/       # 积木与公共组件
│   ├── hooks/            # 状态管理与交互逻辑
│   ├── pages/            # 功能页面
│   ├── types/            # TypeScript 类型定义
│   ├── visualizations/   # 树形结构与图表
│   └── workers/          # 独立计算任务
├── tests/
│   └── algorithms.test.ts
├── bun.lock
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🌐 自动化部署

项目使用 GitHub Actions 与 GitHub Pages 实现持续集成和静态网站部署。

```text
Push to main
     ↓
Install Dependencies
     ↓
TypeScript Check
     ↓
Vitest Tests
     ↓
Production Build
     ↓
Deploy to GitHub Pages
```

在仓库的 `Settings → Pages` 中，将部署来源设置为 `GitHub Actions`，即可通过内置工作流完成自动构建与部署。

---

## 🖥️ 演示模式

为课堂讲解、算法教学及项目展示提供独立的演示模式。

| 快捷键 | 操作 |
| --- | --- |
| `Space` | 播放 / 暂停 |
| `←` | 上一步 |
| `→` | 下一步 |
| `R` | 重置演示 |
| `S` | 载入经典样例 |
| `F` | 全屏 |
| `Esc` | 退出演示模式 |

所有核心演示操作同时提供触屏按钮，兼容平板及其他触摸设备。

---

## 🧱 LEGO Algorithm Lab 系列

LEGO Algorithm Lab 是一个以积木视觉语言探索计算机算法的系列实验项目。

| 项目 | 主题 | 在线体验 |
| --- | --- | --- |
| [LEGO BatchLab](https://github.com/luo00oul/lego-batchlab) | 批处理调度算法 | [Visit](https://luo00oul.github.io/lego-batchlab/) |
| [LEGO HuffmanLab](https://github.com/luo00oul/lego-huffmanlab) | 多元 Huffman 与贪心算法 | [Visit](https://luo00oul.github.io/lego-huffmanlab/) |

系列项目致力于将抽象的算法思想转化为可以观察、操作、探索和验证的交互式学习体验。

---

## 🤝 反馈与贡献

欢迎通过 GitHub Issues 提出：

- 算法正确性问题。
- 可视化与交互体验建议。
- 性能优化方案。
- 文档改进建议。
- 新的算法实验与教学场景。

[提交 Issue](https://github.com/luo00oul/lego-huffmanlab/issues)

---

## 免责声明

本项目为独立开发的非官方算法教学实验项目，与 LEGO Group 不存在官方合作、授权或关联关系。

项目中的积木、底板与角色形象采用代码几何绘制，仅用于算法可视化与学习展示。

---

**Build with Bricks. Think with Algorithms.**

让算法不再只是代码，而是可以亲手搭建的思想。



---

## 👥 小组成员与项目分工

| 姓名 | 职责 | 主要工作 |
| --- | --- | --- |
| **罗瑞恒** | 项目架构与开发 | 项目统筹、系统架构、核心功能开发、功能集成与网站部署 |
| **张思怡** | 前端开发与视觉设计 | 乐高主题设计、页面布局、交互动画与响应式适配 |
| **左佳豪** | 核心算法与可视化 | 多元 Huffman 算法、优先队列、树形可视化与 C++ 参考实现 |
| **周若涵** | 功能测试与技术文档 | 算法验证、反例测试、性能分析与项目文档编写 |
| **汪林波** | 课堂讲解 | 问题背景、贪心策略、算法原理及正确性证明 |
| **冉晨洋** | 课堂讲解 | 网站演示、算法执行过程、反例分析及性能实验 |

---
