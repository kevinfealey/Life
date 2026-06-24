import { clamp } from "./scoring.js";

const CHILD_NAMES = ["Ari", "Mika", "Sol", "Noa", "Remy", "Jules"];

export function createPendingKid(worldY, random = Math.random, unexpected = false) {
  return {
    id: `pending-${worldY}-${Math.floor(random() * 10000)}`,
    dueAt: worldY + 900 + random() * 800,
    unexpected,
    notified: false
  };
}

export function createChild(index, roadCenter, worldY, random = Math.random) {
  return {
    id: `child-${index}-${worldY}`,
    name: CHILD_NAMES[index % CHILD_NAMES.length],
    x: roadCenter + (random() - 0.5) * 120,
    yOffset: 220 + index * 90,
    velocity: (random() - 0.5) * 0.35,
    age: 0,
    stability: 82,
    independence: 0.08,
    influenceCooldown: 0,
    leaving: false
  };
}

export function updateChild(child, parent, stage, roadCenter, roadWidth, inputInfluence, dt) {
  child.age += dt * 0.34;
  child.independence = clamp(child.age / 19, 0.08, 1);

  const parentPull = Math.sign(parent.x - child.x) * (1 - child.independence) * 0.16;
  const roadPull = Math.sign(roadCenter - child.x) * (0.15 + (1 - child.independence) * 0.16);
  const siblingDrift = Math.sin((child.age + child.yOffset) * 0.8) * child.independence * 0.035;
  child.velocity += parentPull + roadPull + inputInfluence * (1 - child.independence) * 0.04 + siblingDrift;
  child.velocity *= 0.94;
  child.x += child.velocity * dt * 58;

  const distance = Math.abs(child.x - roadCenter);
  const offRoad = distance > roadWidth * 0.48;
  const conflict = Math.abs(parent.x - child.x) > roadWidth * 0.42 && child.independence > 0.45;
  child.stability = clamp(child.stability + (offRoad ? -0.08 : 0.025) * dt * 60 + (conflict ? -0.018 : 0));
  child.leaving = child.age > 19;

  return { offRoad, conflict };
}

export function childMeter(children) {
  if (!children.length) return 100;
  return children.reduce((sum, child) => sum + child.stability, 0) / children.length;
}
