export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function createMeters() {
  return {
    stability: 82,
    resources: 58,
    freedom: 18,
    purpose: 12,
    guardrails: 18,
    childStability: 100
  };
}

export function applyMeterDelta(meters, delta) {
  for (const [key, value] of Object.entries(delta)) {
    if (key in meters) {
      meters[key] = clamp(meters[key] + value);
    }
  }
}

export function calculatePurposeGain({ onRoad, objectiveHit, childCount, stage }) {
  let gain = onRoad ? 0.018 : -0.01;
  if (objectiveHit) gain += 1.6;
  if (childCount > 0 && stage.id === "parenthood") gain += 0.012 * childCount;
  return gain;
}

export function resourcePressureCost(stage, speed) {
  return 0.004 * stage.pressure * speed;
}

export function guardrailDamageReduction(meters) {
  return 0.25 + meters.guardrails / 160;
}
