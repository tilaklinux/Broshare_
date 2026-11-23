-- ============================================
-- HostelBarter Database Schema
-- Run this SQL in your MySQL database to set up
-- ============================================

CREATE DATABASE IF NOT EXISTS broshare;
USE broshare;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  hostel_name VARCHAR(100) NOT NULL,
  room_number VARCHAR(20) NOT NULL,
  role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category ENUM('Books', 'Electronics', 'Accessories', 'Essentials', 'Other') NOT NULL,
  looking_for VARCHAR(255) NOT NULL,
  image_url VARCHAR(500) DEFAULT NULL,
  photo_removed_by_admin TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('available', 'bartered', 'deleted') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  item_id INT DEFAULT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
);

-- Indexes for faster queries
CREATE INDEX idx_items_user ON items(user_id);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_item ON messages(item_id);
CREATE INDEX idx_messages_unread ON messages(receiver_id, read_at, sender_id);
CREATE TABLE IF NOT EXISTS barter_requests (
 id INT AUTO_INCREMENT PRIMARY KEY,
 target_item_id INT NOT NULL,
 offered_item_id INT,
 requester_id INT NOT NULL,
 kind ENUM('item','cash','free') NOT NULL,
 amount DECIMAL(10,2),
 status ENUM('pending','accepted','rejected','withdrawn','cancelled') NOT NULL DEFAULT 'pending',
 FOREIGN KEY (target_item_id) REFERENCES items(id) ON DELETE CASCADE,
 FOREIGN KEY (offered_item_id) REFERENCES items(id) ON DELETE CASCADE,
 FOREIGN KEY (requester_id) REFERENCES users(id),
 CHECK ((kind='item' AND offered_item_id IS NOT NULL AND amount IS NULL) OR
        (kind='cash' AND amount IS NOT NULL AND amount>0 AND offered_item_id IS NULL) OR
        (kind='free' AND amount IS NULL AND offered_item_id IS NULL))
);
-- Immutable snapshot: deleting a listing must not erase a completed exchange.
CREATE TABLE IF NOT EXISTS completed_trades (
 request_id INT PRIMARY KEY, target_item_id INT NOT NULL, offered_item_id INT,
 requester_id INT NOT NULL, owner_id INT NOT NULL, kind ENUM('item','cash','free') NOT NULL,
 amount DECIMAL(10,2), completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Moderation audit log
CREATE TABLE IF NOT EXISTS admin_actions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NULL,
  action VARCHAR(80) NOT NULL,
  target_type ENUM('listing', 'photo', 'user', 'proposal') NOT NULL,
  target_id INT NULL,
  target_label VARCHAR(255) NULL,
  details VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_admin_actions_created ON admin_actions(created_at);
