const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const {chromium}=require('playwright');

test('小測：自由設定、觀察四樣品、計算及排序',{timeout:180000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
 const remote=process.env.UNIT53_URL,url=remote||`http://127.0.0.1:${port}/units/5/parts/5.3/`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],...(remote?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const p=await browser.newPage({viewport:{width:1366,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url,{waitUntil:'networkidle'});await p.clock.install();await p.clock.pauseAt(new Date(Date.now()+1000));
 await p.waitForFunction(()=>document.querySelector('#unknown-quiz-lab').dataset.phase==='ready');
 const choose=async id=>{await p.locator(`[data-unknown-sample="${id}"]`).click();await p.waitForFunction(()=>['ready','complete','interrupted'].includes(document.querySelector('#unknown-quiz-lab').dataset.phase));};
 const observe=async()=>{await p.locator('#unknown-observe').click();await p.clock.runFor(6500);assert.equal(await p.locator('#unknown-quiz-lab').getAttribute('data-phase'),'complete');};
 const {MATERIAL_IMAGES}=await import('../units/5/parts/5.3/assets/unknown-explore-model.mjs');
 await t.test('起始不揭答案，輸入有效範圍與每份設定獨立',async()=>{
  const imageSizes=await p.evaluate(async files=>Promise.all(files.map(async src=>{const image=new Image();image.src=src;await image.decode();return [image.naturalWidth,image.naturalHeight];})),Object.values(MATERIAL_IMAGES).map(file=>new URL(`assets/${file}`,url).href));assert.ok(imageSizes.every(([w,h])=>w===1254&&h===1254));
  assert.equal(await p.locator('[data-unknown-sample]').count(),4);assert.deepEqual(await p.locator('[data-unknown-sample] [data-sample-name]').allTextContents(),['鋁塊','玻璃塊','鐵塊','銅塊']);assert.deepEqual(await p.locator('[name=\"rank-1\"] option:not([value=\"\"])').allTextContents(),['鋁塊','玻璃塊','鐵塊','銅塊']);assert.equal(await p.locator('#unknown-mass').inputValue(),'100');assert.equal(await p.locator('#unknown-heat').inputValue(),'500');
  assert.equal(await p.locator('#unknown-image').getAttribute('src').then(src=>src.includes('unknown-sample-aluminum.webp')),true);assert.match(await p.locator('#unknown-image').getAttribute('alt'),/鋁塊/);assert.equal(await p.locator('#unknown-meter').textContent(),'20.00');assert.equal(await p.locator('#unknown-check').isDisabled(),true);
  for(const id of ['a','b','c','d']){assert.equal(await p.locator(`#unknown-c-${id}`).isDisabled(),true);assert.equal(await p.locator(`#unknown-c-${id}`).inputValue(),'');}
  await p.locator('#unknown-mass').fill('99');assert.equal(await p.locator('#unknown-observe').isDisabled(),true);assert.match(await p.locator('#unknown-setting-error').textContent(),/100～350/);
  await p.locator('#unknown-mass').fill('100');await p.locator('#unknown-heat').fill('3001');assert.equal(await p.locator('#unknown-observe').isDisabled(),true);
  await p.locator('#unknown-heat').fill('500');await observe();assert.match(await p.locator('#unknown-records').innerText(),/42\.73°C/);assert.ok(await p.locator('#unknown-records tr').first().evaluate(n=>n.getBoundingClientRect().height)>0);assert.equal(await p.locator('#unknown-c-a').isEnabled(),true);assert.equal(await p.locator('#unknown-c-b').isDisabled(),true);
  await p.locator('#unknown-mass').fill('175.5');assert.match(await p.locator('#unknown-status').textContent(),/原紀錄保留/);assert.match(await p.locator('#unknown-records').innerText(),/100 g/);
  await choose('b');assert.equal(await p.locator('#unknown-image').getAttribute('src').then(src=>src.includes('unknown-sample-glass.webp')),true);assert.match(await p.locator('#unknown-image').getAttribute('alt'),/玻璃塊/);assert.equal(await p.locator('#unknown-image').evaluate(n=>n.complete&&n.naturalWidth===1254),true);assert.equal(await p.locator('#unknown-mass').inputValue(),'100');await choose('a');assert.equal(await p.locator('#unknown-mass').inputValue(),'175.5');
 });
 await t.test('各自不同條件可觀察並保留紀錄，根據顯示讀值算出答案',async()=>{
  await p.locator('#unknown-mass').fill('100');
  for(const [id,mass,heat] of [['b','200','1000'],['c','250','650'],['d','175.5','700.5']]){await choose(id);await p.locator('#unknown-mass').fill(mass);await p.locator('#unknown-heat').fill(heat);await observe();}
  const rows=await p.locator('#unknown-records tr').allTextContents();assert.equal(rows.length,4);assert.match(rows[1],/200 g.*1,000 cal.*45\.00°C/);assert.match(rows[2],/250 g.*650 cal.*43\.64°C/);assert.match(rows[3],/175\.5 g.*700\.5 cal/);
  assert.equal(await p.locator('#unknown-check').isEnabled(),true);
  await p.locator('#unknown-check').click();assert.match(await p.locator('#unknown-feedback-a').textContent(),/先填/);assert.match(await p.locator('#unknown-rank-feedback').textContent(),/完成/);
  await p.locator('#unknown-c-a').fill('0.9');await p.locator('#unknown-check').click();assert.match(await p.locator('#unknown-feedback-a').textContent(),/再算一次/);
  for(const [id,v] of Object.entries({a:'0.22',b:'0.20',c:'0.11',d:'0.09'}))await p.locator(`#unknown-c-${id}`).fill(v);
  for(let i=1;i<=4;i++)await p.locator(`[name="rank-${i}"]`).selectOption('a');await p.locator('#unknown-check').click();assert.match(await p.locator('#unknown-rank-feedback').textContent(),/只能選一次/);
  for(const [i,id] of ['a','b','c','d'].entries())await p.locator(`[name="rank-${i+1}"]`).selectOption(id);await p.locator('#unknown-check').click();assert.equal(await p.locator('#quiz-result').getAttribute('data-correct'),'true');
 });
 await t.test('重新作答保留紀錄、切換中斷及重新觀察只更新該筆',async()=>{
  await p.locator('#heat-quiz button[type=reset]').click();assert.equal(await p.locator('#unknown-c-a').inputValue(),'');assert.equal(await p.locator('#quiz-result').isHidden(),true);assert.equal(await p.locator('#unknown-check').isEnabled(),true);
  const before=await p.locator('#unknown-records').innerText();await choose('a');await p.locator('#unknown-mass').fill('200');await p.locator('#unknown-observe').click();await p.clock.runFor(1000);await choose('b');assert.equal(await p.locator('#unknown-records').innerText(),before);
  await choose('a');assert.match(await p.locator('#unknown-status').textContent(),/中斷/);await observe();const after=await p.locator('#unknown-records tr').allTextContents();assert.match(after[0],/200 g.*500 cal.*31\.36°C/);assert.match(after[1],/200 g.*1,000 cal.*45\.00°C/);
  let previousSet=new Set(['鋁塊','玻璃塊','鐵塊','銅塊']);
  for(let round=0;round<2;round++){await p.locator('#unknown-new').click();await p.waitForFunction(()=>document.querySelector('#unknown-quiz-lab').dataset.phase==='ready');const reordered=await p.locator('[data-unknown-sample] [data-sample-name]').allTextContents(),nextSet=new Set(reordered);assert.equal(nextSet.size,4);assert.ok([...nextSet].every(name=>['鋁塊','玻璃塊','鐵塊','銅塊','鎂塊','石墨塊','鈦塊','木塊'].includes(name)));assert.ok([...nextSet].some(name=>!previousSet.has(name)),'換組一定加入新材料');assert.ok([...previousSet].some(name=>!nextSet.has(name)),'換組一定移除上一組的至少一種材料');assert.deepEqual(await p.locator('[name="rank-1"] option:not([value=""])').allTextContents(),reordered);for(let i=0;i<4;i++){await choose('abcd'[i]);assert.ok((await p.locator('#unknown-image').getAttribute('src')).includes(MATERIAL_IMAGES[reordered[i]]));assert.match(await p.locator('#unknown-image').getAttribute('alt'),new RegExp(reordered[i]));}assert.match(await p.locator('#unknown-records').innerText(),/尚未觀察/);assert.equal(await p.locator('#unknown-check').isDisabled(),true);assert.equal(await p.locator('#unknown-c-a').inputValue(),'');previousSet=nextSet;}
 });
 await t.test('常用視窗不溢出，控制項可閱讀',async()=>{
  for(const width of [1440,1280,390,320]){await p.setViewportSize({width,height:900});const data=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('[data-unknown-sample]')].map(x=>x.getBoundingClientRect().height),meter:parseFloat(getComputedStyle(document.querySelector('#unknown-meter')).fontSize)}));assert.equal(data.overflow,false,`${width} overflow`);assert.ok(data.buttons.every(x=>x>=44));assert.ok(data.meter>=14);}
  assert.deepEqual(errors,[]);
 });
});

test('小測圖片載入失敗可重試，成功後不自動開始',{timeout:30000},async t=>{
 const server=spawn('python3',['-u','-m','http.server','0','--bind','127.0.0.1'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','pipe']});t.after(()=>server.kill());
 const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),5000);server.stdout.on('data',d=>{const m=String(d).match(/port (\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});server.on('error',reject);});
 const remote=process.env.UNIT53_URL,url=remote||`http://127.0.0.1:${port}/units/5/parts/5.3/`;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],...(remote?{proxy:{server:process.env.HTTPS_PROXY||process.env.HTTP_PROXY}}:{})});t.after(()=>browser.close());
 const p=await browser.newPage();let allowImage=false;await p.route('**/unknown-sample-aluminum.webp*',route=>allowImage?route.continue():route.abort());await p.goto(url,{waitUntil:'networkidle'});
 await p.waitForFunction(()=>document.querySelector('#unknown-quiz-lab').dataset.phase==='error');assert.equal(await p.locator('#unknown-observe').isDisabled(),true);allowImage=true;await p.locator('#unknown-retry').click();await p.waitForFunction(()=>document.querySelector('#unknown-quiz-lab').dataset.phase==='ready');assert.equal(await p.locator('#unknown-observe').isEnabled(),true);assert.equal(await p.locator('#unknown-energy').textContent(),'0');
});
