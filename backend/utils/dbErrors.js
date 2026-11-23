// Turn common MariaDB failures into an answer that tells the user what to
// do, instead of a generic "please retry". Unknown errors keep the original
// database message so the real cause is visible in the UI and logs.
export function describeDbError(err, fallback) {
  switch (err?.code) {
    case 'ER_BAD_FIELD_ERROR':
      return 'Your database is missing a column this feature needs. Run backend/migrations/006_repair_listing_deletion.sql (and any other missing files in backend/migrations), then restart the backend.';
    case 'ER_NO_SUCH_TABLE':
      return 'Your database is missing a table this feature needs. Apply the files in backend/migrations in order, then restart the backend.';
    case 'WARN_DATA_TRUNCATED':
    case 'ER_DATA_TOO_LONG':
    case 'ER_WARN_DATA_OUT_OF_RANGE':
      return "Your database cannot store the 'deleted' status yet. Run backend/migrations/006_repair_listing_deletion.sql, then restart the backend.";
    default:
      return err?.message ? `${fallback} (${err.message})` : fallback;
  }
}
