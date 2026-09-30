# Backend authentication

Copy `.env.example` to `.env` only for a new setup; preserve existing secrets and database settings. Set two distinct, randomly generated JWT secrets and the exact frontend origin. Start MongoDB, then run `npm run server`. `npm run build` checks and compiles TypeScript; `npm test` runs HTTP authentication tests with database operations stubbed, without accessing your database.

The authentication API is under `/api/auth`:

| Method/path | Body or authentication | Result |
| --- | --- | --- |
| POST /register | name, email, password | user, accessToken; refresh cookie |
| POST /login | email, password | user, accessToken; refresh cookie |
| POST /refresh | refresh cookie | user, accessToken; rotated refresh cookie |
| POST /logout | refresh cookie | revokes that refresh session and clears cookie |
| GET /me | Authorization: Bearer accessToken | user with id, name, email |

Browser requests must use `credentials: 'include'`. Keep access tokens in memory and restore the session through `/refresh` after a reload. Serialize refresh requests so two requests do not try to consume the same rotating token. Access tokens expire after 15 minutes; refresh tokens after seven days. Logout revokes refresh access; an already-issued access token remains valid until it expires. Login retains at most ten refresh sessions per user.

Local HTTP uses `SameSite=Lax` cookies without Secure. Production requires HTTPS and uses Secure cookies. Set `COOKIE_SAME_SITE=none` only if frontend/API are on different sites; browser third-party-cookie policies may still block those cookies. Authentication POST requests reject a supplied Origin that differs from FRONTEND_URL.

Passwords require at least eight characters and at most 72 UTF-8 bytes. Emails are trimmed and lowercased. The database stores `passwordHash` and hashed refresh tokens, which are excluded from normal queries and API responses.

## Existing data

The old schema used `password`, while its controller wrote `passwordHash`. Existing users with only `password` cannot log in through the repaired controller. Inspect existing records before migration: copy a verified bcrypt hash into `passwordHash` only if its format and provenance are known; otherwise require a password reset or recreate development accounts. Do not copy plaintext passwords into `passwordHash`. Normalize legacy emails and resolve collisions before relying on the unique email index. Old JWT sessions must sign in again because tokens now carry a token kind and stored refresh tokens are digests.

The tests cover HTTP/session behavior and real schema validation, hashing, and JWT verification. `npm run test:database` checks the social workflow and indexes in an isolated MongoDB test database, with simulated provider calls. Rate limiting, password recovery, and email verification remain separate release tasks. See the root README for the complete social connection, publishing, media, and webhook setup.
