import {test} from 'node:test';import assert from 'node:assert/strict';import {CAMERA,initialCamera,moveCamera,cameraState,cameraRays} from '../units/4/parts/4.4/assets/camera-optics.mjs';
test('相機鏡頭固定，只能調整花朵與感光元件的位置',()=>{
 const s=initialCamera();assert.equal(s.lens,undefined);assert.equal(s.flower,CAMERA.lens+CAMERA.f);assert.equal(s.sensor,CAMERA.lens-CAMERA.f);assert.equal(moveCamera(s,'lens',8),s);
 assert.equal(moveCamera(s,'flower',0).flower,CAMERA.flowerMin);assert.equal(moveCamera(s,'flower',100).flower,CAMERA.flowerMax);
 assert.equal(moveCamera(s,'sensor',0).sensor,CAMERA.sensorMin);assert.equal(moveCamera(s,'sensor',100).sensor,CAMERA.sensorMax);
});
test('像距、清晰度與輔助光路共用固定鏡頭模型',()=>{
 const flower=11.3,u=flower-CAMERA.lens,v=CAMERA.f*u/(u-CAMERA.f),s={...initialCamera(),flower,sensor:v},g=cameraState(s);
 assert.equal(g.u,u);assert.equal(g.image.type,'real');assert.equal(g.image.size,'smaller');assert.ok(g.success);assert.ok(Math.abs(g.image.v-v)<1e-9);
 for(const y of [-1.05,1.05]){const rays=cameraRays(s).filter(r=>r.y===y);assert.equal(rays.length,2);assert.ok(Math.abs(rays[0].end-rays[1].end)<1e-9);}
 assert.equal(cameraState(initialCamera()).checks.clear,false);
 const defocused=moveCamera(s,'sensor',v-.5);assert.equal(cameraState(defocused).success,false);
 const inside=moveCamera(s,'flower',CAMERA.lens+CAMERA.f*.75),insideImage=cameraState(inside);assert.equal(insideImage.image.type,'virtual');assert.equal(insideImage.checks.clear,false);assert.equal(insideImage.success,false);
});
test('縮小影像的感光面判定符合預覽中花朵與感光元件框的比例',()=>{
 const state={...initialCamera(),flower:CAMERA.lens+4.5,sensor:3.6},g=cameraState(state);
 assert.ok(g.scale<1);assert.ok(g.scale>.48);assert.equal(g.checks.clear,true);assert.equal(g.checks.small,true);assert.equal(g.checks.complete,true);assert.equal(g.success,true);
 const tooLarge={...state,flower:CAMERA.lens+2.05},outside=cameraState(tooLarge);
 assert.ok(outside.scale>CAMERA.sensorFitMax);assert.equal(outside.checks.complete,false);
});
test('等大範圍不會誤判成縮小影像',()=>{
 const state={...initialCamera(),flower:CAMERA.lens+4,sensor:4};
 assert.equal(cameraState(state).scale,1);assert.equal(cameraState(state).checks.small,false);assert.equal(cameraState(state).success,false);
});
