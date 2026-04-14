# Synchroni — agent notes

## Supabase

- Use **only** `src/lib/supabase.ts` for `createClient` (hardcoded URL + anon key per product decision).
- **Profiles:** always load/update by `id` from `auth.users`, never by email.

## Auth UX

- Session bootstrap must **never** hang: enforce a **3s** max wait (e.g. `Promise.race` with `getSession`).
- Sign out: `signOut()` → clear user state → `window.location.reload()`.

## Roles & navigation

- **Default tab after login:** supervisor → Search; artist → My Catalog; label → Catalog Search; admin → Search (with top-bar role preview).
- **Admin** viewing as themselves: supervisor sidebar + Admin Panel only (not merged artist/label trees).

## Builds

- Run `npm run typecheck` and `npm run build` before shipping; fix all TypeScript errors.
