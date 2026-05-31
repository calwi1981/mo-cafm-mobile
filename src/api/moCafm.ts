import { apiGet, apiPost } from "./client";

export async function login(personnel_number: string, password: string) {
  return apiPost("/api/login", { personnel_number, password });
}

export async function getSites(userId: number) {
  return apiGet(`/api/sites?user_id=${encodeURIComponent(String(userId))}`);
}

export async function getBuildings(userId: number) {
  return apiGet(`/api/buildings?user_id=${encodeURIComponent(String(userId))}`);
}

export async function getRooms(userId: number, buildingId: number) {
  return apiGet(`/api/buildings/${buildingId}/rooms?user_id=${encodeURIComponent(String(userId))}`);
}

export async function getAssets(userId: number, buildingId: number) {
  return apiGet(`/api/buildings/${buildingId}/assets?user_id=${encodeURIComponent(String(userId))}`);
}

export async function getTickets(userId: number, status: string) {
  return apiGet(`/api/tickets?user_id=${encodeURIComponent(String(userId))}&status=${encodeURIComponent(status)}&limit=100&offset=0`);
}

export async function getChecklistRuns(userId: number, state: "OPEN_ACTIVE" | "IN_PROGRESS") {
  return apiGet(`/api/checklists/runs?user_id=${encodeURIComponent(String(userId))}&state=${state}&limit=50&offset=0`);
}


export async function getTicketDetail(userId: number, ticketId: number) {
  return apiGet(`/api/tickets/${ticketId}?user_id=${encodeURIComponent(String(userId))}`);
}


export async function createTicket(payload: {
  requester_user_id: number;
  site_id: string;
  building_id?: number | null;
  room_id?: number | null;
  asset_id?: number | null;
  title: string;
  description?: string;
  priority?: string;
  assigned_group?: string;
}) {
  return apiPost("/api/tickets", payload);
}

export async function addTicketComment(userId: number, ticketId: number, comment_text: string) {
  return apiPost(`/api/tickets/${ticketId}/comment`, {
    requester_user_id: userId,
    comment_text,
  });
}

export async function updateTicket(userId: number, ticketId: number, payload: {
  status: string;
  assigned_group: string;
  priority: string;
  comment_text: string;
}) {
  return apiPost(`/api/tickets/${ticketId}/update`, {
    requester_user_id: userId,
    ...payload,
  });
}


export async function getChecklistRunDetail(userId: number, runId: number) {
  return apiGet(`/api/checklists/runs/${runId}?user_id=${encodeURIComponent(String(userId))}`);
}

export async function saveChecklistRun(userId: number, runId: number, answers: any[]) {
  return apiPost(`/api/checklists/runs/${runId}/save`, {
    requester_user_id: userId,
    answers,
  });
}


export async function createNokTicketsFromChecklist(userId: number, runId: number) {
  return apiPost(`/api/checklists/runs/${runId}/create-nok-tickets`, {
    requester_user_id: userId,
  });
}
