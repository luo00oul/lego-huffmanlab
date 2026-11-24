# LEGO HuffmanLab · 乐高多元 Huffman 算法实验室

面向湖南大学计算机科学与技术专业《算法设计与分析》小班展示的交互式算法实验平台，对应教材 **实现题 4-14：多元 Huffman 编码问题**。本项目延续上一期 [LEGO BatchLab](https://github.com/luo00oul/lego-batchlab) 的原创乐高积木视觉体系，将贪心算法、优先队列、多元 Huffman 树、反例证伪、真实性能压测与课堂展示模式融为一体。

- **预期线上地址**：`https://luo00oul.github.io/lego-huffmanlab/`
- **默认官方样例**：`n = 7, k = 3, weights = [45, 13, 12, 16, 9, 5, 22]` → **输出 `593 199`**

> 说明：网站中所有乐高积木、底板与工程师小人均为纯代码原创几何绘制，不含未经授权的官方标志或素材；全部核心算法均在本地浏览器运行，无后端、数据库或外部 API 依赖。

---

## 一、原始算法题目

**实现题 4-14：多元 Huffman 编码问题**

在一个操场的四周摆放着 $n$ 堆石子。现要将石子有次序地合并成一堆。规定每次**至少选 2 堆、最多选 $k$ 堆**石子合并成新的一堆，合并的费用为新的一堆的石子数。设计一个算法，计算出将 $n$ 堆石子合并成一堆的最大总费用和最小总费用（允许任意选择石子堆，不要求相邻）。

- 输入样例 (`cpp/input.txt`)：
  ```text
  7 3
  45 13 12 16 9 5 22
  ```
- 输出样例 (`cpp/output.txt`)：
  ```text
  593 199
  ```

---

## 二、七大核心功能模块与课堂展示模式

1. **积木工坊（Workshop）**：自动拼装开场动画、原始题目、最大/最小费用直觉对比与课程信息。
2. **算法实验室（Algorithm Lab）**：左侧小根堆（最小费用）与右侧大根堆（最大费用）双策略对比；支持选块高亮→移入拼装台→吸附生成新块三阶段动画，联动优先队列、历史跳转与伪代码高亮；支持同步/独立播放、`input.txt` 导入与 `output.txt` 导出。
3. **Huffman Tree 积木树**：动态生长的多元 Huffman 树与最大费用二叉链式合并树；支持缩放平移、节点检视、$k$ 进制编码展示、WPL 逐步核对表，以及「首次调整（不补零）」与「补零满 $k$ 叉（自动折叠超多虚零）」双视图切换。
4. **积木挑战（Challenge）**：面向课堂现场互动的手动点击合并挑战，支持最小/最大费用双目标、撤销、贪心提示、星级评分，并**严格兼容所有等价最优路径**（绝不误判非标准顺序但费用相同的最优方案）。
5. **贪心策略研究室（Strategy Lab）**：7 种合并策略横向对比，内建 Web Worker 记忆化穷举验证（$n \le 8$ 安全上限）与**自动反例搜索器**（可视化对比 `n=4, k=3, [1,2,3,4]` 下 13 vs 16）。
6. **性能分析（Benchmark）**：Web Worker 隔离调用纯 $O(n \log n)$ / $O(n)$ 空间无快照引擎，真实记录 $n$-耗时、$k$-最小费用、多策略对比及分布影响 4 组交互式乐高图表并支持 CSV 导出。
7. **算法百科（Documentation）**：19 讲大学课程级中文讲义（KaTeX 公式、交换论证、补零等价、最大费用两步证明、边界条件、可复制下载的 C++17 / TypeScript 源码及 5–10 分钟课堂讲稿）。
8. **课堂展示模式（Presentation Mode）**：一键全屏大字投影、隐藏多余导航、支持键盘快捷键（`Space`、`←`/`→`、`R`、`S`、`F`、`Esc`）且所有操作均有大尺寸触屏按钮与可展开悬浮讲稿提词卡。

---

## 三、算法与工程严谨性

- **纯算法核心与动画事件流彻底解耦**：纯算法模块（`src/algorithms/core.ts`）仅维护一维 `BigIntHeap`，时间复杂度 $O(n \log n)$、空间复杂度 $O(n)$，直接服务于大规模性能测试；轨迹生成器（`src/algorithms/trace.ts`）专供可视化回放使用。
- **全程无损大整数精度**：TypeScript 从字符串解析到累加全程使用原生 `BigInt`（绝不先转 `Number` 导致 $2^{53}$ 以上丢精度）；C++17 使用 `__int128_t` 防止 64 位整数溢出。
- **首次调整公式避免无谓补零**：当 $n > 1$ 时首轮合并 $r = 2 + (n - 2) \bmod (k - 1)$ 堆，等价于补齐 $m = ((k - 1) - (n - 1) \bmod (k - 1)) \bmod (k - 1)$ 个零权值虚节点，避免 $k \gg n$ 时的无效节点开销。

---

## 四、技术栈

- **前端框架**：React 19 + TypeScript + Vite 8 + Tailwind CSS 4
- **动效与图标**：Motion (`motion/react`) + Lucide React
- **图表与公式**：Apache ECharts + KaTeX
- **并发与测试**：Web Workers + Vitest + C++17 (`g++`)
- **自动化部署**：GitHub Actions + GitHub Pages（`base: './'` + Hash 路由零 404）

---

## 五、本地运行与测试

```bash
# 1. 安装依赖
npm install

# 2. 启动本地开发服务器（默认 http://localhost:3000）
npm run dev

# 3. 运行 Vitest 单元测试与 120 组随机穷举交叉验证
npm test

# 4. TypeScript 静态类型检查
npm run lint

# 5. 构建生产静态产物
npm run build

# 6. 编译并验证 C++17 参考程序
g++ -std=c++17 -O2 cpp/main.cpp -o /tmp/huffman
/tmp/huffman cpp/input.txt /tmp/output.txt
diff -u cpp/output.txt /tmp/output.txt
```

---

## 六、GitHub Pages 发布指南

项目已内置 `.github/workflows/pages.yml`、`public/.nojekyll`、`vite.config.ts` (`base: './'`) 与 Hash 路由。创建独立仓库并发布仅需以下几步：

```bash
# 1. 在 GitHub 上新建空仓库：luo00oul/lego-huffmanlab
# 2. 在本地项目根目录初始化并推送至 main 分支
git init
git add .
git commit -m "feat: release LEGO HuffmanLab v1.0"
git branch -M main
git remote add origin https://github.com/luo00oul/lego-huffmanlab.git
git push -u origin main
```

3. 打开仓库页面 `Settings → Pages`，将 **Source** 设置为 **GitHub Actions**。
4. 等待 `Build and Deploy LEGO HuffmanLab to GitHub Pages` 工作流变绿后，即可访问：
   `https://luo00oul.github.io/lego-huffmanlab/`

---

## 七、项目目录结构

```text
lego-huffmanlab/
├── .github/workflows/pages.yml    # GitHub Pages 自动测试与部署
├── cpp/
│   ├── main.cpp                   # C++17 参考实现（__int128 防溢出）
│   ├── input.txt                  # 官方输入样例
│   └── output.txt                 # 官方输出样例 (593 199)
├── docs/
│   └── presentation-script.md     # 5-10 分钟课堂展示完整讲稿
├── public/
│   └── .nojekyll                  # 禁用 Jekyll 处理
├── src/
│   ├── algorithms/                # 纯算法引擎、二叉堆、BigInt 解析、穷举与轨迹
│   ├── components/                # 乐高积木、工程师小人、KaTeX 公式、代码框、演示条
│   ├── hooks/                     # 全局数据集上下文与 Hash 路由
│   ├── pages/                     # 七大核心功能页面
│   ├── types/                     # TypeScript 类型契约
│   ├── visualizations/            # SVG 交互式积木树画布与 ECharts 封装
│   └── workers/                   # Web Worker（穷举搜索、反例搜索、真实压测）
└── tests/
    └── algorithms.test.ts         # Vitest 单元测试与小规模随机穷举交叉验证
```

---

## 八、小组成员与分工（预留）

| 姓名 | 学号 | 负责模块 | 展示环节 |
| --- | --- | --- | --- |
| 成员 1（待填） | — | 算法设计与正确性证明 | 题意、贪心证明、反例剖析 |
| 成员 2（待填） | — | 前端工程与乐高可视化 | 算法实验室与积木树现场演示 |
| 成员 3（待填） | — | 交互挑战、性能实测与文档 | 课堂互动挑战与复杂度实测总结 |
