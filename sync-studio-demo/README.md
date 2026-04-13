# Sync Studio (Standalone Demo)

Sync Studio is a **fully standalone concept demo** for investor/partner/music-supervisor conversations. It is intentionally isolated from the production app and uses static mock data only.

## What this demo includes

### Screens
1. **Landing**
   - Headline: "Upload a scene. Audition music in context."
   - CTA: Upload Clip
   - CTA: Try Demo Scene
2. **Upload Clip**
   - Drag/drop style upload zone
   - Validation messaging for:
     - invalid file type
     - clip over 30 seconds (simulated)
     - failed upload
   - Optional title + notes
3. **Studio Workspace**
   - Split-screen layout with scene playback controls on left
   - Search/filter + track cards on right
   - Track cards include title, artist, genre, mood tags, duration, preview, Try on Scene, favorite
4. **Audition Mode**
   - Active track state
   - Clip/music volume controls
   - Music start offset control
   - Restart scene + remove track actions
   - Simulated synchronized playback behavior
5. **Saved Matches**
   - Pre-seeded examples + newly saved matches
   - Reopen any saved match back into workspace

### Seeded data
- **3 demo scenes**
  - Nike Spot – Tunnel Walk
  - YouTube Travel Intro
  - Indie Drama – Closing Scene
- **10 demo tracks** with metadata
  - title, artist, genre, mood tags, BPM, duration, vocal/instrumental, one-stop, easy-clear
- **3 saved scene matches**

## Run locally

From repository root:

```bash
cd sync-studio-demo
python3 -m http.server 4173
```

Open: `http://localhost:4173`

(Any static server works; no build step or backend required.)

## Demo flow (concise)

1. Start on Landing and click **Upload Clip** or **Try Demo Scene**.
2. In Upload, pick a `.mov` file, optionally add title/notes, then upload.
3. Enter Workspace, search/filter tracks, then click **Try on Scene**.
4. Adjust music offset/volume and clip audio controls while playback runs.
5. Save a pairing to **Saved Scene Matches**.
6. Reopen any saved match for another pass.

## Simulated vs future production behavior

### Simulated in this prototype
- No backend, auth, storage, or database
- No real audio/video compositing
- Upload progress and failure are UI simulation
- 30-second validation is represented via file-size threshold + messaging
- Preview and synchronized playback are visual state simulations

### Would be real in production
- Real media upload/transcoding + duration validation from media metadata
- Secure asset storage and signed URLs
- Actual dual-channel playback engine (scene + selected track) with sync and offset
- Rights/clearance metadata from catalog APIs
- Persistent saved matches tied to user/team accounts
- Collaboration/sharing and export workflows
