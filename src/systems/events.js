const EVENTS = [
  {
    name: "Big expense",
    stages: ["young-adult", "adult-pressure", "parenthood", "later-life"],
    message: "A large expense lands. Guardrails soften the hit.",
    delta: { resources: -16, stability: -7 },
    mitigatedBy: "guardrails"
  },
  {
    name: "Illness",
    stages: ["school-age", "teen-years", "young-adult", "adult-pressure", "parenthood", "later-life"],
    message: "Illness slows everything down for a while.",
    delta: { stability: -11, resources: -6, freedom: -4 },
    mitigatedBy: "support"
  },
  {
    name: "Job loss",
    stages: ["young-adult", "adult-pressure", "parenthood"],
    message: "Work disappears suddenly. Savings and community matter now.",
    delta: { resources: -20, stability: -12, freedom: 3 },
    mitigatedBy: "guardrails"
  },
  {
    name: "Burnout",
    stages: ["young-adult", "adult-pressure", "parenthood"],
    message: "Burnout makes precise choices harder.",
    delta: { stability: -15, purpose: -4, freedom: -3 },
    mitigatedBy: "habits"
  },
  {
    name: "Opportunity",
    stages: ["teen-years", "young-adult", "adult-pressure", "parenthood", "later-life"],
    message: "An opportunity appears off the safest line.",
    delta: { purpose: 8, freedom: 6, resources: -4 },
    mitigatedBy: null
  },
  {
    name: "Helpful mentor",
    stages: ["school-age", "teen-years", "young-adult", "adult-pressure"],
    message: "A mentor helps you convert risk into direction.",
    delta: { purpose: 7, stability: 5 },
    mitigatedBy: null
  },
  {
    name: "Aging parent",
    stages: ["adult-pressure", "parenthood", "later-life"],
    message: "An aging parent needs attention. Responsibility widens.",
    delta: { freedom: -7, purpose: 4, resources: -7 },
    mitigatedBy: "community"
  },
  {
    name: "Bad choice",
    stages: ["teen-years", "young-adult", "adult-pressure"],
    message: "A choice looked harmless. The cost arrives late.",
    delta: { stability: -12, resources: -8, freedom: 4 },
    mitigatedBy: "habits"
  }
];

const OBJECTIVES = [
  { label: "learn", delta: { purpose: 4, stability: 2 }, risk: 0.15 },
  { label: "connect", delta: { purpose: 5, freedom: -1 }, risk: 0.1 },
  { label: "save", delta: { resources: 9, freedom: -3, guardrails: 2 }, risk: 0.08 },
  { label: "rest", delta: { stability: 8, resources: -2 }, risk: 0.06 },
  { label: "stretch", delta: { purpose: 8, freedom: 6, stability: -3 }, risk: 0.42 },
  { label: "show up", delta: { purpose: 6, resources: -3, stability: 3 }, risk: 0.12 }
];

export function createEvent(stage, random = Math.random) {
  const options = EVENTS.filter((event) => event.stages.includes(stage.id));
  return options[Math.floor(random() * options.length)] ?? EVENTS[0];
}

export function createObjective(stage, roadCenter, worldY, random = Math.random) {
  const objective = OBJECTIVES[Math.floor(random() * OBJECTIVES.length)];
  const temptation = stage.id === "teen-years" || stage.id === "young-adult";
  const outside = temptation && random() < 0.4;
  const offset = outside ? (random() > 0.5 ? 1 : -1) * (190 + random() * 85) : (random() - 0.5) * 190;
  return {
    id: `objective-${worldY}-${Math.floor(random() * 10000)}`,
    ...objective,
    x: roadCenter + offset,
    y: worldY,
    outside,
    collected: false
  };
}

export function applyEventMitigation(event, meters) {
  const guardrailStrength = meters.guardrails / 100;
  const multiplier = event.mitigatedBy ? 1 - Math.min(0.58, guardrailStrength * 0.55) : 1;
  return Object.fromEntries(
    Object.entries(event.delta).map(([key, value]) => [key, value < 0 ? value * multiplier : value])
  );
}
