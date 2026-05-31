import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { Site, User } from "./types/models";

let webUser: User | null = null;
let webSite: Site | null = null;

const USER_KEY = "mo_cafm_user";
const SITE_KEY = "mo_cafm_site";

export async function saveSession(user: User, site?: Site | null) {
  if (Platform.OS === "web") {
    webUser = user;
    if (site) webSite = site;
    return;
  }

  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  if (site) {
    await SecureStore.setItemAsync(SITE_KEY, JSON.stringify(site));
  }
}

export async function saveCurrentSite(site: Site) {
  if (Platform.OS === "web") {
    webSite = site;
    return;
  }

  await SecureStore.setItemAsync(SITE_KEY, JSON.stringify(site));
}

export async function loadSession(): Promise<{ user: User | null; site: Site | null }> {
  if (Platform.OS === "web") {
    return { user: webUser, site: webSite };
  }

  const userRaw = await SecureStore.getItemAsync(USER_KEY);
  const siteRaw = await SecureStore.getItemAsync(SITE_KEY);

  return {
    user: userRaw ? JSON.parse(userRaw) : null,
    site: siteRaw ? JSON.parse(siteRaw) : null,
  };
}

export async function clearSession() {
  if (Platform.OS === "web") {
    webUser = null;
    webSite = null;
    return;
  }

  await SecureStore.deleteItemAsync(USER_KEY);
  await SecureStore.deleteItemAsync(SITE_KEY);
}
