# CODEX Audit Report — Synchroni4

Date: 2026-03-26 (UTC)

## Scope and Method
This audit was performed by **executing** the repository and scripts, not code-reading alone.

Executed commands:
- `npm ci`
- `npm test`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run dev -- --host 127.0.0.1 --port 4173` + HTTP probe
- `npm run smoke` (new smoke script added during this audit)
- direct network checks to hosted Supabase endpoint

---

## 1) Stack Identification

### Frontend stack
- React 18 + TypeScript + Vite
- Tailwind CSS + PostCSS
- ESLint (flat config)

### Backend/data stack
- Supabase (Auth + Postgres + Storage) via `@supabase/supabase-js`
- SQL migrations in `supabase/migrations/*.sql`

### Deployment hints
- Netlify config exists (`netlify.toml`, `public/_redirects`)

---

## 2) Scripts and Tooling Setup

From `package.json`:
- `dev` → `vite`
- `build` → `vite build`
- `lint` → `eslint .`
- `typecheck` → `tsc --noEmit -p tsconfig.app.json`
- `preview` → `vite preview`
- `smoke` → `node scripts/smoke-test.mjs` (**added in this audit**)

No `test` script existed at start.

---

## 3) Environment Requirements

### Current behavior
The app currently uses a Supabase project and anon key. During this audit, `src/lib/supabase.ts` was updated to support env-based configuration with fallback values:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Optional smoke-test env vars (added)
For authenticated backend smoke checks:
- `SUPABASE_SMOKE_EMAIL`
- `SUPABASE_SMOKE_PASSWORD`
- plus `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Additional external integration noted
- `Upload.tsx` contains an Anthropic call using placeholder key text (`ANTHROPIC_API_KEY`) in request headers; this is not wired to runtime secrets and will not work as-is.

---

## 4) Database Setup and Storage Setup

### Migrations present
Schema and workflow migrations exist for:
- profiles, tracks, projects, playlists, briefs, submissions/workflow, messaging, analytics, etc.
- storage bucket provisioning for `audio-tracks`

### Storage
- migration creates bucket `audio-tracks` and policies for upload/public-read.

### Reality during execution
- Environment network policy blocked direct access to hosted Supabase (`CONNECT tunnel failed, response 403`), preventing end-to-end verification against that remote backend from this runtime.

---

## 5) Auth Flow and RBAC (from executed behavior + code-path validation)

### Auth flow in app
- Sign in/up via Supabase Auth UI (`AuthScreen`)
- On auth, profile is loaded/created in `profiles`
- Role normalized to canonical values (`supervisor`, `artist`, `label`, `admin`)
- Allowed tabs are role-dependent in `getAllowedTabs`

### Execution outcome
- Could not execute real sign-in against Supabase from this runtime due upstream network restriction.
- Frontend shell and auth screen route are served and mount successfully.

---

## 6) Checks Run (Initial State)

### `npm ci`
- **Pass**

### `npm test`
- **Fail**: script missing

### `npm run lint`
- **Fail**: 60 issues (24 errors, 36 warnings)
- Blocking errors include no-unused-vars, no-explicit-any, hooks rules violations, etc.

### `npm run typecheck`
- **Fail**: multiple TS errors, including strict type mismatches and unused locals.

### `npm run build`
- **Pass** (bundle built)

### `npm run dev` startup
- **Pass** (HTTP 200 from local dev server)

---

## 7) Feature Verification Matrix (Execution-backed)

Status key:
- ✅ Verified working through direct execution
- ⚠️ Partially verified (frontend/runtime only)
- ❌ Could not verify due blocker

| Area | Status | Notes |
|---|---:|---|
| auth / sign in | ❌ | Backend sign-in blocked by Supabase network access restriction in this environment. |
| role-based access | ⚠️ | Client-side role gating logic exists and was traced; could not complete authenticated end-to-end server check. |
| dashboards | ⚠️ | UI boot verified; data-backed dashboard paths depend on Supabase access. |
| brief creation/editing | ⚠️ | Code paths and SQL schema exist; not executable end-to-end without backend access. |
| track upload with real files | ❌ | Upload flow depends on Supabase Storage write + DB insert; backend inaccessible here. |
| catalog browsing/search | ⚠️ | UI path available; track query execution to backend blocked. |
| submissions to briefs | ⚠️ | Table/workflow exists (`brief_submissions`); live mutation not possible in this environment. |
| database persistence | ❌ | Could not validate writes/reads against hosted DB due network block. |
| storage/file retrieval | ❌ | Could not validate storage object upload/read via hosted Supabase. |

---

## 8) Highest-Priority Issues Found

1. **No reliable smoke-test harness** for run/boot + optional backend checks.
2. **Supabase configuration hard-coded** (before this audit), making environment portability and secure config harder.
3. **Quality gates currently failing** (`lint`, `typecheck`) despite successful build.
4. **Backend verification is environment-blocked** (proxy/tunnel restriction to Supabase endpoint).

---

## 9) Fixes Applied During This Audit

### Fix A — Supabase env configurability
- Updated `src/lib/supabase.ts` to prioritize `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` with current values as fallback.
- Added clear runtime warning when env vars are absent.

### Fix B — Added executable smoke test runner
- Added `scripts/smoke-test.mjs`.
- Added `npm run smoke` script.
- Smoke runner verifies local dev server boot and app shell response.
- Includes optional authenticated Supabase checks when credentials/env are provided.

These are incremental, architecture-preserving fixes that improve operability without rewriting core product paths.

---

## 10) Re-run Results After Fixes

Executed after changes:
- `npm run lint` → still fails (existing codebase issues remain)
- `npm run typecheck` → still fails (existing codebase issues remain)
- `npm run build` → passes
- `npm run smoke` → passes local startup smoke, skips authenticated Supabase smoke due missing env credentials
- manual smoke: local dev server boot and root document served successfully

---

## 11) Exact Errors Encountered

### A) Missing test suite script
- `npm ERR! Missing script: "test"`

### B) Lint failures
- 60 total issues reported (24 errors, 36 warnings) with representative categories:
  - unused variables/imports
  - `any` usage where forbidden by lint rules
  - React hooks rule violations (including conditional hook calls in `TrackDetailModal.tsx`)

### C) Typecheck failures
Representative failures:
- strict typing mismatches for `Tabs` props in multiple files
- unused locals under `noUnusedLocals: true`

### D) Backend access failure
- `curl: (56) CONNECT tunnel failed, response 403` when probing hosted Supabase endpoint
- Node Supabase client reports `TypeError: fetch failed`

---

## 12) Likely Root Causes

1. **Quality debt accumulated**: app compiles for production but violates stricter lint/typecheck policies.
2. **No formal test harness**: no built-in test script; manual quality checks were the only guard.
3. **Env/network mismatch**: runtime cannot reach hosted Supabase from this environment.
4. **Secrets/config hygiene gap**: hard-coded backend config existed prior to this audit.

---

## 13) Recommended Fixes (Priority Order)

1. **P0: Resolve lint/typecheck blockers**
   - Fix `TrackDetailModal` hook-order violations first (runtime correctness risk).
   - Resolve `Tabs` typing mismatches across affected screens.
   - Remove/replace `any` usages and dead imports/locals.

2. **P0: Add CI gate for build + smoke + lint + typecheck**
   - Keep checks consistent and prevent regressions.

3. **P1: Add authenticated integration smoke profile for Supabase**
   - Use dedicated test account creds in CI secrets.
   - Execute auth + key read/write flows (profile, track insert, brief submission).

4. **P1: Complete env documentation**
   - Document required variables and setup for local/staging/prod.

5. **P2: Replace placeholder Anthropic key handling**
   - Move to secure server-side proxy or signed edge function; never ship hardcoded placeholder in request path.

---

## 14) Final Current Status (Post-fix)

### What works now
- Dependency install (`npm ci`)
- Production build (`npm run build`)
- Local dev server startup and app shell serving
- New smoke runner for repeatable local startup validation
- Supabase config can now be overridden via env vars

### What is broken now
- `npm run lint` fails
- `npm run typecheck` fails
- End-to-end backend verification not runnable in this environment due Supabase network/proxy block

### What is incomplete
- No first-class unit/integration test suite
- Authenticated backend smoke checks need credentials + network path
- Several critical product flows remain unverified end-to-end from this runtime (auth, upload, persistence, storage retrieval)

