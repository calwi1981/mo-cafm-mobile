import { addQueueItem, getQueueItems, removeQueueItem, getQueueCount } from "./db/database";
import { addTicketComment, createTicket, updateTicket, saveChecklistRun, createNokTicketsFromChecklist } from "./api/moCafm";
import { isOnline } from "./cacheService";
import { markDirty, markSynced } from "./syncState";

export function queueAction(type: string, payload: any) {
  addQueueItem(type, payload);
  markDirty();
}

export function pendingQueueCount() {
  return getQueueCount();
}

export async function flushQueue() {
  if (!(await isOnline())) {
    markDirty();
    return { success: false, error: "offline", processed: 0, pending: pendingQueueCount() };
  }

  const items = getQueueItems();
  let processed = 0;

  for (const item of items) {
    try {
      console.log("SYNC ITEM", item);

      if (item.type === "ticket_create") {
        await createTicket(item.payload);
      } else if (item.type === "ticket_update") {
        await updateTicket(item.payload.user_id, item.payload.ticket_id, item.payload.data);
      } else if (item.type === "ticket_comment") {
        await addTicketComment(item.payload.user_id, item.payload.ticket_id, item.payload.comment_text);
      } else if (item.type === "checklist_save") {
        await saveChecklistRun(item.payload.user_id, item.payload.run_id, item.payload.answers);
      } else if (item.type === "checklist_create_nok_tickets") {
        await createNokTicketsFromChecklist(item.payload.user_id, item.payload.run_id);
      } else {
        throw new Error(`unknown_queue_type:${item.type}`);
      }

      console.log("SYNC OK", item.type, item.id);
      removeQueueItem(item.id);
      processed += 1;
    } catch (e) {
      console.error("SYNC FAILED", item, e);
      markDirty();
      return { success: false, error: String(e), processed, pending: pendingQueueCount() };
    }
  }

  if (pendingQueueCount() === 0) {
    markSynced();
  } else {
    markDirty();
  }

  return { success: true, processed, pending: pendingQueueCount() };
}
