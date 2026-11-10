const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {chromium}=require('playwright');
const {expect}=require('playwright/test');

test('5.2 同頁比較：兩種局部圖、操作與版面', {timeout:120000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..')});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m)resolve(m[1])});server.on('error',reject)});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${port}/units/5/parts/5.2/`);
 const lab=page.locator('#insulation-lab');await expect(lab).toHaveAttribute('data-assets','ready');
 await t.test('移除同屏入口和模式',async()=>{assert.equal(await page.locator('#insulation-expand,#insulation-return,#insulation-dialog').count(),0);assert.equal(await page.locator('#card-06 #insulation-lab').count(),1)});
 await t.test('兩模式與窄螢幕都有雙圖、穩定版面及圖表下方的按鈕',async()=>{
  for(const width of [1366,900,390,320]){await page.setViewportSize({width,height:900});
   for(const mode of ['gap','lining']){await page.locator(`[data-insulation-comparison=${mode}]`).click();await expect(lab).toHaveAttribute('data-assets','ready');await page.waitForTimeout(500);
    const bottle=()=>page.locator('#insulation-bottle-a').evaluate(n=>{const r=n.getBoundingClientRect(),base=document.querySelector('#insulation-lab').getBoundingClientRect();return {width:r.width,y:r.y-base.y}});
    const coords=()=>page.evaluate(()=>{const base=document.querySelector('#insulation-lab').getBoundingClientRect();return ['#insulation-lab','.insulation-scene','.insulation-chart-block','#insulation-play'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [r.x-base.x,r.y-base.y,r.width,r.height]})});
    const before=await coords(),source=page.locator('#insulation-source-a'),inset=page.locator(mode==='gap'?'#insulation-mechanism':'#insulation-lining-focus'),closedBottle=await bottle();if(width>=900){const scene=await page.locator('.insulation-scene').boundingBox(),label=await page.locator('.insulation-bottle-view figcaption').last().boundingBox();assert.ok(scene.y+scene.height-label.y-label.height<50,JSON.stringify({width,mode,scene,label}));}await source.click();await expect(inset).toBeVisible();await page.waitForTimeout(500);const openBottle=await bottle();assert.ok(Math.abs(closedBottle.width-openBottle.width)<1&&Math.abs(closedBottle.y-openBottle.y)<1,JSON.stringify({width,mode,closedBottle,openBottle}));
    assert.equal(await inset.locator(mode==='gap'?'.insulation-micro-panel':'.insulation-lining-zoom').filter({visible:true}).count(),mode==='gap'?1:2);if(mode==='gap'){assert.equal(await page.locator('[data-micro=a]').isVisible(),true);assert.equal(await page.locator('[data-micro=b]').isVisible(),false);}
    if(width>=900){const target=await page.evaluate(()=>{const svg=document.querySelector('#insulation-bottle-a'),p=svg.createSVGPoint();p.x=139;p.y=440;const v=p.matrixTransform(svg.getScreenCTM()),r=document.querySelector('.insulation-scene').getBoundingClientRect(),dot=document.querySelector('[data-target="a"]');return {dx:Math.abs(v.x-r.left-Number(dot.getAttribute('cx'))),dy:Math.abs(v.y-r.top-Number(dot.getAttribute('cy')))}});assert.ok(target.dx<2&&target.dy<2,JSON.stringify({width,mode,target}));}
    if(mode==='gap'){const card=await inset.boundingBox(),labels=await page.locator('.insulation-bottle-view figcaption').all();for(const label of labels){const box=await label.boundingBox();assert.ok(card.y>=box.y+box.height-1,JSON.stringify({width,card,box}));}for(const wave of await inset.locator('.micro-lens-radiation').all())assert.equal(await wave.evaluate(n=>getComputedStyle(n).opacity),'1');const particle=inset.locator('.micro-lens-particle').first();await expect.poll(async()=>particle.evaluate(n=>{const r=n.getBoundingClientRect();return r.height/r.width})).toBeGreaterThan(.85);const box=await particle.boundingBox();assert.ok(box.height/box.width<1.15);}
    assert.equal(await source.getAttribute('aria-expanded'),'true');assert.equal(await page.locator('.insulation-curve-key .curve-a').evaluate(n=>getComputedStyle(n).opacity),'1');assert.equal(await page.locator('.insulation-curve-key .curve-b').evaluate(n=>getComputedStyle(n).opacity),'1');
    const plot=await page.locator('.insulation-plot').boundingBox(),buttons=await page.locator('.insulation-control-row').boundingBox();assert.ok(buttons.y>=plot.y+plot.height-1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.locator('.insulation-chart-heading').click();await expect(inset).toBeHidden();await page.waitForTimeout(500);assert.deepEqual(await coords(),before);const restored=await bottle();assert.ok(Math.abs(restored.width-closedBottle.width)<1&&Math.abs(restored.y-closedBottle.y)<1);
    await page.locator('#insulation-source-b').click();await expect(inset).toBeVisible();if(mode==='gap'){assert.equal(await page.locator('[data-micro=a]').isVisible(),false);assert.equal(await page.locator('[data-micro=b]').isVisible(),true);}await page.locator('#insulation-source-b').click();await expect(inset).toBeHidden();
   }
  }
 });
 await t.test('反射層比較波線、曲線與開始暫停同步',async()=>{
  await page.setViewportSize({width:1366,height:900});await page.locator('[data-insulation-comparison=lining]').click();await expect(lab).toHaveAttribute('data-assets','ready');await page.locator('#insulation-source-a').click();
  assert.equal(await page.locator('[data-lining-zoom=b] .lining-compare-return').count(),1);assert.equal(await page.locator('[data-lining-zoom=b] .lining-compare-leak').count(),0);assert.equal(await page.locator('[data-lining-zoom=b] .lining-compare-reflector').getAttribute('d'),'M166 5V59');assert.match(await page.locator('[data-lining-zoom=b] svg').getAttribute('aria-label'),/外壁面向真空的一側/);
  const wave=page.locator('[data-lining-zoom=a] .lining-compare-wave');await page.locator('#insulation-play').click();await expect(lab).toHaveAttribute('data-playing','true');assert.equal(await wave.evaluate(n=>getComputedStyle(n).animationName),'lining-compare-flow');await page.waitForTimeout(400);assert.ok(Number(await lab.getAttribute('data-elapsed'))>0);
  assert.ok(Number(await page.locator('#insulation-point-b').getAttribute('cy'))<Number(await page.locator('#insulation-point-a').getAttribute('cy')));const elapsed=Number(await lab.getAttribute('data-elapsed'));await page.locator('.insulation-chart-heading').click();await expect(page.locator('#insulation-lining-focus')).toBeHidden();await page.waitForTimeout(150);assert.ok(Number(await lab.getAttribute('data-elapsed'))>elapsed);await page.locator('#insulation-source-a').click();await page.locator('#insulation-play').click();assert.equal(await wave.evaluate(n=>getComputedStyle(n).animationName),'none');await page.locator('#insulation-reset').click();await expect(lab).toHaveAttribute('data-elapsed','0.000');
 });
 await t.test('局部粒子及輻射在選取後持續移動',async()=>{
  await page.setViewportSize({width:900,height:900});
  for(const motion of ['no-preference','reduce']){await page.emulateMedia({reducedMotion:motion});await page.locator('[data-insulation-comparison=gap]').click();
   for(const role of ['a','b']){await page.locator(`#insulation-source-${role}`).click();const particle=page.locator(`[data-micro=${role}] .micro-lens-particle`).first(),wave=page.locator(`[data-micro=${role}] .micro-lens-radiation`);const x=await particle.getAttribute('cx'),offset=await wave.evaluate(n=>n.style.strokeDashoffset);await page.waitForTimeout(750);assert.notEqual(await particle.getAttribute('cx'),x);assert.notEqual(await wave.evaluate(n=>n.style.strokeDashoffset),offset);await page.locator(`#insulation-source-${role}`).click();}
  }
 });
 await t.test('兩側夾層可點選並支援觸控與鍵盤',async()=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:900,height:900});await page.locator('[data-insulation-comparison=gap]').click();
  assert.equal(await page.locator('.insulation-inspect-prompt').innerText(),'點選瓶身夾層，查看局部放大');
  for(const role of ['a','b'])for(const x of [140,300]){const source=page.locator(`#insulation-source-${role}`);await source.scrollIntoViewIfNeeded();const point=await page.locator(`#insulation-bottle-${role}`).evaluate((svg,x)=>{const p=svg.createSVGPoint();p.x=x;p.y=275;const v=p.matrixTransform(svg.getScreenCTM());return {x:v.x,y:v.y}},x);await page.mouse.click(point.x,point.y);await expect(source).toHaveAttribute('aria-pressed','true');await source.click();await expect(source).toHaveAttribute('aria-pressed','false');}
  await page.locator('#insulation-source-a').focus();await page.keyboard.press('Enter');await expect(page.locator('#insulation-source-a')).toHaveAttribute('aria-pressed','true');await page.keyboard.press('Enter');
  const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),p=await c.newPage();try{await p.goto(`http://127.0.0.1:${port}/units/5/parts/5.2/`);await expect(p.locator('#insulation-lab')).toHaveAttribute('data-assets','ready');const source=p.locator('#insulation-source-a');await source.scrollIntoViewIfNeeded();const point=await p.locator('#insulation-bottle-a').evaluate(svg=>{const q=svg.createSVGPoint();q.x=300;q.y=275;const v=q.matrixTransform(svg.getScreenCTM());return{x:v.x,y:v.y}});await p.touchscreen.tap(point.x,point.y);await expect(source).toHaveAttribute('aria-pressed','true');}finally{await c.close();}
 });
 await t.test('沒有瀏覽器錯誤',()=>assert.deepEqual(errors,[]));
});
