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

## Message notifications

The **Inbox** navigation button shows a red badge with the number of students who have unopened messages for you. Inside the Inbox, each conversation shows its own unread count and the total is summarized in the heading. When a new message arrives, a pop-up appears in the corner with the sender's name and a preview — click it to open that chat. Opening a conversation marks its messages as read and clears its counters.

Existing databases need the read-tracking column:

```bash
mariadb -u root -p broshare < backend/migrations/005_message_notifications.sql
```

Messages from before the migration are treated as already read, so counters start clean. To test the counters against a disposable database, start the backend and run `node tests/message-notifications.mjs` from `backend/`.

## Managing your listings

In **My Listings** you can **Update photo** on any listing to replace its picture (the old photo file is removed), upload a photo to a listing that has none, and **Delete** a listing you no longer need. Deleting removes the listing from the marketplace and your listings, deletes its photo file, and cancels pending proposals for it; completed-trade history stays readable. Only the owner can do any of this. To verify against a disposable database, run `node tests/listing-management.mjs` from `backend/`.

## Troubleshooting: listing deletion fails but photo deletion works

Deleting a listing additionally needs `items.status` to accept `'deleted'`, the `photo_removed_by_admin` column, and the `barter_requests` table. If an older database skipped a migration, photo removal still works while owner and admin listing deletion fail. Run the repair script (safe to run more than once), then restart Express:

```bash
mariadb -u root -p broshare < backend/migrations/006_repair_listing_deletion.sql
```

The API now reports the specific database problem in the error message instead of only “please retry”, and the same detail is printed in the Express terminal. Note that a deleted listing intentionally remains visible to admins under the **Deleted** status (with a Restore option); it disappears from the marketplace and from the owner's My Listings immediately.

## Forgot password (free)

The login page has a **Forgot password?** link. Enter the registered email and Broshare creates a one-time reset link that expires in 30 minutes; only a hash of the token is stored in MariaDB. After a reset, previously issued login sessions stop working.

Existing databases need:

```bash
mariadb -u root -p broshare < backend/migrations/007_password_reset.sql
```

You do **not** need a paid email service. Two free options:

1. **No email setup (local demo):** set `ALLOW_DEV_RESET_LINK=true` in `backend/.env` and leave the `SMTP_*` values unset. The reset link is printed in the backend terminal and shown on the forgot-password page. Never enable this on a public server — anyone could reset any account with it.
2. **Real emails for free (Gmail):**
   1. Turn on 2-Step Verification for the Google account, then create an **App Password** (Google Account → Security → App passwords).
   2. In `backend/.env` set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=youraddress@gmail.com`, `SMTP_PASS=` the 16-character app password (**without spaces**), `MAIL_FROM=Broshare <youraddress@gmail.com>`, `FRONTEND_URL=http://localhost:3000`, and `ALLOW_DEV_RESET_LINK=false`. Never commit `.env` or share the app password.
   3. Restart Express, then from `backend/` run `npm run test-email -- youraddress@gmail.com` and check the inbox/spam folder.
   4. Open the site, log out, and use **Forgot password?** with a registered email to receive a real reset email.
   Free tiers from providers such as Brevo or Resend work the same way with their SMTP details.

If a student forgets **which email** they registered with, a reset link cannot be sent — ask an admin to find the account by name in the Admin Panel's Users tab and tell them the email.

To test the whole flow against a disposable database, start the backend with `ALLOW_DEV_RESET_LINK=true` and no SMTP configured, then run `node tests/password-reset.mjs` from `backend/`.
