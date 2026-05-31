import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { t } from "../i18n";

type Props = {
  title: string;
  syncRed?: boolean;
  onLogout?: () => void;
  onSwitchSite?: () => void;
  onSync?: () => void;
  language?: string;
  pendingCount?: number;
};

export function TopBar({ title, syncRed, onLogout, onSwitchSite, onSync, language, pendingCount = 0 }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bar}>
        <TouchableOpacity onPress={onLogout} style={styles.smallButton}>
          <Text style={styles.smallButtonText}>{t(language, "logout")}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onSwitchSite} style={styles.switchButton}>
          <Text style={styles.smallButtonText}>{t(language, "switchSite")}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onSync} style={[styles.syncButton, syncRed ? styles.red : styles.green]}>
          <Text style={styles.syncText}>{t(language, "sync")}{pendingCount > 0 ? ` (${pendingCount})` : ""}</Text>
        </TouchableOpacity>
      </View>

      <Text numberOfLines={1} style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: "#0f172a", paddingBottom: 8 },
  bar: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, paddingBottom: 6 },
  smallButton: { paddingVertical: 9, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#334155" },
  switchButton: { flex: 1, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#334155", alignItems: "center" },
  smallButtonText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  title: { color: "#cbd5e1", fontSize: 13, fontWeight: "700", textAlign: "center", paddingHorizontal: 12 },
  syncButton: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8 },
  green: { backgroundColor: "#16a34a" },
  red: { backgroundColor: "#dc2626" },
  syncText: { color: "#fff", fontWeight: "800", fontSize: 12 },
});
