import React, { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AUTO_LOGOUT_HOURS } from "./src/config";
import { LoginScreen } from "./src/screens/LoginScreen";
import { SiteSelectScreen } from "./src/screens/SiteSelectScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { Site, User } from "./src/types/models";
import { t } from "./src/i18n";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const loginAtRef = useRef<number | null>(null);

  function logout() {
    setUser(null);
    setSite(null);
    loginAtRef.current = null;
  }

  function handleLogin(nextUser: User) {
    loginAtRef.current = Date.now();
    setUser(nextUser);
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
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      {!user ? (
        <LoginScreen onLogin={handleLogin} language="de" />
      ) : !site ? (
        <SiteSelectScreen user={user} onSelect={setSite} onLogout={logout} />
      ) : (
        <DashboardScreen user={user} site={site} onLogout={logout} onSwitchSite={() => setSite(null)} />
      )}
    </>
  );
}
