# Broshare_
Broshare is Project for the University Students to cater their needs, using barter system.

## Local setup

1. Create a new MariaDB database with `mariadb -u root -p < backend/schema.sql`. For an existing installation, apply any missing files in `backend/migrations/` in numerical order. If proposals already work, run only `mariadb -u root -p broshare < backend/migrations/002_trade_history.sql`.
2. Copy `backend/.env.example` to `backend/.env`. Set the database credentials, database name and a private JWT secret.
3. In `backend/`, run `npm ci` and `npm run dev`. In a second terminal at the project root, run `npm ci` and `npm run dev`.
4. Open the Vite site on port 3000. Vite forwards `/api` and `/uploads` to Express on port 5000. In production, configure the web server to forward both paths and persist `backend/uploads` across deployments.

## Two-account smoke test

Use separate browser profiles. Have A post a textbook with a photo and B post a calculator. Check the textbook photo in A's listings and B's feed. From B, message A: verify both names and the listing title, then reply from A's inbox. Send an item proposal and a competing cash proposal for the textbook. From A's My Listings, accept the item proposal. Both listings should leave the feed, the cash proposal should no longer be pending, and `completed_trades` should contain one new row.

## Trade history

Open **Trades** to switch between Received and Sent offers. Refresh to see the latest decisions. Only the sender can withdraw a pending offer. Removing a listing hides it from the feed and My Listings, rejects pending offers involving it, and preserves the listing title in trade history. Previously hard-deleted requests cannot be recovered by the migration.

For the three-student integration test, start the backend against a **disposable database** initialized with the current schema. From `backend/`, with the same `.env` as the running server, run `node tests/trade-history.mjs`. This creates test accounts and listings, checks withdrawal permissions, competing offers, both students’ histories, a single completed-trade record, and history after listing removal. Test data is left in the disposable database.
