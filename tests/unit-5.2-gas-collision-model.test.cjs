const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../units/5/parts/5.2/assets/gas-collision-model.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('equal-mass collisions exchange momentum and energy on actual contact',()=>{
 const a={x:10,y:10,vx:12,vy:2},b={x:15.9,y:10,vx:-3,vy:2},before={px:a.vx+b.vx,py:a.vy+b.vy,e:a.vx**2+a.vy**2+b.vx**2+b.vy**2};
 const event=model.collide(a,b,3);assert.ok(event);near(a.vx,-3);near(b.vx,12);near(a.vx+b.vx,before.px);near(a.vy+b.vy,before.py);near(event.energyAfter,before.e);assert.ok(event.deltaA<0&&event.deltaB>0);near(event.deltaA+event.deltaB,0);
 assert.equal(model.collide({x:0,y:0,vx:2,vy:0},{x:7,y:0,vx:-2,vy:0},3),null);
});
test('denser gap develops more particle collisions than sparse gap',()=>{
 const air=model.create(330,45,18),vacuum=model.create(330,45,2);
 for(let i=0;i<1200;i++){model.step(air,1/60);model.step(vacuum,1/60);}
 assert.ok(air.collisions>vacuum.collisions,`${air.collisions} versus ${vacuum.collisions}`);assert.ok(air.energyExchanged>0);
 for(const m of [air,vacuum])for(const p of m.particles){assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.ok(p.x>=-3&&p.x<=m.width+3&&p.y>=-3&&p.y<=m.height+3);}
});
test('warmer and cooler boundary encounters change kinetic energy',()=>{
 const warm={width:100,height:40,radius:3,particles:[{x:3,y:20,vx:-20,vy:0,highlight:0}],flashes:[],collisions:0,energyExchanged:0};model.step(warm,.01);assert.ok(warm.particles[0].vx>20);
 const cool={width:100,height:40,radius:3,particles:[{x:97,y:20,vx:80,vy:0,highlight:0}],flashes:[],collisions:0,energyExchanged:0};model.step(cool,.01);assert.ok(cool.particles[0].vx<0&&Math.abs(cool.particles[0].vx)<80);
});
test('oblique collisions conserve vector momentum and kinetic energy',()=>{
 const a={x:12,y:14,vx:18,vy:6},b={x:17,y:16,vx:-4,vy:-1};const px=a.vx+b.vx,py=a.vy+b.vy,e=a.vx**2+a.vy**2+b.vx**2+b.vy**2;
 const event=model.collide(a,b,3);assert.ok(event);near(a.vx+b.vx,px);near(a.vy+b.vy,py);near(a.vx**2+a.vy**2+b.vx**2+b.vy**2,e);assert.ok(Math.abs(event.deltaA)>1);
});
