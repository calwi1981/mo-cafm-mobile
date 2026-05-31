import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function Footer() {
  return (
    <View style={styles.footer}>
      <Text style={styles.text}>© {new Date().getFullYear()} Markus A. Bross</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { padding: 8, alignItems: "center" },
  text: { color: "#94a3b8", fontSize: 11 },
});
