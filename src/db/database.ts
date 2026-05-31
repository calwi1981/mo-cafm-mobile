let syncState: Record<string, string> = {};
let sites: Record<string, any> = {};
let tickets: Record<number, any> = {};
let checklists: Record<number, any> = {};
let ticketDetails: Record<number, any> = {};
let checklistDetails: Record<number, any> = {};
let queue: any[] = [];
let queueId = 1;

export function initDb() {}

export function setSyncValue(key: string, value: string) {
  syncState[key] = value;
}

export function getSyncValue(key: string): string | null {
  return syncState[key] ?? null;
}

export function setDirty(value: boolean) {
  setSyncValue("dirty", value ? "1" : "0");
}

export function isDirty(): boolean {
  return getSyncValue("dirty") === "1";
}

export function setLastSyncNow() {
  setSyncValue("last_sync_at", new Date().toISOString());
  setDirty(false);
}

export function getLastSyncAt(): string | null {
  return getSyncValue("last_sync_at");
}

export function cacheSites(rows: any[]) {
  for (const site of rows) sites[site.site_id] = site;
}

export function getCachedSites(): any[] {
  return Object.values(sites);
}

export function cacheTickets(rows: any[]) {
  for (const ticket of rows) {
    if (ticket.status !== "DONE") tickets[ticket.id] = ticket;
  }
}

export function getCachedTickets(siteId: string): any[] {
  return Object.values(tickets).filter((x: any) => x.site_id === siteId && x.status !== "DONE");
}

export function cacheChecklists(rows: any[]) {
  for (const run of rows) {
    if (["OPEN", "IN_PROGRESS"].includes(run.status)) checklists[run.id] = run;
  }
}

export function getCachedChecklists(siteId: string): any[] {
  return Object.values(checklists).filter((x: any) => x.site_id === siteId && ["OPEN", "IN_PROGRESS"].includes(x.status));
}

export function setCurrentSiteId(siteId: string) {
  setSyncValue("current_site_id", siteId);
}

export function getCurrentSiteId(): string | null {
  return getSyncValue("current_site_id");
}

export function cacheTicketDetail(ticketId: number, detail: any) {
  ticketDetails[ticketId] = detail;
}

export function getCachedTicketDetail(ticketId: number): any | null {
  return ticketDetails[ticketId] ?? null;
}

export function cacheChecklistDetail(runId: number, detail: any) {
  checklistDetails[runId] = detail;
}

export function getCachedChecklistDetail(runId: number): any | null {
  return checklistDetails[runId] ?? null;
}

export function addQueueItem(type: string, payload: any) {
  queue.push({ id: queueId++, type, payload, created_at: new Date().toISOString() });
}

export function getQueueItems(): any[] {
  return queue;
}

export function removeQueueItem(id: number) {
  queue = queue.filter((x) => x.id !== id);
}

export function getQueueCount(): number {
  return queue.length;
}
