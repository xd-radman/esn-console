/**
 * mlApi.js — Organizer Retention Prediction Client (Placeholder Heuristic)
 * Isolates all ML inference calls behind a single async contract so Phase 6
 * can swap the local heuristic for a real Python FastAPI `POST /predict` call
 * without changing `PredictionSidebar.jsx`.
 */

// TODO: Replace with FastAPI POST /predict in Phase 6
export async function predictSessionOutcome({
  projectId,
  format = 'interactive',
  groupMix = 'balanced',
  comfort = 'high',
  groupSize = 28,
}) {
  // Simulate brief network latency so loading states are exercised before Phase 6
  await new Promise((resolve) => setTimeout(resolve, 360));

  let score = 50;
  const factors = [];

  // Format contribution
  if (format === 'interactive' || format === 'cultural') {
    score += 14;
    factors.push('interactiveFormat');
  } else if (format === 'workshop') {
    score += 7;
  } else {
    score += 4;
  }

  // Participant mix contribution
  if (groupMix === 'balanced') {
    score += 15;
    factors.push('balancedMix');
  } else {
    score -= 4;
    factors.push('skewedMixRisk');
  }

  // Comfort level contribution
  if (comfort === 'high') {
    score += 18;
    factors.push('highComfort');
  } else if (comfort === 'medium') {
    score += 4;
  } else {
    score -= 20;
    factors.push('lowComfortRisk');
  }

  // Group size sweet spot (15–45 participants)
  const size = Number(groupSize) || 0;
  if (size >= 15 && size <= 45) {
    score += 8;
    factors.push('optimalGroupSize');
  } else if (size > 60) {
    score -= 10;
    factors.push('largeGroupRisk');
  } else if (size > 0 && size < 12) {
    score -= 3;
    factors.push('smallGroupNote');
  }

  // Subtle project-type calibration
  if (projectId === 'buddy-system' && groupMix === 'balanced') {
    score += 4;
  } else if (projectId === 'istanbul-cultural-trip' && format === 'cultural') {
    score += 4;
  }

  const probability = Math.max(24, Math.min(96, Math.round(score)));

  let verdict = 'at_risk';
  if (probability >= 75) {
    verdict = 'high_retention';
  } else if (probability >= 52) {
    verdict = 'moderate_retention';
  }

  return {
    verdict,
    probability,
    topFactors: factors.slice(0, 3),
  };
}
