const { chromium } = require("playwright");
const fs = require("fs"),
  path = require("path"),
  http = require("http"),
  assert = require("assert");
const root = path.resolve(__dirname, "../..");
const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split("?")[0]).replace(/^\/Suds-Jack/, "");
  let f = path.join(root, url);
  if (!f.startsWith(root)) {
    res.writeHead(403);
    return res.end();
  }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) {
    res.writeHead(404);
    return res.end();
  }
  res.setHeader(
    "Content-Type",
    {
      ".js": "text/javascript",
      ".html": "text/html",
      ".css": "text/css",
      ".json": "application/json",
    }[path.extname(f)] || "application/octet-stream",
  );
  res.end(fs.readFileSync(f));
});
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    headless: true,
  });
  try {
    // The CI runner has no GPU. Use the committed mobile art tier for the full
    // real-input playthrough. Mobile deliberately uses procedural art; desktop
    // GLB animation coverage runs separately below.
    const page = await browser.newPage({ viewport: { width: 680, height: 800 } });
    const errors = [];
    const mobileGlbs = [];
    page.on("request", r => { if (/\\.glb(?:\\?|$)/.test(r.url())) mobileGlbs.push(r.url()); });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) console.log("HTTP", r.status(), r.url());
    });
    await page.goto(base + "/#concrete");
    await page.locator('a.play[href="concrete/"]').click();
    await page.waitForURL("**/concrete/");
    await page.locator("#start:not([disabled])").waitFor();
    assert.match(await page.locator(".build").first().innerText(), /v4/);
    assert.equal(await page.locator("#world").getAttribute("data-art"), "ready");
    assert.equal(await page.locator("#world").getAttribute("data-quality"), "mobile");
    assert.equal(await page.locator("#world").getAttribute("data-clips"), null);
    assert.deepEqual(mobileGlbs, [], "mobile must not request GLBs");
    console.log("ART", await page.locator("#world").evaluate((e) => ({ ...e.dataset })));
    await page.locator("#start").click();
    await page.keyboard.down("w");
    await page.waitForFunction(() => Number(document.querySelector("#speed").textContent) >= 15, null, {
      timeout: 15000,
    });
    await page.keyboard.press("Space");
    await page.waitForTimeout(120);
    await page.keyboard.press("j");
    await page.keyboard.up("w");
    await page.waitForFunction(
      () => Number(document.querySelector("#score").textContent.replaceAll(",", "")) > 0,
      null,
      { timeout: 15000 },
    );
    const score = await page.locator("#score").innerText();
    assert(Number(score.replaceAll(",", "")) > 0, "aerial combo banks via keyboard");
    await page.keyboard.press("r");
    await page.waitForTimeout(200);
    assert.equal(await page.locator("#speed").innerText(), "0");
    await page.keyboard.down("w");
    await page.waitForFunction(() => Number(document.querySelector("#speed").textContent) >= 15, null, {
      timeout: 15000,
    });
    await page.keyboard.down("d");
    await page.waitForFunction(() => Number(document.querySelector("#world").dataset.heading) < 3, null, {
      timeout: 10000,
    });
    await page.keyboard.up("d");
    await page.waitForFunction(() => Number(document.querySelector("#world").dataset.riderZ) < 7, null, {
      timeout: 15000,
    });
    await page.keyboard.down("l");
    await page.keyboard.press("Space");
    await page.waitForFunction(
      () => document.querySelector("#trick-name").textContent.includes("50–50 grind"),
      null,
      { timeout: 10000 },
    );
    assert.match(await page.locator("#trick-name").innerText(), /50–50 grind/);
    console.log("PASS rail snap through movement and ollie/grind inputs");
    await page.keyboard.up("l");
    await page.keyboard.up("w");
    await page.keyboard.press("r");
    await page.keyboard.press("Space");
    await page.waitForTimeout(180);
    await page.keyboard.press("k");
    await page.waitForTimeout(150);
    assert.match(await page.locator("#trick-name").innerText(), /Indy grab/);
    console.log("PASS procedural grab registers through keyboard");
    await page.waitForTimeout(700);
    await page.keyboard.press("r");
    await page.keyboard.down("w");
    await page.waitForFunction(() => Number(document.querySelector("#speed").textContent) >= 32, null, {
      timeout: 15000,
    });
    await page.keyboard.press("Space");
    await page.waitForFunction(() => document.querySelector("#world").dataset.air === "true", null, {
      timeout: 5000,
    });
    const takeoffHeading = Number(await page.locator("#world").getAttribute("data-heading"));
    await page.keyboard.down("d");
    await page.waitForFunction(
      (start) => Number(document.querySelector("#world").dataset.heading) < start - 1.2,
      takeoffHeading,
      { timeout: 10000 },
    );
    await page.keyboard.up("d");
    await page.keyboard.up("w");
    await page.waitForFunction(() => document.querySelector("#world").dataset.air === "false", null, {
      timeout: 10000,
    });
    console.log("LANDING", await page.locator("#world").evaluate((e) => ({ ...e.dataset })));
    await page.waitForFunction(
      () => document.querySelector("#trick-name").textContent.includes("BAIL"),
      null,
      { timeout: 15000 },
    );
    assert.match(await page.locator("#trick-name").innerText(), /BAIL/);
    await page.waitForFunction(() => document.querySelector("#speed").textContent === "0", null, {
      timeout: 15000,
    });
    assert.equal(await page.locator("#speed").innerText(), "0");
    console.log("PASS sideways landing causes bail and automatic recovery");
    await page.locator("#help").click();
    const before = await page.locator("#time").innerText();
    await page.waitForTimeout(1200);
    assert.equal(await page.locator("#time").innerText(), before, "pause freezes timer");
    await page.locator("#resume").click();
    console.log(
      "PASS Hub -> v4 title -> drop in -> ollie + kickflip -> bank " +
        score +
        " -> reset -> pause/resume",
    );
    assert.deepEqual(errors, []);
    await page.close();
    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    mobile.on("request", r => { if (/\.glb(?:\?|$)/.test(r.url())) mobileGlbs.push(r.url()); });
    mobile.on("pageerror", e => errors.push(e.message));
    await mobile.goto(base + "/concrete/");
    await mobile.locator("#start:not([disabled])").waitFor();
    await mobile.locator("#start").tap();
    await mobile.locator('#intro').waitFor({state:'hidden'});
    assert(await mobile.locator("#move-stick").isVisible());
    assert(await mobile.locator("#look-stick").isVisible());
    await mobile.locator('[data-key=" "]').tap();
    await mobile.waitForTimeout(150);
    await mobile.locator('[data-key="j"]').tap();
    await mobile.waitForFunction(
      () => Number(document.querySelector("#score").textContent.replaceAll(",", "")) > 0,
      null,
      { timeout: 15000 },
    );
    assert(
      Number((await mobile.locator("#score").innerText()).replaceAll(",", "")) > 0,
      "touch combo banks",
    );
    assert.equal(await mobile.locator("#world").getAttribute("data-art"), "ready");
    console.log("MOBILE ART", await mobile.locator("#world").evaluate((e) => ({ ...e.dataset })));
    console.log("PASS mobile title -> touch ollie/flip -> bank, both sticks visible");
    assert.deepEqual(mobileGlbs, [], "no delayed mobile GLB insertion");
    assert.deepEqual(errors, []);
    await mobile.locator('#help').tap();
    await mobile.locator('#scheme').tap();
    await mobile.locator('#resume').tap();
    await mobile.keyboard.press('r');
    assert.equal(await mobile.locator('#scheme').getAttribute('aria-pressed'),'true');
    const cdp=await mobile.context().newCDPSession(mobile);
    const box=await mobile.locator('#look-stick').boundingBox();
    const point={x:box.x+box.width/2,y:box.y+box.height*.88};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
    await mobile.waitForFunction(()=>document.querySelector('#world').dataset.loaded==='true');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    await mobile.waitForTimeout(150);
    assert.equal(await mobile.locator('#world').getAttribute('data-air'),'false','cancel must not ollie');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
    await mobile.waitForFunction(()=>document.querySelector('#world').dataset.loaded==='true');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await mobile.waitForFunction(()=>document.querySelector('#world').dataset.air==='true');
    await mobile.waitForFunction(()=>document.querySelector('#world').dataset.air==='false');
    await mobile.screenshot({path:'concrete/test/flick-phone.png'});
    await mobile.locator('#help').tap();
    await mobile.locator('#scheme').tap();
    await mobile.locator('#resume').tap();
    assert.equal(await mobile.locator('#scheme').getAttribute('aria-pressed'),'false');
    console.log('PASS optional flick touch load/cancel/release/landing and return to button controls');
    await mobile.waitForTimeout(350); // allow the menu's duplicate-touch debounce to expire
    await mobile.locator('#help').tap();
    await mobile.locator('#scheme').tap();
    await mobile.locator('#resume').tap();
    await mobile.keyboard.press('r');
    // Emulate the hardware boundary; gameplay still consumes the real pad poll.
    await mobile.evaluate(()=>{
      window.testPad={connected:true,axes:[0,0,0,.8],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
      Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.testPad]});
    });
    await mobile.waitForFunction(()=>document.querySelector('#world').dataset.loaded==='true');
    await mobile.evaluate(()=>{window.testPad.axes[3]=0;});
    await mobile.waitForFunction(()=>document.querySelector('#world').dataset.air==='true');
    await mobile.waitForFunction(()=>document.querySelector('#world').dataset.air==='false');
    console.log('PASS controller poll loads and releases a flick ollie');
    await mobile.close();
    // Desktop still promises all twelve Blender clips and real grab contact.
    const desktop = await browser.newPage({ viewport: { width: 800, height: 600 } });
    desktop.setDefaultTimeout(90000);
    await desktop.goto(base + "/concrete/?quality=desktop");
    await desktop.locator("#start:not([disabled])").waitFor();
    assert.equal(await desktop.locator("#world").getAttribute("data-art"), "ready");
    const clips = (await desktop.locator("#world").getAttribute("data-clips") || "").split(",");
    for (const clip of ["idle","push","coast","crouch","ollie","air","land","kickflip","grab","grind","bail","recover"]) assert(clips.includes(clip), clip);
    await desktop.locator("#start").click();
    await desktop.keyboard.press("Space");
    await desktop.waitForFunction(() => document.querySelector("#world").dataset.air === "true");
    await desktop.keyboard.press("k");
    await desktop.waitForFunction(() => {
      const error = document.querySelector("#world").dataset.grabError;
      return error !== undefined && Number.isFinite(Number(error)) && Number(error) < .06;
    });
    console.log("PASS desktop twelve clips and grab contact within 6cm");
    await desktop.close();
    const fallback = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await fallback.route("**/*.glb?*", (route) => route.abort());
    await fallback.goto(base + "/concrete/");
    await fallback.locator("#start:not([disabled])").waitFor();
    assert.equal(await fallback.locator("#world").getAttribute("data-art"), "fallback");
    await fallback.locator("#start").click();
    console.log("PASS missing-model fallback still enters gameplay");
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
