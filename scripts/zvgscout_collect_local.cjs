#!/usr/bin/env node
/* eslint-disable no-console */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright is not installed. Run: npm install && npx playwright install chromium");
  process.exit(1);
}

const START_URL =
  process.env.ZVGSCOUT_URL ||
  "https://zvgscout.com/zwangsversteigerungen?page=1&maplat=50.83871608853164&maplng=12.8785815480677&mapzoom=11.283512746895843";

const OUT_ROOT = path.join(process.cwd(), "var", "imports", "zvgscout-local");
const PROFILE_DIR = process.env.ZVGSCOUT_PROFILE_DIR || path.join(OUT_ROOT, "_browser-profile");
const OUT_JSONL = process.env.ZVGSCOUT_OUT || path.join(OUT_ROOT, "records.jsonl");
const DEBUG_DIR = path.join(OUT_ROOT, "_debug");
const HEADLESS = process.env.ZVGSCOUT_HEADLESS === "1";
const WAIT_MS = Number(process.env.ZVGSCOUT_WAIT_MS || 45000);
const PAGES = Number(process.env.ZVGSCOUT_MAX_PAGES || 1);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
function sha1(value) {
  return crypto.createHash("sha1").update(String(value)).digest("hex");
}
function norm(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}
function pageUrl(base, pageNo) {
  const url = new URL(base);
  url.searchParams.set("page", String(pageNo));
  return url.toString();
}
function appendJsonl(file, obj) {
  fs.appendFileSync(file, JSON.stringify(obj) + "\n", "utf8");
}
function safeFile(value) {
  return String(value || "file").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}
function isBadPageText(text) {
  const t = String(text || "").toLowerCase();
  return (
    t.includes("sicherheitsüberprüfung wird durchgeführt") ||
    t.includes("cloudflare") ||
    t.includes("fehler beim laden der daten") ||
    t.includes("fehler erneut versuchen")
  );
}
function abs(base, value) {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}
function extractPropertyCandidatesFromObject(obj, sourceUrl, out = []) {
  if (!obj || typeof obj !== "object") return out;

  if (Array.isArray(obj)) {
    obj.forEach((item) => extractPropertyCandidatesFromObject(item, sourceUrl, out));
    return out;
  }

  const text = JSON.stringify(obj);
  const looksLikeProperty =
    /aktenzeichen|verkehrswert|amtsgericht|auction|versteiger|adresse|address|latitude|longitude|wohnfläche|grundstück/i.test(text) &&
    text.length > 200;

  if (looksLikeProperty) {
    out.push({
      source: "network-json-object",
      sourceUrl,
      raw: obj,
      rawText: text.slice(0, 200000),
    });
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") extractPropertyCandidatesFromObject(value, sourceUrl, out);
  }

  return out;
}
function extractUrls(text, baseUrl) {
  const urls = new Set();
  const source = String(text || "");

  for (const match of source.matchAll(/https?:\/\/[^"'\s<>]+/g)) {
    const url = match[0].replace(/[),.;]+$/, "");
    if (/zvgscout\.com/i.test(url)) urls.add(url);
  }

  for (const match of source.matchAll(/\/(?:zwangsversteigerungen|versteigerung|objekt|objects?|properties?)[^"'\s<>)]{3,200}/gi)) {
    const url = abs(baseUrl, match[0]);
    if (url) urls.add(url);
  }

  return Array.from(urls);
}
function isDetailUrl(url) {
  try {
    const u = new URL(url);
    const p = u.pathname.toLowerCase();

    if (!/zvgscout\.com$/i.test(u.hostname.replace(/^www\./, ""))) return false;
    if (p === "/" || p === "/zwangsversteigerungen" || p === "/zwangsversteigerungen/") return false;
    if (p.includes("/_next/")) return false;
    if (p.endsWith(".js") || p.endsWith(".css") || p.endsWith(".png") || p.endsWith(".jpg") || p.endsWith(".ico")) return false;
    if (u.searchParams.has("page")) return false;

    return /zwangsversteiger|versteigerung|objekt|property|immobilie|\d/.test(p + " " + u.search);
  } catch {
    return false;
  }
}

async function clickCookieButtons(page) {
  const candidates = [
    "Alle akzeptieren",
    "Nur notwendige",
    "Akzeptieren",
    "Accept all",
    "Accept",
  ];

  for (const label of candidates) {
    try {
      const button = page.getByRole("button", { name: new RegExp(label, "i") });
      if (await button.count()) {
        await button.first().click({ timeout: 2500 });
        await page.waitForTimeout(1000);
        return true;
      }
    } catch {}
  }

  return false;
}

async function collectFromPage(page, url, pageNo, networkItems) {
  console.log("[open]", url);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((e) => {
    console.warn("[goto warning]", e.message);
  });

  await page.waitForTimeout(2500);
  await clickCookieButtons(page);

  /*
    If site shows "Fehler beim Laden der Daten", give user/manual profile time.
    In visible browser you can click "Erneut versuchen", login, accept cookies, etc.
  */
  console.log("[wait]", WAIT_MS, "ms for client data/manual actions");
  await page.waitForTimeout(WAIT_MS);

  ensureDir(DEBUG_DIR);
  const prefix = path.join(DEBUG_DIR, "page-" + pageNo);
  await page.screenshot({ path: prefix + ".png", fullPage: true }).catch(() => {});

  const dom = await page.evaluate(() => {
    const text = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
    const html = document.documentElement.outerHTML;
    const anchors = Array.from(document.querySelectorAll("a[href]")).map((a) => ({
      href: a.href,
      text: (a.innerText || a.textContent || "").replace(/\s+/g, " ").trim(),
    }));
    const scripts = Array.from(document.querySelectorAll("script"))
      .map((s) => s.textContent || "")
      .filter((t) => /versteiger|Aktenzeichen|Verkehrswert|property|auction|amtsgericht/i.test(t))
      .slice(0, 40);
    return {
      title: document.title,
      url: location.href,
      text,
      htmlSample: html.slice(0, 500000),
      anchors,
      scripts,
    };
  });

  fs.writeFileSync(prefix + ".json", JSON.stringify({ dom, networkItems }, null, 2), "utf8");
  fs.writeFileSync(prefix + ".html", dom.htmlSample, "utf8");

  if (isBadPageText(dom.text)) {
    console.warn("[bad page]", "site returned error/cloudflare text; saved debug:", prefix + ".png");
  }

  const detailUrls = new Set();
  for (const a of dom.anchors) {
    if (isDetailUrl(a.href)) detailUrls.add(a.href);
  }
  for (const script of dom.scripts) {
    extractUrls(script, url).filter(isDetailUrl).forEach((u) => detailUrls.add(u));
  }
  for (const item of networkItems) {
    extractUrls(item.text || JSON.stringify(item.json || ""), url).filter(isDetailUrl).forEach((u) => detailUrls.add(u));
  }

  const candidates = [];
  for (const item of networkItems) {
    if (item.json) extractPropertyCandidatesFromObject(item.json, item.url, candidates);
    if (item.text && /aktenzeichen|verkehrswert|amtsgericht|versteiger/i.test(item.text)) {
      candidates.push({
        source: "network-text",
        sourceUrl: item.url,
        rawText: item.text.slice(0, 200000),
      });
    }
  }

  for (const script of dom.scripts) {
    candidates.push({
      source: "script",
      sourceUrl: url,
      rawText: script.slice(0, 200000),
    });
  }

  fs.writeFileSync(prefix + ".detail-urls.json", JSON.stringify(Array.from(detailUrls), null, 2), "utf8");
  fs.writeFileSync(prefix + ".candidates.json", JSON.stringify(candidates, null, 2), "utf8");

  return {
    detailUrls: Array.from(detailUrls),
    candidates,
    isBadPage: isBadPageText(dom.text),
  };
}

async function collectDetail(page, url, index) {
  console.log("[detail]", url);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((e) => {
    console.warn("[detail goto warning]", e.message);
  });
  await page.waitForTimeout(4000);

  const raw = await page.evaluate(() => {
    const clean = (v) => String(v || "").replace(/\s+/g, " ").trim();
    const title = clean(document.querySelector("h1")?.textContent) || clean(document.querySelector("h2")?.textContent) || document.title;
    const text = clean(document.body?.innerText || "");
    const html = document.documentElement.outerHTML;
    const images = Array.from(document.querySelectorAll("img[src], source[srcset]"))
      .flatMap((el) => {
        const values = [];
        const src = el.getAttribute("src");
        const srcset = el.getAttribute("srcset");
        if (src) values.push(src);
        if (srcset) {
          for (const part of srcset.split(",")) {
            const first = part.trim().split(/\s+/)[0];
            if (first) values.push(first);
          }
        }
        return values;
      })
      .map((v) => new URL(v, location.href).toString())
      .filter((v) => !/logo|favicon|sprite|icon/i.test(v));
    const docs = Array.from(document.querySelectorAll("a[href]"))
      .map((a) => ({ href: new URL(a.getAttribute("href"), location.href).toString(), text: clean(a.textContent) }))
      .filter((d) => /pdf|download|gutachten|expos|dokument|bekanntmachung/i.test(d.href + " " + d.text));
    return {
      source: "detail-dom",
      sourceUrl: location.href,
      title,
      rawText: text,
      htmlSample: html.slice(0, 500000),
      images,
      documents: docs,
    };
  });

  const prefix = path.join(DEBUG_DIR, "detail-" + String(index).padStart(3, "0") + "-" + safeFile(sha1(url).slice(0, 8)));
  await page.screenshot({ path: prefix + ".png", fullPage: true }).catch(() => {});
  fs.writeFileSync(prefix + ".json", JSON.stringify(raw, null, 2), "utf8");
  return raw;
}

async function main() {
  ensureDir(OUT_ROOT);
  ensureDir(DEBUG_DIR);

  if (fs.existsSync(OUT_JSONL)) fs.unlinkSync(OUT_JSONL);

  const allNetwork = [];
  const records = [];
  const detailUrls = new Set();

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: HEADLESS,
    viewport: { width: 1440, height: 1100 },
    locale: "de-DE",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  });

  context.on("response", async (response) => {
    const url = response.url();
    const ct = response.headers()["content-type"] || "";
    if (!/json|text|javascript|html/i.test(ct) && !/api|trpc|graphql|_next|versteiger/i.test(url)) return;

    try {
      const text = await response.text();
      if (!/versteiger|Aktenzeichen|Verkehrswert|amtsgericht|property|auction|address|adresse/i.test(text)) return;

      let json = null;
      if (/json/i.test(ct)) {
        try {
          json = JSON.parse(text);
        } catch {}
      }

      allNetwork.push({
        url,
        contentType: ct,
        status: response.status(),
        text: text.slice(0, 500000),
        json,
      });
    } catch {}
  });

  const page = await context.newPage();

  try {
    for (let pageNo = 1; pageNo <= PAGES; pageNo += 1) {
      const before = allNetwork.length;
      const url = pageUrl(START_URL, pageNo);
      const result = await collectFromPage(page, url, pageNo, allNetwork.slice(before));

      result.detailUrls.forEach((u) => detailUrls.add(u));

      for (const candidate of result.candidates) {
        const rec = {
          collectedAt: new Date().toISOString(),
          externalId: sha1(candidate.sourceUrl + ":" + sha1(candidate.rawText || JSON.stringify(candidate.raw || ""))).slice(0, 24),
          sourceUrl: candidate.sourceUrl,
          source: candidate.source,
          rawText: candidate.rawText || JSON.stringify(candidate.raw || ""),
        };
        records.push(rec);
        appendJsonl(OUT_JSONL, rec);
      }
    }

    let i = 0;
    for (const url of detailUrls) {
      i += 1;
      const raw = await collectDetail(page, url, i);
      const rec = {
        collectedAt: new Date().toISOString(),
        externalId: sha1(url).slice(0, 24),
        sourceUrl: url,
        source: raw.source,
        title: raw.title,
        rawText: raw.rawText,
        images: raw.images,
        documents: raw.documents,
      };
      records.push(rec);
      appendJsonl(OUT_JSONL, rec);
    }
  } finally {
    fs.writeFileSync(path.join(OUT_ROOT, "network.json"), JSON.stringify(allNetwork, null, 2), "utf8");
    fs.writeFileSync(path.join(OUT_ROOT, "detail-urls.json"), JSON.stringify(Array.from(detailUrls), null, 2), "utf8");
    fs.writeFileSync(path.join(OUT_ROOT, "collect-summary.json"), JSON.stringify({
      records: records.length,
      detailUrls: detailUrls.size,
      out: OUT_JSONL,
      profileDir: PROFILE_DIR,
      debugDir: DEBUG_DIR,
    }, null, 2), "utf8");

    await context.close();
  }

  console.log("collector done");
  console.log("records:", records.length);
  console.log("detail urls:", detailUrls.size);
  console.log("out:", OUT_JSONL);
  console.log("debug:", DEBUG_DIR);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
