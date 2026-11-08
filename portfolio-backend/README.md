# Levi Blaque Portfolio API

Node.js and Express API for the Levi Blaque portfolio. It uses MongoDB through Mongoose and keeps browser administrator authentication in server-side sessions. Phase 6 adds the public portfolio API and protected admin resource APIs.

The frontend has **not** been connected to these resources in this phase. The frontend service methods remain unavailable until the separate integration phase.

## Requirements and local setup

- Node.js 20.19 or newer (the current development runtime is Node.js 24.15.0).
- A local MongoDB instance for running the application or the one-time administrator bootstrap.

Copy `.env.example` to `.env` and fill in local values. `.env` is ignored by Git. Production requires `NODE_ENV=production`, `MONGODB_URI`, a unique `SESSION_SECRET` of at least 32 bytes, positive `TRUST_PROXY`, `FRONTEND_ORIGIN`, `SESSION_IDLE_TIMEOUT`, and `SESSION_ABSOLUTE_TIMEOUT`.

```sh
npm install
npm run dev
```

The application validates configuration and opens the MongoDB connection before listening. The backend is native ES modules and has no transpilation build step. Tests run without MongoDB:

```sh
npm test
```

Replica-set integration tests run only when `MONGODB_REPLICA_SET_TEST_URI` targets localhost and the dedicated database `portfolio_phase6_integrity_test`. They drop that test database before/after running. Never point this variable at a production or valuable database.

## Authentication and administrator setup

There is no public administrator registration endpoint. With the backend environment configured and MongoDB available, run `npm run admin:create` in an interactive terminal. It refuses to create an account when an administrator already exists, hides the password prompt, enforces a minimum password length, and stores an Argon2id hash.

Authentication remains session based:

- `GET /api/auth/csrf` returns a synchronizer token.
- `POST /api/auth/login` requires `X-CSRF-Token`, checks the supplied Origin when present, applies login rate limiting, verifies the Argon2id password, and regenerates the session identifier.
- `GET /api/auth/me` validates administrator activity and idle/absolute session limits.
- `POST /api/auth/logout` requires CSRF validation and destroys the server-side session.

Admin resource requests use the same authenticated session and require the synchronizer token plus an allowed Origin on state-changing requests. Authentication and admin responses use `Cache-Control: no-store`. The production cookie uses `__Host-`, Secure, HttpOnly, SameSite=Lax, and Path=/, without Domain. The login limiter uses process-local memory and is suitable for one backend instance; configure a shared rate-limit store before introducing multiple instances.

## API conventions

New public and admin resource endpoints return JSON in one of these forms:

```json
{ "success": true, "data": {} }
```

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

Validation and resource errors use `success: false` and a safe error code/message; validation errors include field paths. Malformed MongoDB IDs return 400, missing resources return 404, duplicate/conflicting resources return 409, and unauthenticated admin requests return 401. Production errors do not include stack traces or raw database errors.

List endpoints accept `page` (1–10,000) and `limit` (1–100), with endpoint-specific allowlisted filters. Unknown query parameters are rejected. Search strings are escaped before being used in database regular expressions.

## Public endpoints

| Method and path | Behavior |
| --- | --- |
| `GET /api/projects` | Published projects only. Supports `page`, `limit`, `search`, `category`, `status`, `technology`, and `sort` (`newest`, `oldest`, `recentlyUpdated`; `updated` is accepted as the existing frontend alias). Publication status cannot be overridden. Technologies are resolved to safe public objects. |
| `GET /api/projects/:slug` | Published project details, including image metadata, links, dates, milestones, and public technology objects. Missing and draft projects both return 404. |
| `GET /api/profile` | Active public profile fields only; returns `data: null` if none exists. |
| `GET /api/settings/public` | Public site title, contact email, SEO values, footer text, and social links only. Returns `data: null` if settings do not exist. Maintenance mode and primary-setting internals are not exposed. |
| `GET /api/technologies` | Technologies associated with at least one published project. |
| `POST /api/contact` | Validates and saves a message with status `new` and email status `pending`; returns 201 only after persistence. It does not send email. Limited to five submissions per hour per client IP by the default limiter. |

Contact submissions accept `name`, `email`, `subject`, and `message`; status and email-delivery fields are not accepted. There is no public GET endpoint for contact messages.

Example public requests:

```sh
curl 'http://localhost:5000/api/projects?category=web&sort=newest'
curl 'http://localhost:5000/api/projects/example-project'
curl 'http://localhost:5000/api/settings/public'
curl -X POST 'http://localhost:5000/api/contact' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","subject":"Hello","message":"I would like to get in touch."}'
```

## Protected admin endpoints

Every `/api/admin/*` resource route requires an active administrator session. Every POST, PUT, PATCH, and DELETE also requires `X-CSRF-Token` and an allowed Origin.

| Method and path | Behavior |
| --- | --- |
| `GET /api/admin/overview` | Project counts, unread-message count, and recent project/message records. |
| `GET /api/admin/projects` | Paginated project list; filters `search`, `category`, `status`, `publicationStatus`, `technology`, and `sort`. |
| `GET /api/admin/projects/:id` | Project editor representation. |
| `POST /api/admin/projects` | Create draft or published project. Generates a slug when omitted; validates published-project requirements. |
| `PATCH /api/admin/projects/:id` | Partial update; omitted fields are preserved. Existing slugs remain unchanged unless an explicit slug is supplied. |
| `DELETE /api/admin/projects/:id` | Explicit project deletion. |
| `GET /api/admin/technologies` | Paginated technology list with search/category filters. |
| `GET /api/admin/technologies/:id` | Technology detail. |
| `POST /api/admin/technologies` | Create a technology with generated slug when omitted. Normalized names are unique case-insensitively. |
| `PATCH /api/admin/technologies/:id` | Partial technology update; a name change updates its normalized unique key. |
| `DELETE /api/admin/technologies/:id` | Transactionally refuses deletion while a project references the technology. Requires MongoDB transactions. |
| `GET /api/admin/messages` | Paginated message list with search, status (`all`, `new`/`unread`, `read`, `replied`, `archived`, `spam`), and newest/oldest sorting. |
| `GET /api/admin/messages/:id` | Full message detail, including internal email-delivery status. |
| `PATCH /api/admin/messages/:id/status` | Updates only message status and read timestamp. `unread` maps to the model’s `new`; email status cannot be changed here. |
| `DELETE /api/admin/messages/:id` | Explicit message deletion. |
| `GET /api/admin/profile` | Full active profile or `data: null`. |
| `PUT /api/admin/profile` | Creates the first active profile or partially updates the current one. The unique active-profile index handles concurrent first writes. |
| `GET /api/admin/settings` | Primary settings or `data: null`. |
| `PUT /api/admin/settings` | Creates primary settings or partially updates the existing primary record. |

## Data mapping and limits

The services map frontend-facing names to the approved Mongoose models without changing schemas:

- Project `startDate`/`endDate` map to `startedAt`/`completedAt`; project status is normalized to lowercase. Admin responses map progress status back to the dashboard’s title-case values.
- Project technology input may be comma-separated names or ObjectId strings. Names must already exist as Technology records; unknown names return a validation error. The API does not silently create technologies while saving a project.
- Project image fields accept stored HTTP(S) image metadata, including gallery captions. Local `File` objects, base64 previews, and image uploads are not persisted; cloud storage/upload is deferred to Phase 7.
- Profile `seoDescription` maps to the existing `siteDescription` field without duplicate storage. Settings social-link text accepts one URL per line or `Label: URL` and maps to structured records.
- Profile `background` and `journey` remain separate model fields. The existing About editor has one combined “Background and journey” field, so this API maps its `background` value only and preserves an omitted `journey` value. The current editor omits the model-required `displayName`; on an explicit first profile save, the service maps only that missing field to the already established portfolio identity “Levi Blaque.” It does not synthesize biography or other profile content.
- Site settings require an explicit `siteTitle` when creating the first primary record. SEO description uses `siteDescription` storage and is returned as `seoDescription` for the frontend naming convention.
- Contact submissions store a message and return confirmation that it was saved. Email delivery is deferred to Phase 7.

Mongoose validators remain enabled on create and updates; project publication requirements and chronological dates are checked before database updates as well. The Technology schema now has a normalized-name field and unique index.

## Technology-name migration and reference integrity

Technology names are normalized with Unicode NFKC normalization, trimmed, internal whitespace collapsed, and lowercased using the `en-US` locale. MongoDB enforces uniqueness with the `technology_normalized_name_unique` unique index on `normalizedName`. Technology creation and name updates set the same normalized value; duplicate-key conflicts return HTTP 409.

Before deploying this schema/service change to a database containing technology records, back up the database and pause API writes that create or rename technologies. Run a dry run with the target database in `MONGODB_URI`:

```sh
npm run technology:names:migrate
```

If the script reports duplicate normalized names, it exits without changing records or creating the index. Resolve those records manually; the script never deletes, merges, or renames them. Then rerun with `--apply`:

```sh
npm run technology:names:migrate -- --apply
```

The apply run backfills missing or stale `normalizedName` values and creates the unique index. Run it once, before deploying/starting the updated API, while technology writes remain paused. The script uses the configured MongoDB database, so confirm `MONGODB_URI` carefully; it was not run as part of this change.

Project creation and updates (including technology-reference changes) and technology deletion use MongoDB transactions. Each reference assignment and deletion writes the same technology document inside its transaction, forcing concurrent operations to conflict and retry rather than allowing write skew. These operations require a replica set or sharded cluster. A standalone MongoDB deployment receives HTTP 503 `MONGODB_TRANSACTIONS_REQUIRED`; there is no unsafe fallback. Configure a replica set for local development and deployment before using these operations.

## Integration and deployment status

- Frontend/backend integration has **not** started. Frontend source remains unchanged in Phase 6.
- Cloud image storage and email delivery are deferred to Phase 7.
- No production MongoDB connection or live API verification was performed.
- Production deployment depends on selecting the backend host, configuring secrets and `FRONTEND_ORIGIN`/`TRUST_PROXY`, then adding the chosen host’s exact `/api/:path*` Vercel rewrite before the SPA fallback. No host or rewrite destination is assumed here.
