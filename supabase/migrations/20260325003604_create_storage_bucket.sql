/*
  # Create Storage Bucket for Audio Tracks

  1. Creates the audio-tracks bucket
  2. Sets up storage policies for uploading and reading audio files
*/

-- Create storage bucket for audio tracks
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-tracks', 'audio-tracks', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to audio-tracks bucket
CREATE POLICY "Users can upload audio tracks"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-tracks');

-- Allow public read access to audio tracks
CREATE POLICY "Public can read audio tracks"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio-tracks');
