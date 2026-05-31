import { Footer } from "../components/Footer";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { syncSites } from "../cacheService";
import { Site, User } from "../types/models";
import { t } from "../i18n";
import { notify } from "../notify";

type Props = {
  user: User;
  onSelect: (site: Site) => void;
  onLogout: () => void;
};

export function SiteSelectScreen({ user, onSelect, onLogout }: Props) {
  const [sites, setSites] = useState<Site[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const rows = await syncSites(user.id);
        setSites(rows);
      } catch (e: any) {
        notify("Objekte", e?.message || "Objekte konnten nicht geladen werden.");
      } finally {
        setBusy(false);
      }
    }
    load();
  }, [user.id]);

  return (
    <View style={styles.container}>
      <View style={styles.head}>
        <Text style={styles.title}>{t(user.language, "selectSite")}</Text>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logout}>{t(user.language, "logout")}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.user}>{user.display_name}</Text>

      {busy ? <Text>{t(user.language, "loadingSites")}</Text> : null}

      <FlatList
        data={sites}
        keyExtractor={(item) => item.site_id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => onSelect(item)}>
            <Text style={styles.cardTitle}>{item.hotel_name}</Text>
            <Text style={styles.cardSub}>{[item.brand, item.city, item.country_code].filter(Boolean).join(" · ")}</Text>
          </TouchableOpacity>
        )}
      />
          <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8fafc" },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontSize: 24, fontWeight: "900", color: "#0f172a" },
  logout: { color: "#dc2626", fontWeight: "800" },
  user: { color: "#64748b", marginBottom: 16 },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  cardTitle: { fontSize: 17, fontWeight: "900", color: "#0f172a" },
  cardSub: { marginTop: 4, color: "#64748b" },
});
