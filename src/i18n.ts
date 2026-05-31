export type Lang = "de" | "en" | "nl";

export const translations: Record<Lang, Record<string, string>> = {
  de: {
    appTitle: "MO-CAFM",
    mobileApp: "Mobile App",
    personnelNumber: "Personalnummer",
    password: "Passwort",
    login: "Anmelden",
    pleaseWait: "Bitte warten...",
    loginMissing: "Bitte Personalnummer und Passwort eingeben.",
    loginFailed: "Login fehlgeschlagen",
    unknownError: "Unbekannter Fehler",
    selectSite: "Objekt auswählen",
    logout: "Logout",
    loadingSites: "Lade Objekte...",
    tickets: "Tickets",
    checklists: "Checklisten",
    sync: "Sync",
    syncOk: "Daten wurden synchronisiert.",
    syncError: "Synchronisierung fehlgeschlagen.",
    syncOffline: "Gerät nicht online, bitte erst Verbindung herstellen.",
    autoLogoutTitle: "Automatischer Logout",
    autoLogoutText: "Die Sitzung wurde nach 6 Stunden beendet.",
  },
  en: {
    appTitle: "MO-CAFM",
    mobileApp: "Mobile App",
    personnelNumber: "Personnel number",
    password: "Password",
    login: "Sign in",
    pleaseWait: "Please wait...",
    loginMissing: "Please enter personnel number and password.",
    loginFailed: "Login failed",
    unknownError: "Unknown error",
    selectSite: "Select property",
    logout: "Logout",
    loadingSites: "Loading properties...",
    tickets: "Tickets",
    checklists: "Checklists",
    sync: "Sync",
    syncOk: "Data has been synchronized.",
    syncError: "Synchronization failed.",
    syncOffline: "Device is not online. Please connect first.",
    autoLogoutTitle: "Automatic logout",
    autoLogoutText: "The session was ended after 6 hours.",
  },
  nl: {
    appTitle: "MO-CAFM",
    mobileApp: "Mobiele app",
    personnelNumber: "Personeelsnummer",
    password: "Wachtwoord",
    login: "Inloggen",
    pleaseWait: "Even geduld...",
    loginMissing: "Voer personeelsnummer en wachtwoord in.",
    loginFailed: "Inloggen mislukt",
    unknownError: "Onbekende fout",
    selectSite: "Object selecteren",
    logout: "Uitloggen",
    loadingSites: "Objecten laden...",
    tickets: "Tickets",
    checklists: "Checklists",
    sync: "Sync",
    syncOk: "Gegevens zijn gesynchroniseerd.",
    syncError: "Synchronisatie mislukt.",
    syncOffline: "Apparaat is niet online. Maak eerst verbinding.",
    autoLogoutTitle: "Automatisch uitloggen",
    autoLogoutText: "De sessie is na 6 uur beëindigd.",
  },
};

export function getLang(language?: string): Lang {
  if (language === "en") return "en";
  if (language === "nl") return "nl";
  return "de";
}

export function t(language: string | undefined, key: string): string {
  const lang = getLang(language);
  return translations[lang][key] || translations.de[key] || key;
}
