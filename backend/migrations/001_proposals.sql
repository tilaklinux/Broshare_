CREATE TABLE IF NOT EXISTS barter_requests (
 id INT AUTO_INCREMENT PRIMARY KEY,
 target_item_id INT NOT NULL,
 offered_item_id INT,
 requester_id INT NOT NULL,
 kind ENUM('item','cash','free') NOT NULL,
 amount DECIMAL(10,2),
 status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
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
