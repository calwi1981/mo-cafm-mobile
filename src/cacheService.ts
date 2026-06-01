import NetInfo from "@react-native-community/netinfo";
import {
  cacheChecklistDetail,
  cacheChecklists,
  cacheSites,
  cacheTicketDetail,
  cacheTickets,
  clearCachedTicketsForSite,
  clearCachedChecklistsForSite,
  getCachedChecklistDetail,
  getCachedChecklists,
  getCachedSites,
  getCachedTicketDetail,
  getCachedTickets,
  setLastSyncNow,
} from "./db/database";
import { getChecklistRunDetail, getChecklistRuns, getSites, getTicketDetail, getTickets } from "./api/moCafm";
import { flushQueue } from "./syncQueue";
import { markDirty, markSynced } from "./syncState";

export async function isOnline() {
  const state = await NetInfo.fetch();
  return !!state.isConnected && state.isInternetReachable !== false;
}

export function readSitesFromCache() {
  return getCachedSites();
}

export function readTicketsFromCache(siteId: string) {
  return getCachedTickets(siteId);
}

export function readChecklistsFromCache(siteId: string) {
  return getCachedChecklists(siteId);
}

export function readTicketDetailFromCache(ticketId: number) {
  return getCachedTicketDetail(ticketId);
}

export function readChecklistDetailFromCache(runId: number) {
  return getCachedChecklistDetail(runId);
}

export async function syncSites(userId: number) {
  if (!(await isOnline())) {
    markDirty();
    return getCachedSites();
  }

  const sites = await getSites(userId);
  cacheSites(sites);
  setLastSyncNow();
  markSynced();
  return sites;
}

export async function syncCurrentSite(userId: number, siteId: string) {
  if (!(await isOnline())) {
    markDirty();
    return {
      success: false,
      error: "offline",
      tickets: getCachedTickets(siteId),
      checklists: getCachedChecklists(siteId),
    };
  }

  await flushQueue();

  const openTickets = await getTickets(userId, "OPEN");
  const progressTickets = await getTickets(userId, "IN_PROGRESS");
  const waitingTickets = await getTickets(userId, "WAITING");

  const tickets = [
    ...openTickets.items,
    ...progressTickets.items,
    ...waitingTickets.items,
  ].filter((x) => x.site_id === siteId);

  clearCachedTicketsForSite(siteId);
  cacheTickets(tickets);

  for (const ticket of tickets) {
    try {
      const detail = await getTicketDetail(userId, ticket.id);
      cacheTicketDetail(ticket.id, detail);
    } catch {
      // Detailfehler darf Gesamtsync nicht abbrechen.
    }
  }

  const openRuns = await getChecklistRuns(userId, "OPEN_ACTIVE");
  const progressRuns = await getChecklistRuns(userId, "IN_PROGRESS");

  const checklists = [
    ...openRuns.items,
    ...progressRuns.items,
  ].filter((x) => x.site_id === siteId);

  clearCachedChecklistsForSite(siteId);
  cacheChecklists(checklists);

  for (const run of checklists) {
    try {
      const detail = await getChecklistRunDetail(userId, run.id);
      cacheChecklistDetail(run.id, detail);
    } catch {
      // Detailfehler darf Gesamtsync nicht abbrechen.
    }
  }

  setLastSyncNow();
  markSynced();

  return {
    success: true,
    tickets,
    checklists,
  };
}
