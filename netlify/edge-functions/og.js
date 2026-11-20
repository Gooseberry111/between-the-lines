// netlify/edge-functions/og.js — link previews on Netlify.
//
// Chat apps and social sites (WhatsApp, iMessage, X, Slack…) don't run
// JavaScript, so they can't see a poem's title in the Vue app. This Edge
// Function runs before the site's routing on poem / poet / collection URLs:
//   - link-preview bots get a tiny HTML page with Open Graph tags
//   - everyone else passes straight through to the app as normal
//
// Netlify deploys it automatically with the site (it's picked up from the
// netlify/edge-functions folder) — nothing to configure. It reads published
// poems with the public anon key (needs supabase/sql/03_public_reading.sql).

const SUPABASE_URL = "https://fnwkzvntkjjzqxerqxvs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZud2t6dm50a2pqenF4ZXJxeHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MTUzMTksImV4cCI6MjEwMDI5MTMxOX0.ZAMgkAOx38CxCdhKJvyOl76n5bAo5wxKCBju8Q9GVaY";

const DEFAULT_DESCRIPTION = "A quiet place to write, read and listen to poetry.";

export const PREVIEW_BOTS =
  /bot|crawler|spider|facebookexternalhit|whatsapp|telegram|slack|discord|twitter|linkedin|embedly|pinterest|skype|iframely|preview/i;

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstLines(body = "", count = 2) {
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, count)
    .join(" / ");
}

async function fetchOne(table, query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}&limit=1`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] ?? null;
}

/** Works out the preview title/description for an app path. */
export async function describe(path) {
  const meta = { title: "Between the Lines", description: DEFAULT_DESCRIPTION, type: "website" };
  const [, kind, rawId] = path.match(/^\/(poem|poet|collection)\/([^/?#]+)/) ?? [];
  const id = rawId ? encodeURIComponent(decodeURIComponent(rawId)) : null;

  try {
    if (kind === "poem") {
      // status=published: never leak drafts
      const poem = await fetchOne("poems", `select=title,body,profiles(username)&id=eq.${id}&status=eq.published`);
      if (poem) {
        const author = poem.profiles?.username;
        meta.title = author ? `${poem.title} — ${author}` : poem.title;
        meta.description = firstLines(poem.body) || DEFAULT_DESCRIPTION;
        meta.type = "article";
      }
    } else if (kind === "poet") {
      const poet = await fetchOne("profiles", `select=*&id=eq.${id}`);
      if (poet?.username) {
        meta.title = `${poet.username} · Between the Lines`;
        meta.description = poet.bio || `Poems by ${poet.username}.`;
        meta.type = "profile";
      }
    } else if (kind === "collection") {
      const col = await fetchOne("collections", `select=title,description,profiles(username)&id=eq.${id}`);
      if (col) {
        const author = col.profiles?.username;
        meta.title = `${col.title}${author ? ` — a collection by ${author}` : ""}`;
        meta.description = col.description || DEFAULT_DESCRIPTION;
      }
    }
  } catch (err) {
    console.warn("og lookup failed:", err?.message);
  }
  return meta;
}

/** Builds the preview page for a request (bot check happens in the handler). */
export async function renderPreview(request) {
  const url = new URL(request.url);
  const site = url.origin;
  const path = url.pathname;

  const { title, description, type } = await describe(path);
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const u = escapeHtml(`${site}${path}`);
  const image = escapeHtml(`${site}/og-image.png`);

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>${t}</title>
<meta name="description" content="${d}">
<link rel="canonical" href="${u}">
<meta property="og:site_name" content="Between the Lines">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${u}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${image}">
<meta http-equiv="refresh" content="0; url=${u}">
</head><body><a href="${u}">${t}</a></body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}

export default async (request) => {
  const userAgent = request.headers.get("user-agent") ?? "";
  // People get the normal app: returning nothing lets Netlify carry on
  if (!PREVIEW_BOTS.test(userAgent)) return;
  return renderPreview(request);
};

export const config = {
  path: ["/poem/*", "/poet/*", "/collection/*"],
};
