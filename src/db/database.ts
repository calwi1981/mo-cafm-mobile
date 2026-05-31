export function initDb() {}

export function setSyncValue(_key: string, _value: string) {}

export function getSyncValue(_key: string): string | null {
  return null;
}

export function setDirty(_value: boolean) {}

export function isDirty(): boolean {
  return false;
}

export function setLastSyncNow() {}

export function getLastSyncAt(): string | null {
  return null;
}

export function cacheSites(_sites: any[]) {}

export function getCachedSites(): any[] {
  return [];
}

export function cacheTickets(_tickets: any[]) {}

export function getCachedTickets(_siteId: string): any[] {
  return [];
}

export function cacheChecklists(_runs: any[]) {}

export function getCachedChecklists(_siteId: string): any[] {
  return [];
}


export function setCurrentSiteId(_siteId: string) {}

export function getCurrentSiteId(): string | null {
  return null;
}

export function cacheTicketDetail(_ticketId: number, _detail: any) {}

export function getCachedTicketDetail(_ticketId: number): any | null {
  return null;
}

export function cacheChecklistDetail(_runId: number, _detail: any) {}

export function getCachedChecklistDetail(_runId: number): any | null {
  return null;
}

export function addQueueItem(_type: string, _payload: any) {}

export function getQueueItems(): any[] {
  return [];
}

export function removeQueueItem(_id: number) {}

export function getQueueCount(): number {
  return 0;
}
