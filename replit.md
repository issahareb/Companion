# Replit.md

## Overview
GuardianGrid (Adept) is a Destiny 2 loadout manager web application. It enables players to authenticate via Bungie's OAuth2, manage in-game inventory, create and save custom loadouts, and share them. Key features include browsing collections, triumphs, season progressions, and in-game loadout manipulation. The application aims to provide a dark, Destiny-themed UI with custom animations and supports German, English, and French localization, enhancing the player experience with comprehensive tools and AI-driven insights.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project is organized as a monorepo with `client/` (React frontend), `server/` (Express backend), and `shared/` (shared types and schemas).

### Frontend
-   **Framework**: React 18 with TypeScript, Vite, Wouter for routing, TanStack React Query for state management.
-   **UI/UX**: shadcn/ui with Radix UI, Tailwind CSS, Framer Motion for animations.
    -   **Theming**: Dark, Destiny-inspired with a gold/indigo palette, custom clip-paths, subtle animations. Rarity CSS vars: `--color-exotic=#ceae33`, `--color-legendary=#522f65`, `--color-rare=#5076a3`, `--color-gold-accent=#E5C76B`. All colors reference CSS vars, no hardcoded hex in components.
    -   **Typography**: Protest Strike (headings), Plus Jakarta Sans (body), JetBrains Mono (code). Minimum font size: 11px. Tracking: `tracking-destiny` (0.12em), `tracking-destiny-wide` (0.2em), `tracking-destiny-widest` (0.3em). Uppercase limited to section headers and tab labels only.
    -   **Animations**: Cinematic animation system using Framer Motion + CSS, Apple ease curve, spring physics. Tab transitions use crossfade (opacity only), not horizontal slide. Entry animations only on first load, not tab switches. Supports `prefers-reduced-motion` for accessibility.
    -   **Layout**: Consolidated header, tab-style character selector, collapsible desktop sidebar (icon-only mode via PanelLeft toggle), mobile bottom tab bar with "Mehr" overflow, full-screen loadout modal on small screens. iOS overscroll fixed. Safe area padding for mobile. Section visual hierarchy with `ai-section-badge` and `section-stripe-*` CSS classes.
-   **Core Pages**: Home/Login, Dashboard (characters, vault, loadouts, postmaster, collections, triumphs, season progression, AI analysis), loadout sharing page with smart matching, and legal pages (Impressum, Datenschutz/Privacy Policy) with DE/EN/FR translations.
-   **Loadout Builder**: Items added to loadouts automatically include perks, mods, and stats. Subclass can be added with full socket configuration (super, abilities, aspects, fragments). EquippedSlot in the loadout sidebar shows expandable perk/mod/socket details.

### Backend
-   **Framework**: Express 5 on Node.js.
-   **API**: Manages Bungie API interactions (fetching profile data, item transfers, equips, subclass mods, in-game loadouts) and CRUD for user-saved loadouts. Includes endpoints for AI services and Bungie news.
-   **Route Modules**: `server/routes.ts` delegates to four sub-routers: `routes/auth.ts` (login/logout/me/turnstile), `routes/bungie.ts` (profile, transfer, equip, loadout actions + profile cache), `routes/loadouts.ts` (CRUD + share code), `routes/ai.ts` (5 AI endpoints). Shared middleware/helpers in `routes/shared.ts`.
-   **Bungie API Integration**: Fetches comprehensive player profile states. Implements `bungieRequestWithRetry` with exponential backoff, 15s timeout, and handles various HTTP and Bungie-specific errors. Features a server-side 30s TTL in-memory profile cache and robust error classification. Profile endpoint supports `?include=characters,vaultItems,...` for partial responses to reduce mobile data usage.
-   **AI Advisor Suite**: Integrates OpenAI GPT-4o via Replit AI Integrations. Provides endpoints for Playstyle Analysis, Build Recommendation, Weapon Roll Evaluation, Triumph Advisor, and Equipment Synergy Analysis. All AI endpoints are rate-limited and require authentication.
-   **Bungie News Feed**: Provides a public endpoint for the latest Bungie.net news, with a 10-minute server-side cache and content type detection.
-   **Health Check**: `/healthz` endpoint returns `{ status: 'ok', timestamp }` for monitoring.

### Data Management & Persistence
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Tables**: `saved_loadouts` for user loadouts and `sessions` for server-side session management.
-   **Authentication**: Bungie OAuth2 with server-side sessions using HTTPOnly cookies. Implements refresh token rotation and session cleanup. Includes `requireAuth` middleware for API protection and Cloudflare Turnstile CAPTCHA integration.
-   **Shared Layer**: `shared/` directory contains `schema.ts` (Drizzle ORM/Zod schemas) and `routes.ts` (type-safe API route definitions with Zod validation).

### Security & Robustness
-   **Security**: Helmet for security headers, `express-rate-limit` for API rate limiting, CORS configured with exact origin matching (URL-parsed hostname check in dev), bot protection, 100kb request size limit, Cloudflare integration with IP validation (`getClientIp` verifies `cf-connecting-ip` only when `req.ip` is in Cloudflare IP ranges, handles IPv4-mapped IPv6). SESSION_SECRET is required in production (no fallback).
-   **Error Handling**: React Error Boundary, `useOnlineStatus` hook for offline support (disables action buttons when offline), React Query retry logic (rate-limit-aware — skips retries on 429), mutation locking to prevent concurrent Bungie mutations, and AbortController for fetch cleanup. AI error handling uses `handleAiError` helper with robust status extraction. Consistent error schema: all endpoints return `{ message, errorType?, errorCode? }`.
-   **Internationalization**: Supports German, English, and French. Language preference stored under `guardiangrid_language` localStorage key (migrated from legacy `forge_language`).
-   **Code Splitting**: Secondary Dashboard tabs (Collections, Triumphs, Season, AI panels, News) are lazy-loaded with `React.lazy()` and `Suspense` to reduce initial bundle size.
-   **Animation Constants**: `appleEase`, `springSnappy`, `springGentle`, `springMedium` centralized in `client/src/components/dashboard/shared.ts` (no longer duplicated per-file).
-   **Tab Sync**: `BroadcastChannel` notifies other browser tabs on mutation success; profile auto-refetches every 5 minutes when tab is active.
-   **Share Code Collision**: Server generates share codes with `nanoid(10)` and retries up to 3 times on unique constraint violation.
-   **Accessibility**: Key interactive elements (item cards, dropdown actions, menu toggle, refresh) have `aria-label` and `aria-expanded` attributes. Noise overlay fully hidden via `display: none` under `prefers-reduced-motion`.

## External Dependencies

### Third-Party Services
-   **Bungie.net API**: Primary external service for all game data and authentication.
-   **PostgreSQL**: Relational database for persistent storage.
-   **OpenAI GPT-4o**: Integrated via Replit AI Integrations for AI advisor features.
-   **Cloudflare Turnstile**: Optional CAPTCHA service for login.

### Key NPM Packages
-   **Database**: `drizzle-orm`, `drizzle-kit`, `drizzle-zod`.
-   **Backend**: `express`, `helmet`, `express-rate-limit`, `cors`, `cookie-parser`.
-   **Frontend**: `@tanstack/react-query`, `@tanstack/react-virtual`, `wouter`, `framer-motion`, `shadcn/ui`, `radix-ui`.
-   **Utilities**: `zod`, `nanoid`.

### UX Patterns
-   **Item Detail Modal**: Tapping any item in the Vault or Postmaster opens a full detail modal (`ItemDetailModal.tsx`) showing screenshot, icon, name, description, stats (with animated bars), active/inactive perks, mods, and action buttons (add to loadout, transfer, equip). Uses `z-[70]` to layer above all other UI. Supports all three languages.
-   **Pending Item Overlay**: When items are being transferred/equipped/pulled, a spinning loader overlay appears on the item card (VaultItemCard, EquippedSlotRow, PostmasterPanel items) using `pendingItemIds` state tracked in Dashboard.
-   **Vault Virtualization**: VaultPanel uses `@tanstack/react-virtual` for row-based virtualization with responsive column detection, improving performance for large vaults.
-   **Mobile Bottom Tab Bar**: 4 main tabs (characters/vault/loadouts/postmaster) + "Mehr" overflow button on mobile; hamburger menu hidden on mobile.