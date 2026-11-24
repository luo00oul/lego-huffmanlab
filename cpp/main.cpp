#include <algorithm>
#include <cstdint>
#include <fstream>
#include <functional>
#include <iostream>
#include <queue>
#include <stdexcept>
#include <string>
#include <vector>

/**
 * 实现题 4-14：多元 Huffman 编码问题（石子任意合并最大/最小总费用）
 * 时间复杂度：O(n log n)
 * 空间复杂度：O(n)
 *
 * 使用 __int128（若平台支持）防止大规模输入下累加费用发生 64 位整数溢出。
 */

#ifdef __SIZEOF_INT128__
using i128 = __int128_t;
#else
using i128 = long long;
#endif

static std::string toStringI128(i128 value) {
    if (value == 0) return "0";
    bool neg = value < 0;
    if (neg) value = -value;
    std::string out;
    while (value > 0) {
        out.push_back(static_cast<char>('0' + static_cast<int>(value % 10)));
        value /= 10;
    }
    if (neg) out.push_back('-');
    std::reverse(out.begin(), out.end());
    return out;
}

static bool parsePositiveI128(const std::string& token, i128& out) {
    if (token.empty()) return false;
    i128 acc = 0;
    for (char c : token) {
        if (c < '0' || c > '9') return false;
        acc = acc * 10 + (c - '0');
    }
    if (acc <= 0) return false;
    out = acc;
    return true;
}

/**
 * 最小费用：多元 Huffman 贪心算法（不实际补零，调整首次合并数量）
 * 当 n > 1 时，首次合并数量 r = 2 + (n - 2) % (k - 1)，此后每次合并最小的 k 堆。
 */
static i128 computeMinCost(const std::vector<i128>& weights, long long k) {
    const std::size_t n = weights.size();
    if (n <= 1) return 0;

    std::priority_queue<i128, std::vector<i128>, std::greater<i128>> minHeap(
        weights.begin(), weights.end()
    );

    i128 totalCost = 0;
    std::size_t firstMergeCount =
        static_cast<std::size_t>(2 + ((static_cast<long long>(n) - 2) % (k - 1)));
    firstMergeCount = std::min(firstMergeCount, n);

    i128 firstSum = 0;
    for (std::size_t i = 0; i < firstMergeCount; ++i) {
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

/**
 * 最大费用：大根堆每次合并最大的 2 堆（退化为二叉链式合并树）
 */
static i128 computeMaxCost(const std::vector<i128>& weights) {
    const std::size_t n = weights.size();
    if (n <= 1) return 0;

    std::priority_queue<i128> maxHeap(weights.begin(), weights.end());
    i128 totalCost = 0;

    while (maxHeap.size() > 1) {
        i128 a = maxHeap.top();
        maxHeap.pop();
        i128 b = maxHeap.top();
        maxHeap.pop();
        i128 merged = a + b;
        totalCost += merged;
        maxHeap.push(merged);
    }

    return totalCost;
}

int main(int argc, char* argv[]) {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    std::string inputPath = (argc >= 2) ? argv[1] : "input.txt";
    std::string outputPath = (argc >= 3) ? argv[2] : "output.txt";

    std::ifstream fin(inputPath);
    if (!fin.is_open()) {
        std::cerr << "Error: cannot open input file: " << inputPath << "\n";
        return 1;
    }

    long long n = 0;
    long long k = 0;
    if (!(fin >> n >> k) || n < 1 || k < 2) {
        std::cerr << "Error: invalid n or k (require n >= 1 and k >= 2)\n";
        return 1;
    }

    std::vector<i128> weights;
    weights.reserve(static_cast<std::size_t>(n));
    for (long long i = 0; i < n; ++i) {
        std::string tok;
        if (!(fin >> tok)) {
            std::cerr << "Error: insufficient stone pile weights\n";
            return 1;
        }
        i128 w = 0;
        if (!parsePositiveI128(tok, w)) {
            std::cerr << "Error: weight must be a positive integer: " << tok << "\n";
            return 1;
        }
        weights.push_back(w);
    }

    i128 maxCost = computeMaxCost(weights);
    i128 minCost = computeMinCost(weights, k);

    std::ofstream fout(outputPath);
    if (!fout.is_open()) {
        std::cerr << "Error: cannot open output file: " << outputPath << "\n";
        return 1;
    }

    fout << toStringI128(maxCost) << " " << toStringI128(minCost) << "\n";
    std::cout << toStringI128(maxCost) << " " << toStringI128(minCost) << "\n";
    return 0;
}
