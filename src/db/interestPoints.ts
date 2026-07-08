import { createId, getDatabase } from './client';
import type { InterestPoint, WaypointType } from './types';

interface InterestPointRow {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  description: string;
  photo_uris: string;
  created_at: number;
}

function mapRow(row: InterestPointRow): InterestPoint {
  let photoUris: string[] = [];
  try {
    photoUris = JSON.parse(row.photo_uris) as string[];
  } catch {
    photoUris = [];
  }
  return {
    id: row.id,
    name: row.name,
    category: row.category as WaypointType,
    lat: row.lat,
    lon: row.lon,
    description: row.description,
    photoUris,
    createdAt: row.created_at,
  };
}

/** Every user-created interest point, newest first. */
export async function getAllInterestPoints(): Promise<InterestPoint[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<InterestPointRow>(
    'SELECT * FROM interest_points ORDER BY created_at DESC',
  );
  return rows.map(mapRow);
}

export type InterestPointInput = Omit<InterestPoint, 'id' | 'createdAt'>;

/** Inserts a new interest point and returns the persisted record. */
export async function addInterestPoint(input: InterestPointInput): Promise<InterestPoint> {
  const db = await getDatabase();
  const id = createId();
  const createdAt = Date.now();
  await db.runAsync(
    `INSERT INTO interest_points (id, name, category, lat, lon, description, photo_uris, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name,
    input.category,
    input.lat,
    input.lon,
    input.description,
    JSON.stringify(input.photoUris),
    createdAt,
  );
  return { ...input, id, createdAt };
}

/** Overwrites the editable fields of an interest point (position stays put). */
export async function updateInterestPoint(id: string, patch: InterestPointInput): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE interest_points
       SET name = ?, category = ?, lat = ?, lon = ?, description = ?, photo_uris = ?
     WHERE id = ?`,
    patch.name,
    patch.category,
    patch.lat,
    patch.lon,
    patch.description,
    JSON.stringify(patch.photoUris),
    id,
  );
}

export async function deleteInterestPoint(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM interest_points WHERE id = ?', id);
}
