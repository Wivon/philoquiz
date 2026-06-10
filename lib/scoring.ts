/**
 * Kahoot-style scoring: a correct answer is worth more the faster it comes in.
 * Instant correct answer ≈ 1000 pts, just-in-time ≈ 500 pts, wrong = 0.
 */
export function computeScore(
  correct: boolean,
  timeLeftSeconds: number,
  durationSeconds: number,
): number {
  if (!correct) return 0;
  const ratio = Math.max(0, Math.min(1, timeLeftSeconds / durationSeconds));
  return Math.round(500 + 500 * ratio);
}
