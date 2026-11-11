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

  await t.test('冷卻液循環方向、熱傳與溫差比較曲線',async()=>{
    await choose('coolant');
    assert.match(await p.locator('#coolant-photo').getAttribute('src'),/application-coolant-labeled\.webp/);
    assert.match(await p.locator('#coolant-photo').getAttribute('alt'),/管路位置為示意/);
    assert.equal(await p.locator('[data-coolant-stage]').count(),0);
    assert.match(await p.locator('#coolant-loop-desc').textContent(),/由引擎流向散熱器，再流回引擎/);
    assert.match(await p.locator('#coolant-loop-desc').textContent(),/引擎內吸熱由藍轉黃/);
    assert.equal((await p.locator('#coolant-compare-title').textContent()).trim(),'為什麼比熱大，能持續帶走引擎的熱？');
    assert.match(await p.locator('#coolant-chart-description').textContent(),/比熱較小的液體升溫較快.*比熱較大的液體升溫較慢.*代表溫差/);
    assert.match(await p.locator('.coolant-chart-legend').innerText(),/引擎[\s\S]*比熱較大：溫差維持較久[\s\S]*比熱較小：溫差很快縮小/);
    assert.match(await p.locator('.coolant-gap-callouts').innerText(),/溫差大 → 持續吸熱[\s\S]*溫差縮小 → 熱傳變慢/);
    assert.match(await p.locator('.coolant-key').textContent(),/升溫慢、溫差維持久，才能持續吸熱帶走引擎的熱/);
    const curveRelation=await p.locator('.coolant-temp-chart').evaluate(svg=>{
      const point=(selector,ratio)=>{const path=svg.querySelector(selector),length=path.getTotalLength(),value=path.getPointAtLength(length*ratio);return{x:value.x,y:value.y}};
      const engine=point('.coolant-chart-engine',.9).y;
      return{lowStart:point('.coolant-chart-low-cp',0),lowEnd:point('.coolant-chart-low-cp',1),highStart:point('.coolant-chart-high-cp',0),highEnd:point('.coolant-chart-high-cp',1),engine};
    });
    assert.ok(Math.abs(curveRelation.lowStart.y-curveRelation.highStart.y)<1,`兩種液體從相同初溫開始：${JSON.stringify(curveRelation)}`);
    assert.ok(Math.abs(curveRelation.lowEnd.y-curveRelation.engine)<25,'比熱較小液體較快接近引擎溫度');
    assert.ok(curveRelation.highEnd.y-curveRelation.engine>60,'比熱較大液體較久維持與引擎的溫差');
    assert.match(await p.locator('#application-coolant .life-note').innerText(),/水與防凍液的混合液.*循環與散熱條件/);
    await capture('coolant');
  });

  await t.test('液流自動緩速循環、冷暖變化及減少動態時自動播放',async()=>{
    const page=await browser.newPage({viewport:{width:1366,height:900},ignoreHTTPSErrors:Boolean(remote)});
    try{
      await page.goto(url,{waitUntil:'networkidle'});await page.locator('[data-application=coolant]').click();await ready(page,'coolant');
      await page.locator('#coolant-circuit-path').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('.coolant-packet').count(),12);assert.equal(await page.locator('#coolant-flow-toggle').count(),0);
      const selected=await page.waitForFunction(()=>{const items=[...document.querySelectorAll('.coolant-packet')];const i=items.findIndex(e=>+e.dataset.x>175&&+e.dataset.x<185&&+e.dataset.y>130&&+e.dataset.y<155);return i<0?false:i+1},null,{timeout:7000});
      const packet=page.locator('.coolant-packet').nth((await selected.jsonValue())-1);
      const before=await packet.evaluate(e=>({y:+e.dataset.y,warmth:+e.dataset.warmth,fill:e.dataset.color}));await page.waitForTimeout(700);
      const after=await packet.evaluate(e=>({y:+e.dataset.y,warmth:+e.dataset.warmth,fill:e.dataset.color}));
      assert.ok(after.y<before.y-10&&after.y>before.y-70,'液流應在引擎內向上自動緩慢流動');
      assert.ok(after.warmth>before.warmth,'同一段液流經引擎後應逐漸變暖');assert.notEqual(after.fill,before.fill);
      const verifySameColor=async(locator,track)=>{
        const values=await locator.evaluate((e,trackId)=>{
          const svg=e.ownerSVGElement,path=svg.querySelector('#coolant-circuit-path'),length=path.getTotalLength(),distance=+e.dataset.distance;
          const track=svg.querySelector(trackId),y1=+track.getAttribute('y1'),y2=+track.getAttribute('y2');
          const stops=[...track.querySelectorAll('stop')].map(stop=>stop.getAttribute('stop-color'));
          const packetGradient=svg.querySelector(e.firstElementChild.getAttribute('fill').slice(4,-1));
          const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));const cool=rgb(stops[0]),warm=rgb(stops[1]);
          const expected=[-14,14].map(offset=>{const y=path.getPointAtLength((distance+offset+length)%length).y,q=Math.max(0,Math.min(1,(y-y1)/(y2-y1)));return cool.map((c,i)=>Math.round(c+(warm[i]-c)*q))});
          const actual=[...packetGradient.querySelectorAll('stop')].map(stop=>stop.getAttribute('stop-color').match(/\d+/g).map(Number));return {expected,actual};
        },track);
        assert.ok(values.expected.every((rgb,i)=>rgb.every((v,j)=>Math.abs(v-values.actual[i][j])<=2)),`液流與同位置管路溫色不一致：${JSON.stringify(values)}`);
      };
      await verifySameColor(packet,'#coolant-fluid-temperature');
      const coolingHandle=await page.waitForFunction(()=>{const items=[...document.querySelectorAll('.coolant-packet')];const i=items.findIndex(e=>+e.dataset.x>405&&+e.dataset.x<415&&+e.dataset.y>100&&+e.dataset.y<130);return i<0?false:i+1},null,{timeout:7000});
      const cooling=page.locator('.coolant-packet').nth((await coolingHandle.jsonValue())-1);
      const coolBefore=await cooling.evaluate(e=>({y:+e.dataset.y,warmth:+e.dataset.warmth}));await page.waitForTimeout(700);
      const coolAfter=await cooling.evaluate(e=>({y:+e.dataset.y,warmth:+e.dataset.warmth}));
      assert.ok(coolAfter.y>coolBefore.y+10);assert.ok(coolAfter.warmth<coolBefore.warmth,'同一段液流經散熱器後應逐漸變冷');
      await verifySameColor(cooling,'#coolant-fluid-temperature');
      for(let sample=0;sample<3;sample++){
        const mismatches=await page.locator('#coolant-flow-packets').evaluate(group=>{
          const svg=group.ownerSVGElement,path=svg.querySelector('#coolant-circuit-path'),length=path.getTotalLength();
          const clamp=n=>Math.max(0,Math.min(1,n));const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
          return [...group.children].flatMap((packet,index)=>{
            const distance=+packet.dataset.distance,gradient=svg.querySelector(packet.firstElementChild.getAttribute('fill').slice(4,-1));
            const actual=[...gradient.querySelectorAll('stop')].map(stop=>stop.getAttribute('stop-color').match(/\d+/g).map(Number));
            return [-14,14].flatMap((offset,side)=>{
              const d=(distance+offset+length)%length,point=path.getPointAtLength(d);
              const background=svg.querySelector('#coolant-fluid-temperature');
              const y1=+background.getAttribute('y1'),y2=+background.getAttribute('y2'),stops=[...background.querySelectorAll('stop')];
              const cool=rgb(stops[0].getAttribute('stop-color')),warm=rgb(stops[1].getAttribute('stop-color')),q=clamp((point.y-y1)/(y2-y1));
              const expected=cool.map((c,i)=>Math.round(c+(warm[i]-c)*q));
              return expected.some((value,i)=>Math.abs(value-actual[side][i])>2)?[{index,side,expected,actual:actual[side]}]:[];
            });
          });
        });
        assert.deepEqual(mismatches,[],`液流與管路的冷暖顏色應在整條路徑一致：${JSON.stringify(mismatches)}`);
        await page.waitForTimeout(250);
      }
      const deviceLayout=await page.locator('.coolant-loop-diagram').evaluate(svg=>{
        const engine=svg.querySelector('#coolant-engine-panel').getBBox(),radiator=svg.querySelector('#coolant-radiator-panel').getBBox(),temperature=svg.querySelector('#coolant-fluid-temperature'),path=svg.querySelector('#coolant-circuit-path');
        const y1=+temperature.getAttribute('y1'),y2=+temperature.getAttribute('y2'),length=path.getTotalLength();
        const nearest=(x,y)=>{let best={error:Infinity};for(let d=0;d<length;d+=1){const p=path.getPointAtLength(d),error=Math.hypot(p.x-x,p.y-y);if(error<best.error)best={x:p.x,y:p.y,error};}return best;};
        return {engine:{x:engine.x,y:engine.y,width:engine.width,height:engine.height},radiator:{x:radiator.x,y:radiator.y,width:radiator.width,height:radiator.height},y1,y2,engineOut:nearest(180,79),engineIn:nearest(180,179),radiatorIn:nearest(410,79),radiatorOut:nearest(410,179)};
      });
      for(const box of [deviceLayout.engine,deviceLayout.radiator]){assert.equal(deviceLayout.y2,box.y);assert.equal(deviceLayout.y1,box.y+box.height);}
      assert.ok(deviceLayout.engineOut.error<2&&deviceLayout.engineIn.error<2&&deviceLayout.radiatorIn.error<2&&deviceLayout.radiatorOut.error<2,'流動管路應穿過引擎和散熱器');
      const temperatureAt=y=>Math.max(0,Math.min(1,(y-deviceLayout.y1)/(deviceLayout.y2-deviceLayout.y1)));
      assert.ok(temperatureAt(deviceLayout.engineOut.y)>.98&&temperatureAt(deviceLayout.engineIn.y)<.02,'引擎出口應較暖，入口應較冷');
      assert.ok(temperatureAt(deviceLayout.radiatorIn.y)>.98&&temperatureAt(deviceLayout.radiatorOut.y)<.02,'散熱器入口應較暖，出口應較冷');
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
        const data=await p.locator('#application-'+key).evaluate(n=>({overflow:document.documentElement.scrollWidth>innerWidth,clipped:[...n.querySelectorAll('.life-temperatures strong,.life-energy strong,.life-bar-row strong')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent),fonts:[...n.querySelectorAll('h3,.life-reading,.coolant-key p,.coolant-chart-axis-labels,.coolant-chart-legend span,.coolant-gap-callouts span')].map(e=>parseFloat(getComputedStyle(e).fontSize)),hotspots:[...n.querySelectorAll('[data-coolant-stage]')].map(e=>{const r=e.getBoundingClientRect(),b=e.closest('.life-coolant-model').getBoundingClientRect();return{w:r.width,h:r.height,inside:r.left>=b.left&&r.right<=b.right&&r.top>=b.top&&r.bottom<=b.bottom};}),topDifference:(()=>{const columns=n.querySelectorAll('.life-workbench>div');return columns.length===2?Math.abs(columns[0].getBoundingClientRect().top-columns[1].getBoundingClientRect().top):0;})(),heightDifference:(()=>{const photo=n.querySelector('.life-photo'),panel=n.querySelector('.life-coolant-model');return photo&&panel?Math.abs(photo.getBoundingClientRect().height-panel.getBoundingClientRect().height):0;})(),coastHeightDifference:(()=>{const columns=n.querySelector('.coast-workbench'),left=columns?.children[0],panel=columns?.children[1];return left&&panel?Math.abs(left.getBoundingClientRect().height-panel.getBoundingClientRect().height):0;})()}));
        layouts.push({width,height,key,...data});assert.equal(data.overflow,false,`${width} ${key} page overflow`);assert.deepEqual(data.clipped,[],`${width} ${key} clipped`);assert.ok(data.fonts.every(s=>s>=16));if(width>=1280&&key!=='body')assert.ok(data.topDifference<1,`${width} ${key} columns misaligned`);if(width>=1280&&key==='coast')assert.ok(data.coastHeightDifference<2,`${width} coast columns unbalanced: ${data.coastHeightDifference}`);
        data.hotspots.forEach(h=>{assert.ok(h.w>=44&&h.h>=44);assert.equal(h.inside,true,`${width} hotspot cropped`);});
        if(width===320)await capture(key+'-320');
      }
    }
    assert.deepEqual(errors,[]);
    if(process.env.APPLICATION_CAPTURE_DIR)await fs.writeFile(path.join(process.env.APPLICATION_CAPTURE_DIR,'layouts.json'),JSON.stringify(layouts,null,2));
  });
});
