import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { addTicketComment, createTicket, getAssets, getBuildings, getRooms, getTicketDetail, updateTicket } from "../api/moCafm";
import { Footer } from "../components/Footer";
import { TopBar } from "../components/TopBar";
import { t } from "../i18n";
import { notify } from "../notify";
import { syncTickets } from "../cacheService";
import { markDirty, markSynced, getSyncRed } from "../syncState";
import { Asset, Building, Room, Site, Ticket, User } from "../types/models";

type TicketFilter = "ALL" | "OPEN" | "IN_PROGRESS" | "WAITING";

type Props = {
  user: User;
  site: Site;
  onBack: () => void;
  onLogout: () => void;
  onSwitchSite: () => void;
};

function isOverdue(due?: string) {
  if (!due) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

function isToday(due?: string) {
  if (!due) return false;
  const today = new Date();
  const d = new Date(due);
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

function dueGroup(ticket: Ticket, language?: string) {
  if (isOverdue(ticket.due_date)) return t(language, "overdue");
  if (isToday(ticket.due_date)) return t(language, "dueToday");
  return t(language, "dueLater");
}

function dueRank(ticket: Ticket) {
  if (isOverdue(ticket.due_date)) return 0;
  if (isToday(ticket.due_date)) return 1;
  return 2;
}

function fmtDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("de-DE");
}

export function TicketsScreen({ user, site, onBack, onLogout, onSwitchSite }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<TicketFilter>("ALL");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncRed, setSyncRed] = useState(getSyncRed());
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [commentVisible, setCommentVisible] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newGroup, setNewGroup] = useState("MAINTENANCE");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [newBuildingId, setNewBuildingId] = useState<number | null>(null);
  const [newRoomId, setNewRoomId] = useState<number | null>(null);
  const [newAssetId, setNewAssetId] = useState<number | null>(null);
  const [objectSearch, setObjectSearch] = useState("");

  const [editStatus, setEditStatus] = useState("OPEN");
  const [editPriority, setEditPriority] = useState("MEDIUM");
  const [editGroup, setEditGroup] = useState("MAINTENANCE");
  const [editComment, setEditComment] = useState("");
  const [newComment, setNewComment] = useState("");

  async function loadTickets() {
    try {
      setBusy(true);
      const rows = (await syncTickets(user.id, site.site_id))
        .sort((a: Ticket, b: Ticket) => {
          const r = dueRank(a) - dueRank(b);
          if (r !== 0) return r;
          return String(a.due_date || "9999-12-31").localeCompare(String(b.due_date || "9999-12-31"));
        });

      setTickets(rows);
    } catch (e: any) {
      notify(t(user.language, "tickets"), e?.message || t(user.language, "unknownError"));
    } finally {
      setSyncRed(getSyncRed());
      setBusy(false);
    }
  }

  async function openTicket(ticket: Ticket) {
    try {
      const detail = await getTicketDetail(user.id, ticket.id);
      setSelectedTicket(detail);
      setDetailVisible(true);
    } catch (e: any) {
      notify(t(user.language, "ticketDetail"), e?.message || t(user.language, "unknownError"));
    }
  }



  async function loadTicketReferenceData() {
    try {
      const allBuildings = await getBuildings(user.id);
      const siteBuildings = allBuildings.filter((b: Building) => b.site_id === site.site_id);
      setBuildings(siteBuildings);

      if (siteBuildings.length === 1) {
        await selectBuilding(siteBuildings[0].id);
      }
    } catch (e: any) {
      notify(t(user.language, "newTicket"), e?.message || t(user.language, "unknownError"));
    }
  }

  async function selectBuilding(buildingId: number) {
    setNewBuildingId(buildingId);
    setNewRoomId(null);
    setNewAssetId(null);
    setObjectSearch("");

    try {
      const nextRooms = await getRooms(user.id, buildingId);
      const nextAssets = await getAssets(user.id, buildingId);
      setRooms(nextRooms);
      setAssets(nextAssets);
    } catch (e: any) {
      notify(t(user.language, "newTicket"), e?.message || t(user.language, "unknownError"));
    }
  }

  function openCreateTicket() {
    setCreateVisible(true);
    loadTicketReferenceData();
  }

  async function submitCreateTicket() {
    if (!newTitle.trim()) {
      notify(t(user.language, "newTicket"), t(user.language, "titleField"));
      return;
    }

    try {
      await createTicket({
        requester_user_id: user.id,
        site_id: site.site_id,
        title: newTitle.trim(),
        description: newDescription.trim(),
        priority: newPriority,
        assigned_group: newGroup,
        building_id: newBuildingId,
        room_id: newRoomId,
        asset_id: newAssetId,
      });

      markDirty();
      setSyncRed(getSyncRed());
      setCreateVisible(false);
      setNewTitle("");
      setNewDescription("");
      setNewPriority("MEDIUM");
      setNewGroup("MAINTENANCE");
      setNewBuildingId(null);
      setNewRoomId(null);
      setNewAssetId(null);
      setObjectSearch("");
      setRooms([]);
      setAssets([]);
      markSynced();
      await loadTickets();
      markDirty();
      setSyncRed(getSyncRed());
      notify(t(user.language, "newTicket"), t(user.language, "ticketCreated"));
    } catch (e: any) {
      notify(t(user.language, "newTicket"), e?.message || t(user.language, "unknownError"));
    }
  }

  function openEditModal() {
    const ticket = selectedTicket?.ticket;
    if (!ticket) return;

    setEditStatus(ticket.status || "OPEN");
    setEditPriority(ticket.priority || "MEDIUM");
    setEditGroup(ticket.assigned_group || "MAINTENANCE");
    setEditComment("");
    setEditVisible(true);
  }

  async function submitTicketUpdate() {
    if (!editComment.trim()) {
      notify(t(user.language, "updateTicket"), t(user.language, "commentRequired"));
      return;
    }

    const ticket = selectedTicket?.ticket;
    if (!ticket) return;

    try {
      await updateTicket(user.id, ticket.id, {
        status: editStatus,
        priority: editPriority,
        assigned_group: editGroup,
        comment_text: editComment.trim(),
      });

      markDirty();
      setSyncRed(getSyncRed());
      setEditVisible(false);
      markDirty();
      setSyncRed(getSyncRed());
      setDetailVisible(false);
      markSynced();
      await loadTickets();
      markDirty();
      setSyncRed(getSyncRed());
      notify(t(user.language, "updateTicket"), t(user.language, "ticketUpdated"));
    } catch (e: any) {
      notify(t(user.language, "updateTicket"), e?.message || t(user.language, "unknownError"));
    }
  }

  async function submitComment() {
    if (!newComment.trim()) {
      notify(t(user.language, "addComment"), t(user.language, "commentRequired"));
      return;
    }

    const ticket = selectedTicket?.ticket;
    if (!ticket) return;

    try {
      await addTicketComment(user.id, ticket.id, newComment.trim());
      markDirty();
      setSyncRed(getSyncRed());
      setCommentVisible(false);
      setNewComment("");
      const detail = await getTicketDetail(user.id, ticket.id);
      setSelectedTicket(detail);
      await loadTickets();
      markDirty();
      setSyncRed(getSyncRed());
    } catch (e: any) {
      notify(t(user.language, "addComment"), e?.message || t(user.language, "unknownError"));
    }
  }


  useEffect(() => {
    loadTickets();
  }, [site.site_id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      if (filter !== "ALL" && ticket.status !== filter) return false;

      if (!q) return true;

      const text = [
        ticket.ticket_no,
        ticket.title,
        ticket.status,
        ticket.priority,
        ticket.assigned_group,
        ticket.hotel_name,
        ticket.building_name,
        ticket.room_code,
      ].filter(Boolean).join(" ").toLowerCase();

      return text.includes(q);
    });
  }, [tickets, filter, search]);

  const grouped = useMemo(() => {
    const result: Array<{ type: "header"; title: string } | { type: "ticket"; ticket: Ticket }> = [];
    let last = "";

    for (const ticket of filtered) {
      const group = dueGroup(ticket, user.language);
      if (group !== last) {
        result.push({ type: "header", title: group });
        last = group;
      }
      result.push({ type: "ticket", ticket });
    }

    return result;
  }, [filtered, user.language]);

  return (
    <View style={styles.container}>
      <TopBar title={site.hotel_name} onLogout={onLogout} onSwitchSite={onSwitchSite} onSync={loadTickets} language={user.language} syncRed={syncRed} />

      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← {t(user.language, "backToDashboard")}</Text>
        </TouchableOpacity>

        <View style={styles.titleRow}>
          <Text style={styles.title}>{t(user.language, "tickets")}</Text>
          <TouchableOpacity style={styles.newButton} onPress={openCreateTicket}>
            <Text style={styles.newButtonText}>+ {t(user.language, "newTicket")}</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.search}
          placeholder={t(user.language, "search")}
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.filters}>
          {(["ALL", "OPEN", "IN_PROGRESS", "WAITING"] as TicketFilter[]).map((x) => (
            <TouchableOpacity key={x} style={[styles.filterButton, filter === x && styles.filterActive]} onPress={() => setFilter(x)}>
              <Text style={[styles.filterText, filter === x && styles.filterTextActive]}>{x === "ALL" ? t(user.language, "all") : x}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {busy ? <Text style={styles.loading}>{t(user.language, "loadingTickets")}</Text> : null}

        <FlatList
          data={grouped}
          keyExtractor={(item, index) => item.type === "header" ? `h-${item.title}-${index}` : `t-${item.ticket.id}`}
          renderItem={({ item }) => {
            if (item.type === "header") {
              return <Text style={styles.groupHeader}>{item.title}</Text>;
            }

            const ticket = item.ticket;
            return (
              <TouchableOpacity style={styles.ticketCard} onPress={() => openTicket(ticket)}>
                <View style={styles.ticketTop}>
                  <Text style={styles.ticketNo}>{ticket.ticket_no}</Text>
                  <Text style={[styles.status, ticket.status === "OPEN" ? styles.statusOpen : ticket.status === "IN_PROGRESS" ? styles.statusProgress : styles.statusWaiting]}>
                    {ticket.status}
                  </Text>
                </View>
                <Text style={styles.ticketTitle}>{ticket.title}</Text>
                <Text style={styles.ticketMeta}>{[ticket.building_name, ticket.room_code, ticket.assigned_group].filter(Boolean).join(" · ")}</Text>
                <Text style={styles.ticketDue}>{t(user.language, "dueDate")}: {fmtDate(ticket.due_date)}</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={!busy ? <Text style={styles.empty}>{t(user.language, "noTickets")}</Text> : null}
        />
      </View>

      <Footer />

      <Modal visible={detailVisible} animationType="slide" onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{t(user.language, "ticketDetail")}</Text>
            <TouchableOpacity onPress={() => setDetailVisible(false)}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {selectedTicket?.ticket ? (
              <>
                <Text style={styles.detailNo}>{selectedTicket.ticket.ticket_no}</Text>
                <Text style={styles.detailTitle}>{selectedTicket.ticket.title}</Text>
                <Text style={styles.detailLine}>{t(user.language, "status")}: {selectedTicket.ticket.status}</Text>
                <Text style={styles.detailLine}>{t(user.language, "priority")}: {selectedTicket.ticket.priority || "-"}</Text>
                <Text style={styles.detailLine}>{t(user.language, "dueDate")}: {fmtDate(selectedTicket.ticket.due_date)}</Text>
                <Text style={styles.detailLine}>{t(user.language, "building")}: {selectedTicket.ticket.building_name || "-"}</Text>
                <Text style={styles.detailLine}>{t(user.language, "room")}: {selectedTicket.ticket.room_code || "-"}</Text>
                <Text style={styles.detailLine}>{t(user.language, "asset")}: {selectedTicket.ticket.asset_code || "-"}</Text>

                <Text style={styles.sectionTitle}>{t(user.language, "description")}</Text>
                <Text style={styles.description}>{selectedTicket.ticket.description || "-"}</Text>

                <View style={styles.detailActions}>
                  <TouchableOpacity style={styles.actionButton} onPress={openEditModal}>
                    <Text style={styles.actionButtonText}>{t(user.language, "updateTicket")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={() => setCommentVisible(true)}>
                    <Text style={styles.actionButtonText}>{t(user.language, "addComment")}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionTitle}>{t(user.language, "comments")}</Text>
                {(selectedTicket.comments || []).length === 0 ? <Text style={styles.description}>-</Text> : null}
                {(selectedTicket.comments || []).map((c: any) => (
                  <View key={c.id} style={styles.comment}>
                    <Text style={styles.commentUser}>{c.user_name || "-"}</Text>
                    <Text style={styles.commentText}>{c.comment_text}</Text>
                    <Text style={styles.commentDate}>{fmtDate(c.created_at)}</Text>
                  </View>
                ))}
              </>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    
      <Modal visible={createVisible} animationType="slide" onRequestClose={() => setCreateVisible(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{t(user.language, "newTicket")}</Text>
            <TouchableOpacity onPress={() => setCreateVisible(false)}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.label}>{t(user.language, "titleField")}</Text>
            <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle} />

            <Text style={styles.label}>{t(user.language, "descriptionField")}</Text>
            <TextInput style={[styles.input, styles.textArea]} value={newDescription} onChangeText={setNewDescription} multiline />

            <Text style={styles.label}>Raum oder Anlage suchen</Text>
            <TextInput
              style={styles.input}
              placeholder="z.B. 279"
              value={objectSearch}
              onChangeText={setObjectSearch}
            />

            <Text style={styles.subLabel}>{t(user.language, "room")}</Text>
            <ScrollView style={styles.pickList} nestedScrollEnabled>
              {rooms
                .filter((r) => {
                  const q = objectSearch.trim().toLowerCase();
                  if (!q && newRoomId !== r.id) return false;
                  return [r.room_code, r.name].filter(Boolean).join(" ").toLowerCase().includes(q) || newRoomId === r.id;
                })
                .slice(0, 80)
                .map((r) => (
                  <TouchableOpacity key={r.id} style={[styles.pickItem, newRoomId === r.id && styles.optionActive]} onPress={() => setNewRoomId(r.id)}>
                    <Text style={[styles.optionText, newRoomId === r.id && styles.optionTextActive]}>{[r.room_code, r.name].filter(Boolean).join(" - ")}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <Text style={styles.subLabel}>{t(user.language, "asset")}</Text>
            <ScrollView style={styles.pickList} nestedScrollEnabled>
              {assets
                .filter((a) => {
                  const q = objectSearch.trim().toLowerCase();
                  if (!q && newAssetId !== a.id) return false;
                  return [a.asset_code, a.description, a.standard_asset_name].filter(Boolean).join(" ").toLowerCase().includes(q) || newAssetId === a.id;
                })
                .slice(0, 80)
                .map((a) => (
                  <TouchableOpacity key={a.id} style={[styles.pickItem, newAssetId === a.id && styles.optionActive]} onPress={() => setNewAssetId(a.id)}>
                    <Text style={[styles.optionText, newAssetId === a.id && styles.optionTextActive]}>{[a.asset_code, a.description].filter(Boolean).join(" - ")}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <Text style={styles.label}>{t(user.language, "priority")}</Text>
            <View style={styles.optionRow}>
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((x) => (
                <TouchableOpacity key={x} style={[styles.optionButton, newPriority === x && styles.optionActive]} onPress={() => setNewPriority(x)}>
                  <Text style={[styles.optionText, newPriority === x && styles.optionTextActive]}>{x}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t(user.language, "group")}</Text>
            <View style={styles.optionRow}>
              {["AM", "MAINTENANCE", "MANAGER", "EXTERN"].map((x) => (
                <TouchableOpacity key={x} style={[styles.optionButton, newGroup === x && styles.optionActive]} onPress={() => setNewGroup(x)}>
                  <Text style={[styles.optionText, newGroup === x && styles.optionTextActive]}>{x}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={submitCreateTicket}>
              <Text style={styles.primaryButtonText}>{t(user.language, "saveTicket")}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={editVisible} animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{t(user.language, "updateTicket")}</Text>
            <TouchableOpacity onPress={() => setEditVisible(false)}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.label}>{t(user.language, "status")}</Text>
            <View style={styles.optionRow}>
              {["OPEN", "IN_PROGRESS", "WAITING", "DONE"].map((x) => (
                <TouchableOpacity key={x} style={[styles.optionButton, editStatus === x && styles.optionActive]} onPress={() => setEditStatus(x)}>
                  <Text style={[styles.optionText, editStatus === x && styles.optionTextActive]}>{x}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t(user.language, "priority")}</Text>
            <View style={styles.optionRow}>
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((x) => (
                <TouchableOpacity key={x} style={[styles.optionButton, editPriority === x && styles.optionActive]} onPress={() => setEditPriority(x)}>
                  <Text style={[styles.optionText, editPriority === x && styles.optionTextActive]}>{x}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t(user.language, "group")}</Text>
            <View style={styles.optionRow}>
              {["AM", "MAINTENANCE", "MANAGER", "EXTERN"].map((x) => (
                <TouchableOpacity key={x} style={[styles.optionButton, editGroup === x && styles.optionActive]} onPress={() => setEditGroup(x)}>
                  <Text style={[styles.optionText, editGroup === x && styles.optionTextActive]}>{x}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t(user.language, "comments")}</Text>
            <TextInput style={[styles.input, styles.textArea]} value={editComment} onChangeText={setEditComment} multiline />

            <TouchableOpacity style={styles.primaryButton} onPress={submitTicketUpdate}>
              <Text style={styles.primaryButtonText}>{t(user.language, "saveTicket")}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={commentVisible} animationType="slide" onRequestClose={() => setCommentVisible(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{t(user.language, "addComment")}</Text>
            <TouchableOpacity onPress={() => setCommentVisible(false)}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <TextInput style={[styles.input, styles.textArea]} value={newComment} onChangeText={setNewComment} multiline />
            <TouchableOpacity style={styles.primaryButton} onPress={submitComment}>
              <Text style={styles.primaryButtonText}>{t(user.language, "send")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { flex: 1, padding: 14 },
  backButton: { marginBottom: 8 },
  backText: { color: "#0f172a", fontWeight: "800" },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: "900", color: "#0f172a", flex: 1 },
  newButton: { backgroundColor: "#0f172a", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  newButtonText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  search: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 10 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  filterButton: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "#e2e8f0" },
  filterActive: { backgroundColor: "#0f172a" },
  filterText: { color: "#334155", fontWeight: "800", fontSize: 12 },
  filterTextActive: { color: "#fff" },
  loading: { color: "#64748b", marginBottom: 8 },
  groupHeader: { fontSize: 14, fontWeight: "900", color: "#475569", marginTop: 12, marginBottom: 6 },
  ticketCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 14, padding: 14, marginBottom: 10 },
  ticketTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  ticketNo: { fontWeight: "900", color: "#0f172a" },
  status: { overflow: "hidden", borderRadius: 999, paddingVertical: 4, paddingHorizontal: 8, color: "#fff", fontWeight: "900", fontSize: 11 },
  statusOpen: { backgroundColor: "#dc2626" },
  statusProgress: { backgroundColor: "#2563eb" },
  statusWaiting: { backgroundColor: "#f97316" },
  ticketTitle: { fontSize: 16, fontWeight: "900", color: "#0f172a", marginBottom: 4 },
  ticketMeta: { color: "#64748b", marginBottom: 4 },
  ticketDue: { color: "#334155", fontWeight: "700" },
  empty: { textAlign: "center", color: "#64748b", marginTop: 20 },
  modal: { flex: 1, backgroundColor: "#f8fafc" },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#0f172a" },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  close: { color: "#fff", fontSize: 24, fontWeight: "900" },
  modalBody: { padding: 16 },
  detailNo: { color: "#475569", fontWeight: "900", marginBottom: 4 },
  detailTitle: { fontSize: 24, fontWeight: "900", color: "#0f172a", marginBottom: 14 },
  detailLine: { fontSize: 15, color: "#334155", marginBottom: 6 },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: "#0f172a", marginTop: 16, marginBottom: 8 },
  description: { color: "#334155", lineHeight: 21 },
  comment: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 12, padding: 12, marginBottom: 10 },
  commentUser: { fontWeight: "900", color: "#0f172a" },
  commentText: { color: "#334155", marginTop: 4 },
  commentDate: { color: "#94a3b8", marginTop: 4, fontSize: 12 },
  detailActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  actionButton: { flex: 1, backgroundColor: "#334155", padding: 12, borderRadius: 10, alignItems: "center" },
  actionButtonText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  label: { fontWeight: "900", color: "#0f172a", marginTop: 12, marginBottom: 6 },
  subLabel: { fontWeight: "900", color: "#475569", marginTop: 10, marginBottom: 6 },
  pickList: { maxHeight: 170, backgroundColor: "#f1f5f9", borderRadius: 12, marginBottom: 8 },
  pickItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, padding: 12, fontSize: 16 },
  textArea: { minHeight: 120, textAlignVertical: "top" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  optionButton: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "#e2e8f0" },
  optionActive: { backgroundColor: "#0f172a" },
  optionText: { color: "#334155", fontWeight: "800", fontSize: 12 },
  optionTextActive: { color: "#fff" },
  primaryButton: { backgroundColor: "#16a34a", padding: 15, borderRadius: 12, alignItems: "center", marginTop: 18 },
  primaryButtonText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
