// A shared counter must wait for actual silence, including host-owned replies.
// Only time is accelerated; input uses the real field and Enter key.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const fixture = `<!doctype html><div id="slot"></div><script type="module">
import {mountChat} from './js/chat.js?v=26';
window.chat = mountChat(document.querySelector('#slot'), {where:'in',openOnLoad:true,speed:1});
// Like Toko Live, a host can own its input/replies without calling chat.type.
const input = document.querySelector('.tc-say-row input');
input.addEventListener('keydown', e => {
  if(e.key !== 'Enter') return;
  e.preventDefault(); e.stopImmediatePropagation();
  const text=input.value; input.value='';
  setTimeout(() => {
    const line = document.createElement('p'); line.className='tc-me';
    line.textContent='HOST REPLY: '+text; document.querySelector('.tc-log').append(line);
  }, 20000);
}, true);
</script>`;
const server = http.createServer((q,r) => {
  if(q.url.startsWith('/toko/idle-fixture.html')) {r.writeHead(200,{'Content-Type':'text/html'});r.end(fixture);return;}
  const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f,(e,b)=>{r.writeHead(e?404:200,{'Content-Type':{'.js':'text/javascript','.html':'text/html'}[path.extname(f)]||'application/octet-stream'});r.end(e?'missing':b)});
});
let browser;
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({args:['--no-sandbox']});
  const page=await browser.newPage({reducedMotion:'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();
  const open=async()=>{
    await page.goto(`http://127.0.0.1:${server.address().port}/toko/idle-fixture.html`);
    await page.locator('.tc-say-row input').waitFor();
    await page.clock.runFor(1000);
  };
  const count=()=>page.locator('.tc-me').count();
  await open();
  const input=page.locator('.tc-say-row input');
  const before=await count();
  for(let i=0;i<3;i++) {await input.fill('Still typing '+i);await page.clock.runFor(9000);}
  assert.equal(await count(),before,'no aside across the old deadline while typing');
  await page.clock.runFor(14000);
  assert.equal(await count(),before,'typing restarts the whole 24-second silence wait');
  await page.clock.runFor(2000);
  assert.equal(await count(),before+1,'a real silence still produces one aside');
  console.log('PASS typing defers the aside; real silence still produces it');

  await open();
  const hostBefore=await count();
  await input.fill('A host-owned question'); await input.press('Enter');
  // A delayed host reply must restart silence independently of the earlier
  // keystrokes: input alone would still allow an aside at the old deadline.
  await page.clock.runFor(22000);
  assert.equal(await count(),hostBefore+1,'one real Enter produces the host reply');
  await page.clock.runFor(5000);
  assert.equal(await count(),hostBefore+1,'host reply resets the old idle deadline');
  await page.clock.runFor(20000);
  assert.equal(await count(),hostBefore+2,'silence after the host reply still gets an aside');
  console.log('PASS host-owned reply defers the aside; silence afterwards still works');
  const leave=await page.locator('.tc-leave').boundingBox();
  await page.mouse.click(leave.x+leave.width/2,leave.y+leave.height/2);
  const closed=await count(); await page.clock.runFor(30000);
  assert.equal(await count(),closed,'closed counter stays quiet');
  await page.evaluate(()=>window.chat.destroy()); await page.clock.runFor(30000);
  assert.equal(await page.locator('.toko-chat').count(),0,'destroy removes counter and activity observer');
  assert.deepEqual(errors,[]);
  console.log('PASS close/destroy and no page exceptions');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close();server.close()});
