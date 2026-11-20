# Database setup

Run these in **Supabase Dashboard → SQL Editor**, in order. Each file is safe
to run more than once, and they only add things — no existing data is changed.

| File | What it turns on |
| --- | --- |
| `01_poem_lines_update_policy.sql` | Editing a poem keeps the hearts on its lines |
| `02_saved_poems.sql` | Bookmarking poems and the Saved page |
| `03_public_reading.sql` | Reading published poems without an account |
| `04_social.sql` | Poet bios, following, margin notes, notifications, most-loved lines |
| `05_poem_versions.sql` | Draft history in the editor |
| `06_admin.sql` | Admin page: poem of the day, editor's picks, reports & moderation (then make yourself admin — see the top of the file) |

Every feature checks whether its table exists, so the app keeps working if a
file hasn't been run yet — that feature is just hidden.

## Edge functions

```sh
supabase functions deploy match-instrumental
supabase functions deploy delete-account
```

Link previews are handled by `netlify/edge-functions/og.js`, which deploys
with the site on Netlify — nothing to set up in Supabase.
