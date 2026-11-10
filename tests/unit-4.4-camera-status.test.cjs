const {test}=require('node:test'),assert=require('node:assert/strict'),{openBench}=require('./helpers/convex-bench-fixture.cjs');

test('相機小測即時標示對焦、影像大小與感光面狀態',{timeout:120000},async t=>{
 const {p,frame,errors}=await openBench(t,{url:process.env.CAMERA_URL}),q=p.locator('[data-camera-lab]');
 await p.locator('.route a[href="#s11"]').click();
 await p.waitForFunction(()=>document.querySelector('[data-camera-lab]')?.dataset.cameraRender==='3d');
 const track=q.locator('[data-camera-track]'),focus=q.locator('[data-camera-state-focus]'),size=q.locator('[data-camera-state-size]'),fit=q.locator('[data-camera-state-fit]'),surface=q.locator('[data-camera-preview-frame]');
 async function move(key,position){await q.locator(`[data-camera-select=${key}]`).click();const b=await track.boundingBox();await track.click({position:{x:b.width*position/12,y:b.height/2}});await frame();}
 assert.equal(await focus.innerText(),'失焦');assert.equal(await size.innerText(),'縮小');assert.equal(await fit.innerText(),'完整');assert.equal(await surface.getAttribute('data-clear'),'false');
 await move('flower',11.3);await move('sensor',2.05);
 assert.equal(await focus.innerText(),'已對焦');assert.equal(await size.innerText(),'縮小');assert.equal(await fit.innerText(),'完整');assert.equal(await focus.getAttribute('data-pass'),'true');assert.equal(await surface.getAttribute('data-clear'),'true');assert.ok(await surface.evaluate(el=>el.getAnimations().length>0),'對焦框跨過清晰門檻時應短暫脈動');
 await move('sensor',4.3);
 assert.equal(await focus.innerText(),'失焦');assert.equal(await size.innerText(),'縮小');assert.equal(await fit.innerText(),'完整');assert.equal(await surface.getAttribute('data-clear'),'false');
 await move('flower',7.1);await move('sensor',1.4);
 assert.equal(await focus.innerText(),'失焦');assert.equal(await size.innerText(),'放大');assert.equal(await fit.innerText(),'超出感光面');assert.equal(await size.getAttribute('data-pass'),'false');assert.deepEqual(errors,[]);
});
