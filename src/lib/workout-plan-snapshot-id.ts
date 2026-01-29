import { randomUUID } from "node:crypto";

/**
 * Tworzy fabrykę funkcji getSnapshotId dla unikalnych snapshotów planu treningowego.
 * Snapshot jest identyfikowany przez exercise_title + exercise_type + exercise_part.
 * Ta sama kombinacja zwraca ten sam UUID w ramach jednej operacji.
 */
export function createSnapshotIdFactory(): (
  title: string | null | undefined,
  type: string | null | undefined,
  part: string | null | undefined,
) => string | null {
  const snapshotIdMap = new Map<string, string>();

  return (title, type, part) => {
    if (!title) {
      return null;
    }

    let typePart: string;
    if (type && part) {
      typePart = `|${type}|${part}`;
    } else if (type) {
      typePart = `|${type}|`;
    } else if (part) {
      typePart = `||${part}`;
    } else {
      typePart = "";
    }
    const snapshotKey = `${title}${typePart}`;

    let snapshotId = snapshotIdMap.get(snapshotKey);
    if (!snapshotId) {
      snapshotId = randomUUID();
      snapshotIdMap.set(snapshotKey, snapshotId);
    }

    return snapshotId;
  };
}
