import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://iaiwasggfhufetrmhcwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhaXdhc2dnZmh1ZmV0cm1oY3d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzOTcyMDIsImV4cCI6MjA4OTk3MzIwMn0.carIi1R6DGBLKq5n7jYv_nK96hoNoFgsoV8rAe8m7Ck'
)
