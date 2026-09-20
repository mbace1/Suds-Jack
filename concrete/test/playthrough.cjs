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
// A DualSense the page cannot tell from a real one: the game and the menus
// both poll navigator.getGamepads, so every controller check below goes
// through the same code path a plugged-in pad drives.
const FAKE_PAD = `window.__pad={id:'DualSense Wireless Controller (Vendor: 054c Product: 0ce6)',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.__pad];`;
const dataset = (page) => page.locator("#world").evaluate((e) => ({ ...e.dataset }));
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
    assert.match(await page.locator(".build").first().innerText(), /v5/);
    assert.equal(await page.locator("#world").getAttribute("data-art"), "ready");
    assert.equal(await page.locator("#world").getAttribute("data-quality"), "mobile");
    assert.equal(await page.locator("#world").getAttribute("data-skater"), "thps");
    assert.equal(await page.locator("#world").getAttribute("data-clips"), null);
    assert.deepEqual(mobileGlbs, [], "mobile must not request GLBs");
    console.log("ART", await dataset(page));
    await page.locator("#start").click();
    await page.keyboard.down("w");
    await page.waitForFunction(() => Number(document.querySelector("#speed").textContent) >= 15, null, {
      timeout: 15000,
    });
    assert.equal(await page.locator("#world").getAttribute("data-pose"), "push", "the THPS rig pushes while the push key is held");
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
    assert.equal(await page.locator("#world").getAttribute("data-pose"), "grind");
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
    const landing = await dataset(page);
    console.log("LANDING", landing);
    await page.waitForFunction(
      () => document.querySelector("#trick-name").textContent.includes("BAIL"),
      null,
      { timeout: 15000 },
    );
    assert.match(await page.locator("#trick-name").innerText(), /BAIL/);
    assert.equal(await page.locator("#world").getAttribute("data-pose"), "bail");
    await page.waitForFunction(() => Number(document.querySelector("#world").dataset.bail) === 0, null, {
      timeout: 15000,
    });
    const recovered = await dataset(page);
    assert.equal(recovered.speed, "0.00");
    assert(Math.hypot(Number(recovered.riderX) - Number(landing.riderX), Number(recovered.riderZ) - Number(landing.riderZ)) < 1.5,
      `bail recovers where the skater fell, not at the start of the room (${recovered.riderX},${recovered.riderZ} vs ${landing.riderX},${landing.riderZ})`);
    console.log("PASS sideways landing causes bail and recovery in place");
    await page.locator("#help").click();
    assert.equal(await page.evaluate(() => window.__concrete.screen), "pause");
    const before = await page.locator("#time").innerText();
    await page.waitForTimeout(1200);
    assert.equal(await page.locator("#time").innerText(), before, "pause freezes timer");
    await page.locator("#resume").click();
    assert.equal(await page.evaluate(() => window.__concrete.screen), "play");
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => window.__concrete.screen), "pause");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    assert(await page.locator("#controls").evaluate((d) => d.open), "CONTROLS opens the controls sheet from the pause menu");
    await page.keyboard.press("Escape");
    assert(!(await page.locator("#controls").evaluate((d) => d.open)));
    assert.equal(await page.evaluate(() => window.__concrete.screen), "pause");
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => window.__concrete.screen), "play");
    console.log(
      "PASS Hub -> v5 title -> drop in -> ollie + kickflip -> bank " +
        score +
        " -> reset -> pause/controls/resume by keyboard",
    );
    assert.deepEqual(errors, []);
    await page.close();

    // The DualSense path: menus walked with the d-pad, cross to drop in,
    // triangle to grind (which the pad could not do in v3), Options to pause,
    // Create to reset, and the quarter pipe ridden two ways.
    const pad = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    pad.on("pageerror", (e) => errors.push(e.message));
    await pad.addInitScript(FAKE_PAD);
    const press = async (i, ms = 90) => {
      await pad.evaluate((i) => { window.__pad.buttons[i].pressed = true; window.__pad.buttons[i].value = 1; }, i);
      await pad.waitForTimeout(ms);
      await pad.evaluate((i) => { window.__pad.buttons[i].pressed = false; window.__pad.buttons[i].value = 0; }, i);
      await pad.waitForTimeout(ms);
    };
    const stick = (x, y) => pad.evaluate(([x, y]) => { window.__pad.axes[0] = x; window.__pad.axes[1] = y; }, [x, y]);
    const screen = () => pad.evaluate(() => window.__concrete.screen);
    await pad.goto(base + "/concrete/?quality=mobile");
    await pad.locator("#start:not([disabled])").waitFor();
    await press(13); await press(13); // d-pad down twice: OPTIONS
    await press(0);
    assert.equal(await screen(), "options");
    assert.equal(await pad.evaluate(() => document.documentElement.dataset.glyphs), "ps", "DualSense glyphs follow the pad");
    assert.equal(await pad.locator("#options-menu .item.selected").innerText().then((t) => t.split("\n")[0]), "LOOK", "mobile tier has one skater, so LOOK is the first setting");
    await press(15); // right: PS1
    assert.equal(await pad.locator("#world").getAttribute("data-look"), "ps1");
    await press(14); // left: back to modern
    assert.equal(await pad.locator("#world").getAttribute("data-look"), "modern");
    assert.equal(await pad.evaluate(() => JSON.parse(localStorage.getItem("concrete-opts")).look), "modern", "options persist");
    await press(1); // circle: back
    assert.equal(await screen(), "title");
    await press(12); await press(12); // up to DROP IN
    await press(0);
    assert.equal(await screen(), "play");
    await pad.waitForTimeout(150);
    assert.equal(await pad.locator("#world").getAttribute("data-air"), "false", "the cross that confirmed DROP IN is not an ollie");
    await stick(0, -1);
    await pad.waitForFunction(() => Number(document.querySelector("#speed").textContent) >= 15, null, { timeout: 15000 });
    assert.equal(await pad.locator("#device").innerText(), "DUALSENSE");
    await stick(1, -1); // lean right toward the rail at x = 10
    await pad.waitForFunction(() => Number(document.querySelector("#world").dataset.heading) < 3, null, { timeout: 10000 });
    await stick(0, -1);
    await pad.waitForFunction(() => Number(document.querySelector("#world").dataset.riderZ) < 7, null, { timeout: 15000 });
    await press(3); // triangle beside the rail
    await pad.waitForFunction(() => document.querySelector("#trick-name").textContent.includes("50–50 grind"), null, { timeout: 10000 });
    console.log("PASS triangle grinds from the pad");
    await press(0); // cross: ollie off the rail
    await pad.waitForFunction(() => document.querySelector("#world").dataset.grinding === "-1", null, { timeout: 5000 });
    await stick(0, 0);
    await press(9); // Options: pause
    assert.equal(await screen(), "pause");
    const frozen = await pad.locator("#time").innerText();
    await pad.waitForTimeout(900);
    assert.equal(await pad.locator("#time").innerText(), frozen, "Options pauses the clock");
    await press(9);
    assert.equal(await screen(), "play");
    await press(8); // Create: reset position
    await pad.waitForTimeout(150);
    const afterReset = await dataset(pad);
    assert.equal(afterReset.riderX, "8.000"); assert.equal(afterReset.riderZ, "16.000");
    console.log("PASS Options pauses and resumes, Create resets");
    // Ride the big quarter pipe flat out: launch off the lip, come back down
    // the transition facing the room, no bail, and roll out with speed.
    await stick(0, -1);
    await pad.waitForFunction(() => document.querySelector("#world").dataset.vert === "true", null, { timeout: 30000 });
    await stick(0, 0);
    await pad.waitForFunction(() => Number(document.querySelector("#world").dataset.riderY) > 4.5, null, { timeout: 15000 });
    await pad.waitForFunction(() => document.querySelector("#world").dataset.air === "false", null, { timeout: 15000 });
    const landed = await dataset(pad);
    assert(Number(landed.riderZ) < -29.5, `lands back on the transition (z ${landed.riderZ})`);
    assert(!(await pad.locator("#trick-name").innerText()).includes("BAIL"), "a vert landing is straight");
    assert.match(await pad.locator("#trick-name").innerText(), /Ramp air|BANKED/);
    await pad.waitForFunction(() => { const d = document.querySelector("#world").dataset; return Number(d.riderZ) > -28 && Math.cos(Number(d.heading)) > 0.9; }, null, { timeout: 15000 });
    assert(Number((await dataset(pad)).speed) > 2, "rolls out of the transition with speed");
    console.log("PASS vert launch off the quarter pipe, landing on the transition, rolling out", landed);
    // Too slow for the lip: dribble up to the ramp at a few metres a second,
    // climb part of the transition and roll back down fakie.
    await press(8);
    await pad.waitForTimeout(120);
    for (let i = 0; i < 600; i++) {
      const d = await dataset(pad);
      if (Number(d.riderZ) < -26) break;
      await stick(0, Number(d.speed) < 4 ? -1 : 0);
      await pad.waitForTimeout(40);
    }
    await stick(0, 0);
    const outcome = await pad.waitForFunction(() => {
      const d = document.querySelector("#world").dataset;
      if (d.air === "true" || d.vert === "true") return "air";
      return Number(d.riderZ) < -29 && Math.cos(Number(d.heading)) > 0.9 ? "back" : false;
    }, null, { timeout: 30000 });
    assert.equal(await outcome.jsonValue(), "back", "a slow approach rolls back down the transition without leaving it");
    console.log("PASS slow approach rolls back fakie");
    assert.deepEqual(errors, []);
    await pad.close();

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
    assert.equal(await mobile.locator("#world").getAttribute("data-skater"), "thps");
    console.log("MOBILE ART", await dataset(mobile));
    console.log("PASS mobile title -> touch ollie/flip -> bank, both sticks visible");
    assert.deepEqual(mobileGlbs, [], "no delayed mobile GLB insertion");
    assert.deepEqual(errors, []);
    await mobile.close();
    // Desktop: the THPS skater boots with the Blender warehouse; the Blender
    // rig loads only when the SKATER option asks, and then still promises all
    // twelve clips and real grab contact.
    const desktop = await browser.newPage({ viewport: { width: 800, height: 600 } });
    desktop.setDefaultTimeout(90000);
    desktop.on("pageerror", e => errors.push(e.message));
    const desktopGlbs = [];
    desktop.on("request", r => { if (/\.glb(?:\?|$)/.test(r.url())) desktopGlbs.push(r.url().split("/").pop().split("?")[0]); });
    await desktop.goto(base + "/concrete/?quality=desktop");
    await desktop.locator("#start:not([disabled])").waitFor();
    assert.equal(await desktop.locator("#world").getAttribute("data-art"), "ready");
    assert.equal(await desktop.locator("#world").getAttribute("data-skater"), "thps");
    assert.deepEqual(desktopGlbs, ["warehouse.glb"], "the THPS default loads no skater GLB");
    await desktop.keyboard.press("ArrowDown"); await desktop.keyboard.press("ArrowDown"); await desktop.keyboard.press("Enter");
    assert.equal(await desktop.evaluate(() => window.__concrete.screen), "options");
    await desktop.keyboard.press("ArrowRight");
    await desktop.waitForFunction(() => document.querySelector("#world").dataset.skater === "blender");
    const clips = (await desktop.locator("#world").getAttribute("data-clips") || "").split(",");
    for (const clip of ["idle","push","coast","crouch","ollie","air","land","kickflip","grab","grind","bail","recover"]) assert(clips.includes(clip), clip);
    assert.deepEqual(desktopGlbs.sort(), ["board.glb", "skater.glb", "warehouse.glb"]);
    await desktop.keyboard.press("Escape");
    await desktop.keyboard.press("ArrowUp"); await desktop.keyboard.press("ArrowUp"); await desktop.keyboard.press("Enter");
    assert.equal(await desktop.evaluate(() => window.__concrete.screen), "play");
    await desktop.keyboard.press("Space");
    await desktop.waitForFunction(() => document.querySelector("#world").dataset.air === "true");
    await desktop.keyboard.press("k");
    await desktop.waitForFunction(() => {
      const error = document.querySelector("#world").dataset.grabError;
      return error !== undefined && Number.isFinite(Number(error)) && Number(error) < .06;
    });
    console.log("PASS desktop THPS default, Blender rig on demand with twelve clips and grab contact within 6cm");
    assert.deepEqual(errors, []);
    await desktop.close();
    {
    // --- v5: the room's objects, its ledges and its lips -------------------
    // Setup (placing the skater, reading the room's tables) goes through the
    // debug hook; every action under test is a real pad press.
    const room = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    room.on("pageerror", (e) => errors.push(e.message));
    await room.addInitScript(FAKE_PAD);
    await room.goto(base + "/concrete/?quality=mobile");
    await room.locator("#start:not([disabled])").waitFor();
    await room.locator("#start").click();
    const rstick = (x, y) => room.evaluate(([x, y]) => { window.__pad.axes[0] = x; window.__pad.axes[1] = y; }, [x, y]);
    const rhold = (i, v) => room.evaluate(([i, v]) => { window.__pad.buttons[i].pressed = v; window.__pad.buttons[i].value = v ? 1 : 0; }, [i, v]);
    const rpress = async (i, ms = 200) => { await rhold(i, true); await room.waitForTimeout(ms); await rhold(i, false); await room.waitForTimeout(ms); };
    const place = (x, z, h, v) => room.evaluate(([x, z, h, v]) => window.__concrete.debug.placeAt(x, z, h, v), [x, z, h, v]);
    const rds = () => dataset(room);
    const settle = () => room.waitForFunction(() => { const d = document.querySelector("#world").dataset; return d.air === "false" && Number(d.bail) === 0 && Number(d.grinding) < 0; }, null, { timeout: 15000 });
    const hunt = async (fn, ticks = 200) => { for (let i = 0; i < ticks; i++) { const d = await rds(); if (fn(d)) return d; await room.waitForTimeout(40); } return await rds(); };

    // Nothing stands in a run-up. The props are one table both tiers read, so
    // asserting it here is asserting what the room actually contains.
    const props = await room.evaluate(() => window.__concrete.debug.props());
    const rails = await room.evaluate(() => window.__concrete.debug.rails());
    assert(props.length >= 12, "the room is dressed from the prop table");
    const RIDING = [
      { name: "north quarter", x0: -16, x1: 16, z0: -35, z1: -29 },
      { name: "south quarter", x0: -26, x1: -6, z0: 28, z1: 34 },
      { name: "east quarter", x0: 17, x1: 27, z0: 22, z1: 28 },
      { name: "funbox", x0: -4.5, x1: 4.5, z0: -3, z1: 9 },
      { name: "north run-up", x0: -16, x1: 16, z0: -29, z1: -20 },
    ];
    for (const p of props)
      for (const r of RIDING)
        assert(
          p.x + p.w / 2 < r.x0 || p.x - p.w / 2 > r.x1 || p.z + p.d / 2 < r.z0 || p.z - p.d / 2 > r.z1,
          `${p.kind} at ${p.x},${p.z} stands in the ${r.name}`,
        );
    // Each coping has a deck behind it rather than 3.6 m of promised air.
    for (const [x, z] of [[0, -36.5], [-16, 36], [22, 33]])
      assert.equal(await room.evaluate(([x, z]) => window.__concrete.debug.ground(x, z), [x, z]), 3.6, `deck behind the coping at ${x},${z}`);
    assert(rails.some(r => r.kind === "ledge" && r.axis === "x"), "the funbox has ledges across it");
    assert(rails.some(r => r.kind === "ledge" && r.axis === "z"), "and along it");
    console.log("PASS the room's props are out of every run-up, the copings have decks, ledges run both axes");

    // A crate is solid: ride into one and you stop outside it, not through it.
    const crate = props.find((p) => p.kind === "crate");
    await place(crate.x, crate.z + 6, Math.PI, 11);
    await rstick(0, -1);
    const hitCrate = await hunt((d) => Number(d.bail) > 0 || Number(d.speed) < 1 || Number(d.riderZ) < crate.z + crate.d / 2, 150);
    await rstick(0, 0);
    assert(
      Number(hitCrate.riderZ) > crate.z + crate.d / 2 - 0.15,
      `a crate stops the skater outside it (z ${hitCrate.riderZ} vs face ${crate.z + crate.d / 2})`,
    );
    await settle();
    console.log("PASS a crate is solid at speed:", await room.locator("#trick-name").innerText());

    // The funbox is a box, and its top edge takes a grind.
    await place(6.2, 3, Math.PI * 1.5, 5);
    await rhold(3, true);
    await rstick(0, -1);
    await rpress(0, 200);
    const ledge = await hunt((d) => Number(d.grindsDone) > 0 || Number(d.bail) > 0, 60);
    await rhold(3, false);
    await rstick(0, 0);
    assert.equal(ledge.lastGrind, "ledge", "ollieing onto the funbox with grind held grinds its ledge");
    assert.match(await room.locator("#trick-name").innerText(), /Boardslide|50–50/);
    console.log("PASS funbox ledge grind:", await room.locator("#trick-name").innerText());
    await room.waitForTimeout(600);
    await settle();

    // Triangle at the coping stalls on the lip; letting it go rolls back in,
    // and a roll-in is NOT a transfer — reading the transition's own fall as
    // an edge popped the skater into the air at the bottom of every ramp.
    await place(0, -26, Math.PI, 12);
    await rhold(3, true);
    await rstick(0, -1);
    const stalled = await hunt((d) => Number(d.stallsDone) > 0 || d.vert === "true", 200);
    assert(Number(stalled.stallsDone) > 0, "triangle into the lip stalls rather than launching");
    assert.match(stalled.lastStall, /stall|Fakie/);
    assert(Math.abs(Number(stalled.riderY) - 3.66) < 0.05, "the stall sits on the coping");
    await rhold(3, false);
    await rstick(0, 0);
    const transfersBefore = Number(stalled.transfers);
    const rolled = await hunt((d) => Number(d.riderZ) > -29, 200);
    assert(Number(rolled.riderZ) > -29, "the stall drops back in");
    assert.equal(Number(rolled.transfers), transfersBefore, "rolling in off a stall never pops into the air");
    console.log("PASS", stalled.lastStall, "on the coping, then a clean roll-in");
    await rstick(0, 0);
    await settle();

    // A line: 50-50 the long rail, ollie out, kickflip, land it.
    const scoreBefore = Number((await room.locator("#score").innerText()).replaceAll(",", ""));
    await place(10, 10, Math.PI, 12);
    await rstick(0, -1);
    await hunt((d) => Number(d.riderZ) < 7, 200);
    await rhold(3, true);
    const onRail = await hunt((d) => Number(d.grindsDone) > 0, 150);
    assert.equal(onRail.lastGrind, "rail");
    await rhold(3, false);
    await rpress(0, 200);
    await rpress(2, 250);
    const landed = await hunt((d) => d.air === "false" && Number(d.grinding) < 0, 200);
    await rstick(0, 0);
    assert.equal(Number(landed.bail), 0, "the line lands clean");
    const scoreAfter = Number((await room.locator("#score").innerText()).replaceAll(",", ""));
    assert(scoreAfter > scoreBefore + 500, `the line banks (${scoreBefore} -> ${scoreAfter})`);
    console.log("PASS rail line: 50-50, ollie out, kickflip, landed —", scoreAfter - scoreBefore, "points");
    assert.deepEqual(errors, []);
    await room.close();
    }

    const fallback = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await fallback.route("**/*.glb?*", (route) => route.abort());
    await fallback.goto(base + "/concrete/");
    await fallback.locator("#start:not([disabled])").waitFor();
    assert.equal(await fallback.locator("#world").getAttribute("data-art"), "fallback");
    assert.equal(await fallback.locator("#world").getAttribute("data-skater"), "thps");
    await fallback.locator("#start").click();
    assert.equal(await fallback.evaluate(() => window.__concrete.screen), "play");
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
