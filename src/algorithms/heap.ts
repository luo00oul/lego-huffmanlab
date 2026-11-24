/**
 * Generic Binary Heap (O(log n) push/pop, O(n) space)
 * Used for traceable simulations where items carry unique IDs.
 */
export class BinaryHeap<T> {
  private readonly data: T[] = [];
  private readonly compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number, initialItems?: readonly T[]) {
    this.compare = compare;
    if (initialItems && initialItems.length > 0) {
      this.data = [...initialItems];
      for (let i = Math.floor(this.data.length / 2) - 1; i >= 0; i--) {
        this.siftDown(i);
      }
    }
  }

  get size(): number {
    return this.data.length;
  }

  peek(): T | undefined {
    return this.data[0];
  }

  push(item: T): void {
    this.data.push(item);
    this.siftUp(this.data.length - 1);
  }

  pop(): T | undefined {
    const n = this.data.length;
    if (n === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (n > 1) {
      this.data[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  /** Returns a shallow copy of the internal heap-order array (for heap visualization). */
  toHeapArray(): T[] {
    return [...this.data];
  }

  /** Returns elements sorted by comparator without mutating the heap. */
  toSortedArray(): T[] {
    return [...this.data].sort(this.compare);
  }

  private siftUp(index: number): void {
    const data = this.data;
    const cmp = this.compare;
    let i = index;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (cmp(data[i], data[parent]) < 0) {
        const tmp = data[i];
        data[i] = data[parent];
        data[parent] = tmp;
        i = parent;
      } else {
        break;
      }
    }
  }

  private siftDown(index: number): void {
    const data = this.data;
    const cmp = this.compare;
    const n = data.length;
    let i = index;
    while (true) {
      const left = (i << 1) + 1;
      const right = left + 1;
      let best = i;
      if (left < n && cmp(data[left], data[best]) < 0) best = left;
      if (right < n && cmp(data[right], data[best]) < 0) best = right;
      if (best !== i) {
        const tmp = data[i];
        data[i] = data[best];
        data[best] = tmp;
        i = best;
      } else {
        break;
      }
    }
  }
}

/**
 * Specialized allocation-free BigInt Binary Heap for O(n) space pure computation & benchmarks.
 */
export class BigIntHeap {
  private readonly data: bigint[];
  private readonly isMin: boolean;

  constructor(isMin: boolean, initial?: readonly bigint[]) {
    this.isMin = isMin;
    this.data = initial ? [...initial] : [];
    if (this.data.length > 1) {
      for (let i = (this.data.length >> 1) - 1; i >= 0; i--) {
        this.siftDown(i);
      }
    }
  }

  get size(): number {
    return this.data.length;
  }

  push(val: bigint): void {
    this.data.push(val);
    this.siftUp(this.data.length - 1);
  }

  pop(): bigint {
    const n = this.data.length;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (n > 1) {
      this.data[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  private better(a: bigint, b: bigint): boolean {
    return this.isMin ? a < b : a > b;
  }

  private siftUp(index: number): void {
    const d = this.data;
    let i = index;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.better(d[i], d[p])) {
        const t = d[i];
        d[i] = d[p];
        d[p] = t;
        i = p;
      } else {
        break;
      }
    }
  }

  private siftDown(index: number): void {
    const d = this.data;
    const n = d.length;
    let i = index;
    while (true) {
      const l = (i << 1) + 1;
      const r = l + 1;
      let best = i;
      if (l < n && this.better(d[l], d[best])) best = l;
      if (r < n && this.better(d[r], d[best])) best = r;
      if (best !== i) {
        const t = d[i];
        d[i] = d[best];
        d[best] = t;
        i = best;
      } else {
        break;
      }
    }
  }
}
