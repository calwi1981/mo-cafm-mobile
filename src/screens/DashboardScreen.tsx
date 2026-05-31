import { Footer } from "../components/Footer";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { readChecklistsFromCache, readTicketsFromCache, syncCurrentSite } from "../cacheService";
import { TopBar } from "../components/TopBar";
import { ChecklistRun, Site, Ticket, User } from "../types/models";
import { t } from "../i18n";
import { pendingQueueCount } from "../syncQueue";
import { notify } from "../notify";
import { getSyncRed } from "../syncState";

type Props = {
  onOpenTickets: () => void;
  onOpenChecklists: () => void;
  user: User;
  site: Site;
  onLogout: () => void;
  onSwitchSite: () => void;
};

export function DashboardScreen({ user, site, onLogout, onSwitchSite, onOpenTickets, onOpenChecklists }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [runs, setRuns] = useState<ChecklistRun[]>([]);
  const [syncRed, setSyncRed] = useState(false);
  const [pendingCount, setPendingCount] = useState(pendingQueueCount());

  async function syncNow() {
    const state = await NetInfo.fetch();
    if (!state.isConnected || state.isInternetReachable === false) {
      setSyncRed(true);
      setPendingCount(pendingQueueCount());
      notify(t(user.language, "sync"), t(user.language, "syncOffline"));
      return;
    }

    try {
      await syncCurrentSite(user.id, site.site_id);
      const nextTickets = readTicketsFromCache(site.site_id);
      const nextRuns = readChecklistsFromCache(site.site_id);

      setTickets(nextTickets);
      setRuns(nextRuns);
      setSyncRed(false);
      setPendingCount(pendingQueueCount());
    } catch (e: any) {
      notify(t(user.language, "sync"), e?.message || t(user.language, "syncError"));
    }
  }

  function loadLocalDashboard() {
    setTickets(readTicketsFromCache(site.site_id));
    setRuns(readChecklistsFromCache(site.site_id));
    setPendingCount(pendingQueueCount());
    setSyncRed(getSyncRed() || pendingQueueCount() > 0);
  }

  useEffect(() => {
    loadLocalDashboard();
  }, [site.site_id]);

  return (
    <View style={styles.container}>
      <TopBar title={site.hotel_name} syncRed={syncRed} pendingCount={pendingCount} onLogout={onLogout} onSwitchSite={onSwitchSite} onSync={syncNow} language={user.language} />

      <View style={styles.content}>
        <TouchableOpacity style={styles.bigCard} onPress={onOpenTickets}>
          <Text style={styles.bigNumber}>{tickets.length}</Text>
          <Text style={styles.bigTitle}>{t(user.language, "tickets")}</Text>
          <Text style={styles.hint}>OPEN · IN_PROGRESS · WAITING</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bigCard} onPress={onOpenChecklists}>
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
