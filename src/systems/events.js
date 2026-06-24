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
  { label: "Play", icon: "P", stages: ["early-childhood"], summary: "+stability +purpose", color: "#9fd3c7", delta: { stability: 5, purpose: 3 }, risk: 0.05 },
  { label: "School", icon: "?", stages: ["school-age", "teen-years"], summary: "+purpose +guardrails", color: "#7cc6e8", delta: { purpose: 5, guardrails: 2, freedom: -1 }, risk: 0.12 },
  { label: "Friends", icon: "F", stages: ["school-age", "teen-years"], summary: "+purpose risk", color: "#59a14f", delta: { purpose: 5, stability: -1, freedom: 2 }, risk: 0.24 },
  { label: "Rebel", icon: "!", stages: ["teen-years"], summary: "+freedom -stability", color: "#d65f5f", delta: { freedom: 8, stability: -7, purpose: 2 }, risk: 0.62 },
  { label: "Train", icon: "T", stages: ["young-adult", "adult-pressure"], summary: "+purpose -resources", color: "#7cc6e8", delta: { purpose: 7, resources: -5, guardrails: 1 }, risk: 0.22 },
  { label: "Rent", icon: "$", stages: ["young-adult", "adult-pressure"], summary: "+stability -resources", color: "#f2d264", delta: { stability: 5, resources: -7, freedom: -2 }, risk: 0.2 },
  { label: "Career", icon: "^", stages: ["young-adult", "adult-pressure"], summary: "+resources risk", color: "#f2a65a", delta: { resources: 9, purpose: 3, stability: -3 }, risk: 0.42 },
  { label: "System", icon: "G", stages: ["adult-pressure", "parenthood", "later-life"], summary: "+guardrails -freedom", color: "#70b77e", delta: { guardrails: 7, freedom: -4, stability: 2 }, risk: 0.1 },
  { label: "Child Care", icon: "K", stages: ["parenthood"], summary: "+kids -resources", color: "#9fd3c7", delta: { purpose: 7, resources: -6, freedom: -4, stability: 2 }, risk: 0.28 },
  { label: "Partner", icon: "@", stages: ["parenthood", "adult-pressure"], summary: "+purpose -freedom", color: "#d9c6ff", delta: { purpose: 6, freedom: -2, stability: 3 }, risk: 0.18 },
  { label: "Rest", icon: "Z", stages: ["young-adult", "adult-pressure", "parenthood", "later-life"], summary: "+stability", color: "#d9c6ff", delta: { stability: 8, resources: -2 }, risk: 0.06 },
  { label: "Legacy", icon: "L", stages: ["later-life"], summary: "+purpose +kids", color: "#f2d264", delta: { purpose: 10, stability: 2 }, risk: 0.08 }
];

export function createEvent(stage, random = Math.random) {
  const options = EVENTS.filter((event) => event.stages.includes(stage.id));
  return options[Math.min(options.length - 1, Math.floor(random() * options.length))] ?? EVENTS[0];
}

export function createObjective(stage, roadCenter, worldY, random = Math.random) {
  const options = OBJECTIVES.filter((objective) => objective.stages.includes(stage.id));
  const pool = options.length ? options : OBJECTIVES;
  const objective = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))] ?? OBJECTIVES[0];
  const temptation = stage.id === "teen-years" || stage.id === "young-adult";
  const outside = temptation && random() < 0.4;
  const offset = outside ? (random() > 0.5 ? 1 : -1) * (170 + random() * 70) : (random() - 0.5) * 165;
  return {
    id: `objective-${worldY}-${Math.floor(random() * 10000)}`,
    ...objective,
    x: roadCenter + offset,
    y: worldY,
    outside,
    collected: false,
    pulse: 0
  };
}

export function applyEventMitigation(event, meters) {
  const guardrailStrength = meters.guardrails / 100;
  const multiplier = event.mitigatedBy ? 1 - Math.min(0.58, guardrailStrength * 0.55) : 1;
  return Object.fromEntries(
    Object.entries(event.delta).map(([key, value]) => [key, value < 0 ? value * multiplier : value])
  );
}
