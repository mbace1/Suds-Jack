// Real player actions: title -> inspect -> chosen target -> enemy turn ->
// reward -> next fight. Debug state is read only; no debug action advances play.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const server = http.createServer((req,res) => {
  let file = path.join(root, req.url.split('?')[0]);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (error, bytes) => { res.writeHead(error ? 404 : 200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream'}); res.end(error ? 'missing' : bytes); });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = process.env.SLAY_BASE_URL || `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({executablePath:process.env.BROWSER_PATH || undefined, args:['--enable-unsafe-swiftshader']});
  try {
    for (const mobile of [false, true]) {
      const page = await browser.newPage({viewport:mobile ? {width:390,height:844} : {width:1280,height:720}, isMobile:mobile, hasTouch:mobile});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const activate = async locator => mobile ? locator.tap() : locator.click();
      const idle = () => page.waitForFunction(() => !window.__sk.busy());
      await page.goto(base + '/');
      await activate(page.getByRole('link', {name:'Play Slay Kallio', exact:true}));
      // Seed is set through the normal supported URL, before the real title action.
      await page.goto(new URL('slaykallio/?seed=4', base + '/').href);
      await page.waitForFunction(() => !!window.__sk);
      assert.equal(await page.locator('#ver').innerText(), 'v7');
      await activate(page.locator('#start'));
      await idle();
      assert.equal(await page.evaluate(() => __sk.state().encounter), 0);
      // First tap inspects and must not play via a second event from one touch.
      await activate(page.locator('#hand .card').first());
      assert.equal(await page.evaluate(() => __sk.state().stats.cardsPlayed), 0);
      assert.match(await page.locator('#cardfocus').innerText(), /Swing/);
      assert.equal(await page.locator('#cardfocus [data-target]').count(), 3);
      const labels = await page.locator('.unit.enemy').evaluateAll(els => els.map(e => {const r=e.getBoundingClientRect();return {left:r.left,right:r.right};}));
      for(let i=1;i<labels.length;i++) assert.ok(labels[i].left >= labels[i-1].right - 2, 'enemy labels do not overlap');
      const targets = await page.locator('#cardfocus button').evaluateAll(els => els.map(e => e.getBoundingClientRect().height));
      assert.ok(targets.every(h=>h>=44), 'selected-card controls fit a thumb');
      await page.screenshot({path:path.join(__dirname, mobile?'flow-phone.png':'flow-desktop.png')});
      const hp = await page.evaluate(() => __sk.state().enemies.map(e=>e.hp));
      await activate(page.locator('#cardfocus [data-target="2"]'));
      await idle();
      assert.deepEqual(await page.evaluate(() => __sk.state().enemies.map(e=>e.hp)), [hp[0],hp[1],hp[2]-6]);
      assert.equal(await page.evaluate(() => __sk.state().stats.cardsPlayed), 1);
      // Deck overlay owns keyboard input, and closing it does not commit a card.
      await activate(page.locator('#deckbtn'));
      const before = await page.evaluate(() => JSON.stringify(__sk.state()));
      await page.keyboard.press('1'); await page.keyboard.press('e');
      assert.equal(await page.evaluate(() => JSON.stringify(__sk.state())), before);
      await page.locator('#deck .close').focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('#deck').isVisible(), false);
      assert.equal(await page.locator('#cardfocus').isVisible(), false);
      assert.equal(await page.evaluate(() => JSON.stringify(__sk.state())), before);
      // Read-only policy picks legal cards; every action goes through rendered controls.
      for (let step=0;step<50;step++) {
        await idle();
        const info = await page.evaluate(() => {
          const s=__sk.state();
          const i=s.hand.findIndex((c,i)=>__sk.engine.canPlay(s,i));
          return {phase:s.phase,encounter:s.encounter,i,target:s.enemies.find(e=>e.alive)?.slot};
        });
        if(info.encounter>0) break;
        if(info.phase==='reward') {await activate(page.locator('#options button').first());continue;}
        assert.equal(info.phase,'fight');
        if(info.i<0) {
          // Even unplayable cards can be read, with a concrete explanation.
          if(await page.locator('#hand .card').count()) {
            await activate(page.locator('#hand .card').first());
            assert.match(await page.locator('#cardfocus').innerText(), /Need .* energy|cannot be played/);
            await activate(page.locator('.focus-cancel'));
          }
          await activate(page.locator('#end'));
        } else {
          await activate(page.locator(`#hand .card[data-i="${info.i}"]`));
          const enemy=page.locator(`#cardfocus [data-target="${info.target}"]`);
          if(await enemy.count()) await activate(enemy);
          else await activate(page.locator('.focus-actions button').first());
        }
      }
      await idle();
      assert.equal(await page.evaluate(() => __sk.state().encounter),1,'reward advances to second fight');
      assert.ok(await page.evaluate(() => __sk.state().stats.cardsPlayed)>1);
      // Recover through the deck's quit control and start a fresh run.
      await activate(page.locator('#deckbtn')); await activate(page.locator('#quit'));
      await activate(page.locator('#start')); await idle();
      assert.equal(await page.evaluate(() => __sk.state().stats.cardsPlayed),0);
      if(mobile) {
        await page.setViewportSize({width:844,height:390});
        await activate(page.locator('#hand .card').first());
        await page.screenshot({path:path.join(__dirname,'flow-landscape-phone.png')});
        const r=await page.locator('#cardfocus').boundingBox();
        assert.ok(r.x>=0&&r.y>=0&&r.x+r.width<=844&&r.y+r.height<=390);
      }
      assert.deepEqual(errors,[]);
      console.log(`PASS ${mobile?'touch':'desktop'}: exact target, modal isolation, first fight, reward, next fight, restart`);
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
