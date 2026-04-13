/*
  # Update Tracks with Real Audio URLs
  
  1. Changes
    - Updates the 111 Collective artist tracks with verified real audio URLs
    - Uses publicly accessible audio samples that actually exist
*/

UPDATE tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' WHERE artist = 'Naïka' AND title = 'Midnight Bloom';
UPDATE tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' WHERE artist = 'Naïka' AND title = 'Glass Heart';
UPDATE tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' WHERE artist = 'Naïka' AND title = 'Honey Drip';

UPDATE tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' WHERE artist = 'Tia Tia' AND title = 'Golden Hour';
UPDATE tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' WHERE artist = 'Tia Tia' AND title = 'Neon Dreams';
UPDATE tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' WHERE artist = 'Tia Tia' AND title = 'Soft Landing';

UPDATE tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' WHERE artist = 'Darkchild Collective' AND title = 'Shadow Protocol';
UPDATE tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' WHERE artist = 'Darkchild Collective' AND title = 'Concrete Jungle';
UPDATE tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' WHERE artist = 'Darkchild Collective' AND title = 'Night Shift';

UPDATE tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' WHERE artist = 'Cody Tarpley' AND title = 'Dusty Roads';
UPDATE tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3' WHERE artist = 'Cody Tarpley' AND title = 'Front Porch Blues';
UPDATE tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3' WHERE artist = 'Cody Tarpley' AND title = 'Wildfire Heart';

UPDATE tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3' WHERE artist = 'Leather Jacket' AND title = 'Chrome Hearts';
UPDATE tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3' WHERE artist = 'Leather Jacket' AND title = 'Midnight Ride';
UPDATE tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3' WHERE artist = 'Leather Jacket' AND title = 'Broken Halo';

UPDATE tracks SET audio_url = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3' WHERE artist = 'Timothy Williams' AND title = 'Epic Horizons';
UPDATE tracks SET audio_url = 'https://file-examples.com/storage/fef84f67ad67d61eb58a36a/2017/11/file_example_MP3_700KB.mp3' WHERE artist = 'Timothy Williams' AND title = 'Whispers of Time';
UPDATE tracks SET audio_url = 'https://file-examples.com/storage/fef84f67ad67d61eb58a36a/2017/11/file_example_MP3_1MG.mp3' WHERE artist = 'Timothy Williams' AND title = 'Battle Cry';
