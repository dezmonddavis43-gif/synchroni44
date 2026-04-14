-- Precise length from client-side decode; display uses MM:SS from duration_ms / 1000.
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS duration_ms integer;

COMMENT ON COLUMN public.tracks.duration_ms IS 'Audio length in milliseconds (from Web Audio decode on upload).';
