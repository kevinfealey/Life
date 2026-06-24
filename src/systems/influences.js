const INFLUENCE_TYPES = [
  {
    id: "parent",
    label: "Parent",
    icon: "P",
    color: "#4c78a8",
    force: 1.25,
    duration: 7,
    effect: { stability: 3, freedom: -1 },
    effectLabel: "+stability, -freedom",
    message: "A parent corrects your course. It helps, but it also constrains."
  },
  {
    id: "friend",
    label: "Friend",
    icon: "F",
    color: "#59a14f",
    force: 0.95,
    duration: 5,
    effect: { stability: 3, purpose: 1 },
    effectLabel: "+stability",
    message: "A friend helps you find your lane."
  },
  {
    id: "bad-influence",
    label: "Peer Pull",
    icon: "!",
    color: "#d65f5f",
    force: -1.1,
    duration: 5,
    effect: { stability: -4, freedom: 2 },
    effectLabel: "risk: -stability",
    message: "A peer pulls toward the shoulder."
  },
  {
    id: "sibling",
    label: "Sibling",
    icon: "S",
    color: "#b279a2",
    force: 0.7,
    duration: 11,
    effect: { purpose: 2, stability: 1 },
    effectLabel: "long pull",
    message: "A sibling changes the rhythm for a long stretch."
  },
  {
    id: "mentor",
    label: "Mentor",
    icon: "M",
    color: "#f28e2b",
    force: 1.25,
    duration: 8,
    effect: { purpose: 4, stability: 2 },
    effectLabel: "+purpose",
    message: "A mentor makes the road easier to read."
  }
];

export function createInfluence(stage, roadCenter, worldY, random = Math.random) {
  const childStage = stage.id === "early-childhood" || stage.id === "school-age";
  const teenStage = stage.id === "teen-years";
  const pool = childStage
    ? ["parent", "friend", "bad-influence", "sibling"]
    : teenStage
      ? ["parent", "friend", "bad-influence", "mentor"]
      : ["friend", "bad-influence", "mentor"];
  const type = INFLUENCE_TYPES.find((item) => item.id === pool[Math.floor(random() * pool.length)]);
  const side = random() > 0.5 ? 1 : -1;
  return {
    ...type,
    id: `${type.id}-${worldY}-${Math.floor(random() * 10000)}`,
    x: roadCenter + side * (70 + random() * 150),
    y: worldY,
    side,
    age: 0,
    active: false,
    applied: false
  };
}

export function influencePush(influence, playerX, roadCenter) {
  const distance = Math.max(42, Math.abs(influence.x - playerX));
  const towardRoad = Math.sign(roadCenter - playerX) || 1;
  const towardInfluence = Math.sign(influence.x - playerX) || influence.side;
  const direction = influence.force >= 0 ? towardRoad : towardInfluence;
  const strength = Math.min(1.7, 120 / distance);
  return direction * Math.abs(influence.force) * strength;
}
