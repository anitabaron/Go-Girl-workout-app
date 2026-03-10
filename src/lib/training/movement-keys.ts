export const movementKeyValues = [
  "core_hold",
  "compression",
  "handstand_support",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "hip_hinge",
  "squat_pattern",
  "general_strength",
] as const;

export type MovementKey = (typeof movementKeyValues)[number];

export function inferMovementKey(params: {
  title?: string | null;
  part?: string | null;
}): MovementKey {
  const text = `${params.title ?? ""} ${params.part ?? ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/l-?sit|hollow|plank|support|core hold/.test(text)) return "core_hold";
  if (/compression|pike leg lift|knee raise|unoszen/.test(text)) return "compression";
  if (/handstand|wall lean|pike press|stack/.test(text)) return "handstand_support";
  if (/row|scap pull|horizontal pull/.test(text)) return "horizontal_pull";
  if (/pull[- ]?up|chin[- ]?up|active hang|dead hang|invert/.test(text)) {
    return "vertical_pull";
  }
  if (/press|push[- ]?up|dip/.test(text)) return "vertical_push";
  if (/hinge|rdl|deadlift|good morning/.test(text)) return "hip_hinge";
  if (/squat|lunge|split squat|leg/.test(text)) return "squat_pattern";
  return "general_strength";
}
