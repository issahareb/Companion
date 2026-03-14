# Replit.md

## Overview
GuardianGrid (Adept) is a Destiny 2 loadout manager web application. It allows players to authenticate with Bungie, manage in-game inventory, create and save custom loadouts, and share them. The application provides a dark, Destiny-themed UI with custom animations, supports German, English, and French localization, and includes AI-driven insights to enhance the player experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project is structured as a monorepo containing `client/` (React frontend), `server/` (Express backend), and `shared/` (shared types and schemas).

### Frontend
-   **Framework**: React 18 with TypeScript, Vite, Wouter for routing, and TanStack React Query for state management.
-   **UI/UX**: shadcn/ui with Radix UI and Tailwind CSS for components, Framer Motion for animations.
    -   **Theming**: Dark, Destiny-inspired theme using a gold/indigo palette, custom clip-paths, and subtle animations. Rarity colors are defined via CSS variables.
    -   **Typography**: Uses Protest Strike for headings, Plus Jakarta Sans for body text, and JetBrains Mono for code, with specific tracking classes for Destiny-themed spacing. Uppercase is limited to section headers and tab labels.
    -   **Animations**: Employs a cinematic animation system with Framer Motion + CSS, Apple ease curve, and spring physics. Tab transitions use crossfade, and entry animations are shown only on first load. Supports `prefers-reduced-motion`.
    -   **Layout**: Features a consolidated header, tab-style character selector, a collapsible desktop sidebar, and a mobile bottom tab bar with an overflow menu.
-   **Core Pages**: Includes Home/Login, a comprehensive Dashboard (characters, vault, loadouts, postmaster, collections, triumphs, season progression, activity/raid report, AI analysis), loadout sharing, and legal pages (Impressum, Datenschutz/Privacy Policy) with multi-language support.
-   **Loadout Builder**: Allows adding items with associated perks, mods, and stats, and full subclass configuration.

### Backend
-   **Framework**: Express 5 on Node.js.
-   **API**: Manages Bungie API interactions (fetching profile data, item transfers, equips, subclass mods, in-game loadouts), CRUD operations for user-saved loadouts, AI services, and Bungie news.
-   **Bungie API Integration**: Handles comprehensive profile data fetching, `bungieRequestWithRetry` with exponential backoff, error handling, and a server-side 30s TTL in-memory profile cache. Supports partial responses to optimize data usage.
-   **AI Advisor Suite**: Integrates OpenAI GPT-4o via Replit AI Integrations for Playstyle Analysis, Build Recommendation, Weapon Roll Evaluation, Triumph Advisor, and Equipment Synergy Analysis. AI endpoints are rate-limited and enforce per-user daily usage limits (5/day free, unlimited for premium).
-   **Activity History / Raid Report**: Fetches and processes activity history from the Bungie API, including raid, dungeon, nightfall, crucible, gambit, trials, and strike modes, providing stats and breakdowns.
-   **Bungie News Feed**: Provides a public endpoint for the latest Bungie.net news with a 10-minute server-side cache.

### Data Management & Persistence
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Tables**: `saved_loadouts`, `sessions`, `ai_usage` (for tracking AI request counts with daily resets), and `user_premium` (for premium subscription status).
-   **Authentication**: Bungie OAuth2 with server-side sessions using HTTPOnly cookies, refresh token rotation, and Cloudflare Turnstile CAPTCHA integration.
-   **Shared Layer**: `shared/` directory contains `schema.ts` (Drizzle ORM/Zod schemas) and `routes.ts` (type-safe API route definitions with Zod validation).

### Security & Robustness
-   **Security**: Implements Helmet for security headers (HSTS 2yr, CSP, X-Frame-Options deny), `express-rate-limit`, CORS with exact origin matching, bot protection, Cloudflare integration for IP validation, Zod validation on all mutation endpoints (Bungie + loadouts + AI), session binding (UA hash + 90-day absolute expiry), IDOR protection on loadout list/delete, and a global error handler that never leaks internal error messages (5xx → generic message).
-   **Error Handling**: Utilizes React Error Boundary, `useOnlineStatus` for offline support, React Query retry logic (rate-limit-aware), mutation locking, and AbortController for fetch cleanup. Consistent error schema for API responses.
-   **Internationalization**: Supports German, English, and French, with language preferences stored in localStorage.
-   **Code Splitting**: Uses `React.lazy()` and `Suspense` for lazy-loading secondary Dashboard tabs to reduce initial bundle size.
-   **Premium / Monetization**: Free tier offers 5 daily AI requests; premium provides unlimited access. Usage tracked in `ai_usage` table.
-   **Tab Sync**: `BroadcastChannel` for cross-tab communication and auto-refetching profile data every 5 minutes when active.

## External Dependencies

### Third-Party Services
-   **Bungie.net API**: Main source for all game data and authentication.
-   **PostgreSQL**: Database for persistent storage.
-   **OpenAI GPT-4o**: Integrated via Replit AI Integrations for AI features.
-   **Cloudflare Turnstile**: CAPTCHA service for authentication.

### Key NPM Packages
-   **Database**: `drizzle-orm`, `drizzle-kit`, `drizzle-zod`.
-   **Backend**: `express`, `helmet`, `express-rate-limit`, `cors`, `cookie-parser`.
-   **Frontend**: `@tanstack/react-query`, `@tanstack/react-virtual`, `wouter`, `framer-motion`, `shadcn/ui`, `radix-ui`.
-   **Utilities**: `zod`, `nanoid`.