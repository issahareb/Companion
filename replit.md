# Replit.md

## Overview

GuardianGrid (Adept) is a Destiny 2 loadout manager web application. It enables players to authenticate via Bungie's OAuth2, manage their in-game inventory across characters, vault, and postmaster, create and save custom loadouts, and share them. Key features include browsing collections, triumphs, season progressions, and in-game loadout manipulation. The application features a dark, Destiny-themed UI with custom animations and supports German, English, and French localization.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project uses a monorepo with `client/` (React frontend), `server/` (Express backend), and `shared/` (shared types and schemas).

### Frontend (client/)
-   **Framework**: React 18 with TypeScript, Vite for bundling.
-   **Routing**: Wouter.
-   **State Management**: TanStack React Query.
-   **UI**: shadcn/ui with Radix UI, Tailwind CSS.
-   **Animations**: Framer Motion.
-   **Key Pages**: Home/Login, Dashboard (with tabs for characters, vault, loadouts, postmaster, collections, triumphs, season progression, AI playstyle analysis), and a loadout sharing page.

### Dashboard Component Architecture
-   **Dashboard.tsx** (~670 lines): Main layout shell, state management, action handlers, tab routing.
-   **`client/src/components/dashboard/`**: 16 focused component files:
    -   `shared.ts` — TabType, FilterState, toItem helper, useItemFilter hook
    -   `BungieStatus.tsx` — BungieAutoRetry countdown + OfflineBanner
    -   `FilterBar.tsx` — Slot/rarity/power filter bar
    -   `QuestCard.tsx` — Quest item display card
    -   `ArtifactDisplay.tsx` — Artifact tier display with active items
    -   `SubclassEditor.tsx` — Subclass socket categories with plug swapping
    -   `EquippedSlotRow.tsx` — Equipped slot row with item picker, mods tooltip, RollRatingBadge
    -   `VaultItemCard.tsx` — Vault item card with transfer/equip dropdown
    -   `CharacterPanel.tsx` — Character hero, stat rings, weapons/armor, subclass, artifact, quests
    -   `VaultPanel.tsx` — Vault search, filters, item grid, desktop loadout sidebar
    -   `LoadoutsPanel.tsx` — Saved loadouts grid with share/load/delete
    -   `PostmasterPanel.tsx` — Per-character postmaster items with pull button
    -   `CollectionsPanel.tsx` — Collections search, filter, collectibles grid
    -   `TriumphsPanel.tsx` — Triumphs search, filter, records with progress bars
    -   `SeasonPanel.tsx` — Season progression cards with level/reset info
    -   `PlaystylePanel.tsx` — AI playstyle analysis with rating ring, strengths/weaknesses/synergies/tips

### Backend (server/)
-   **Framework**: Express 5 on Node.js.
-   **API Routes**: Manages Bungie API interactions for fetching profile data, transferring items, equipping items, pulling from postmaster, locking items, inserting subclass plugs, and managing in-game loadouts. Also handles CRUD operations for user-saved loadouts.

### Bungie API Integration
-   The server fetches comprehensive player profile states, including characters, inventory, vault, postmaster, currencies, collectibles, records, seasonal artifact, and in-game loadouts using various Bungie API components.
-   Provides endpoints for in-game actions like item transfers, equipping, and subclass modifications.
-   Caches Bungie manifest data for 24 hours.
-   **Retry Logic**: `bungieRequestWithRetry` wrapper with exponential backoff (max 3 attempts), 15s timeout via AbortController, handles HTTP 429 rate limits, 503/521/522 maintenance, and Bungie-specific throttle/maintenance error codes.
-   **Profile Cache**: Server-side 30s TTL in-memory cache for profile state responses. Bypass with `?fresh=true` query param. Cache invalidated on write operations.
-   **Error Classification**: `BungieApiError` class with typed errors (`rate_limit`, `maintenance`, `auth`, `timeout`, `network`, `api`) passed to frontend for appropriate UI handling.

### AI Playstyle Analysis
-   **Module**: `server/ai.ts` — OpenAI GPT-4o integration via Replit AI Integrations (env vars: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`).
-   **Endpoint**: POST `/api/ai/analyze-playstyle` — Protected by `requireAuth` + rate limited (10/15min). Accepts character data + language, returns structured analysis JSON.
-   **Analysis Output**: `{ playstyle, summary, rating (1-10), strengths[], weaknesses[], synergies[], tips[] }`.
-   **Frontend**: `PlaystylePanel.tsx` with animated rating ring, staggered list reveals, and re-analyze button. Results cached in component state.

### Client-Side Data Management
-   Extensive type definitions for game entities like perks, mods, sockets, artifacts, inventory items, collectibles, records, and progressions.
-   Custom React hooks for fetching and mutating Bungie API data and managing saved loadouts.

### Robustness & Error Handling
-   **React Error Boundary**: `ErrorBoundary` component wraps the app routes. Shows retry/home buttons on crashes. Individual tab sections can be wrapped for isolation.
-   **Offline Support**: `useOnlineStatus` hook tracks `navigator.onLine`. Offline banner shown in Dashboard. React Query uses `networkMode: 'offlineFirst'` to show cached data when offline.
-   **Query Retry**: React Query retries queries up to 2 times with exponential backoff. Skips retry for 401/403/maintenance errors. Mutations do not retry.
-   **Mutation Locking**: Shared `BUNGIE_MUTATION_KEY` across all Bungie mutations. `useIsBungieMutating()` hook prevents concurrent mutations (no double-transfers).
-   **AbortController Cleanup**: All fetch calls in `use-bungie-auth.ts` use AbortController cancelled on unmount. Profile state query uses React Query's built-in signal forwarding.
-   **Bungie-Down Fallback UI**: Dashboard detects `errorType` from server responses and shows maintenance/rate-limit specific screens with auto-retry countdown.

### Internationalization (i18n)
-   Supports German, English, and French, covering all UI strings.

### Shared Layer (shared/)
-   **`schema.ts`**: Drizzle ORM table definitions and Zod schemas.
-   **`routes.ts`**: Type-safe API route definitions with Zod validation.

### Database
-   **ORM**: Drizzle ORM with PostgreSQL.
-   **Tables**:
    -   `saved_loadouts` for storing user-defined loadouts with item details, class type, and share codes.
    -   `sessions` for server-side session management (id, bungieMembershipId, accessToken, refreshToken, tokenExpiresAt, createdAt).

### Authentication
-   **Bungie OAuth2 with Server-Side Sessions**: OAuth code exchange handled server-side. Access tokens and refresh tokens stored in DB `sessions` table, never exposed to the client.
-   **HTTPOnly Cookies**: Session ID stored in a signed HTTPOnly cookie (`session_id`). Cookie config: httpOnly, secure (prod), sameSite: 'lax', path: '/', maxAge: 30 days, signed with SESSION_SECRET.
-   **Refresh Token Rotation**: When access token expires, `requireAuth` middleware auto-refreshes using the stored refresh token and updates the session in DB.
-   **Auth Routes**: POST `/api/auth/login` (code exchange + session creation), POST `/api/auth/logout` (session deletion), GET `/api/auth/me` (session validation + profile info).
-   **requireAuth Middleware**: Protects all `/api/bungie/*` routes. Reads session cookie, validates session, auto-refreshes expired tokens, attaches accessToken to request.
-   **Session Cleanup**: Expired sessions (>30 days) cleaned up hourly via interval.
-   **Dashboard Auth Guard**: Dashboard shows loading spinner while checking session, redirects to `/` if not authenticated.
-   **Cloudflare Turnstile CAPTCHA**: Optional CAPTCHA on login. Requires `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` env vars. Auto-detects if keys are set.

### Security
-   **Helmet**: Full security headers (CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy).
-   **Rate Limiting**: Global API limit (200/15min), auth endpoints (15/15min), write endpoints (60/15min). Uses `cf-connecting-ip` header for Cloudflare compatibility.
-   **CORS**: Locked to guardiangrid.net, www.guardiangrid.net, and Replit dev domains. Credentials: true for cookie support.
-   **Bot Protection**: Blocks API requests without valid User-Agent headers.
-   **Request Size Limits**: JSON and URL-encoded bodies capped at 1MB.
-   **Trust Proxy**: Configured for Cloudflare proxy (reads real client IPs from CF headers).
-   **Cloudflare Integration**: App is ready for Cloudflare proxy. Set DNS to "Proxied" (orange cloud) in Cloudflare dashboard for DDoS protection, WAF, and SSL.
-   **cookie-parser**: Signed cookie parsing with SESSION_SECRET.

### Storage Pattern
-   Uses a swappable `IStorage` interface, currently implemented with PostgreSQL (`DatabaseStorage`).
-   Session CRUD: createSession, getSession, updateSessionTokens, deleteSession, deleteExpiredSessions.

### UI/UX Decisions
-   **Theming**: Dark, Destiny-inspired with a gold/indigo color palette, custom clip-paths, and subtle animations.
-   **Typography**: Protest Strike (headings), Plus Jakarta Sans (body), JetBrains Mono (code). Minimum text size: 8px.
-   **Animations**: Apple-like cinematic animation system using Framer Motion + CSS. Apple ease curve `[0.16, 1, 0.3, 1]` for smooth deceleration. Spring physics `{ damping: 25-30, stiffness: 120-300 }` for interactive elements. CSS classes: `.reveal-up`, `.reveal-scale`, `.reveal-left` (with `.visible`), `.hover-lift`, `.press-scale`, `.card-3d`, `.scroll-container`, `.animate-float-gentle`, `.animate-breathe`, `.progress-animated`. Stagger delays via `stagger-1` through `stagger-8`. `useScrollReveal` hook uses IntersectionObserver with scroll container root detection (`data-scroll-container`). `will-change: transform, opacity` on animated classes for GPU compositing. Exotic glow is subtle (4s cycle). No shimmer on stat cards.
-   **Layout**: Single consolidated header bar (no double header). Clean tab-style character selector with bottom border indicator.
-   **Section Headers**: Minimal style — icon + label + subtle line divider (no gradient icon containers).
-   **Background**: Subtle static blur orbs (no pulse animations on background elements).
-   **Branding**: "GuardianGrid (Adept)" with "(Adept)" in gold. Currencies shown in header only (not duplicated in sidebar/mobile menu).
-   **Responsive Design**: Hamburger menu for all screen sizes, desktop sidebar for larger screens.

## External Dependencies

### Third-Party Services
-   **Bungie.net API**: Used for OAuth2 authentication and all game data interaction, proxied through the server.
-   **PostgreSQL**: Primary database for application data storage.

### Key NPM Packages
-   **drizzle-orm**, **drizzle-kit**, **drizzle-zod**: For database management.
-   **express**: Web framework.
-   **@tanstack/react-query**: Client-side asynchronous state management.
-   **wouter**: Lightweight client-side router.
-   **framer-motion**: Animation library.
-   **shadcn/ui**: UI component library built on Radix UI and Tailwind CSS.
-   **zod**: Schema validation.
-   **nanoid**: Unique ID generation.
-   **helmet**: Security headers middleware.
-   **express-rate-limit**: API rate limiting.
-   **cors**: Cross-origin resource sharing control.
-   **cookie-parser**: Signed cookie parsing for session management.
