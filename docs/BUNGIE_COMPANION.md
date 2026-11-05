# Bungie companion features

The authenticated dashboard has a lazy-loaded **Companion** section:

- Public milestones with Bungie's supplied expiry dates, separate from personal completion status.
- Character-specific vendor inventory, prices, purchase restrictions and refresh times. Purchases remain in the game.
- A clearly bounded sample of the last 50 activities of the selected character, plus on-demand post-game reports and weapon kills when supplied. Missing report metrics remain unknown rather than becoming zero.
- An armor selector over owned, compatible items. It maximizes reported stat totals (optionally weighting one stat three times) with one piece per slot and at most one exotic. It does not model mods, aspects, set bonuses, targets or future stat changes after equipping. Selection opens the existing loadout editor without applying it to the game.
- Duplicate comparison by item definition with unique instance IDs, reported stats, active sockets and reversible lock controls. No automatic deletion or invented best-roll verdict.
- Native loadout equip, snapshot, clear and rename using Bungie's predefined names. Overwrites and clears require an explicit in-app confirmation. Locked/unavailable slots are rejected by Bungie and surfaced to the player.
- Reusable socket choices on character-held equipment through `InsertSocketPlugFree`. Bungie validates unlocks, cost, location and reversibility. No spending of materials.

Existing character inventory, transfers, collections, triumphs, news, roll ratings and AI advice are retained. No new AI credentials, AI calls, database tables or migrations are introduced.

## Integration fixes

All browser action payloads now accept numeric platform IDs as well as legacy numeric strings, validating them to supported Destiny platforms. Instance and character IDs remain strings to avoid int64 precision loss. Socket requests are translated into Bungie's `itemId` and nested `plug` contract. Transfer/postmaster stack sizes are forwarded; profile caches invalidate for either platform representation. Write requests are not replayed automatically after an ambiguous network timeout. Profile requests include reusable plug component 310, zero-valued item stats are retained, and inventory lock states are exposed.

## Access and caching

All new endpoints require a session. Vendor requests additionally enforce the session's Destiny membership ID. Public milestone data is cached for five minutes and definition tables for one hour with request coalescing. Private vendor and report data is not stored in a shared server cache. Client query keys include character/account or activity IDs, requests are loaded on demand, and logout clears the existing query cache. Game changes use existing session auth, same-origin protections, shared mutation state and profile invalidation.

The Bungie application must have the appropriate vendor read and item move/equip permissions. An expired login, missing permission, maintenance or rate limit is displayed as an error. These controls do not resolve an independent OAuth callback/DNS configuration problem.

## Verification

- `npm run check`
- `npm run build` (equivalent without tsx CLI IPC: `node --import tsx script/build.ts`)
- `node --import tsx --test script/bungie-companion.test.ts`
- After building and starting `vite preview` on port 4173: `node script/companion-browser-test.mjs`
- Existing UI, OAuth and Postgres API suites in `.github/workflows/verify-redesign.yml`.

Bungie contract and route tests stub upstream calls and session storage, never accessing a real account. Browser tests similarly use fixtures. An authenticated real-account check remains necessary before claiming production verification of game changes.

Official reference: https://bungie-net.github.io/multi/index.html and https://github.com/Bungie-net/api.
