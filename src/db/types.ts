/**
 * Domain types shared across the data layer and UI.
 *
 * All distances are in meters, durations in seconds, timestamps in epoch
 * milliseconds, and coordinates in WGS84 degrees.
 */

export type TrackStatus = 'recording' | 'paused' | 'completed';

export interface Track {
  id: string;
  name: string;
  startedAt: number;
  endedAt: number | null;
  distanceM: number;
  ascentM: number;
  descentM: number;
  durationS: number;
  maxAlt: number | null;
  status: TrackStatus;
  /** The followed route this hike was recorded against, if any. */
  routeId: string | null;
  /** Air temperature (°C) captured at the start of the hike, if available. */
  weatherTempC: number | null;
  /** WMO weather code captured at the start of the hike, if available. */
  weatherCode: number | null;
  /** When the weather snapshot was fetched (epoch ms), if available. */
  weatherFetchedAt: number | null;
}

export interface TrackPoint {
  id: number;
  trackId: string;
  lat: number;
  lon: number;
  alt: number | null;
  accuracy: number | null;
  speed: number | null;
  recordedAt: number;
}

/** A single GPS sample before it is persisted (no row id yet). */
export type TrackPointInput = Omit<TrackPoint, 'id'>;

export type RouteSource = 'osm' | 'gpx' | 'manual' | 'remote';

export type RouteDifficulty = 'easy' | 'moderate' | 'hard' | 'expert';

export interface Route {
  id: string;
  name: string;
  region: string | null;
  difficulty: RouteDifficulty | null;
  distanceM: number;
  ascentM: number;
  source: RouteSource;
  /** GeoJSON LineString geometry, [lon, lat] coordinate order. */
  geometry: GeoJSON.LineString;
}

export type WaypointType =
  | 'water'
  | 'campsite'
  | 'peak'
  | 'junction'
  | 'hut'
  | 'shelter'
  | 'view'
  | 'other';

export interface Waypoint {
  id: string;
  routeId: string | null;
  trackId: string | null;
  lat: number;
  lon: number;
  name: string;
  type: WaypointType;
}

/**
 * A curated point of interest (mountain hut, water source, shelter, …) shown as
 * a toggleable map layer. Bundled POIs are seeded from `src/data/pois.json`;
 * `category` reuses {@link WaypointType} so POIs and user waypoints share the
 * same icon/color metadata. Coordinates are WGS84 degrees.
 */
export interface Poi {
  id: string;
  name: string;
  category: WaypointType;
  lat: number;
  lon: number;
  elevation: number | null;
  note: string | null;
}

/**
 * A user-created interest point dropped on the map with a description and
 * photos. Unlike the curated {@link Poi} dataset (read-only, seeded) these are
 * user content: created by long-pressing the map, editable, and wiped on reset.
 * `category` reuses {@link WaypointType} so it shares the same icon/color
 * metadata; `photoUris` are persisted copies in the document directory.
 * Coordinates are WGS84 degrees; `createdAt` is epoch milliseconds.
 */
export interface InterestPoint {
  id: string;
  name: string;
  category: WaypointType;
  lat: number;
  lon: number;
  description: string;
  photoUris: string[];
  createdAt: number;
}

export interface JournalEntry {
  id: string;
  trackId: string;
  note: string;
  photoUris: string[];
  createdAt: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}
