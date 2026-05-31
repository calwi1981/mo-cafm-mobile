import { Footer } from "../components/Footer";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { login } from "../api/moCafm";
import { User } from "../types/models";
import { t } from "../i18n";
import { notify } from "../notify";

type Props = {
  onLogin: (user: User) => void;
  language?: string;
};

export function LoginScreen({ onLogin, language }: Props) {
  const [personnelNumber, setPersonnelNumber] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!personnelNumber.trim() || !password.trim()) {
      notify("Login", t(language, "loginMissing"));
      return;
    }

    try {
      setBusy(true);
      const res = await login(personnelNumber.trim(), password.trim());
      onLogin(res.user);
    } catch (e: any) {
      notify(t(language, "loginFailed"), e?.message || t(language, "unknownError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t(language, "appTitle")}</Text>
      <Text style={styles.subtitle}>{t(language, "mobileApp")}</Text>

      <TextInput
        style={styles.input}
        placeholder={t(language, "personnelNumber")}
        value={personnelNumber}
        onChangeText={setPersonnelNumber}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder={t(language, "password")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={submit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? t(language, "pleaseWait") : t(language, "login")}</Text>
      </TouchableOpacity>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#f8fafc" },
  title: { fontSize: 34, fontWeight: "900", color: "#0f172a", textAlign: "center" },
  subtitle: { fontSize: 16, color: "#475569", textAlign: "center", marginBottom: 32 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: "#0f172a", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
