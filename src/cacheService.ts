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

export async function isOnline() {
  const state = await NetInfo.fetch();
  return !!state.isConnected && state.isInternetReachable !== false;
}

export async function syncSites(userId: number) {
  if (!(await isOnline())) {
    return getCachedSites();
  }

  const sites = await getSites(userId);
  cacheSites(sites);
  setLastSyncNow();
  return sites;
}

export async function syncTickets(userId: number, siteId: string) {
  if (!(await isOnline())) {
    return getCachedTickets(siteId);
  }

  const open = await getTickets(userId, "OPEN");
  const progress = await getTickets(userId, "IN_PROGRESS");
  const waiting = await getTickets(userId, "WAITING");

  const rows = [...open.items, ...progress.items, ...waiting.items].filter((x) => x.site_id === siteId);
  cacheTickets(rows);
  setLastSyncNow();
  return rows;
}

export async function syncChecklists(userId: number, siteId: string) {
  if (!(await isOnline())) {
    return getCachedChecklists(siteId);
  }

  const open = await getChecklistRuns(userId, "OPEN_ACTIVE");
  const progress = await getChecklistRuns(userId, "IN_PROGRESS");

  const rows = [...open.items, ...progress.items].filter((x) => x.site_id === siteId);
  cacheChecklists(rows);
  setLastSyncNow();
  return rows;
}


export async function syncTicketDetail(userId: number, ticketId: number) {
  if (!(await isOnline())) {
    return getCachedTicketDetail(ticketId);
  }

  const detail = await getTicketDetail(userId, ticketId);
  cacheTicketDetail(ticketId, detail);
  return detail;
}

export async function syncChecklistDetail(userId: number, runId: number) {
  if (!(await isOnline())) {
    return getCachedChecklistDetail(runId);
  }

  const detail = await getChecklistRunDetail(userId, runId);
  cacheChecklistDetail(runId, detail);
  return detail;
}
