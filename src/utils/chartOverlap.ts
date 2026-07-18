export const OFFSET_FRACTION = 0.04;

export function displayDataKey(key: string): string {
  return `__display_${key}`;
}

type OverlapPoint = Record<string, string | number | null>;

function hasConsecutiveCollision(points: OverlapPoint[], keyA: string, keyB: string): boolean {
  let consecutive = 0;
  for (const point of points) {
    const a = point[keyA];
    const b = point[keyB];
    if (a !== null && a !== undefined && b !== null && b !== undefined && a === b) {
      consecutive += 1;
      if (consecutive >= 2) return true;
    } else {
      consecutive = 0;
    }
  }
  return false;
}

export function assignRenderOffsets(
  keys: string[],
  points: OverlapPoint[],
  domainSpan: number,
): Map<string, number> {
  const step = OFFSET_FRACTION * domainSpan;
  const offsets = new Map<string, number>();

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    let offset = 0;
    for (let j = 0; j < i; j++) {
      if (hasConsecutiveCollision(points, key, keys[j])) {
        offset = (offsets.get(keys[j]) ?? 0) + step;
        break;
      }
    }
    offsets.set(key, offset);
  }

  return offsets;
}

export function buildDisplayRows(
  rows: OverlapPoint[],
  keys: string[],
  offsets: Map<string, number>,
): OverlapPoint[] {
  return rows.map((row) => {
    const displayRow: OverlapPoint = { ...row };
    for (const key of keys) {
      const value = row[key];
      const offset = offsets.get(key) ?? 0;
      displayRow[displayDataKey(key)] =
        value !== null && value !== undefined ? Number(value) + offset : null;
    }
    return displayRow;
  });
}
