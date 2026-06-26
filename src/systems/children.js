import { clamp } from "./scoring.js";

const CHILD_NAMES = ["Ari", "Mika", "Sol", "Noa", "Remy", "Jules"];

export function createPendingKid(worldY, random = Math.random, unexpected = false) {
  return {
    id: `pending-${worldY}-${Math.floor(random() * 10000)}`,
    dueAt: worldY + 220 + random() * 180,
    unexpected,
    notified: false
  };
}

export function createChild(index, roadCenter, worldY, random = Math.random) {
  return {
    id: `child-${index}-${worldY}`,
    name: CHILD_NAMES[index % CHILD_NAMES.length],
    x: roadCenter + (random() - 0.5) * 120,
    yOffset: 76 + index * 56,
    velocity: (random() - 0.5) * 0.35,
    age: 0,
    stability: 82,
    independence: 0.08,
    curiosity: 0.68 + random() * 0.4,
    caution: 0.24 + random() * 0.34,
    peerBias: random() > 0.5 ? 1 : -1,
    interestX: roadCenter,
    interestLabel: "road",
    offRoadNoticeAt: 0,
    influenceCooldown: 0,
    leaving: false
  };
}

export function updateChild(child, parent, stage, roadCenter, roadWidth, inputInfluence, dt, context = {}) {
  child.age += dt * 0.72;
  child.independence = clamp(child.age / 19, 0.08, 1);

  const visibleObjects = context.visibleObjects ?? [];
  const siblings = context.siblings ?? [];
  const childWorldY = context.childWorldY ?? 0;
  const safeRadius = roadWidth * 0.48;
  let targetX = roadCenter;
  let targetLabel = "road";
  let targetScore = -Infinity;

  for (const object of visibleObjects) {
    if (object.collected) continue;
    const distanceY = Math.abs(object.y - childWorldY);
    if (distanceY > 520) continue;
    const good = (object.delta?.stability ?? 0) + (object.delta?.purpose ?? 0) + (object.delta?.resources ?? 0) > 0;
    const risky = object.outside || object.risk > child.caution || (object.delta?.stability ?? 0) < 0;
    const novelty = child.curiosity * (risky ? 1.75 : 0.95);
    const cautionPenalty = child.caution * (risky ? 0.48 : 0.1);
    const closeness = 1 - distanceY / 520;
    const score = novelty + closeness - cautionPenalty + (good ? 0.12 : 0);
    if (score > targetScore) {
      targetScore = score;
      targetX = object.x;
      targetLabel = risky ? "risk" : "spark";
    }
  }

  let peerPull = 0;
  for (const sibling of siblings) {
    if (sibling.id === child.id) continue;
    const closeness = Math.max(0, 1 - Math.abs(sibling.x - child.x) / Math.max(1, roadWidth));
    peerPull += Math.sign(sibling.x - child.x) * closeness * child.independence * 0.12;
  }
  peerPull += Math.sin(child.age * 2.1 + child.yOffset) * child.independence * child.curiosity * 0.08;

  const parentPull = Math.sign(parent.x - child.x) * (1 - child.independence) * 0.13;
  const roadPull = Math.sign(roadCenter - child.x) * (0.08 + (1 - child.independence) * 0.13);
  const targetPull = Math.sign(targetX - child.x) * (0.08 + child.independence * child.curiosity * 0.22);
  const playerInfluence = inputInfluence * Math.max(0.1, 1 - child.independence) * 0.06;

  child.velocity += parentPull + roadPull + targetPull + peerPull + playerInfluence;
  child.velocity *= 0.925;
  child.x += child.velocity * dt * 72;
  child.interestX = targetX;
  child.interestLabel = targetLabel;

  const distance = Math.abs(child.x - roadCenter);
  const offRoad = distance > safeRadius;
  const conflict = Math.abs(parent.x - child.x) > roadWidth * 0.38 && child.independence > 0.38;
  const riskyTarget = targetLabel === "risk";
  child.stability = clamp(child.stability + (offRoad ? -0.24 : 0.025) * dt * 60 + (conflict ? -0.04 : 0) + (riskyTarget ? -0.015 * dt * 60 : 0));
  child.leaving = child.age > 19;

  return { offRoad, conflict, targetLabel, targetX };
}

export function childMeter(children) {
  if (!children.length) return 100;
  return children.reduce((sum, child) => sum + child.stability, 0) / children.length;
}
