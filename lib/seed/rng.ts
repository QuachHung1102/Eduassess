// RNG tất định (mulberry32) — cùng seed cho cùng dãy. Dùng để seed tái lập.

export type Rng = {
  next(): number; // [0,1)
  int(min: number, max: number): number; // inclusive
  pick<T>(arr: readonly T[]): T;
  shuffle<T>(arr: readonly T[]): T[];
  bool(p?: number): boolean;
};

export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)];
  const shuffle = <T,>(arr: readonly T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const bool = (p = 0.5) => next() < p;
  return { next, int, pick, shuffle, bool };
}
