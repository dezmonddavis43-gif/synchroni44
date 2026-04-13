# Synchroni-4

Sync licensing marketplace/workflow platform built with React + Vite + Supabase and deployed on Netlify.

## Local development

```bash
npm install
npm run dev
```

## Environment variables

Set these in Netlify and local `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ANTHROPIC_API_KEY` (optional; enables AI metadata suggestion during upload)

## Quality checks

```bash
npm run typecheck
npm run build
npm run smoke
npm run test:critical
```

`test:critical` requires these additional vars for authenticated end-to-end checks:

- `SUPABASE_SMOKE_EMAIL`
- `SUPABASE_SMOKE_PASSWORD`

## Studio demo media behavior

- The Studio now auto-seeds demo projects per user when that user has no Studio entries.
- Demo projects are stored in `studio_entries` and `studio_entry_tracks` (real database records, not UI-only mocks).
- Demo media uses lightweight public HTTPS assets for immediate local playback:
  - video via `video_url`
  - audio via `audio_url`
- User uploads continue to use Supabase Storage bucket `studio` with owner-scoped object paths:
  - `studio/{userId}/{studioEntryId}/thumbnail/...`
  - `studio/{userId}/{studioEntryId}/video/...`
  - `studio/{userId}/{studioEntryId}/audio/...`
