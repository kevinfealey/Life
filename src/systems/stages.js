export const STAGES = [
  {
    id: "early-childhood",
    name: "Early Childhood",
    startAge: 0,
    endAge: 6,
    control: 0.34,
    parentGuardrail: 0.86,
    freedom: 18,
    pressure: 0.24,
    risk: 0.34,
    objectiveRate: 0.6,
    eventRate: 0.5,
    lesson: "Dependence"
  },
  {
    id: "school-age",
    name: "School Age",
    startAge: 6,
    endAge: 13,
    control: 0.5,
    parentGuardrail: 0.72,
    freedom: 32,
    pressure: 0.38,
    risk: 0.46,
    objectiveRate: 0.75,
    eventRate: 0.7,
    lesson: "Belonging"
  },
  {
    id: "teen-years",
    name: "Teen Years",
    startAge: 13,
    endAge: 19,
    control: 0.68,
    parentGuardrail: 0.48,
    freedom: 56,
    pressure: 0.56,
    risk: 0.72,
    objectiveRate: 0.9,
    eventRate: 0.95,
    lesson: "Freedom feels like conflict"
  },
  {
    id: "young-adult",
    name: "Young Adult",
    startAge: 19,
    endAge: 30,
    control: 0.86,
    parentGuardrail: 0.18,
    freedom: 78,
    pressure: 0.72,
    risk: 0.82,
    objectiveRate: 1.1,
    eventRate: 1.05,
    lesson: "Choices compound"
  },
  {
    id: "adult-pressure",
    name: "Adult Pressure",
    startAge: 30,
    endAge: 38,
    control: 0.95,
    parentGuardrail: 0.05,
    freedom: 70,
    pressure: 0.96,
    risk: 0.9,
    objectiveRate: 1.35,
    eventRate: 1.25,
    lesson: "Survival requires systems"
  },
  {
    id: "parenthood",
    name: "Parenthood",
    startAge: 38,
    endAge: 58,
    control: 0.92,
    parentGuardrail: 0.02,
    freedom: 58,
    pressure: 1.15,
    risk: 0.92,
    objectiveRate: 1.45,
    eventRate: 1.35,
    lesson: "Control becomes influence"
  },
  {
    id: "later-life",
    name: "Later Life",
    startAge: 58,
    endAge: 80,
    control: 0.78,
    parentGuardrail: 0,
    freedom: 66,
    pressure: 0.7,
    risk: 0.74,
    objectiveRate: 0.95,
    eventRate: 0.8,
    lesson: "Legacy is what you helped make possible"
  }
];

export function getStage(age) {
  if (!Number.isFinite(age)) return STAGES[0];
  return STAGES.find((stage) => age >= stage.startAge && age < stage.endAge) ?? STAGES[STAGES.length - 1];
}

export function getStageProgress(age, stage) {
  const span = Math.max(1, stage.endAge - stage.startAge);
  return Math.max(0, Math.min(1, (age - stage.startAge) / span));
}
