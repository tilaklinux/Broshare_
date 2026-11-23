-- Repair migration for "photo deletes work, but deleting a listing fails".
-- Listing deletion needs all three of these; photo deletion needs none of
-- them, which is why one can work while the other fails. Every statement is
-- safe to run even if your database already has it.

-- 1. items.status must be able to store 'deleted' (from 002_trade_history).
ALTER TABLE items
  MODIFY status ENUM('available', 'bartered', 'deleted') DEFAULT 'available';

-- 2. Deleting a listing clears this flag (from 004_photo_reupload).
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS photo_removed_by_admin TINYINT(1) NOT NULL DEFAULT 0;

-- 3. Deleting a listing rejects its pending proposals, and cancelling a
--    proposal as an admin needs 'cancelled' (from 002/003).
ALTER TABLE barter_requests
  MODIFY status ENUM('pending', 'accepted', 'rejected', 'withdrawn', 'cancelled') NOT NULL DEFAULT 'pending';
