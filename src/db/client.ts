import * as SQLite from 'expo-sqlite';

/**
 * Single shared database handle. Opened lazily and reused across the app.
 * The MVP keeps all data on-device; a cloud sync layer can be added later
 * without changing this access pattern.
 */
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  distance_m REAL NOT NULL DEFAULT 0,
  ascent_m REAL NOT NULL DEFAULT 0,
  descent_m REAL NOT NULL DEFAULT 0,
  duration_s INTEGER NOT NULL DEFAULT 0,
  max_alt REAL,
  status TEXT NOT NULL DEFAULT 'recording',
  route_id TEXT
);

CREATE TABLE IF NOT EXISTS track_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  alt REAL,
  accuracy REAL,
  speed REAL,
  recorded_at INTEGER NOT NULL,
  FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_track_points_track ON track_points (track_id, recorded_at);

CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  region TEXT,
  difficulty TEXT,
  distance_m REAL NOT NULL DEFAULT 0,
  ascent_m REAL NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  geometry TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS waypoints (
  id TEXT PRIMARY KEY NOT NULL,
  route_id TEXT,
  track_id TEXT,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY NOT NULL,
  track_id TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  photo_uris TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pois (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  elevation REAL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS interest_points (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  photo_uris TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL
);
`;

/**
 * Adds any missing columns to an existing table. The MVP has no migration
 * framework, so this fills the gap for additive schema changes: existing
 * installs gain the new columns (back-filled NULL), and it is idempotent
 * because each column is only added when absent. Table and column names are
 * hardcoded constants, so interpolating them carries no injection risk.
 */
async function ensureColumns(
  db: SQLite.SQLiteDatabase,
  table: string,
  columns: { name: string; ddl: string }[],
): Promise<void> {
  const existing = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  const have = new Set(existing.map((c) => c.name));
  for (const column of columns) {
    if (!have.has(column.name)) {
      await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column.ddl}`);
    }
  }
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('hiker.db');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(SCHEMA);
  await ensureColumns(db, 'tracks', [
    { name: 'weather_temp_c', ddl: 'weather_temp_c REAL' },
    { name: 'weather_code', ddl: 'weather_code INTEGER' },
    { name: 'weather_fetched_at', ddl: 'weather_fetched_at INTEGER' },
    { name: 'route_id', ddl: 'route_id TEXT' },
  ]);
  return db;
}

/** Returns the shared database, opening and initializing it on first use. */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = open();
  }
  return dbPromise;
}

/** Generates a sortable, collision-resistant id without extra dependencies. */
export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
