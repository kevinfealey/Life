const INFLUENCE_TYPES = [
  {
    id: "parent",
    label: "Parent",
    color: "#4c78a8",
    force: 0.58,
    duration: 7,
    message: "A parent overcorrects, then steadies you."
  },
  {
    id: "friend",
    label: "Friend",
    color: "#59a14f",
    force: 0.34,
    duration: 5,
    message: "A friend helps you find your lane."
  },
  {
    id: "bad-influence",
    label: "Peer Pull",
    color: "#d65f5f",
    force: -0.46,
    duration: 5,
    message: "A peer pulls toward the shoulder."
  },
  {
    id: "sibling",
    label: "Sibling",
    color: "#b279a2",
    force: 0.22,
    duration: 11,
    message: "A sibling changes the rhythm for a long stretch."
  },
  {
    id: "mentor",
    label: "Mentor",
    color: "#f28e2b",
    force: 0.48,
    duration: 8,
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
    x: roadCenter + side * (70 + random() * 170),
    y: worldY,
    side,
    age: 0,
    active: false
  };
}

export function influencePush(influence, playerX, roadCenter) {
  const distance = Math.max(36, Math.abs(influence.x - playerX));
  const towardRoad = Math.sign(roadCenter - playerX) || 1;
  const towardInfluence = Math.sign(influence.x - playerX) || influence.side;
  const direction = influence.force >= 0 ? towardRoad : towardInfluence;
  return direction * Math.abs(influence.force) * (1 / (distance / 110));
}
