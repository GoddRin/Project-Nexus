/**
 * Where water runs on a height grid (P03a): depressions filled (priority flood), each cell drained
 * to its lowest of eight neighbours, and the area draining through each cell counted. Used to find
 * the river and the side gullies from the elevation model, so they follow the real ground.
 */

export type FlowGrid = {
  n: number;
  /** Heights with every depression filled so water can leave by the edge. */
  filled: Float32Array;
  /** Index of the cell each cell drains to, -1 at the edge. */
  down: Int32Array;
  /** Cells draining through each cell, itself included. */
  area: Float32Array;
};

/** A binary heap of cell indices keyed by height. */
class Heap {
  private keys: Float64Array;
  private ids: Int32Array;
  size = 0;
  constructor(capacity: number) {
    this.keys = new Float64Array(capacity);
    this.ids = new Int32Array(capacity);
  }
  push(id: number, key: number) {
    let i = this.size++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= key) break;
      this.keys[i] = this.keys[p];
      this.ids[i] = this.ids[p];
      i = p;
    }
    this.keys[i] = key;
    this.ids[i] = id;
  }
  pop(): number {
    const top = this.ids[0];
    const key = this.keys[--this.size];
    const id = this.ids[this.size];
    let i = 0;
    for (;;) {
      let c = i * 2 + 1;
      if (c >= this.size) break;
      if (c + 1 < this.size && this.keys[c + 1] < this.keys[c]) c++;
      if (this.keys[c] >= key) break;
      this.keys[i] = this.keys[c];
      this.ids[i] = this.ids[c];
      i = c;
    }
    this.keys[i] = key;
    this.ids[i] = id;
    return top;
  }
}

/** `h` is n x n, row by row. */
export function computeFlow(h: Float32Array, n: number): FlowGrid {
  const filled = new Float32Array(h);
  const done = new Uint8Array(n * n);
  const heap = new Heap(n * n);
  for (let i = 0; i < n; i++)
    for (const c of [i, (n - 1) * n + i, i * n, i * n + n - 1]) {
      if (done[c]) continue;
      done[c] = 1;
      heap.push(c, filled[c]);
    }
  const down = new Int32Array(n * n).fill(-1);
  // priority flood: every cell is reached from the lowest open neighbour, which is where it drains
  // (raised a hair above it, so flat filled areas still drain one way)
  while (heap.size) {
    const c = heap.pop();
    const cx = c % n;
    const cz = (c / n) | 0;
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const x = cx + dx;
        const z = cz + dz;
        if (x < 0 || z < 0 || x >= n || z >= n) continue;
        const k = z * n + x;
        if (done[k]) continue;
        done[k] = 1;
        if (filled[k] <= filled[c]) filled[k] = filled[c] + 1e-3;
        down[k] = c;
        heap.push(k, filled[k]);
      }
  }
  // drain area: visit cells from the highest down, handing each one's area to its outlet
  const order = Array.from({ length: n * n }, (_, i) => i).sort((a, b) => filled[b] - filled[a]);
  const area = new Float32Array(n * n).fill(1);
  for (const c of order) if (down[c] >= 0) area[down[c]] += area[c];
  return { n, filled, down, area };
}

/** The path water takes from a cell to the edge, as cell indices. */
export function traceDown(flow: FlowGrid, start: number): number[] {
  const path = [start];
  let c = start;
  while (flow.down[c] >= 0 && path.length < flow.n * 4) {
    c = flow.down[c];
    path.push(c);
  }
  return path;
}
