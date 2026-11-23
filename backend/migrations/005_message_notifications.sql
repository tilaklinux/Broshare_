-- Track which messages the receiver has opened so the Inbox can show unread
-- counters and new-message popups.
ALTER TABLE messages
  ADD COLUMN read_at TIMESTAMP NULL DEFAULT NULL,
  ADD INDEX idx_messages_unread (receiver_id, read_at, sender_id);

-- Messages that existed before this feature were already visible in the old
-- Inbox, so start everyone with a clean counter.
UPDATE messages SET read_at = created_at WHERE read_at IS NULL;
