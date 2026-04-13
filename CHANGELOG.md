# Changelog

## 2026-03-26
- Added real session bootstrapping in `App.tsx` with Supabase auth session restore, profile hydration, normalized role handling, and role-based tab guarding.
- Added role alias normalization helpers (`creator` / `client` mappings) for consistent access control.
- Added `brief_submissions` migration with duplicate protection, status workflow, RLS policies, indexes, and `updated_at` trigger.
- Upgraded supervisor brief management UI to support richer brief fields, editing, publish/close/archive actions, and inline submission status review.
- Updated creator opportunities flow to use submission lifecycle statuses (`submitted`, `in_review`, `shortlisted`, `selected`, `licensed`, `rejected`) with duplicate-safe handling.
- Added upload validation utility for audio file type and size checks before storage upload.
