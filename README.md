# Sitroom

**Sitroom** is an election situation-room (war-room) platform for monitoring polling in real time. Field agents submit polling-unit results and report incidents from a mobile PWA; coordinators and executives watch results aggregate live, triage incidents, and export tribunal-ready reports.

The system is built for the Nigerian electoral structure (State → LGA → Ward → Polling Unit) but the geography model is generic and driven by CSV import.

## Architecture

The repository is a monorepo with two applications:

| App | Stack | Location | Default port |
| --- | --- | --- | --- |
| **Backend API** | NestJS 11, TypeORM, PostgreSQL, Socket.io | `src/` | `3001` |
| **Agent PWA** | Next.js 16, React 19, Tailwind CSS | `agent-pwa/` | `3000` |

The backend exposes a REST API under `/api/v1` plus a Socket.io gateway for live war-room updates. The PWA is the agent- and coordinator-facing client.

## Features

- **Role-based access control** — six roles: `admin`, `executive`, `state_coordinator`, `lga_coordinator`, `ward_coordinator`, `agent`
- **JWT authentication** — register/login, protected routes, per-role authorization
- **Geography hierarchy** — LGA / Ward / Polling Unit, bulk-loaded via CSV import
- **Party management** — bulk create, seed default Nigerian parties
- **Result submission** — polling-unit results with per-party scores, automatic **anomaly detection**, and State/LGA aggregation
- **Incident reporting** — severity, escalation, and resolution flow
- **Live updates** — Socket.io gateway broadcasts results and incidents to the war room
- **Exports** — Excel export of results, incidents, and a state summary for tribunal use
- **Hardening** — rate limiting (`@nestjs/throttler`), input sanitization, CORS restricted to the frontend origin, global exception filter, paginated list endpoints
- **API docs** — Swagger UI

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- (Optional) Redis — configured via env, reserved for planned background-job features

## Getting started

### 1. Backend API

```bash
# from the repository root
npm install

# create your environment file
cp .env.example .env
# then edit .env (at minimum set JWT_SECRET and your database credentials)

# start in watch mode
npm run start:dev
```

The API starts on `http://localhost:3001`. In non-production environments TypeORM `synchronize` is enabled, so the schema is created automatically — no migrations required for local development.

- REST API base: `http://localhost:3001/api/v1`
- Swagger docs: `http://localhost:3001/api/docs`

### 2. Agent PWA

```bash
cd agent-pwa
npm install

# point the client at the API (defaults to http://localhost:3001 if unset)
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

npm run dev
```

The PWA starts on `http://localhost:3000`.

### 3. Bootstrap the first admin

The database starts empty. Create the initial admin account with the public bootstrap endpoint (it only works while no admin exists):

```bash
curl -X POST http://localhost:3001/api/v1/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"phone":"08012345678","name":"Admin","password":"changeme"}'
```

Then log in, and as admin you can seed reference data:

- `POST /api/v1/admin/import/geography` — import LGAs / Wards / Polling Units from CSV
- `POST /api/v1/admin/seed/parties` — seed default parties
- `POST /api/v1/admin/seed/demo` — seed demo data
- `GET  /api/v1/admin/stats` — dashboard statistics

## Environment variables

Defined in `.env` (see `.env.example`):

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | API port | `3001` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | PostgreSQL user | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `postgres` |
| `DB_NAME` | Database name | `sitroom` |
| `JWT_SECRET` | JWT signing secret — **change in production** | — |
| `JWT_EXPIRES_IN` | Token lifetime | `24h` |
| `REDIS_HOST` | Redis host (reserved) | `localhost` |
| `REDIS_PORT` | Redis port (reserved) | `6379` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` |
| `NODE_ENV` | Environment | `development` |

## API overview

All routes are prefixed with `/api/v1`. Most require a `Bearer` token; roles in parentheses are required.

### Auth
- `POST /auth/login` — public
- `POST /auth/register` — (admin, state_coordinator)
- `GET  /auth/profile` — current user

### Users
- `GET  /users` — (admin, state_coordinator, lga_coordinator)
- `GET  /users/:id` — (admin, state_coordinator)
- `PATCH /users/:id` — (admin)
- `PATCH /users/:id/activate` · `PATCH /users/:id/deactivate` — (admin)

### Geography
- `GET /geography/lgas` · `/geography/lgas/:id`
- `GET /geography/wards` · `/geography/wards/:id`
- `GET /geography/polling-units` · `/geography/polling-units/:id`
- `GET /geography/stats`

### Parties
- `GET  /parties` · `GET /parties/:id`
- `POST /parties` · `PATCH /parties/:id` · `DELETE /parties/:id` — (admin)

### Results
- `POST  /results/submit` — (agent, ward_coordinator, lga_coordinator, state_coordinator, admin)
- `GET   /results` · `GET /results/:id`
- `GET   /results/aggregation` · `GET /results/aggregation/lga`
- `PATCH /results/:id/verify` — (state_coordinator, admin)
- `PATCH /results/:id/flag` — (lga_coordinator, state_coordinator, admin)

### Incidents
- `POST  /incidents`
- `GET   /incidents` · `GET /incidents/stats` · `GET /incidents/:id`
- `PATCH /incidents/:id/escalate` — (ward_coordinator, lga_coordinator, state_coordinator, admin)
- `PATCH /incidents/:id/resolve` — (lga_coordinator, state_coordinator, admin)

### Export — (admin, executive, state_coordinator)
- `GET /export/results`
- `GET /export/incidents`
- `GET /export/summary`

### Admin — (admin, except bootstrap)
- `POST /admin/bootstrap` — public, one-time first-admin creation
- `POST /admin/import/geography` · `POST /admin/seed/parties` · `POST /admin/seed/demo`
- `GET  /admin/stats`

See Swagger at `/api/docs` for full request/response schemas.

## Scripts

Backend (repository root):

```bash
npm run start:dev     # watch mode
npm run start:prod    # run compiled build (node dist/main)
npm run build         # compile to dist/
npm run lint          # eslint --fix
npm run test          # unit tests (jest)
npm run test:e2e      # end-to-end tests
npm run test:cov      # coverage
```

Agent PWA (`agent-pwa/`):

```bash
npm run dev           # next dev
npm run build         # next build
npm run start         # next start (production)
npm run lint          # eslint
```

## Production notes

- Set a strong `JWT_SECRET` and `NODE_ENV=production`.
- With `NODE_ENV=production`, TypeORM `synchronize` is disabled — manage the schema with migrations.
- `FRONTEND_URL` must be set to the deployed PWA origin; CORS (HTTP and WebSocket) is restricted to it.
- Build with `npm run build` and run `npm run start:prod`.

## License

UNLICENSED — private project.
