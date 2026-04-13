# Synchroni Standalone Demo UI

This folder contains a **fully isolated demo environment** of the Synchroni platform UI.

- No backend or Supabase calls
- No imports from existing production code
- Mock data only
- Safe for live demos and stakeholder walkthroughs

## Included demo views

1. Landing / dashboard view
2. Creator dashboard (track upload visual + track metadata list)
3. Client dashboard (brief list + brief detail pane)
4. Track discovery (search + filters + results)
5. Submission view (track-to-brief statuses)

## Run locally

### Option 1: Open directly

Open `index.html` in your browser.

### Option 2: Serve with a local static server (recommended)

From the repository root:

```bash
python3 -m http.server 4173 --directory demo-sync-ui
```

Then visit: `http://localhost:4173`

## Demo interactions

- Left navigation switches between all views.
- Client dashboard: click a brief row to load its detail.
- Discovery page: search input and filters dynamically update results.
