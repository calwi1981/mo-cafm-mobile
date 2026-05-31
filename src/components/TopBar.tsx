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
};

export function TopBar({ title, syncRed, onLogout, onSwitchSite, onSync, language }: Props) {
  return (
    <View style={styles.bar}>
      <TouchableOpacity onPress={onLogout} style={styles.smallButton}>
        <Text style={styles.smallButtonText}>{t(language, "logout")}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSwitchSite} style={styles.titleBox}>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSync} style={[styles.syncButton, syncRed ? styles.red : styles.green]}>
        <Text style={styles.syncText}>{t(language, "sync")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: "#0f172a" },
  smallButton: { paddingVertical: 9, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#334155" },
  smallButtonText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  titleBox: { flex: 1 },
  title: { color: "#fff", fontSize: 16, fontWeight: "800", textAlign: "center" },
  syncButton: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8 },
  green: { backgroundColor: "#16a34a" },
  red: { backgroundColor: "#dc2626" },
  syncText: { color: "#fff", fontWeight: "800", fontSize: 12 },
});
