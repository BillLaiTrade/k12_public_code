import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PROJECTOR as G,initialProjector,moveProjector,projectorState,projectorRays,projectorHint,projectorFocusMarks} from '../units/4/parts/4.4/assets/projector-optics.mjs';

test('鏡片與焦點固定，圖卡和牆面沿光軌移動',()=>{
 const initial={...initialProjector(),kind:'convex'};assert.equal(initialProjector().kind,'concave');
 assert.equal(initial.card,G.lens-G.f);assert.equal(initial.screen,G.lens+G.f);
 assert.equal(initial.lens,undefined);
 assert.equal(moveProjector(initial,'lens',9),initial);
 assert.equal(moveProjector(initial,'card',-10).card,G.cardMin);
 assert.equal(moveProjector(initial,'screen',100).screen,G.screenMax);
 assert.equal(moveProjector(initial,'unknown',2),initial);
 const marks=projectorFocusMarks(initial);
 for(const [key,value] of Object.entries({'left-2':.7,'left-1':3.1,'right-1':7.9,'right-2':10.3}))assert.ok(Math.abs(marks[key]-value)<1e-9);
 for(const screen of [G.screenMin,10.3,G.screenMax])assert.deepEqual(projectorFocusMarks({...initial,screen}),marks,'fixed F and 2F marks do not move or disappear with the wall');
 assert.ok(Object.values(projectorFocusMarks({...initial,kind:'concave'})).every(value=>value===null));
});
test('固定鏡片下可在牆上形成放大、清楚且正立的實像',()=>{
 const card=G.lens-G.f*6.5/(6.5-G.f),state={...initialProjector(),kind:'convex',card,screen:G.lens+6.5,flipped:true};
 const g=projectorState(state);assert.ok(Math.abs(g.u-G.f*6.5/(6.5-G.f))<1e-9);assert.ok(Math.abs(g.image.v-g.s)<1e-9);assert.ok(g.scale>1);assert.equal(g.success,true);assert.equal(projectorState({...state,flipped:false}).checks.upright,false);
 const rays=projectorRays(state);for(const point of [-.45,.45]){const bundle=rays.filter(r=>r.point===point);assert.equal(bundle.length,3);for(const r of bundle)assert.ok(Number.isFinite(r.end[1]));}
});
test('未對焦、虛像、凹透鏡或超出目標框不會通關',()=>{
 assert.equal(projectorState(initialProjector()).success,false);
 const virtual=projectorState({...initialProjector(),card:G.lens-G.f/2});assert.notEqual(virtual.image.type,'real');assert.equal(virtual.checks.clear,false);
 const concave=projectorState({...initialProjector(),kind:'concave'});assert.equal(concave.image.type,'virtual');assert.equal(concave.success,false);
 const farWall=G.lens+6.5,focusedCard=G.lens-G.f*6.5/(6.5-G.f),tooLarge=projectorState({...initialProjector(),kind:'convex',card:focusedCard,screen:farWall,flipped:true});assert.equal(tooLarge.checks.clear,true);
 const before=structuredClone(initialProjector()),hint=projectorHint(before);assert.deepEqual(before,initialProjector());assert.equal(hint.href,'#s5');assert.equal(projectorHint({...before,kind:'convex'}).href,'#s3');
});
