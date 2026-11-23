-- Remember when an admin removed a listing photo so the owner can be told
-- and offered a chance to upload an appropriate replacement.
ALTER TABLE items
  ADD COLUMN photo_removed_by_admin TINYINT(1) NOT NULL DEFAULT 0;
