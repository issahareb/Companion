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
-   **Key Pages**: Home/Login, Dashboard (with tabs for characters, vault, loadouts, postmaster, collections, triumphs, season progression), and a loadout sharing page.

### Backend (server/)
-   **Framework**: Express 5 on Node.js.
-   **API Routes**: Manages Bungie API interactions for fetching profile data, transferring items, equipping items, pulling from postmaster, locking items, inserting subclass plugs, and managing in-game loadouts. Also handles CRUD operations for user-saved loadouts.

### Bungie API Integration
-   The server fetches comprehensive player profile states, including characters, inventory, vault, postmaster, currencies, collectibles, records, seasonal artifact, and in-game loadouts using various Bungie API components.
-   Provides endpoints for in-game actions like item transfers, equipping, and subclass modifications.
-   Caches Bungie manifest data for 24 hours.

### Client-Side Data Management
-   Extensive type definitions for game entities like perks, mods, sockets, artifacts, inventory items, collectibles, records, and progressions.
-   Custom React hooks for fetching and mutating Bungie API data and managing saved loadouts.

### Internationalization (i18n)
-   Supports German, English, and French, covering all UI strings.

### Shared Layer (shared/)
-   **`schema.ts`**: Drizzle ORM table definitions and Zod schemas.
-   **`routes.ts`**: Type-safe API route definitions with Zod validation.

### Database
-   **ORM**: Drizzle ORM with PostgreSQL.
-   **Tables**: `saved_loadouts` for storing user-defined loadouts with item details, class type, and share codes.

### Authentication
-   **Bungie OAuth2**: Client-side public OAuth flow. Access tokens are stored in `localStorage`. The server relies on `bungieMembershipId` from the client for API requests.

### Storage Pattern
-   Uses a swappable `IStorage` interface, currently implemented with PostgreSQL (`DatabaseStorage`).

### UI/UX Decisions
-   **Theming**: Dark, Destiny-inspired with a gold/indigo color palette, custom clip-paths, and animations.
-   **Typography**: Protest Strike (headings), Plus Jakarta Sans (body), JetBrains Mono (code).
-   **Animations**: Framer Motion for page transitions, item interactions, staggered entrances, and specific UI element animations (e.g., exotic item glow, max stats shimmer).
-   **Branding**: "GuardianGrid (Adept)" with "(Adept)" in gold.
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