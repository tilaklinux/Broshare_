-- Password reset support. Only a SHA-256 hash of the reset token is stored,
-- never the token itself, and it expires 30 minutes after it is requested.
ALTER TABLE users
  ADD COLUMN reset_token_hash CHAR(64) NULL,
  ADD COLUMN reset_token_expires TIMESTAMP NULL,
  ADD COLUMN password_changed_at TIMESTAMP NULL,
  ADD INDEX idx_users_reset_token (reset_token_hash);
