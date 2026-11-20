# Broshare_
Broshare is Project for the University Students to cater their needs, using barter system.

## Local setup

1. Create a new MariaDB database with `mariadb -u root -p < backend/schema.sql`. For an existing installation, apply only `backend/migrations/001_proposals.sql` to your existing database instead.
2. Copy `backend/.env.example` to `backend/.env`. Set the database credentials, database name and a private JWT secret.
3. In `backend/`, run `npm ci` and `npm run dev`. In a second terminal at the project root, run `npm ci` and `npm run dev`.
4. Open the Vite site on port 3000. Vite forwards `/api` and `/uploads` to Express on port 5000. In production, configure the web server to forward both paths and persist `backend/uploads` across deployments.

## Two-account smoke test

Use separate browser profiles. Have A post a textbook with a photo and B post a calculator. Check the textbook photo in A's listings and B's feed. From B, message A: verify both names and the listing title, then reply from A's inbox. Send an item proposal and a competing cash proposal for the textbook. From A's My Listings, accept the item proposal. Both listings should leave the feed, the cash proposal should no longer be pending, and `completed_trades` should contain one new row.
