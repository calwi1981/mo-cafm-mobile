import React, { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AUTO_LOGOUT_HOURS } from "./src/config";
import { LoginScreen } from "./src/screens/LoginScreen";
import { SiteSelectScreen } from "./src/screens/SiteSelectScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { TicketsScreen } from "./src/screens/TicketsScreen";
import { ChecklistsScreen } from "./src/screens/ChecklistsScreen";
import { Site, User } from "./src/types/models";
import { t } from "./src/i18n";
import { initDb } from "./src/db/database";

type AppScreen = "dashboard" | "tickets" | "checklists";

export default function App() {
  initDb();
  const [user, setUser] = useState<User | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [screen, setScreen] = useState<AppScreen>("dashboard");
  const loginAtRef = useRef<number | null>(null);

  function logout() {
    setUser(null);
    setSite(null);
    setScreen("dashboard");
    loginAtRef.current = null;
  }

  function handleLogin(nextUser: User) {
    loginAtRef.current = Date.now();
    setUser(nextUser);
  }

  function switchSite() {
    setSite(null);
    setScreen("dashboard");
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (!loginAtRef.current) return;
      const diffHours = (Date.now() - loginAtRef.current) / 1000 / 60 / 60;
      if (diffHours >= AUTO_LOGOUT_HOURS) {
        Alert.alert(t(user?.language, "autoLogoutTitle"), t(user?.language, "autoLogoutText"));
        logout();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [user?.language]);

  return (
    <>
      <StatusBar style="auto" />

      {!user ? (
        <LoginScreen onLogin={handleLogin} language="de" />
      ) : !site ? (
        <SiteSelectScreen
          user={user}
          onSelect={(nextSite) => {
            setSite(nextSite);
            setScreen("dashboard");
          }}
          onLogout={logout}
        />
      ) : screen === "tickets" ? (
        <TicketsScreen
          user={user}
          site={site}
          onBack={() => setScreen("dashboard")}
          onLogout={logout}
          onSwitchSite={switchSite}
        />
      ) : screen === "checklists" ? (
        <ChecklistsScreen
          user={user}
          site={site}
          onBack={() => setScreen("dashboard")}
          onLogout={logout}
          onSwitchSite={switchSite}
        />
      ) : (
        <DashboardScreen
          user={user}
          site={site}
          onLogout={logout}
          onSwitchSite={switchSite}
          onOpenTickets={() => setScreen("tickets")}
          onOpenChecklists={() => setScreen("checklists")}
        />
      )}
    </>
  );
}
