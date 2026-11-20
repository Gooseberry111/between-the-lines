# Between the Lines

A quiet place to write, read and listen to poetry. Built with Vue 3, Vite,
Tailwind CSS 4 and Supabase.

## Features

- **Reading** — open to everyone; line-by-line read-aloud with highlighting,
  AI-matched instrumentals, adjustable text size, focus mode
- **Line hearts, margin notes, share-a-line images**
- **Writing studio** — live preview, local autosave, daily prompts, choose your
  own instrumental, version history
- **Poet pages** with bios, follows and most-loved lines
- **Notifications** for hearts, notes and new followers
- **Saved poems**, readable offline; installable as an app

## Development

```sh
npm install
npm run dev          # http://localhost:5175
npm run build
```

## Tests

```sh
npm test             # unit tests (Vitest)
npm run build && npm run test:e2e   # browser checks: routing, features, phone layouts
```

The browser checks use an installed Chrome or Edge (set `CHROME_PATH` if it
isn't found) and a fake Supabase, so they never touch real data.

## Database & functions

See [`supabase/sql/README.md`](supabase/sql/README.md): run the numbered SQL
files in order, then deploy the edge functions.

## Hosting (Netlify)

- `public/_redirects` sends every route to the app, so deep links and
  refreshes work.
- `netlify/edge-functions/og.js` answers link-preview bots (WhatsApp,
  iMessage, X, Slack…) on poem, poet and collection URLs with the poem's
  title and opening lines. It deploys automatically with the site.
