import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("mo_cafm_mobile.db");

export function initDb() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS cached_sites (
      site_id TEXT PRIMARY KEY NOT NULL,
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cached_tickets (
      id INTEGER PRIMARY KEY NOT NULL,
      site_id TEXT NOT NULL,
      status TEXT NOT NULL,
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cached_checklists (
      id INTEGER PRIMARY KEY NOT NULL,
      site_id TEXT NOT NULL,
      status TEXT NOT NULL,
      json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

export function setSyncValue(key: string, value: string) {
  db.runSync(
    "INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?);",
    key,
    value
  );
}

export function getSyncValue(key: string): string | null {
  const row = db.getFirstSync<{ value: string }>(
    "SELECT value FROM sync_state WHERE key = ?;",
    key
  );
  return row?.value ?? null;
}

export function setDirty(value: boolean) {
  setSyncValue("dirty", value ? "1" : "0");
}

export function isDirty(): boolean {
  return getSyncValue("dirty") === "1";
}

export function setLastSyncNow() {
  setSyncValue("last_sync_at", new Date().toISOString());
  setDirty(false);
}

export function getLastSyncAt(): string | null {
  return getSyncValue("last_sync_at");
}

export function cacheSites(sites: any[]) {
  const now = new Date().toISOString();
  db.withTransactionSync(() => {
    for (const site of sites) {
      db.runSync(
        "INSERT OR REPLACE INTO cached_sites (site_id, json, updated_at) VALUES (?, ?, ?);",
        site.site_id,
        JSON.stringify(site),
        now
      );
    }
  });
}

export function getCachedSites(): any[] {
  const rows = db.getAllSync<{ json: string }>(
    "SELECT json FROM cached_sites ORDER BY site_id;"
  );
  return rows.map((r) => JSON.parse(r.json));
}

export function cacheTickets(tickets: any[]) {
  const now = new Date().toISOString();
  db.withTransactionSync(() => {
    for (const ticket of tickets) {
      db.runSync(
        "INSERT OR REPLACE INTO cached_tickets (id, site_id, status, json, updated_at) VALUES (?, ?, ?, ?, ?);",
        ticket.id,
        ticket.site_id,
        ticket.status,
        JSON.stringify(ticket),
        now
      );
    }

    db.runSync("DELETE FROM cached_tickets WHERE status = 'DONE';");
  });
}

export function getCachedTickets(siteId: string): any[] {
  const rows = db.getAllSync<{ json: string }>(
    "SELECT json FROM cached_tickets WHERE site_id = ? AND status <> 'DONE' ORDER BY id DESC;",
    siteId
  );
  return rows.map((r) => JSON.parse(r.json));
}

export function cacheChecklists(runs: any[]) {
  const now = new Date().toISOString();
  db.withTransactionSync(() => {
    for (const run of runs) {
      db.runSync(
        "INSERT OR REPLACE INTO cached_checklists (id, site_id, status, json, updated_at) VALUES (?, ?, ?, ?, ?);",
        run.id,
        run.site_id,
        run.status,
        JSON.stringify(run),
        now
      );
    }

    db.runSync("DELETE FROM cached_checklists WHERE status NOT IN ('OPEN','IN_PROGRESS');");
  });
}

export function getCachedChecklists(siteId: string): any[] {
  const rows = db.getAllSync<{ json: string }>(
    "SELECT json FROM cached_checklists WHERE site_id = ? AND status IN ('OPEN','IN_PROGRESS') ORDER BY id DESC;",
    siteId
  );
  return rows.map((r) => JSON.parse(r.json));
}
