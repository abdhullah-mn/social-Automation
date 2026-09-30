# Social Automation

React/Vite frontend and Express/MongoDB backend for user-owned social connections and publishing through Zernio.

## Run locally

1. Preserve your existing `server/.env`. For a new setup, copy `server/.env.example` and configure MongoDB, distinct JWT secrets, and your Zernio key. Both `ZERNIO_API_KEY` and the existing `ZERNIO_API` name work.
2. In `server`, run `npm install`, then `npm run check:integrations` (read-only: key validity and MongoDB reachability). Run `npm run server` to start port 5000.
3. In `client`, run `npm install`, then `npm run dev`. Open `http://localhost:5173`. Vite proxies `/api` to port 5000. Keep `FRONTEND_URL=http://localhost:5173` on the backend. Use the same hostname consistently for cookies.
4. Create a website account, open **Social Accounts**, and connect a platform. Complete the provider's OAuth and Page/account selection screens. On return, accounts are synchronized from that user's profile; callback query strings are never accepted as proof of ownership.
5. Open **Scheduler**, select your connected accounts, write content and optionally upload media. Choose **Publish now**, **Schedule**, or **Save draft**. Publishing and scheduling perform real external actions when clicked.

Facebook requires a Page and Instagram requires a Business/Creator account with media. The hosted connection flow also supports LinkedIn and X. Users can connect multiple accounts on a platform. Provider billing/permissions still govern platform availability; a valid key alone does not prove publishing access.

## Status webhooks

For automatic delivery updates, expose the backend over HTTPS and register `https://YOUR_API_HOST/api/webhooks/zernio` in Zernio's webhook settings. Set a strong shared secret there and in `ZERNIO_WEBHOOK_SECRET`. Subscribe to `post.published`, `post.failed`, `post.partial`, `post.platform.published`, `post.platform.failed`, `account.connected`, and `account.disconnected`.

The endpoint verifies the raw-body HMAC and retrieves current provider state to handle repeated/out-of-order deliveries. Local development without webhooks supports **Refresh status** on each post and **Refresh connections** on Accounts. No webhook or live social account is configured automatically by the tests.

## Multi-user design

- A deterministic profile named `social_automation_user_<Mongo user ID>` is created on first connection/sync. The shared Default profile and legacy mappings are never reused automatically.
- Account records belong to a user and profile. Every publish refreshes provider membership and validates the complete selected account set against the logged-in user.
- Media is uploaded directly to a provider-issued signed URL, confirmed server-side, and stored with an owner. Publishing rejects foreign or unconfirmed media IDs.
- Posts are journaled locally before submission. An immutable payload and a namespaced idempotency key protect retries. An ambiguous timeout shows **unconfirmed**, not **failed** or **published**; retry that same submission. The retry window is limited to 23 hours to stay within the provider's 24-hour key retention.
- A post's overall and individual platform statuses are preserved, including partial failures. Scheduling is performed by Zernio and continues after the browser closes. Scheduled posts can be rescheduled or cancelled; already-published posts are not deleted by this UI.
- Drafts stay in MongoDB. **Use draft** loads a copy into the composer; the original draft remains until cancelled.

## Current limits

Uploads: JPEG, PNG, WebP, MP4; 50 MB each; at most ten files. Provider/platform requirements may be stricter. To avoid temporary-upload expiry, media posts must publish within six days of upload; older draft attachments need re-uploading. Lists show the latest 100 posts. AI generation is still a labeled demo, and pricing links do not activate subscriptions. Password recovery, email verification, production rate limiting, and full operational monitoring remain release work.

## Verification

- `server`: `npm run build` and `npm test`. HTTP tests exercise real validation, JWTs and password hashing with stub persistence/provider responses.
- `server`: `npm run test:database` additionally exercises the social workflow against real MongoDB in a generated `sa_test_<random>` database. It verifies the exact database name before deleting that test database. It never writes application records and all Zernio calls remain simulated. The configured database user needs permission to create/drop that isolated database.
- `client`: `npm run lint` and `npm run build`.
- `client`: after building, `npm run test:browser` runs a headless Chrome/Edge smoke test with a local fake API. Set `CHROME_PATH` if it is not installed in a standard path. It verifies protected routes, login, selected-account publishing, shared refresh, reload restoration, OAuth redirection, and logout. A screenshot is written to the ignored `client/artifacts` directory.

Live acceptance: use two separate browser profiles, register two users, connect each user's own social account, and verify neither sees the other's accounts/posts. Publish an explicitly chosen test post from each, verify the real platform URL, test a scheduled post and cancellation, and revoke a connection to confirm reconnect/error handling. Tests never publish real posts.

Production: serve the frontend with SPA fallback, proxy `/api` to the backend (or build with `VITE_API_URL=https://YOUR_API_HOST/api`), set the correct `FRONTEND_URL`, use HTTPS and `NODE_ENV=production`, and configure cookie same-site behavior for your domains. Never put the Zernio key into a `VITE_` variable.

References: [multi-user architecture](https://docs.zernio.com/multi-tenant), [connection flow](https://docs.zernio.com/guides/connecting-accounts), [publishing and media](https://docs.zernio.com/multi-tenant/publishing), [webhook signatures](https://docs.zernio.com/webhooks).
