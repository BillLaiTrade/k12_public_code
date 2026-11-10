const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs/promises');
const {chromium}=require('playwright');

test('第六區：糖炒栗子、海邊觀察與汽車冷卻液',{timeout:240000},async t=>{
  const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});
  t.after(()=>server.kill());
  const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
  const remote=process.env.UNIT53_URL,url=remote||`http://127.0.0.1:${port}/units/5/parts/5.3/`;
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],...(remote?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});
  t.after(()=>browser.close());
  const p=await browser.newPage({viewport:{width:1366,height:900},ignoreHTTPSErrors:Boolean(remote)}),errors=[],layouts=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(url,{waitUntil:'networkidle'});
  await p.clock.install();await p.clock.pauseAt(new Date(Date.now()+1000));
  const ready=(page,key)=>page.waitForFunction(k=>!['loading','error'].includes(document.getElementById('application-'+k).dataset.phase),key);
  const choose=async key=>{await p.locator(`button[data-application="${key}"]`).click();await ready(p,key);};
  const coastArrows=async(page,direction)=>page.locator('[data-coast-arrow]').evaluateAll(arrows=>arrows.slice(2).map(arrow=>arrow.getAttribute('d')));
  const capture=async name=>{if(!process.env.APPLICATION_CAPTURE_DIR)return;await fs.mkdir(process.env.APPLICATION_CAPTURE_DIR,{recursive:true});await p.locator('#card-05').screenshot({path:path.join(process.env.APPLICATION_CAPTURE_DIR,name+'.png')});};

  await t.test('糖炒栗子預設呈現沙子吸熱、升溫及傳熱，與其他情境可切換',async()=>{
    await ready(p,'chestnut');
    assert.equal(await p.locator('[data-application="chestnut"]').getAttribute('aria-pressed'),'true');
    assert.equal(await p.locator('#application-question').textContent(),'沙子如何幫助糖炒栗子加熱？');
    assert.equal(await p.locator('#chestnut-photo').evaluate(n=>n.complete&&n.naturalWidth>0),true);
    assert.equal(await p.locator('[data-chestnut-mode=contact]').getAttribute('aria-pressed'),'true');
    assert.equal(await p.locator('#chestnut-contact-image').evaluate(n=>n.complete&&n.naturalWidth>0),true);
    assert.equal(await p.locator('#chestnut-contact svg [marker-end] path').count(),2);
    await p.locator('[data-chestnut-mode=scene]').click();
    assert.equal(await p.locator('#chestnut-scene').isVisible(),true);
    assert.equal(await p.locator('#chestnut-contact').isVisible(),false);
    await p.locator('[data-chestnut-mode=contact]').press('Enter');
    assert.equal(await p.locator('#chestnut-contact').isVisible(),true);
    assert.equal(await p.locator('[data-chestnut-mode=contact]').getAttribute('aria-pressed'),'true');
    assert.equal(await p.locator('.chestnut-flow li').count(),3);
    assert.match(await p.locator('.chestnut-flow').innerText(),/沙子從鍋子吸熱[\s\S]*比熱較小[\s\S]*將熱傳給栗子/);
    await capture('chestnut-scenario');
  });

  await t.test('海岸日夜畫面、箭頭方向與溫度比較同步',async()=>{
    await choose('coast');
    assert.match(await p.locator('#coast-photo').getAttribute('src'),/shore-day/);
    assert.equal(await p.locator('#coast-photo').evaluate(n=>n.complete&&n.naturalWidth>0),true);
    assert.deepEqual(await coastArrows(p),['M270 175V430','M760 175V430']);
    assert.match(await p.locator('#coast-condition').textContent(),/吸收相同熱量/);
    assert.equal(await p.locator('.coast-material-water').textContent(),'海水');
    assert.equal(await p.locator('.coast-material-sand').textContent(),'砂土');
    await capture('coast-day');
    await p.locator('[data-coast-mode=night]').click();
    assert.match(await p.locator('#coast-photo').getAttribute('src'),/shore-night/);
    assert.deepEqual(await coastArrows(p),['M270 430V175','M760 430V175']);
    assert.match(await p.locator('#coast-condition').textContent(),/放出相同熱量/);
    assert.equal(await p.locator('#coast-water-level').getAttribute('y'),'100');
    assert.ok(Number(await p.locator('#coast-sand-level').getAttribute('height'))>Number(await p.locator('#coast-water-level').getAttribute('height')));
    await capture('coast-night');await choose('chestnut');await choose('coast');
    assert.equal(await p.locator('#application-coast').getAttribute('data-mode'),'night');
    await p.locator('[data-coast-mode=day]').click();
    assert.match(await p.locator('#coast-photo').getAttribute('src'),/shore-day/);
  });

  await t.test('冷卻液循環方向、熱傳與同條件比熱比較',async()=>{
    await choose('coolant');
    assert.match(await p.locator('#coolant-photo').getAttribute('src'),/application-coolant-labeled\.webp/);
    assert.match(await p.locator('#coolant-photo').getAttribute('alt'),/管路位置為示意/);
    assert.equal(await p.locator('[data-coolant-stage]').count(),0);
    assert.match(await p.locator('#coolant-loop-desc').textContent(),/由引擎流向散熱器，再流回引擎/);
    assert.match(await p.locator('#coolant-loop-desc').textContent(),/引擎的熱傳給冷卻液/);
    assert.match(await p.locator('#coolant-compare-title').textContent(),/同質量、同初溫、吸收相同熱量/);
    assert.match(await p.locator('.coolant-key').textContent(),/比引擎低溫/);
    assert.equal(await p.locator('.coolant-sample').count(),2);
    assert.ok(await p.locator('.coolant-rise-high').evaluate(n=>n.getBoundingClientRect().height)>await p.locator('.coolant-rise-low').evaluate(n=>n.getBoundingClientRect().height));
    assert.match(await p.locator('#application-coolant .life-note').innerText(),/水與防凍液的混合液.*循環與散熱條件/);
    await capture('coolant');
  });

  await t.test('液流自動緩速循環、冷暖變化及減少動態時自動播放',async()=>{
    const page=await browser.newPage({viewport:{width:1366,height:900},ignoreHTTPSErrors:Boolean(remote)});
    try{
      await page.goto(url,{waitUntil:'networkidle'});await page.locator('[data-application=coolant]').click();await ready(page,'coolant');
      await page.locator('#coolant-circuit-path').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('.coolant-packet').count(),12);assert.equal(await page.locator('#coolant-flow-toggle').count(),0);
      const selected=await page.waitForFunction(()=>{const items=[...document.querySelectorAll('.coolant-packet')];const i=items.findIndex(e=>+e.dataset.y<70&&+e.dataset.x>155&&+e.dataset.x<185);return i<0?false:i+1},null,{timeout:7000});
      const packet=page.locator('.coolant-packet').nth((await selected.jsonValue())-1);
      const before=await packet.evaluate(e=>({x:+e.dataset.x,warmth:+e.dataset.warmth,fill:e.firstElementChild.getAttribute('fill')}));await page.waitForTimeout(700);
      const after=await packet.evaluate(e=>({x:+e.dataset.x,warmth:+e.dataset.warmth,fill:e.firstElementChild.getAttribute('fill')}));
      assert.ok(after.x>before.x+10&&after.x<before.x+70,'液流應自動緩慢流向散熱器');
      assert.ok(after.warmth>before.warmth,'同一段液流經引擎後應逐漸變暖');assert.notEqual(after.fill,before.fill);
      const coolingHandle=await page.waitForFunction(()=>{const items=[...document.querySelectorAll('.coolant-packet')];const i=items.findIndex(e=>+e.dataset.y>185&&+e.dataset.x>395&&+e.dataset.x<420);return i<0?false:i+1},null,{timeout:7000});
      const cooling=page.locator('.coolant-packet').nth((await coolingHandle.jsonValue())-1);
      const coolBefore=await cooling.evaluate(e=>({x:+e.dataset.x,warmth:+e.dataset.warmth}));await page.waitForTimeout(700);
      const coolAfter=await cooling.evaluate(e=>({x:+e.dataset.x,warmth:+e.dataset.warmth}));
      assert.ok(coolAfter.x<coolBefore.x-10);assert.ok(coolAfter.warmth<coolBefore.warmth,'同一段液流經散熱器後應逐漸變冷');
      assert.match(await page.locator('.coolant-temperature-key').innerText(),/藍色：較冷[\s\S]*黃色：較暖[\s\S]*示意/);
      for(const width of [1440,1366,1280,390,320]){
        await page.setViewportSize({width,height:900});
        const geometry=await page.locator('#application-coolant').evaluate(n=>{
          const box=selector=>n.querySelector(selector).getBoundingClientRect();
          const labels=box('.coolant-labels'),svg=box('.coolant-loop-diagram'),engine=box('.coolant-engine-art'),engineName=box('.coolant-engine-name'),radiator=box('.coolant-radiator-art'),radiatorName=box('.coolant-radiator-name');
          return {labelsBottom:labels.bottom,svgTop:svg.top,engineBottom:engine.bottom,engineNameTop:engineName.top,radiatorBottom:radiator.bottom,radiatorNameTop:radiatorName.top};
        });
        assert.ok(geometry.labelsBottom<=geometry.svgTop+1,`${width} 熱傳標籤遮住循環圖`);
        assert.ok(geometry.engineBottom<=geometry.engineNameTop+1,`${width} 引擎圖示與名稱重疊`);
        assert.ok(geometry.radiatorBottom<=geometry.radiatorNameTop+1,`${width} 散熱器圖示與名稱重疊`);
      }
    }finally{await page.close()}
    const reduced=await browser.newPage({viewport:{width:1366,height:900},reducedMotion:'reduce',ignoreHTTPSErrors:Boolean(remote)});
    try{
      await reduced.goto(url,{waitUntil:'networkidle'});await reduced.locator('[data-application=coolant]').click();await ready(reduced,'coolant');
      const packet=reduced.locator('.coolant-packet').first();await packet.scrollIntoViewIfNeeded();
      assert.equal(await reduced.locator('#coolant-flow-toggle').count(),0);
      const before=await packet.getAttribute('transform');await reduced.waitForTimeout(650);assert.notEqual(await packet.getAttribute('transform'),before,'減少動態設定下仍應自動緩慢流動');
    }finally{await reduced.close()}
  });

  await t.test('圖片失敗隔離在當情境，重試恢復不自動開始；日夜晚到回應不覆蓋新模式',async()=>{
    const page=await browser.newPage({ignoreHTTPSErrors:Boolean(remote)});await page.route('**/application-chestnut.webp*',r=>r.abort());await page.route('**/application-coolant-labeled.webp*',r=>r.abort());
    await page.goto(url,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.getElementById('application-chestnut').dataset.phase==='error');
    await page.locator('button[data-application="coolant"]').click();await page.waitForFunction(()=>document.getElementById('application-coolant').dataset.phase==='error');await page.unroute('**/application-coolant-labeled.webp*');await page.locator('#application-coolant [data-life-retry]').click();await ready(page,'coolant');assert.equal(await page.locator('#coolant-photo').evaluate(n=>n.naturalWidth>0),true);
    await page.locator('button[data-application="chestnut"]').click();
    await page.waitForFunction(()=>document.getElementById('application-chestnut').dataset.phase==='error');
    await page.unroute('**/application-chestnut.webp*');await page.locator('#application-chestnut [data-life-retry]').click();await ready(page,'chestnut');
    await page.route('**/application-coast-shore-night.webp*',r=>r.abort());await page.locator('button[data-application="coast"]').click();await page.waitForFunction(()=>document.getElementById('application-coast').dataset.phase==='error');
    await page.unroute('**/application-coast-shore-night.webp*');await page.locator('#application-coast [data-life-retry]').click();await ready(page,'coast');
    await page.locator('[data-coast-mode="night"]').click();assert.match(await page.locator('#coast-photo').getAttribute('src'),/shore-night/);
    await page.locator('[data-coast-mode="day"]').click();assert.match(await page.locator('#coast-photo').getAttribute('src'),/shore-day/);
    assert.match(await page.locator('#coast-condition').textContent(),/吸收/);await page.close();
  });

  await t.test('切換情境時高度跟隨目前內容，隱藏情境不保留空間',async()=>{
    for(const width of [1440,1366,1280,390,320]){
      await p.setViewportSize({width,height:900});
      for(const key of ['chestnut','coast','coolant']){
        await choose(key);
        const sizes=await p.locator('#application-content').evaluate(n=>({container:n.getBoundingClientRect().height,active:n.querySelector('.life-view:not([hidden])').getBoundingClientRect().height,hidden:[...n.querySelectorAll('.life-view[hidden]')].map(e=>e.getBoundingClientRect().height)}));
        assert.ok(Math.abs(sizes.container-sizes.active)<1,`${width} ${key}: ${JSON.stringify(sizes)}`);
        assert.deepEqual(sizes.hidden,[0,0]);
      }
    }
  });

  await t.test('三桌機與兩窄版三情境無頁面溢出、說明文字易讀，主要文字16px、熱點至少44px',async()=>{
    for(const [width,height]of [[1440,900],[1366,768],[1280,720],[390,844],[320,740]]){
      await p.setViewportSize({width,height});
      for(const key of ['chestnut','coast','coolant']){
        await choose(key);
        const data=await p.locator('#application-'+key).evaluate(n=>({overflow:document.documentElement.scrollWidth>innerWidth,clipped:[...n.querySelectorAll('.life-temperatures strong,.life-energy strong,.life-bar-row strong')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent),fonts:[...n.querySelectorAll('h3,.life-reading,.coolant-key p')].map(e=>parseFloat(getComputedStyle(e).fontSize)),hotspots:[...n.querySelectorAll('[data-coolant-stage]')].map(e=>{const r=e.getBoundingClientRect(),b=e.closest('.life-coolant-model').getBoundingClientRect();return{w:r.width,h:r.height,inside:r.left>=b.left&&r.right<=b.right&&r.top>=b.top&&r.bottom<=b.bottom};}),topDifference:(()=>{const columns=n.querySelectorAll('.life-workbench>div');return columns.length===2?Math.abs(columns[0].getBoundingClientRect().top-columns[1].getBoundingClientRect().top):0;})(),heightDifference:(()=>{const photo=n.querySelector('.life-photo'),panel=n.querySelector('.life-coolant-model');return photo&&panel?Math.abs(photo.getBoundingClientRect().height-panel.getBoundingClientRect().height):0;})(),coastHeightDifference:(()=>{const columns=n.querySelector('.coast-workbench'),left=columns?.children[0],panel=columns?.children[1];return left&&panel?Math.abs(left.getBoundingClientRect().height-panel.getBoundingClientRect().height):0;})()}));
        layouts.push({width,height,key,...data});assert.equal(data.overflow,false,`${width} ${key} page overflow`);assert.deepEqual(data.clipped,[],`${width} ${key} clipped`);assert.ok(data.fonts.every(s=>s>=16));if(width>=1280&&key!=='body')assert.ok(data.topDifference<1,`${width} ${key} columns misaligned`);if(width>=1280&&key==='coast')assert.ok(data.coastHeightDifference<2,`${width} coast columns unbalanced: ${data.coastHeightDifference}`);
        data.hotspots.forEach(h=>{assert.ok(h.w>=44&&h.h>=44);assert.equal(h.inside,true,`${width} hotspot cropped`);});
        if(width===320)await capture(key+'-320');
      }
    }
    assert.deepEqual(errors,[]);
    if(process.env.APPLICATION_CAPTURE_DIR)await fs.writeFile(path.join(process.env.APPLICATION_CAPTURE_DIR,'layouts.json'),JSON.stringify(layouts,null,2));
  });
});
