import { deleteAllRegions } from '@/map/offlineTiles';
import { clearAllPhotos } from '@/media/photos';

import { getDatabase } from './client';
import { seedPoisIfEmpty } from './pois';

/**
 * Erases all user-generated content from the on-device database and restores the
 * bundled defaults. Clears hikes (and their points, waypoints, and journal
 * entries via foreign-key cascade), routes, standalone waypoints, emergency
 * contacts, curated POIs, and the user's interest points, then re-seeds the
 * bundled POI dataset. Also removes all downloaded offline map packs and every
 * interest-point photo, which live outside SQLite (MapLibre's native store and
 * the document directory respectively).
 *
 * App preferences in the `settings` table (theme, language, map layers) are
 * intentionally preserved — they are not user content and resetting them would be
 * a jarring surprise. Callers must ensure no recording is in progress before
 * invoking this; deleting the active track mid-recording would corrupt live state.
 */
export async function resetAllData(): Promise<void> {
  const db = await getDatabase();
  await db.withExclusiveTransactionAsync(async (txn) => {
    // Order is defensive; cascades cover the dependents, but explicit deletes
    // keep this correct even if a foreign key is ever dropped.
    await txn.execAsync('DELETE FROM journal_entries');
    await txn.execAsync('DELETE FROM waypoints');
    await txn.execAsync('DELETE FROM track_points');
    await txn.execAsync('DELETE FROM tracks');
    await txn.execAsync('DELETE FROM routes');
    await txn.execAsync('DELETE FROM emergency_contacts');
    await txn.execAsync('DELETE FROM pois');
    await txn.execAsync('DELETE FROM interest_points');
  });
  // Re-seed outside the transaction above: seedPoisIfEmpty opens its own
  // exclusive transaction, which cannot be nested inside the one above.
  await seedPoisIfEmpty();
  // Offline packs and interest-point photos are not in SQLite, so remove them
  // separately.
  await deleteAllRegions();
  clearAllPhotos();
}
