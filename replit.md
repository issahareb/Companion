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
    -   **Theming**: Dark, Destiny-inspired with a gold/indigo palette, custom clip-paths, subtle animations.
    -   **Typography**: Protest Strike (headings), Plus Jakarta Sans (body), JetBrains Mono (code).
    -   **Animations**: Cinematic animation system using Framer Motion + CSS, Apple ease curve, spring physics. Includes reveal, lift, scale, 3D card effects, and various hover interactions. Supports `prefers-reduced-motion` for accessibility.
    -   **Layout**: Consolidated header, tab-style character selector, responsive design with hamburger menu and desktop sidebar.
-   **Core Pages**: Home/Login, Dashboard (characters, vault, loadouts, postmaster, collections, triumphs, season progression, AI analysis), and a loadout sharing page with smart matching capabilities.

### Backend
-   **Framework**: Express 5 on Node.js.
-   **API**: Manages Bungie API interactions (fetching profile data, item transfers, equips, subclass mods, in-game loadouts) and CRUD for user-saved loadouts. Includes endpoints for AI services and Bungie news.
-   **Bungie API Integration**: Fetches comprehensive player profile states. Implements `bungieRequestWithRetry` with exponential backoff, 15s timeout, and handles various HTTP and Bungie-specific errors. Features a server-side 30s TTL in-memory profile cache and robust error classification.
-   **AI Advisor Suite**: Integrates OpenAI GPT-4o via Replit AI Integrations. Provides endpoints for Playstyle Analysis, Build Recommendation, Weapon Roll Evaluation, Triumph Advisor, and Equipment Synergy Analysis. All AI endpoints are rate-limited and require authentication.
-   **Bungie News Feed**: Provides a public endpoint for the latest Bungie.net news, with a 10-minute server-side cache and content type detection.

### Data Management & Persistence
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Tables**: `saved_loadouts` for user loadouts and `sessions` for server-side session management.
-   **Authentication**: Bungie OAuth2 with server-side sessions using HTTPOnly cookies. Implements refresh token rotation and session cleanup. Includes `requireAuth` middleware for API protection and Cloudflare Turnstile CAPTCHA integration.
-   **Shared Layer**: `shared/` directory contains `schema.ts` (Drizzle ORM/Zod schemas) and `routes.ts` (type-safe API route definitions with Zod validation).

### Security & Robustness
-   **Security**: Helmet for security headers, `express-rate-limit` for API rate limiting, CORS configured, bot protection, request size limits, and Cloudflare integration readiness.
-   **Error Handling**: React Error Boundary, `useOnlineStatus` hook for offline support, React Query retry logic, mutation locking to prevent concurrent Bungie mutations, and AbortController for fetch cleanup.
-   **Internationalization**: Supports German, English, and French.

## External Dependencies

### Third-Party Services
-   **Bungie.net API**: Primary external service for all game data and authentication.
-   **PostgreSQL**: Relational database for persistent storage.
-   **OpenAI GPT-4o**: Integrated via Replit AI Integrations for AI advisor features.
-   **Cloudflare Turnstile**: Optional CAPTCHA service for login.

### Key NPM Packages
-   **Database**: `drizzle-orm`, `drizzle-kit`, `drizzle-zod`.
-   **Backend**: `express`, `helmet`, `express-rate-limit`, `cors`, `cookie-parser`.
-   **Frontend**: `@tanstack/react-query`, `wouter`, `framer-motion`, `shadcn/ui`, `radix-ui`.
-   **Utilities**: `zod`, `nanoid`.