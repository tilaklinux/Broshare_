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

## Admin panel

Apply the admin migration to an existing database:

```bash
mariadb -u root -p broshare < backend/migrations/003_admin_panel.sql
```

There is deliberately no “register as admin” option. Register a normal account first, then promote that one account directly in MariaDB:

```bash
mariadb -u root -p broshare -e "UPDATE users SET role='admin', status='active' WHERE email='your-email@example.com';"
```

Restart Express, refresh the site (or sign out and back in), and open **Admin** in the navigation bar. Instead of the SQL update, you can run `npm run make-admin -- your-email@example.com` from `backend/` after registering. Admin authority is checked from MariaDB by Express on every admin request, so changing a role or suspending an account takes effect immediately.

Admins can:

- see user, listing, photo, proposal, completed-trade, and message totals;
- search and filter every listing status, including removed listings;
- enlarge a listing photo, remove only its photo, delete the whole listing, or restore a removed listing;
- search users, suspend/reactivate accounts, promote/demote admins, and permanently delete user accounts;
- cancel a pending proposal and review an audit log of moderation actions.

Removing a photo deletes its file from `backend/uploads`. Deleting a listing hides it from the marketplace, rejects pending proposals involving it, deletes its photo file, and preserves resolved trade titles. Suspending a student signs out their existing sessions, hides their listings, prevents new sign-ins, and rejects their pending proposals. Deleting a user is permanent: it removes their account, listings, messages, proposals, and uploaded photo files.

### Admin integration test

Start the backend against a **disposable database** initialized with the current schema. From `backend/`, with the same `.env` used by the running server, run:

```bash
node tests/admin-panel.mjs
```

It creates test accounts, promotes one directly in the test database, and checks admin/non-admin access, photo and listing deletion, proposal cancellation, suspension/reactivation, role changes, protected self-actions, permanent user deletion, and the audit log. Test accounts and listings are left in the disposable database.

## Re-uploading a listing photo

If an admin removes a listing photo, the owner will see a notice in **My Listings** — “An admin removed this listing's photo” — with an **Upload photo** button to add an appropriate replacement. Listings that simply never had a photo get the same upload option. Existing databases need the flag that records an admin removal:

```bash
mariadb -u root -p broshare < backend/migrations/004_photo_reupload.sql
```

Only the listing owner can upload to their listing, the listing must not be deleted, and the same JPG/PNG/GIF/WebP and 5 MB limits apply. Uploading clears the admin-removal notice.
