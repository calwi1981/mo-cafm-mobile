let lastSyncAt: number | null = null;
let dirty = false;

export function markSynced() {
  lastSyncAt = Date.now();
  dirty = false;
}

export function markDirty() {
  dirty = true;
}

export function getSyncRed(): boolean {
  if (dirty) return true;
  if (!lastSyncAt) return true;

  const ageMs = Date.now() - lastSyncAt;
  return ageMs > (2 * 60 * 60 * 1000);
}

export function getLastSyncAt(): number | null {
  return lastSyncAt;
}
