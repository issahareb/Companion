# Replit.md

## Overview

**Forge** is a Destiny 2 loadout manager web application. It allows players to authenticate via Bungie's OAuth2 system, browse their inventory (currently using mock data), assemble custom loadouts by assigning items to equipment slots, save loadouts to a database, and share them via unique share codes/links. The UI is themed with a dark, Destiny-inspired aesthetic using custom clip-paths, animations, and a gold/indigo color palette.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project uses a three-directory monorepo layout:
- **`client/`** — React frontend (SPA)
- **`server/`** — Express backend (API + static serving)
- **`shared/`** — Shared types, schemas, and route definitions used by both client and server

### Frontend (client/)
- **Framework:** React 18 with TypeScript
- **Bundler:** Vite (with HMR in dev, builds to `dist/public` for production)
- **Routing:** Wouter (lightweight client-side router)
- **State/Data Fetching:** TanStack React Query for server state management
- **UI Components:** shadcn/ui (new-york style) with Radix UI primitives, Tailwind CSS for styling
- **Animations:** Framer Motion for page transitions and item card interactions
- **Path aliases:** `@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` → `attached_assets/`

**Key pages:**
- `/` — Home/Login: Handles Bungie OAuth flow, redirects to dashboard on auth
- `/dashboard` — Main loadout builder with inventory grid, equipped slots, search, save/share
- `/share/:shareCode` — Public read-only view of a shared loadout

### Backend (server/)
- **Framework:** Express 5 on Node.js, wrapped in an HTTP server
- **Dev server:** Vite middleware is injected in development mode for HMR
- **Production:** Static files served from `dist/public`, SPA fallback for client-side routes
- **Build:** Custom build script (`script/build.ts`) uses esbuild for server and Vite for client

**API Routes (all under `/api/`):**
- `GET /api/loadouts/:bungieMembershipId` — List saved loadouts for a user
- `POST /api/loadouts` — Create/save a new loadout
- `GET /api/loadouts/share/:shareCode` — Get a loadout by its share code

### Shared Layer (shared/)
- **`schema.ts`** — Drizzle ORM table definitions and Zod schemas (using `drizzle-zod`)
- **`routes.ts`** — Type-safe API route definitions with Zod validation schemas, used by both client hooks and server route handlers. Includes a `buildUrl` helper for parameterized paths.

### Database
- **ORM:** Drizzle ORM with PostgreSQL dialect
- **Connection:** `node-postgres` (pg) Pool, configured via `DATABASE_URL` environment variable
- **Schema push:** `npm run db:push` (uses `drizzle-kit push`)
- **Tables:**
  - `saved_loadouts` — Stores loadouts with fields: `id` (serial PK), `bungie_membership_id` (text), `name` (text), `items` (jsonb — maps slot to item data), `share_code` (unique text, nullable), `created_at` (timestamp)

### Authentication
- **Bungie OAuth2:** Client-side public OAuth flow. The frontend redirects to Bungie for authorization, receives a code, and exchanges it for an access token directly from the client.
- **Token storage:** Access token and profile data stored in `localStorage`
- **No server-side session management** for auth — the server trusts the `bungieMembershipId` passed by the client in API requests.
- **API Key & Client ID** are hardcoded in the frontend auth hook (`use-bungie-auth.ts`). The Bungie API key is `c95aec1b858f4122a4b1451c89b591ab` and client ID is `51625`.

### Storage Pattern
- The server uses a `DatabaseStorage` class implementing an `IStorage` interface, making the storage layer swappable. Currently only the PostgreSQL implementation exists.

## External Dependencies

### Third-Party Services
- **Bungie.net API** — OAuth2 authentication and (planned) inventory data fetching. Currently uses mock inventory data with Bungie CDN icon URLs.
- **PostgreSQL** — Primary database, connected via `DATABASE_URL` environment variable. Must be provisioned before the app can run.

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit** + **drizzle-zod** — Database ORM, migrations, and schema-to-Zod conversion
- **express** (v5) — HTTP server framework
- **@tanstack/react-query** — Async state management on the client
- **wouter** — Client-side routing
- **framer-motion** — Animations
- **shadcn/ui** ecosystem — Radix UI primitives, Tailwind CSS, class-variance-authority, clsx, tailwind-merge
- **zod** — Runtime validation for API inputs/outputs
- **nanoid** — Unique ID generation (used in dev for cache-busting)
- **connect-pg-simple** — Listed as dependency (for potential session store use)

### Replit-Specific Plugins
- `@replit/vite-plugin-runtime-error-modal` — Error overlay in dev
- `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-dev-banner` — Dev-only Replit integrations (conditionally loaded)