import { Footer } from "../components/Footer";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { getChecklistRuns, getTickets } from "../api/moCafm";
import { TopBar } from "../components/TopBar";
import { ChecklistRun, Site, Ticket, User } from "../types/models";
import { t } from "../i18n";

type Props = {
  onOpenTickets: () => void;
  user: User;
  site: Site;
  onLogout: () => void;
  onSwitchSite: () => void;
};

export function DashboardScreen({ user, site, onLogout, onSwitchSite, onOpenTickets }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [runs, setRuns] = useState<ChecklistRun[]>([]);
  const [syncRed, setSyncRed] = useState(false);

  async function syncNow() {
    const state = await NetInfo.fetch();
    if (!state.isConnected || state.isInternetReachable === false) {
      Alert.alert(t(user.language, "sync"), t(user.language, "syncOffline"));
      return;
    }

    try {
      const openTickets = await getTickets(user.id, "OPEN");
      const progressTickets = await getTickets(user.id, "IN_PROGRESS");
      const waitingTickets = await getTickets(user.id, "WAITING");
      const openRuns = await getChecklistRuns(user.id, "OPEN_ACTIVE");
      const progressRuns = await getChecklistRuns(user.id, "IN_PROGRESS");

      setTickets([...openTickets.items, ...progressTickets.items, ...waitingTickets.items].filter((t) => t.site_id === site.site_id));
      setRuns([...openRuns.items, ...progressRuns.items].filter((r) => r.site_id === site.site_id));
      setSyncRed(false);
      Alert.alert(t(user.language, "sync"), t(user.language, "syncOk"));
    } catch (e: any) {
      Alert.alert(t(user.language, "sync"), e?.message || t(user.language, "syncError"));
    }
  }

  useEffect(() => {
    syncNow();
  }, [site.site_id]);

  return (
    <View style={styles.container}>
      <TopBar title={site.hotel_name} syncRed={syncRed} onLogout={onLogout} onSwitchSite={onSwitchSite} onSync={syncNow} language={user.language} />

      <View style={styles.content}>
        <TouchableOpacity style={styles.bigCard} onPress={onOpenTickets}>
          <Text style={styles.bigNumber}>{tickets.length}</Text>
          <Text style={styles.bigTitle}>{t(user.language, "tickets")}</Text>
          <Text style={styles.hint}>OPEN · IN_PROGRESS · WAITING</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bigCard}>
          <Text style={styles.bigNumber}>{runs.length}</Text>
          <Text style={styles.bigTitle}>{t(user.language, "checklists")}</Text>
          <Text style={styles.hint}>OPEN · IN_PROGRESS</Text>
        </TouchableOpacity>
      </View>
          <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, gap: 14 },
  bigCard: { backgroundColor: "#fff", padding: 22, borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  bigNumber: { fontSize: 42, fontWeight: "900", color: "#0f172a" },
  bigTitle: { fontSize: 20, fontWeight: "900", color: "#0f172a" },
  hint: { marginTop: 4, color: "#64748b" },
});
