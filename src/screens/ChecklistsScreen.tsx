import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { createNokTicketsFromChecklist, getChecklistRunDetail, saveChecklistRun } from "../api/moCafm";
import { Footer } from "../components/Footer";
import { TopBar } from "../components/TopBar";
import { t } from "../i18n";
import { pendingQueueCount } from "../syncQueue";
import { readChecklistDetailFromCache, readChecklistsFromCache, syncCurrentSite } from "../cacheService";
import { notify } from "../notify";
import { markDirty, markSynced, getSyncRed } from "../syncState";
import { queueAction } from "../syncQueue";
import { ChecklistRun, Site, User } from "../types/models";

type Props = {
  user: User;
  site: Site;
  onBack: () => void;
  onLogout: () => void;
  onSwitchSite: () => void;
};

type RunFilter = "ALL" | "OPEN" | "IN_PROGRESS";
type CycleFilter = "ALL" | "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

function fmtDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("de-DE");
}

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

function dueRank(run: ChecklistRun) {
  if (isOverdue(run.due_date)) return 0;
  if (isToday(run.due_date)) return 1;
  return 2;
}

function dueGroup(run: ChecklistRun, language?: string) {
  if (isOverdue(run.due_date)) return t(language, "overdue");
  if (isToday(run.due_date)) return t(language, "dueToday");
  return t(language, "dueLater");
}

function questionText(item: any, language?: string) {
  if (language === "en") return item.question_en || item.question_de || "-";
  if (language === "nl") return item.question_nl || item.question_de || "-";
  return item.question_de || item.question_en || "-";
}

export function ChecklistsScreen({ user, site, onBack, onLogout, onSwitchSite }: Props) {
  const [runs, setRuns] = useState<ChecklistRun[]>([]);
  const [filter, setFilter] = useState<RunFilter>("ALL");
  const [cycleFilter, setCycleFilter] = useState<CycleFilter>("ALL");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [syncRed, setSyncRed] = useState(getSyncRed());
  const [pendingCount, setPendingCount] = useState(pendingQueueCount());
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<number, any>>({});

  async function loadRuns() {
    try {
      setBusy(true);
      const rows = readChecklistsFromCache(site.site_id)
        .filter((x: ChecklistRun) => ["OPEN", "IN_PROGRESS"].includes(x.status))
        .sort((a: ChecklistRun, b: ChecklistRun) => {
          const r = dueRank(a) - dueRank(b);
          if (r !== 0) return r;
          return String(a.due_date || "9999-12-31").localeCompare(String(b.due_date || "9999-12-31"));
        });

      setRuns(rows);
    } catch (e: any) {
      notify(t(user.language, "checklists"), e?.message || t(user.language, "unknownError"));
    } finally {
      setSyncRed(getSyncRed());
      setPendingCount(pendingQueueCount());
      setPendingCount(pendingQueueCount());
      setBusy(false);
    }
  }

  async function openRun(run: ChecklistRun) {
    try {
      const detail = readChecklistDetailFromCache(run.id);
      const initial: Record<number, any> = {};
      for (const item of detail.items || []) {
        initial[item.id] = {
          checklist_run_item_id: item.id,
          answer_value: item.answer_value || "",
          answer_number: item.answer_number ?? "",
          answer_unit: item.answer_unit || item.default_unit || "",
          answer_text: item.answer_text || "",
          comment_text: item.comment_text || "",
        };
      }
      setAnswers(initial);
      setSelectedRun(detail);
      setDetailVisible(true);
    } catch (e: any) {
      notify(t(user.language, "checklistDetail"), e?.message || t(user.language, "unknownError"));
    }
  }

  function patchAnswer(itemId: number, patch: any) {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        checklist_run_item_id: itemId,
        ...patch,
      },
    }));
  }

  async function submitChecklist() {
    if (!selectedRun?.run) return;

    const payload = Object.values(answers).map((x: any) => ({
      ...x,
      answer_number: x.answer_number === "" ? null : Number(String(x.answer_number).replace(",", ".")),
    }));

    try {
      queueAction("checklist_save", {
        user_id: user.id,
        run_id: selectedRun.run.id,
        answers: payload,
      });
      markDirty();
      setSyncRed(getSyncRed());
      setPendingCount(pendingQueueCount());
      setPendingCount(pendingQueueCount());
      setDetailVisible(false);
      markSynced();
      setRuns(readChecklistsFromCache(site.site_id).filter((x: ChecklistRun) => ["OPEN", "IN_PROGRESS"].includes(x.status)));
      await loadRuns();
      markDirty();
      setSyncRed(getSyncRed());
      setPendingCount(pendingQueueCount());
      setPendingCount(pendingQueueCount());
      notify(t(user.language, "checklists"), t(user.language, "checklistSaved"));
    } catch (e: any) {
      notify(t(user.language, "checklists"), e?.message || t(user.language, "unknownError"));
    }
  }


  const hasNokAnswers = useMemo(() => {
    return Object.values(answers).some((x: any) => x?.answer_value === "NOK");
  }, [answers]);

  async function submitChecklistAndCreateNokTickets() {
    if (!selectedRun?.run) return;

    await submitChecklist();

    try {
      const res = { created: 0, skipped: 0 };
      queueAction("checklist_create_nok_tickets", {
        user_id: user.id,
        run_id: selectedRun.run.id,
      });
      notify(
        t(user.language, "saveAndCreateNokTickets"),
        `${t(user.language, "nokTicketsCreated")} (${res.created || 0} / ${res.skipped || 0})`
      );
    } catch (e: any) {
      notify(t(user.language, "saveAndCreateNokTickets"), e?.message || t(user.language, "unknownError"));
    }
  }

  useEffect(() => {
    loadRuns();
  }, [site.site_id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return runs.filter((run) => {
      if (filter !== "ALL" && run.status !== filter) return false;
      const freq = run.plan_frequency || (run as any).frequency || (run as any).planFrequency;
      if (cycleFilter !== "ALL" && freq !== cycleFilter) return false;
      if (!q) return true;

      const text = [
        run.template_title,
        run.template_title_de,
        run.template_title_en,
        run.status,
        run.assigned_group,
        run.building_name,
        run.asset_code,
        run.asset_description,
        run.room_code,
        run.room_description,
      ].filter(Boolean).join(" ").toLowerCase();

      return text.includes(q);
    });
  }, [runs, filter, cycleFilter, search]);

  const grouped = useMemo(() => {
    const result: Array<{ type: "header"; title: string } | { type: "run"; run: ChecklistRun }> = [];
    let last = "";

    for (const run of filtered) {
      const group = dueGroup(run, user.language);
      if (group !== last) {
        result.push({ type: "header", title: group });
        last = group;
      }
      result.push({ type: "run", run });
    }

    return result;
  }, [filtered, user.language]);

  return (
    <View style={styles.container}>
      <TopBar title={site.hotel_name} onLogout={onLogout} onSwitchSite={onSwitchSite} onSync={async () => { await syncCurrentSite(user.id, site.site_id); loadRuns(); }} language={user.language} syncRed={syncRed} pendingCount={pendingCount} />

      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← {t(user.language, "backToDashboard")}</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{t(user.language, "checklists")}</Text>

        <TextInput
          style={styles.search}
          placeholder={t(user.language, "search")}
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.filters}>
          {(["ALL", "OPEN", "IN_PROGRESS"] as RunFilter[]).map((x) => (
            <TouchableOpacity key={x} style={[styles.filterButton, filter === x && styles.filterActive]} onPress={() => setFilter(x)}>
              <Text style={[styles.filterText, filter === x && styles.filterTextActive]}>{x === "ALL" ? t(user.language, "all") : x}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filters}>
          {(["ALL", "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as CycleFilter[]).map((x) => (
            <TouchableOpacity key={x} style={[styles.filterButton, cycleFilter === x && styles.filterActive]} onPress={() => setCycleFilter(x)}>
              <Text style={[styles.filterText, cycleFilter === x && styles.filterTextActive]}>{x === "ALL" ? t(user.language, "all") : x}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {busy ? <Text style={styles.loading}>{t(user.language, "loadingChecklists")}</Text> : null}

        <FlatList
          data={grouped}
          keyExtractor={(item, index) => item.type === "header" ? `h-${item.title}-${index}` : `r-${item.run.id}`}
          renderItem={({ item }) => {
            if (item.type === "header") return <Text style={styles.groupHeader}>{item.title}</Text>;

            const run = item.run;
            return (
              <TouchableOpacity style={styles.card} onPress={() => openRun(run)}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{run.template_title_de || run.template_title || "-"}</Text>
                  <Text style={[styles.status, run.status === "OPEN" ? styles.statusOpen : styles.statusProgress]}>{run.status}</Text>
                </View>
                <Text style={styles.meta}>{[run.building_name, run.room_code, run.asset_code].filter(Boolean).join(" · ")}</Text>
                <Text style={styles.meta}>{run.asset_description || run.room_description || ""}</Text>
                <Text style={styles.meta}>{run.plan_frequency || ""}{run.plan_interval_value && run.plan_interval_value !== 1 ? ` / ${run.plan_interval_value}` : ""}</Text>
                <Text style={styles.due}>{t(user.language, "dueDate")}: {fmtDate(run.due_date)}</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={!busy ? <Text style={styles.empty}>{t(user.language, "noChecklists")}</Text> : null}
        />
      </View>

      <Footer />

      <Modal visible={detailVisible} animationType="slide" onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{t(user.language, "checklistDetail")}</Text>
            <TouchableOpacity onPress={() => setDetailVisible(false)}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {selectedRun?.run ? (
              <>
                <Text style={styles.detailTitle}>{selectedRun.run.template_title_de || selectedRun.run.template_title}</Text>
                <Text style={styles.detailLine}>{t(user.language, "status")}: {selectedRun.run.status}</Text>
                <Text style={styles.detailLine}>{t(user.language, "dueDate")}: {fmtDate(selectedRun.run.due_date)}</Text>
                <Text style={styles.detailLine}>{t(user.language, "building")}: {selectedRun.run.building_name || "-"}</Text>
                <Text style={styles.detailLine}>{t(user.language, "room")}: {selectedRun.run.room_code || "-"}</Text>
                <Text style={styles.detailLine}>{t(user.language, "asset")}: {selectedRun.run.asset_code || "-"}</Text>

                {(selectedRun.items || []).map((item: any) => {
                  const a = answers[item.id] || {};
                  const q = questionText(item, user.language);

                  if (item.item_type === "INFO_TEXT") {
                    return (
                      <View key={item.id} style={styles.infoBox}>
                        <Text style={styles.infoText}>{q}</Text>
                      </View>
                    );
                  }

                  return (
                    <View key={item.id} style={styles.questionCard}>
                      <Text style={styles.questionText}>{q}</Text>
                      <Text style={styles.questionType}>{item.item_type}</Text>

                      {item.item_type === "SINGLE_CHOICE" ? (
                        <View style={styles.optionRow}>
                          {["OK", "NOK", ...(item.allow_na ? ["NA"] : [])].map((x) => (
                            <TouchableOpacity key={x} style={[styles.optionButton, a.answer_value === x && styles.optionActive]} onPress={() => patchAnswer(item.id, { answer_value: x })}>
                              <Text style={[styles.optionText, a.answer_value === x && styles.optionTextActive]}>{x}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}

                      {item.item_type === "NUMBER" ? (
                        <View style={styles.numberRow}>
                          <TextInput
                            style={[styles.input, styles.numberInput]}
                            value={String(a.answer_number ?? "")}
                            onChangeText={(v) => patchAnswer(item.id, { answer_number: v })}
                            keyboardType="numeric"
                          />
                          <TextInput
                            style={[styles.input, styles.unitInput]}
                            value={String(a.answer_unit ?? "")}
                            onChangeText={(v) => patchAnswer(item.id, { answer_unit: v })}
                          />
                        </View>
                      ) : null}

                      {item.item_type === "TEXT" ? (
                        <TextInput
                          style={[styles.input, styles.textArea]}
                          value={String(a.answer_text ?? "")}
                          onChangeText={(v) => patchAnswer(item.id, { answer_text: v })}
                          multiline
                        />
                      ) : null}

                      {a.answer_value === "NOK" ? (
                        <TextInput
                          style={[styles.input, styles.commentInput]}
                          placeholder={t(user.language, "comments")}
                          value={String(a.comment_text ?? "")}
                          onChangeText={(v) => patchAnswer(item.id, { comment_text: v })}
                          multiline
                        />
                      ) : null}
                    </View>
                  );
                })}

                <TouchableOpacity style={styles.primaryButton} onPress={submitChecklist}>
                  <Text style={styles.primaryButtonText}>{t(user.language, "saveChecklist")}</Text>
                </TouchableOpacity>

                {hasNokAnswers ? (
                  <TouchableOpacity style={styles.warningButton} onPress={submitChecklistAndCreateNokTickets}>
                    <Text style={styles.primaryButtonText}>{t(user.language, "saveAndCreateNokTickets")}</Text>
                  </TouchableOpacity>
                ) : null}
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
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 14, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "900", color: "#0f172a" },
  status: { overflow: "hidden", borderRadius: 999, paddingVertical: 4, paddingHorizontal: 8, color: "#fff", fontWeight: "900", fontSize: 11 },
  statusOpen: { backgroundColor: "#dc2626" },
  statusProgress: { backgroundColor: "#2563eb" },
  meta: { color: "#64748b", marginTop: 4 },
  due: { color: "#334155", fontWeight: "700", marginTop: 6 },
  empty: { textAlign: "center", color: "#64748b", marginTop: 20 },
  modal: { flex: 1, backgroundColor: "#f8fafc" },
  modalHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#0f172a" },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  close: { color: "#fff", fontSize: 24, fontWeight: "900" },
  modalBody: { padding: 16 },
  detailTitle: { fontSize: 24, fontWeight: "900", color: "#0f172a", marginBottom: 12 },
  detailLine: { fontSize: 15, color: "#334155", marginBottom: 6 },
  infoBox: { backgroundColor: "#e0f2fe", borderRadius: 12, padding: 12, marginTop: 12 },
  infoText: { color: "#075985", fontWeight: "700" },
  questionCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 14, padding: 14, marginTop: 12 },
  questionText: { fontSize: 16, fontWeight: "900", color: "#0f172a" },
  questionType: { color: "#94a3b8", marginTop: 4, marginBottom: 10, fontSize: 12 },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  optionButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "#e2e8f0" },
  optionActive: { backgroundColor: "#0f172a" },
  optionText: { color: "#334155", fontWeight: "900", fontSize: 13 },
  optionTextActive: { color: "#fff" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, padding: 12, fontSize: 16 },
  commentInput: { minHeight: 70, textAlignVertical: "top", marginTop: 8 },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  numberRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  numberInput: { flex: 2 },
  unitInput: { flex: 1 },
  primaryButton: { backgroundColor: "#16a34a", padding: 15, borderRadius: 12, alignItems: "center", marginTop: 18, marginBottom: 40 },
  primaryButtonText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  warningButton: { backgroundColor: "#f97316", padding: 15, borderRadius: 12, alignItems: "center", marginTop: 10, marginBottom: 40 },
});
