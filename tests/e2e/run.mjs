// End-to-end checks in a real browser against the production build.
//
//   npm run build && npm run test:e2e
//
// Supabase is faked (sample poems below), so nothing touches real data.
// Uses an installed Chrome/Edge; set CHROME_PATH if it isn't found.
import { existsSync } from "node:fs";
import { preview } from "vite";
import puppeteer from "puppeteer-core";

// ---------------------------------------------------------------- browser
const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error("No Chrome/Edge found. Set CHROME_PATH to a Chromium-based browser.");
  process.exit(1);
}

// ---------------------------------------------------------------- fixtures
const ME = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const iso = (daysAgo) => new Date(Date.now() - daysAgo * 864e5).toISOString();
const profiles = {
  [ME]: { id: ME, username: "tester", bio: null, created_at: iso(200) },
  [OTHER]: { id: OTHER, username: "Mara Lin", bio: "Writes at night.", created_at: iso(400) },
};
const poems = [
  ["p1", OTHER, "The Weight of Small Hours", "Melancholy", "I keep the kettle singing past midnight,\nas if warmth could be stored in walls.\n\nOutside, the streetlamp hums its one note."],
  ["p2", ME, "Salt Letters", "Loss", "You wrote to me in tides,\neach line erased before I reached it."],
  ["p3", OTHER, "November Window", "Nature", "The maple lets go without ceremony,\nred, then less red, then air."],
  ["p4", OTHER, "What the River Kept", "Hope", "Not the stones, which it rounded and returned,\nbut the sound of us, laughing on the bank."],
  ["p5", ME, "Inventory of a Kind Morning", "Joy", "One cup. Two birds.\nA light that asks for nothing."],
  ["p6", OTHER, "Mirror, Unfinished", "Identity", "I am still arriving\nat the face I was promised."],
  ["p7", OTHER, "Small Arson", "Love", "You struck a match against my name\nand called it light."],
].map(([id, author_id, title, category, body], i) => ({
  id, author_id, title, category, body, status: "published", created_at: iso(i + 1),
  profiles: { username: profiles[author_id].username },
}));
const linesFor = (p) =>
  p.body.split("\n").map((content, i) => ({ id: `${p.id}-l${i}`, poem_id: p.id, line_number: i, content })).filter((l) => l.content.trim());

function respond(url) {
  const u = new URL(url);
  const table = u.pathname.split("/").pop();
  const q = u.searchParams;
  const eq = (k) => q.get(k)?.replace(/^eq\./, "");
  const page = (list) => {
    const offset = Number(q.get("offset") ?? 0);
    const limit = q.get("limit") ? Number(q.get("limit")) : list.length;
    return list.slice(offset, offset + limit);
  };
  switch (table) {
    case "poems": {
      if (eq("id")) {
        const p = poems.find((x) => x.id === eq("id"));
        return p ? { single: true, body: { ...p, audio_url: null, instrumentals: null } } : { status: 406, body: {} };
      }
      let list = [...poems];
      if (eq("author_id")) list = list.filter((p) => p.author_id === eq("author_id"));
      if (eq("category")) list = list.filter((p) => p.category === eq("category"));
      if (q.get("order")?.includes("asc")) list.reverse();
      return { body: page(list), count: list.length };
    }
    case "poem_lines":
      return { body: linesFor(poems.find((p) => p.id === eq("poem_id")) ?? poems[0]) };
    case "line_reactions":
      return { body: [{ line_id: "p1-l1", user_id: OTHER }] };
    case "line_heart_counts":
      return { body: [{ line_id: "p1-l1", content: "as if warmth could be stored in walls.", poem_id: "p1", poem_title: "The Weight of Small Hours", author_id: OTHER, username: "Mara Lin", hearts: 12 }] };
    case "profiles":
      return { single: true, body: profiles[eq("id")] ?? profiles[OTHER] };
    case "saved_poems":
      return { body: q.get("select")?.includes("poems") ? [{ created_at: iso(1), poems: poems[2] }] : [{ poem_id: "p1" }] };
    case "follows":
      return { body: [], count: 3 };
    case "notifications":
      return { body: [{ id: "n1", type: "heart", poem_id: "p2", line_id: "p2-l0", read_at: null, created_at: iso(0.1), actor: { id: OTHER, username: "Mara Lin" }, poems: { title: "Salt Letters" }, poem_lines: { content: "You wrote to me in tides," } }], count: 1 };
    case "comments":
      return { body: [{ id: "c1", body: "This stayed with me all day.", line_id: "p1-l1", user_id: OTHER, created_at: iso(1), profiles: { username: "Mara Lin" } }] };
    case "collections":
      return eq("id")
        ? { single: true, body: { id: "c1", author_id: ME, title: "Letters from November", description: "Dark half of the year.", profiles: { username: "tester" } } }
        : { body: [{ id: "c1", author_id: ME, title: "Letters from November", description: "Dark half of the year." }] };
    case "collection_poems":
      return q.get("select")?.includes("poems") ? { body: [{ position: 0, poems: poems[1] }] } : { body: [{ poem_id: "p2" }] };
    default:
      return { body: [] };
  }
}

const session = {
  access_token: "test", refresh_token: "test", token_type: "bearer", expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: ME, email: "tester@example.com", aud: "authenticated", user_metadata: { username: "tester" }, app_metadata: {} },
};

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,HEAD,POST,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info, accept-profile, content-profile, prefer, accept, x-supabase-api-version, range",
  "access-control-expose-headers": "content-range",
};

// ---------------------------------------------------------------- harness
const server = await preview({ preview: { port: 4399, strictPort: false, open: false }, logLevel: "error" });
const BASE = server.resolvedUrls.local[0].replace(/\/$/, "");
const browser = await puppeteer.launch({ executablePath, headless: true });

let failures = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "  ✓" : "  ✗"} ${msg}`);
  if (!ok) failures++;
};
const settle = (ms = 700) => new Promise((r) => setTimeout(r, ms));

async function openPage({ width = 1280, loggedIn = true } = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width, height: 900 });
  // Requests made by the service worker skip puppeteer's interception and
  // would reach the real Supabase — keep everything on the fake.
  await page.setBypassServiceWorker(true);
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    if (req.method() === "OPTIONS") return req.respond({ status: 204, headers: CORS, body: "" });
    if (url.includes("supabase.co/rest/v1/")) {
      const { body, single, count, status = 200 } = respond(url);
      const wantsObject = (req.headers().accept ?? "").includes("vnd.pgrst.object");
      const out = wantsObject || single ? (Array.isArray(body) ? body[0] : body) : Array.isArray(body) ? body : [body];
      const n = count ?? (Array.isArray(body) ? body.length : 1);
      return req.respond({
        status,
        contentType: "application/json",
        headers: { ...CORS, "content-range": `0-${Math.max(n - 1, 0)}/${n}` },
        body: req.method() === "HEAD" ? "" : JSON.stringify(out),
      });
    }
    if (url.includes("supabase.co")) return req.respond({ status: 200, contentType: "application/json", headers: CORS, body: "{}" });
    req.continue();
  });
  await page.evaluateOnNewDocument(
    (s, loggedIn) => {
      if (loggedIn) localStorage.setItem("sb-fnwkzvntkjjzqxerqxvs-auth-token", JSON.stringify(s));
    },
    session,
    loggedIn,
  );
  return { ctx, page, errors };
}
const pathOf = (page) => page.evaluate(() => location.pathname + location.search);
const text = (page, sel) => page.$eval(sel, (e) => e.textContent.trim()).catch(() => null);

/** Wait (up to 5s) until `sel` exists and its text satisfies `test`. */
async function waitFor(page, sel, test = () => true) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const t = await text(page, sel);
    if (t !== null && test(t)) return true;
    await settle(100);
  }
  return false;
}
async function waitForPath(page, test) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (test(await pathOf(page))) return true;
    await settle(100);
  }
  return false;
}

// DEBUG_PATH=/poem/p1 npm run test:e2e  → print what one page shows, then stop
if (process.env.DEBUG_PATH) {
  const { page, errors } = await openPage({ loggedIn: !process.env.DEBUG_LOGGED_OUT });
  page.on("console", (m) => console.log(`[console.${m.type()}]`, m.text()));
  page.on("requestfinished", (r) => r.url().includes("supabase") && console.log("[req]", r.method(), r.url().slice(0, 160)));
  await page.goto(`${BASE}${process.env.DEBUG_PATH}`, { waitUntil: "networkidle0" });
  await settle(1000);
  console.log("errors:", errors);
  console.log("path:", await pathOf(page));
  console.log((await text(page, "main"))?.slice(0, 500));
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
  process.exit(0);
}

try {
  console.log("\nRouting");
  {
    const { ctx, page } = await openPage({ loggedIn: false });
    await page.goto(`${BASE}/my-poems`, { waitUntil: "networkidle0" });
    check(await waitForPath(page, (p) => p.startsWith("/auth?redirect=")), "private page sends visitors to login, remembering where they were");
    await page.goto(`${BASE}/poem/p1`, { waitUntil: "networkidle0" });
    check(await waitFor(page, "article h1", (t) => t === "The Weight of Small Hours"), "poems are readable without an account");
    await ctx.close();
  }
  {
    const { ctx, page } = await openPage();
    await page.goto(`${BASE}/auth?redirect=/saved`, { waitUntil: "networkidle0" });
    check(await waitForPath(page, (p) => p === "/saved"), "signed-in users skip the login page");
    await page.goto(`${BASE}/auth?redirect=//evil.example`, { waitUntil: "networkidle0" });
    check(await waitForPath(page, (p) => p === "/"), "open redirects are blocked");
    await page.goto(`${BASE}/nope/nothing`, { waitUntil: "networkidle0" });
    check(await waitForPath(page, (p) => p === "/"), "unknown URLs go home");
    await page.goto(`${BASE}/poem/p1`, { waitUntil: "networkidle0" });
    await waitFor(page, 'a[href="/poem/p3"]');
    await page.click('a[href="/poem/p3"]');
    check(await waitFor(page, "article h1", (t) => t === "November Window"), "poem-to-poem navigation loads the new poem");
    await page.goBack();
    check(await waitFor(page, "article h1", (t) => t === "The Weight of Small Hours"), "browser Back restores the previous poem");
    await page.goto(`${BASE}/explore?category=Love`, { waitUntil: "networkidle0" });
    check(await waitFor(page, ".chip-active", (t) => t === "Love"), "Explore reads its filter from the URL");
    await ctx.close();
  }

  console.log("\nFeatures");
  {
    const { ctx, page } = await openPage();
    await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
    check(await waitFor(page, "#loved-title"), "home shows most-loved lines");
    await page.goto(`${BASE}/poem/p1`, { waitUntil: "networkidle0" });
    check(await waitFor(page, "#notes-title"), "poems show margin notes");
    await page.hover("article .group");
    await page.click('[aria-label="Share line as image"]');
    check(await waitFor(page, '[role="dialog"] canvas'), "a line can be turned into a share image");
    if (process.env.SHOTS_DIR) {
      await settle(800);
      await page.screenshot({ path: `${process.env.SHOTS_DIR}/share-modal.png` });
    }
    await page.goto(`${BASE}/poet/${OTHER}`, { waitUntil: "networkidle0" });
    check(await waitFor(page, "main button.btn", (t) => t === "Follow"), "poet pages offer Follow");
    await page.goto(`${BASE}/notifications`, { waitUntil: "networkidle0" });
    check(await waitFor(page, "main li", (t) => t.includes("hearted a line")), "notifications list activity");
    await page.goto(`${BASE}/write`, { waitUntil: "networkidle0" });
    check(await waitFor(page, "main", (t) => t.includes("Today's prompt")), "the editor offers a daily prompt");
    await ctx.close();
  }

  console.log("\nLayout (no sideways scrolling, no page errors)");
  const pages = ["/", "/explore", "/poem/p1", "/write", "/my-poems", `/poet/${OTHER}`, "/saved", "/collections", "/collection/c1", "/notifications", "/profile"];
  for (const width of [360, 768, 1280]) {
    for (const path of pages) {
      const { ctx, page, errors } = await openPage({ width });
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
      await settle(400);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      // SHOTS_DIR=some/folder saves a full-page screenshot of each check
      if (process.env.SHOTS_DIR) {
        const name = path.replace(/\W+/g, "_").replace(/^_|_$/g, "") || "home";
        await page.screenshot({ path: `${process.env.SHOTS_DIR}/${name.slice(0, 30)}-${width}.png`, fullPage: true });
      }
      check(overflow <= 1 && errors.length === 0, `${path} @ ${width}px${overflow > 1 ? ` overflows by ${overflow}px` : ""}${errors.length ? ` — ${errors[0]}` : ""}`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}

console.log(failures ? `\n${failures} check(s) failed\n` : "\nAll checks passed\n");
process.exit(failures ? 1 : 0);
