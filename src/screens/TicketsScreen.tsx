import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { getTicketDetail, getTickets } from "../api/moCafm";
import { Footer } from "../components/Footer";
import { TopBar } from "../components/TopBar";
import { t } from "../i18n";
import { Site, Ticket, User } from "../types/models";

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
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  async function loadTickets() {
    try {
      setBusy(true);
      const open = await getTickets(user.id, "OPEN");
      const progress = await getTickets(user.id, "IN_PROGRESS");
      const waiting = await getTickets(user.id, "WAITING");

      const rows = [...open.items, ...progress.items, ...waiting.items]
        .filter((x: Ticket) => x.site_id === site.site_id)
        .sort((a: Ticket, b: Ticket) => {
          const r = dueRank(a) - dueRank(b);
          if (r !== 0) return r;
          return String(a.due_date || "9999-12-31").localeCompare(String(b.due_date || "9999-12-31"));
        });

      setTickets(rows);
    } catch (e: any) {
      Alert.alert(t(user.language, "tickets"), e?.message || t(user.language, "unknownError"));
    } finally {
      setBusy(false);
    }
  }

  async function openTicket(ticket: Ticket) {
    try {
      const detail = await getTicketDetail(user.id, ticket.id);
      setSelectedTicket(detail);
      setDetailVisible(true);
    } catch (e: any) {
      Alert.alert(t(user.language, "ticketDetail"), e?.message || t(user.language, "unknownError"));
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
      <TopBar title={site.hotel_name} onLogout={onLogout} onSwitchSite={onSwitchSite} onSync={loadTickets} language={user.language} />

      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← {t(user.language, "backToDashboard")}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t(user.language, "tickets")}</Text>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { flex: 1, padding: 14 },
  backButton: { marginBottom: 8 },
  backText: { color: "#0f172a", fontWeight: "800" },
  title: { fontSize: 26, fontWeight: "900", color: "#0f172a", marginBottom: 10 },
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
});
