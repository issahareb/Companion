# Replit.md

## Overview

**GuardianGrid (Adept)** is a Destiny 2 loadout manager web application. It allows players to authenticate via Bungie's OAuth2 system, browse their real game inventory separated by location (character, vault, postmaster), assemble custom loadouts by assigning items to equipment slots, save loadouts to a database, and share them via unique share codes/links. Additional features include browsing collections, triumphs/records, season progressions, in-game loadout management (equip/snapshot/clear), subclass editing, and seasonal artifact display. The UI is themed with a dark, Destiny-inspired aesthetic using custom clip-paths, animations, and a gold/indigo color palette. Supports German, English, and French i18n.

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
- **Fonts:** Protest Strike (display/headings), Plus Jakarta Sans (body), JetBrains Mono (code)
- **Path aliases:** `@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` → `attached_assets/`

**Key pages:**
- `/` — Home/Login: Handles Bungie OAuth flow, redirects to dashboard on auth
- `/dashboard` — Main app with seven tabs:
  - Hüter (character overview with organized equipment sections: Waffen/Rüstung/Subklasse, per-slot swap picker popup, stats, quests)
  - Tresor (vault items with advanced filters by slot/rarity/power)
  - Loadouts (saved loadouts with load/share/delete)
  - Postmeister (postmaster items with pull-from-postmaster action)
  - Sammlung/Collections (collectibles grid with acquired/not-acquired state and search)
  - Triumphe/Triumphs (records with progress bars, objectives, completion state)
  - Saison/Season (progressions/reputation ranks with progress bars)
- `/share/:shareCode` — Shared loadout view with adoption flow (best-match logic for missing items)

### Backend (server/)
- **Framework:** Express 5 on Node.js, wrapped in an HTTP server
- **Dev server:** Vite middleware is injected in development mode for HMR
- **Production:** Static files served from `dist/public`, SPA fallback for client-side routes
- **Build:** Custom build script (`script/build.ts`) uses esbuild for server and Vite for client

**API Routes (all under `/api/`):**
- `GET /api/bungie/profile-state/:membershipType/:membershipId` — Fetch comprehensive profile state: characters (with stats, equipped, inventory, quests, progressions, perks/mods), vault items, postmaster items, currencies, collectibles, records, in-game loadouts
- `POST /api/bungie/transfer` — Transfer item between vault and character (requires Bearer token)
- `POST /api/bungie/equip` — Equip a single item on a character (requires Bearer token)
- `POST /api/bungie/equip-items` — Batch equip multiple items on a character (requires Bearer token)
- `POST /api/bungie/pull-postmaster` — Pull item from postmaster to character inventory (requires Bearer token)
- `POST /api/bungie/lock` — Set lock/unlock state on an item (requires Bearer token)
- `POST /api/bungie/insert-plug` — Swap a subclass socket plug (requires Bearer token)
- `POST /api/bungie/equip-loadout` — Equip an in-game loadout on a character (requires Bearer token)
- `POST /api/bungie/snapshot-loadout` — Snapshot current equipment as an in-game loadout (requires Bearer token)
- `POST /api/bungie/clear-loadout` — Clear an in-game loadout slot (requires Bearer token)
- `GET /api/loadouts/:bungieMembershipId` — List saved loadouts for a user
- `POST /api/loadouts` — Create/save a new loadout
- `DELETE /api/loadouts/:id` — Delete a saved loadout
- `GET /api/loadouts/share/:shareCode` — Get a loadout by its share code

### Bungie API Integration (server/bungie.ts)
- **fetchProfileState()** — Main endpoint. Uses Bungie components 100,102,103,104,200,201,202,205,300,302,304,305,800,900,4000 to fetch:
  - Characters: class, race, power level, emblem, stats (Mobility/Resilience/Recovery/Discipline/Intellect/Strength), equipped items (with perks/mods/sockets), per-character inventory (with perks/mods/sockets), active quests, progressions
  - Vault: items in bucket 138197802 (with perks/mods/sockets)
  - Postmaster: items in bucket 215938771
  - Currencies: Glimmer, Silver, Bright Dust, Legendary Shards via component 103
  - Collectibles: from component 800, with acquired state
  - Records/Triumphs: from component 900, with objectives and completion state
  - Seasonal Artifact: from component 104, with power bonus, points, tiers, and active perks
  - Socket details: from component 304/305, with reusable plug options for subclass editing
  - In-Game Loadouts: from component 4000, with name/color/icon from manifest definitions
- **transferItem()** — Calls Bungie TransferItem API
- **equipItem()** — Calls Bungie EquipItem API
- **equipItems()** — Calls Bungie EquipItems API (batch equip)
- **pullFromPostmaster()** — Calls Bungie PullFromPostmaster API
- **setLockState()** — Calls Bungie SetLockState API
- **insertSocketPlug()** — Calls Bungie InsertSocketPlugFree API (swap subclass abilities/fragments/aspects)
- **equipLoadout()** — Calls Bungie EquipLoadout API (equip in-game loadout)
- **snapshotLoadout()** — Calls Bungie SnapshotLoadout API (save current equipment as loadout)
- **clearLoadout()** — Calls Bungie ClearLoadout API (clear a loadout slot)
- **Manifest**: Cached 24h, parses gear buckets (weapons, armor, ghost, emblem, ship, sparrow, emote), quest bucket (1345459588), postmaster bucket, currency hashes, collectibles, records, progressions, objectives, activities, plug items (for socket lookups), loadout names/colors/icons (DestinyLoadoutNameDefinition, DestinyLoadoutColorDefinition, DestinyLoadoutIconDefinition)

### Client Types (use-profile-state.ts)
- **PerkInfo** — Perk hash, name, icon, description, isActive
- **ModInfo** — Plug hash, name, icon, description
- **SocketPlugOption** — Plug hash, name, icon, description (for reusable plug choices)
- **SocketInfo** — Socket index, current plug hash/name/icon, isEnabled, reusablePlugs array
- **ArtifactInfo** — Artifact hash, name, icon, power bonus, points used/available, tiers with active items
- **InventoryItem** — Extended with optional `perks: PerkInfo[]`, `mods: ModInfo[]`, and `sockets: SocketInfo[]`
- **CollectibleItem** — Hash, name, icon, description, acquired state, source string
- **RecordItem** — Hash, name, icon, description, completed state, objectives with progress, scoreValue
- **ProgressionInfo** — Hash, name, icon, level, progress, nextLevelAt, dailyProgress, currentResetCount
- **InGameLoadoutItem** — Instance ID, item hash, name, icon, slot
- **InGameLoadout** — Index, nameHash, colorHash, iconHash, name, icon, colorImagePath, items array
- **CharacterData** — Extended with `progressions: ProgressionInfo[]`
- **ProfileState** — Extended with `collectibles: CollectibleItem[]`, `records: RecordItem[]`, `artifact?: ArtifactInfo`, `inGameLoadouts: Record<string, InGameLoadout[]>`

### Client Hooks
- **useProfileState** — Fetches `/api/bungie/profile-state`, returns structured ProfileState with all data
- **useTransferItem / useEquipItem / useSwapItem** — Mutations for item management. useSwapItem orchestrates multi-step transfer+equip flows
- **usePullFromPostmaster** — Mutation to pull items from the postmaster
- **useSetLockState** — Mutation to lock/unlock items
- **useEquipItems** — Mutation for batch equipping multiple items
- **useInsertPlug** — Mutation to swap subclass sockets (abilities, aspects, fragments) via InsertSocketPlugFree
- **useEquipLoadout** — Mutation to equip an in-game loadout on a character
- **useSnapshotLoadout** — Mutation to save current equipment as an in-game loadout
- **useClearLoadout** — Mutation to clear an in-game loadout slot
- **useLoadouts / useSaveLoadout / useDeleteLoadout** — Loadout CRUD operations

### i18n (client/src/lib/i18n.tsx)
- Three languages: German (de, default), English (en), French (fr)
- Covers all UI strings including nav, actions, toasts, filters, tab labels (Sammlung, Triumphe, Saison), in-game loadout actions, general slots (ghost/emblem/ship/sparrow/emote), and section labels

### Shared Layer (shared/)
- **`schema.ts`** — Drizzle ORM table definitions and Zod schemas (using `drizzle-zod`)
- **`routes.ts`** — Type-safe API route definitions with Zod validation schemas, used by both client hooks and server route handlers. Includes a `buildUrl` helper for parameterized paths.

### Database
- **ORM:** Drizzle ORM with PostgreSQL dialect
- **Connection:** `node-postgres` (pg) Pool, configured via `DATABASE_URL` environment variable
- **Schema push:** `npm run db:push` (uses `drizzle-kit push`)
- **Tables:**
  - `saved_loadouts` — Stores loadouts with fields: `id` (serial PK), `bungie_membership_id` (text), `name` (text), `items` (jsonb — maps slot to item data), `artifact_mods` (jsonb), `class_type` (integer), `share_code` (unique text, nullable), `created_at` (timestamp)

### Authentication
- **Bungie OAuth2:** Client-side public OAuth flow. The frontend redirects to Bungie for authorization, receives a code, and exchanges it for an access token directly from the client.
- **Token storage:** Access token and profile data stored in `localStorage`
- **No server-side session management** for auth — the server trusts the `bungieMembershipId` passed by the client in API requests.
- **API Key & Client ID**: The Bungie API key is stored in the `BUNGIE_API_KEY` environment variable (used server-side in `server/bungie.ts`). The client ID `51625` is used in the frontend auth hook (`use-bungie-auth.ts`).

### Storage Pattern
- The server uses a `DatabaseStorage` class implementing an `IStorage` interface, making the storage layer swappable. Currently only the PostgreSQL implementation exists.

## External Dependencies

### Third-Party Services
- **Bungie.net API** — OAuth2 authentication and real inventory data fetching via server-side proxy (`server/bungie.ts`). The server fetches the Destiny 2 manifest (cached 24h) and player inventory/characters/vault/currencies/collectibles/records/in-game loadouts, mapping items to the app's slot system. API key stored in `BUNGIE_API_KEY` environment variable.
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

## Design Notes
- Branding: "GuardianGrid (Adept)" — "(Adept)" in gold (#E5C76B)
- Login background: IMG_0553 JPEG (static)
- Hunter tab: IMG_0576 JPEG at 35% opacity in fixed container with gradient overlays
- Warlock tab: IMG_0577 JPEG at 35% opacity in fixed container with gradient overlays
- Login button glow: 3 absolute divs with purple/fuchsia/pink/indigo gradients, 18-25% normal / 35-45% hover opacity
- Hamburger menu: all screen sizes, AnimatePresence slide-out panel with 7 nav items
- Desktop sidebar: visible on md+ screens with nav buttons and currency display
- Gear bucket slots: weapons (kinetic/energy/power), armor (helmet/arms/chest/legs/class), general (ghost/emblem/ship/sparrow/emote), subclass
