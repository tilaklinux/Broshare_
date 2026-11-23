-- Admin roles and account suspension.
-- Existing accounts remain regular active students. Promote an account only
-- with a deliberate SQL update after applying this migration, for example:
-- UPDATE users SET role = 'admin' WHERE email = 'you@example.com';

ALTER TABLE barter_requests
  MODIFY status ENUM('pending', 'accepted', 'rejected', 'withdrawn', 'cancelled') NOT NULL DEFAULT 'pending';

ALTER TABLE users
  ADD COLUMN role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  ADD COLUMN status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
  ADD INDEX idx_users_role_status (role, status);

-- A record of moderation actions. target_label keeps the activity readable
-- even after the target listing or user has been removed.
CREATE TABLE IF NOT EXISTS admin_actions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NULL,
  action VARCHAR(80) NOT NULL,
  target_type ENUM('listing', 'photo', 'user', 'proposal') NOT NULL,
  target_id INT NULL,
  target_label VARCHAR(255) NULL,
  details VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_admin_actions_created (created_at),
  INDEX idx_admin_actions_target (target_type, target_id)
);
