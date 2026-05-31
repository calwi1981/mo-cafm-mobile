import { Alert, Platform } from "react-native";

export function notify(title: string, message?: string) {
  const text = message ? `${title}\n\n${message}` : title;

  if (Platform.OS === "web" && typeof globalThis.alert === "function") {
    globalThis.alert(text);
    return;
  }

  Alert.alert(title, message);
}
