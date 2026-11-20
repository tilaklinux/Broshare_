ALTER TABLE barter_requests MODIFY status ENUM('pending','accepted','rejected','withdrawn') NOT NULL DEFAULT 'pending';
-- Keep item references intact when owners remove listings from the marketplace.
ALTER TABLE items MODIFY status ENUM('available','bartered','deleted') DEFAULT 'available';
