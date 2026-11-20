import { describe, it, expect, vi, afterEach } from "vitest";
import handler, { escapeHtml } from "../../netlify/edge-functions/og.js";

function mockSupabase(rowsByTable) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => {
      const table = new URL(url).pathname.split("/").pop();
      return new Response(JSON.stringify(rowsByTable[table] ?? []), { status: 200 });
    }),
  );
}

const WHATSAPP = "WhatsApp/2.23.20 A";
const BROWSER = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";

async function render(path, userAgent = WHATSAPP) {
  const res = await handler(new Request(`https://btl.example${path}`, { headers: { "user-agent": userAgent } }));
  return { res, html: res ? await res.text() : null };
}

afterEach(() => vi.unstubAllGlobals());

describe("link previews (netlify/edge-functions/og.js)", () => {
  it("describes a published poem with its title, author and opening lines", async () => {
    mockSupabase({
      poems: [{ title: "Salt Letters", body: "You wrote to me in tides,\neach line erased\n\nlater", profiles: { username: "Mara" } }],
    });
    const { res, html } = await render("/poem/abc");
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(html).toContain('<meta property="og:title" content="Salt Letters — Mara">');
    expect(html).toContain('content="You wrote to me in tides, / each line erased"');
    expect(html).toContain('content="https://btl.example/og-image.png"');
    expect(html).toContain('url=https://btl.example/poem/abc"');
  });

  it("only asks for published poems", async () => {
    mockSupabase({ poems: [] });
    await render("/poem/abc");
    expect(fetch.mock.calls[0][0]).toContain("status=eq.published");
  });

  it("falls back to the site defaults when nothing is found", async () => {
    mockSupabase({});
    const { html } = await render("/poem/missing");
    expect(html).toContain('<meta property="og:title" content="Between the Lines">');
  });

  it("escapes HTML in user content", async () => {
    mockSupabase({ poems: [{ title: '<script>alert("x")</script>', body: "a", profiles: null }] });
    const { html } = await render("/poem/abc");
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("lets people through to the normal app", async () => {
    mockSupabase({});
    const { res } = await render("/poem/abc", BROWSER);
    expect(res).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("escapes quotes and ampersands", () => {
    expect(escapeHtml('"&')).toBe("&quot;&amp;");
  });
});
