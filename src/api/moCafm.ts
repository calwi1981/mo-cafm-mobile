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
