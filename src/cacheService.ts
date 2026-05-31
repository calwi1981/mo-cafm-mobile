import NetInfo from "@react-native-community/netinfo";
import {
  cacheChecklistDetail,
  cacheChecklists,
  cacheSites,
  cacheTicketDetail,
  cacheTickets,
  getCachedChecklistDetail,
  getCachedChecklists,
  getCachedSites,
  getCachedTicketDetail,
  getCachedTickets,
  setLastSyncNow,
} from "./db/database";
import { getChecklistRunDetail, getChecklistRuns, getSites, getTicketDetail, getTickets } from "./api/moCafm";
import { markSynced, markDirty } from "./syncState";

export async function isOnline() {
  const state = await NetInfo.fetch();
  return !!state.isConnected && state.isInternetReachable !== false;
}

function useFallback<T>(fallback: T): T {
  markDirty();
  return fallback;
}

export async function syncSites(userId: number) {
  try {
    if (!(await isOnline())) return useFallback(getCachedSites());

    const sites = await getSites(userId);
    cacheSites(sites);
    setLastSyncNow();
    markSynced();
    return sites;
  } catch {
    return useFallback(getCachedSites());
  }
}

export async function syncTickets(userId: number, siteId: string) {
  try {
    if (!(await isOnline())) return useFallback(getCachedTickets(siteId));

    const open = await getTickets(userId, "OPEN");
    const progress = await getTickets(userId, "IN_PROGRESS");
    const waiting = await getTickets(userId, "WAITING");

    const rows = [...open.items, ...progress.items, ...waiting.items].filter((x) => x.site_id === siteId);
    cacheTickets(rows);
    setLastSyncNow();
    markSynced();
    return rows;
  } catch {
    return useFallback(getCachedTickets(siteId));
  }
}

export async function syncChecklists(userId: number, siteId: string) {
  try {
    if (!(await isOnline())) return useFallback(getCachedChecklists(siteId));

    const open = await getChecklistRuns(userId, "OPEN_ACTIVE");
    const progress = await getChecklistRuns(userId, "IN_PROGRESS");

    const rows = [...open.items, ...progress.items].filter((x) => x.site_id === siteId);
    cacheChecklists(rows);
    setLastSyncNow();
    markSynced();
    return rows;
  } catch {
    return useFallback(getCachedChecklists(siteId));
  }
}

export async function syncTicketDetail(userId: number, ticketId: number) {
  try {
    if (!(await isOnline())) return useFallback(getCachedTicketDetail(ticketId));

    const detail = await getTicketDetail(userId, ticketId);
    cacheTicketDetail(ticketId, detail);
    return detail;
  } catch {
    return useFallback(getCachedTicketDetail(ticketId));
  }
}

export async function syncChecklistDetail(userId: number, runId: number) {
  try {
    if (!(await isOnline())) return useFallback(getCachedChecklistDetail(runId));

    const detail = await getChecklistRunDetail(userId, runId);
    cacheChecklistDetail(runId, detail);
    return detail;
  } catch {
    return useFallback(getCachedChecklistDetail(runId));
  }
}
