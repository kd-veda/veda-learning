/**
 * Dynamic Time Warping for aligning a student's pitch/timing trace against
 * the teacher's reference contour, so that a student who chants slightly
 * ahead/behind or slightly faster/slower than the reference is still scored
 * on *shape*, not penalised purely for not hitting a fixed clock.
 *
 * This module is generic (works on any numeric sequences representing a
 * time-varying quantity, e.g. pitch-in-cents-relative-to-target); scoring.ts
 * decides how to turn the resulting alignment + cost into a score.
 */

export interface DtwResult {
  /** Total accumulated cost along the optimal path (lower = better match). */
  cost: number;
  /** Cost normalised by path length, comparable across attempts of different lengths. */
  normalisedCost: number;
  /** Index pairs (referenceIndex, studentIndex) describing the optimal alignment path, in order. */
  path: Array<[number, number]>;
  /** 0..1 confidence that the alignment is meaningful (low if either sequence is mostly gaps). */
  alignmentConfidence: number;
}

/**
 * Runs DTW between a reference sequence and a student sequence. `null`
 * entries (unvoiced/no-data frames) are allowed and are assigned a fixed
 * gap penalty rather than being compared numerically, so a brief dropout
 * doesn't corrupt the whole alignment.
 */
export function dynamicTimeWarp(
  reference: Array<number | null>,
  student: Array<number | null>,
  options: { gapPenalty?: number } = {}
): DtwResult {
  const gapPenalty = options.gapPenalty ?? 80; // ~80 cents, deliberately larger than the "red" band

  const n = reference.length;
  const m = student.length;

  if (n === 0 || m === 0) {
    return { cost: 0, normalisedCost: 0, path: [], alignmentConfidence: 0 };
  }

  // costMatrix[i][j] = best cumulative cost aligning reference[0..i) with student[0..j)
  const costMatrix: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(Infinity));
  costMatrix[0][0] = 0;

  const localCost = (i: number, j: number): number => {
    const r = reference[i];
    const s = student[j];
    if (r === null || s === null) return gapPenalty;
    return Math.abs(r - s);
  };

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = localCost(i - 1, j - 1);
      const best = Math.min(costMatrix[i - 1][j], costMatrix[i][j - 1], costMatrix[i - 1][j - 1]);
      costMatrix[i][j] = cost + best;
    }
  }

  // Backtrack for the path.
  const path: Array<[number, number]> = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    path.push([i - 1, j - 1]);
    const diag = costMatrix[i - 1][j - 1];
    const up = costMatrix[i - 1][j];
    const left = costMatrix[i][j - 1];
    const min = Math.min(diag, up, left);
    if (min === diag) {
      i--;
      j--;
    } else if (min === up) {
      i--;
    } else {
      j--;
    }
  }
  path.reverse();

  const totalCost = costMatrix[n][m];
  const normalisedCost = path.length > 0 ? totalCost / path.length : 0;

  const nonGapSteps = path.filter(([ri, si]) => reference[ri] !== null && student[si] !== null).length;
  const alignmentConfidence = path.length > 0 ? nonGapSteps / path.length : 0;

  return { cost: totalCost, normalisedCost, path, alignmentConfidence };
}
