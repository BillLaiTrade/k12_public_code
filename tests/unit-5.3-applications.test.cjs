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
  const coastWaveSample=async page=>page.locator('#coast-video').evaluate(video=>{const canvas=document.createElement('canvas');canvas.width=80;canvas.height=60;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(video,0,0,80,60);const pixels=context.getImageData(0,0,80,60).data;let total=0,count=0;for(let y=0;y<60;y++)for(let x=0;x<80;x++)if(Math.abs(y-(55-x*.4))<10){const i=(y*80+x)*4;total+=pixels[i]+pixels[i+1]+pixels[i+2];count+=3;}return total/count;});
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

  await t.test('海岸實拍浪線連續變化、左右箭頭固定且日夜方向正確',async()=>{
    await choose('coast');
    assert.match(await p.locator('#application-question').textContent(),/沙灘.*海水/);assert.match(await p.locator('#coast-observation').textContent(),/白天.*沙灘.*海水/);
    assert.equal(await p.locator('#coast-conclusion').evaluate(n=>n.parentElement.id),'application-coast');assert.equal(await p.locator('#coast-conclusion').evaluate(n=>n.previousElementSibling.classList.contains('coast-workbench')),true);
    assert.deepEqual(await p.locator('.coast-arrows').getAttribute('viewBox'),'0 0 1000 750');assert.equal(await p.locator('#coast-video').evaluate(n=>Math.round(n.getBoundingClientRect().width/n.getBoundingClientRect().height*100)/100),1.33);
    assert.equal(await p.locator('.coast-thermal-day').evaluate(n=>getComputedStyle(n).opacity),'1');assert.equal(await p.locator('#coast-heat-label').textContent(),'熱量傳入海水與砂土');
    const motionPage=await browser.newPage({viewport:{width:1366,height:900},ignoreHTTPSErrors:Boolean(remote)});try{await motionPage.goto(url,{waitUntil:'networkidle'});await motionPage.locator('button[data-application="coast"]').click();await motionPage.waitForFunction(()=>document.getElementById('application-coast').dataset.phase==='ready');const video=motionPage.locator('#coast-video');await video.scrollIntoViewIfNeeded();await motionPage.waitForFunction(()=>document.querySelector('#coast-video').currentTime>1,{timeout:7000});const start=await video.evaluate(n=>n.currentTime),frameStart=await coastWaveSample(motionPage),fixedDay=await coastArrows(motionPage,'day');await motionPage.waitForFunction(time=>document.getElementById('coast-video').currentTime>time+1,start,{timeout:7000});const frameLater=await coastWaveSample(motionPage);assert.ok(Math.abs(frameLater-frameStart)>1,'浪線區域應隨時間實際改變，不只是重複靜止畫格');assert.deepEqual(await coastArrows(motionPage,'day'),fixedDay,'海水與砂地箭頭應固定在左右區域，不隨浪線移動');assert.ok(await video.evaluate(n=>n.paused===false&&n.videoWidth>=640&&n.videoHeight>=480));assert.match(await video.getAttribute('src'),/application-coast-real-waves\.mp4/);assert.equal(await motionPage.locator('.coast-surge').count(),0);await motionPage.locator('[data-coast-mode="night"]').click();assert.deepEqual(await coastArrows(motionPage,'night'),['M280 460V250','M860 460V250']);await motionPage.evaluate(()=>window.scrollTo(0,0));await motionPage.waitForFunction(()=>document.querySelector('#coast-video').paused);await video.scrollIntoViewIfNeeded();await motionPage.waitForFunction(()=>!document.querySelector('#coast-video').paused);await motionPage.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await video.evaluate(n=>n.paused),true);await motionPage.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await motionPage.waitForFunction(()=>!document.querySelector('#coast-video').paused);}finally{await motionPage.close();}
    assert.deepEqual(await coastArrows(p,'day'),['M280 250V460','M860 250V460']);
    assert.match(await p.locator('#coast-condition').textContent(),/模型：相同質量、吸收相同熱量/);assert.equal(await p.locator('#coast-model').getAttribute('viewBox'),'0 0 300 115');
    await p.locator('#coast-video').scrollIntoViewIfNeeded();await p.waitForFunction(()=>!document.querySelector('#coast-video').paused);
    const level=async name=>Number(await p.locator('#coast-'+name+'-level').getAttribute('y'));
    assert.ok(await level('sand')<await level('water'));assert.ok(await level('water')<100);assert.match(await p.locator('#coast-water-caption').textContent(),/溫升較小/);assert.match(await p.locator('#coast-sand-caption').textContent(),/溫升較大/);
    await capture('coast-day');
    await p.locator('[data-coast-mode="night"]').click();await ready(p,'coast');
    assert.match(await p.locator('#coast-condition').textContent(),/模型：相同質量、放出相同熱量/);assert.equal(await p.locator('#coast-model').getAttribute('viewBox'),'0 85 300 115');
    assert.equal(await p.locator('.coast-thermal-day').evaluate(n=>getComputedStyle(n).visibility),'hidden');assert.equal(await p.locator('.coast-thermal-night').evaluate(n=>getComputedStyle(n).visibility),'visible');assert.equal(await p.locator('#coast-heat-label').textContent(),'熱量從海水與砂土散出');
    assert.match(await p.locator('#coast-conclusion').textContent(),/降溫較小/);assert.match(await p.locator('#coast-observation').textContent(),/夜晚.*沙灘.*海水/);assert.match(await p.locator('#application-question').textContent(),/夜晚.*沙灘.*海水/);
    assert.equal(await level('sand'),100);assert.equal(await level('water'),100);assert.ok(Number(await p.locator('#coast-sand-level').getAttribute('height'))>Number(await p.locator('#coast-water-level').getAttribute('height')));assert.match(await p.locator('#coast-water-caption').textContent(),/降溫較小/);assert.match(await p.locator('#coast-sand-caption').textContent(),/降溫較大/);
    assert.deepEqual(await coastArrows(p,'night'),['M280 460V250','M860 460V250']);
    assert.doesNotMatch(await p.locator('#application-coast').innerText(),/\d+\s*°C/);
    assert.match(await p.locator('#application-coast').innerText(),/蒸發與風/);
    await capture('coast-night');await choose('chestnut');assert.equal(await p.locator('#coast-video').evaluate(n=>n.paused),true);await choose('coast');assert.match(await p.locator('#application-question').textContent(),/夜晚.*沙灘.*海水/);
    await p.locator('[data-coast-mode="day"]').click();await ready(p,'coast');
    assert.deepEqual(await coastArrows(p,'day'),['M280 250V460','M860 250V460']);
  });

  await t.test('減少動態效果時保留海岸畫面並停止影片',async()=>{
    const page=await browser.newPage({reducedMotion:'reduce',ignoreHTTPSErrors:Boolean(remote)});try{await page.goto(url,{waitUntil:'networkidle'});await page.locator('[data-application="coast"]').click();await ready(page,'coast');await page.locator('#coast-video').scrollIntoViewIfNeeded();assert.equal(await page.locator('#coast-video').evaluate(n=>n.paused),true);assert.match(await page.locator('#application-coast').innerText(),/相同質量/);}finally{await page.close();}
  });

  await t.test('汽車冷卻液：引擎吸熱、散熱器散熱與水的比熱，鍵盤切換並保留階段',async()=>{
    await choose('coolant');assert.match(await p.locator('#application-question').textContent(),/冷卻液.*水/);
    assert.equal(await p.locator('#coolant-focus').textContent(),'冷卻液流經引擎吸收熱，再把熱帶往散熱器。');
    assert.equal(await p.locator('.coolant-key h3').textContent(),'水的比熱較大，吸熱時溫升較小');assert.equal(await p.locator('.coolant-key p').textContent(),'相同質量、吸收相同熱量時，水的溫升比比熱較小的物質低。');
    assert.equal(await p.locator('.coolant-diagram').getAttribute('role'),'img');assert.equal(await p.locator('.coolant-diagram title').textContent(),'冷卻液循環示意圖');assert.equal(await p.locator('.coolant-engine-node').count(),1);assert.equal(await p.locator('.coolant-radiator-node').count(),1);assert.equal(await p.locator('.coolant-fluid').count(),1);assert.match(await p.locator('.coolant-return').textContent(),/回流/);assert.equal(await p.locator('.coolant-release').count(),1);
    assert.match(await p.locator('#application-coolant .life-note').innerText(),/水與防凍液的混合液.*循環與散熱條件/);
    assert.equal(await p.locator('.coolant-loop').count(),0);assert.equal(await p.locator('#coolant-cycle-return').count(),0);assert.equal(await p.locator('.coolant-path [data-coolant-stage]').count(),2);
    await p.locator('[data-coolant-stage="radiator"]').press('Space');
    assert.equal(await p.locator('[data-coolant-stage="radiator"]').getAttribute('aria-pressed'),'true');
    assert.equal(await p.locator('#coolant-focus').textContent(),'冷卻液流經散熱器，把熱傳給周圍空氣，降溫後再流回引擎。');assert.equal(await p.locator('#application-coolant').getAttribute('data-stage'),'radiator');await capture('coolant-radiator');
    await choose('chestnut');await choose('coolant');assert.match(await p.locator('#coolant-focus').textContent(),/散熱器/);
    await p.locator('[data-coolant-stage="engine"]').press('Enter');
    assert.equal(await p.locator('[data-coolant-stage="engine"]').getAttribute('aria-pressed'),'true');
    assert.equal(await p.locator('#coolant-focus').textContent(),'冷卻液流經引擎吸收熱，再把熱帶往散熱器。');assert.equal(await p.locator('#application-coolant').getAttribute('data-stage'),'engine');
    await capture('coolant-engine');
  });

  await t.test('圖片失敗隔離在當情境，重試恢復不自動開始；日夜晚到回應不覆蓋新模式',async()=>{
    const page=await browser.newPage({ignoreHTTPSErrors:Boolean(remote)});await page.route('**/application-chestnut.webp*',r=>r.abort());await page.route('**/application-coolant.webp*',r=>r.abort());
    await page.goto(url,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.getElementById('application-chestnut').dataset.phase==='error');
    await page.locator('button[data-application="coolant"]').click();await page.waitForFunction(()=>document.getElementById('application-coolant').dataset.phase==='error');assert.equal(await page.locator('[data-coolant-stage=engine]').isDisabled(),true);await page.unroute('**/application-coolant.webp*');await page.locator('#application-coolant [data-life-retry]').click();await ready(page,'coolant');await page.locator('[data-coolant-stage="radiator"]').click();assert.match(await page.locator('#coolant-focus').textContent(),/散熱器/);
    await page.locator('button[data-application="chestnut"]').click();
    await page.waitForFunction(()=>document.getElementById('application-chestnut').dataset.phase==='error');
    await page.unroute('**/application-chestnut.webp*');await page.locator('#application-chestnut [data-life-retry]').click();await ready(page,'chestnut');
    await page.route('**/application-coast-real-waves.mp4*',r=>r.abort());await page.locator('button[data-application="coast"]').click();await page.waitForFunction(()=>document.getElementById('application-coast').dataset.phase==='error');
    await page.unroute('**/application-coast-real-waves.mp4*');await page.locator('#application-coast [data-life-retry]').click();await ready(page,'coast');
    assert.match(await page.locator('#coast-video').getAttribute('src'),/application-coast-real-waves\.mp4/);
    await page.locator('#coast-video').scrollIntoViewIfNeeded();await page.waitForFunction(()=>!document.querySelector('#coast-video').paused);await page.locator('[data-coast-mode="night"]').click();assert.equal(await page.locator('#application-coast').getAttribute('data-mode'),'night');
    assert.equal(await page.locator('#coast-video').evaluate(n=>n.paused),false);
    await page.locator('[data-coast-mode="day"]').click();assert.equal(await page.locator('#application-coast').getAttribute('data-mode'),'day');
    assert.equal(await page.locator('#coast-video').evaluate(n=>n.paused),false);
    assert.match(await page.locator('#coast-condition').textContent(),/吸收/);await page.close();
  });

  await t.test('三種生活情境切換時版面高度與圖片框尺寸一致',async()=>{
    for(const width of [1440,1366,1280,390,320]){
      await p.setViewportSize({width,height:900});
      const boxes=[];
      for(const key of ['chestnut','coast','coolant']){
        await choose(key);
        boxes.push(await p.locator('#application-'+key).evaluate(n=>{const box=n.querySelector('.life-photo:not([hidden])').getBoundingClientRect(), panel=document.querySelector('#application-lab').getBoundingClientRect();return {width:box.width,height:box.height,panelHeight:panel.height,cardHeight:document.querySelector("#card-05").getBoundingClientRect().height,photoTop:box.top-panel.top};}));
      }
      for(const box of boxes.slice(1)){for(const field of ['width','height','panelHeight','cardHeight','photoTop'])assert.ok(Math.abs(box[field]-boxes[0][field])<1,`${width}: ${field} ${JSON.stringify(boxes)}`);}
    }
  });

  await t.test('三桌機與兩窄版三情境無頁面溢出、說明文字易讀，主要文字16px、熱點至少44px',async()=>{
    for(const [width,height]of [[1440,900],[1366,768],[1280,720],[390,844],[320,740]]){
      await p.setViewportSize({width,height});
      for(const key of ['chestnut','coast','coolant']){
        await choose(key);
        const data=await p.locator('#application-'+key).evaluate(n=>({overflow:document.documentElement.scrollWidth>innerWidth,clipped:[...n.querySelectorAll('.life-temperatures strong,.life-energy strong,.life-bar-row strong')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent),fonts:[...n.querySelectorAll('h3,.life-reading,.life-coolant-model p')].map(e=>parseFloat(getComputedStyle(e).fontSize)),hotspots:[...n.querySelectorAll('[data-coolant-stage]')].map(e=>{const r=e.getBoundingClientRect(),b=e.closest('.life-coolant-model').getBoundingClientRect();return{w:r.width,h:r.height,inside:r.left>=b.left&&r.right<=b.right&&r.top>=b.top&&r.bottom<=b.bottom};}),topDifference:(()=>{const columns=n.querySelectorAll('.life-workbench>div');return columns.length===2?Math.abs(columns[0].getBoundingClientRect().top-columns[1].getBoundingClientRect().top):0;})(),heightDifference:(()=>{const photo=n.querySelector('.life-photo'),panel=n.querySelector('.life-coolant-model');return photo&&panel?Math.abs(photo.getBoundingClientRect().height-panel.getBoundingClientRect().height):0;})(),coastHeightDifference:(()=>{const columns=n.querySelector('.coast-workbench'),left=columns?.children[0],panel=columns?.children[1];return left&&panel?Math.abs(left.getBoundingClientRect().height-panel.getBoundingClientRect().height):0;})()}));
        layouts.push({width,height,key,...data});assert.equal(data.overflow,false,`${width} ${key} page overflow`);assert.deepEqual(data.clipped,[],`${width} ${key} clipped`);assert.ok(data.fonts.every(s=>s>=16));if(width>=1280&&key!=='body')assert.ok(data.topDifference<1,`${width} ${key} columns misaligned`);if(width===1366&&key==='coolant')assert.ok(data.heightDifference<80,`${width} coolant unbalanced: ${data.heightDifference}`);if(width>=1280&&key==='coast')assert.ok(data.coastHeightDifference<2,`${width} coast columns unbalanced: ${data.coastHeightDifference}`);
        data.hotspots.forEach(h=>{assert.ok(h.w>=44&&h.h>=44);assert.equal(h.inside,true,`${width} hotspot cropped`);});
        if(width===320)await capture(key+'-320');
      }
    }
    assert.deepEqual(errors,[]);
    if(process.env.APPLICATION_CAPTURE_DIR)await fs.writeFile(path.join(process.env.APPLICATION_CAPTURE_DIR,'layouts.json'),JSON.stringify(layouts,null,2));
  });
});
