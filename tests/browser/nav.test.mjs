// Browser tests for the visible navigation (nav-hint.js) on every hosted deck.
// Serves site/ locally and drives each deck in Chromium.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { join, extname, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "../../site");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf" };

async function decks() {
  const root = join(SITE, "assets/downloads/presentations");
  const found = [];
  for (const year of await readdir(root)) {
    for (const slug of await readdir(join(root, year))) found.push(`/assets/downloads/presentations/${year}/${slug}/`);
  }
  return found;
}

let server, browser, origin;
before(async () => {
  server = createServer(async (req, res) => {
    let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = resolve(SITE, "." + path);
    if (!file.startsWith(SITE)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" }).end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {});
});
after(async () => { await browser?.close(); server?.close(); });

function navState(page) {
  return page.evaluate(() => ({
    hash: location.hash,
    count: document.querySelector("#orfe-nav .orfe-count-text").textContent,
    steps: document.querySelectorAll("#orfe-nav .orfe-steps i").length,
    done: document.querySelectorAll("#orfe-nav .orfe-steps i.orfe-done").length,
    pulse: document.querySelector("#orfe-nav .orfe-steps").classList.contains("orfe-pulse"),
  }));
}

async function openDeck(base) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on("pageerror", (e) => {
    // Slidev asks for a screen wake lock; headless browsers in containers deny it.
    if (!/Wake Lock/.test(String(e))) errors.push(String(e));
  });
  await page.goto(origin + base + "#/1");
  await page.waitForSelector("#orfe-nav .orfe-count-text:not(:empty)");
  await page.waitForTimeout(500); // let Slidev register the first slide's build steps
  return { page, errors };
}

async function clickAndSettle(page, label) {
  await page.click(`#orfe-nav button[aria-label="${label}"]`);
  await page.waitForTimeout(400);
  return navState(page);
}

const deckList = await decks();
test("found at least one hosted deck", () => assert.ok(deckList.length > 0));

for (const base of deckList) {
  test(`${base}: Next and Previous buttons change the slide`, async () => {
    const { page, errors } = await openDeck(base);
    let s = await navState(page);
    assert.equal(s.count.split(" / ")[0], "1");
    // Step past any builds on slide 1; the slide number must eventually change.
    for (let i = 0; i <= s.steps && s.count.startsWith("1 /"); i++) s = await clickAndSettle(page, "Next");
    assert.match(s.count, /^2 \//, "Next button did not reach slide 2");
    s = await clickAndSettle(page, "Previous");
    assert.notEqual(s.count.split(" / ")[0], "2", "Previous button did not leave slide 2");
    assert.deepEqual(errors, []);
    await page.close();
  });

  test(`${base}: build steps show under the slide number and pulse when a click does not change the slide`, async () => {
    const { page, errors } = await openDeck(base);
    let s = await navState(page);
    for (let i = 0; i < 40 && s.steps === 0; i++) s = await clickAndSettle(page, "Next");
    assert.ok(s.steps > 0, "no slide with build steps found");
    assert.equal(s.done, 0);
    const slide = s.count;

    const after = await clickAndSettle(page, "Next");
    assert.equal(after.count, slide, "a build step should not change the slide number");
    assert.equal(after.done, 1);
    assert.ok(after.pulse, "step marks should pulse after a build step");
    assert.match(after.hash, /clicks=1/);
    const title = await page.getAttribute('#orfe-nav button[aria-label="Next"]', "title");
    assert.match(title, after.steps > 1 ? /^Next build step/ : /^Next slide/);

    const back = await clickAndSettle(page, "Previous");
    assert.equal(back.count, slide);
    assert.equal(back.done, 0);
    assert.deepEqual(errors, []);
    await page.close();
  });
}
