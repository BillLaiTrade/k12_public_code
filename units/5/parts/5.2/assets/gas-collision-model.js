/* Qualitative equal-mass hard-disc model. Units are illustrative, not real gas data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GasCollisionModel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function collide(a,b,r){
  let dx=b.x-a.x,dy=b.y-a.y,dist=Math.hypot(dx,dy);if(dist>=2*r)return null;
  if(dist<1e-8){dx=1e-8;dy=0;dist=1e-8;}
  const nx=dx/dist,ny=dy/dist,overlap=2*r-dist;
  a.x-=nx*overlap/2;a.y-=ny*overlap/2;b.x+=nx*overlap/2;b.y+=ny*overlap/2;
  const approach=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(approach>=0)return null;
  const beforeA=a.vx*a.vx+a.vy*a.vy,beforeB=b.vx*b.vx+b.vy*b.vy;
  a.vx+=approach*nx;a.vy+=approach*ny;b.vx-=approach*nx;b.vy-=approach*ny;
  return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,energyBefore:beforeA+beforeB,energyAfter:a.vx*a.vx+a.vy*a.vy+b.vx*b.vx+b.vy*b.vy,deltaA:a.vx*a.vx+a.vy*a.vy-beforeA,deltaB:b.vx*b.vx+b.vy*b.vy-beforeB};
 }
 function create(width,height,count,warmSide='left'){
  let seed=417,random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const model={width,height,warmSide,radius:3,particles:[],flashes:[],collisions:0,energyExchanged:0};
  const cols=Math.ceil(Math.sqrt(count*width/Math.max(height,1))),rows=Math.ceil(count/cols);
  for(let i=0;i<count;i++){const x=(i%cols+.5)*width/cols,y=(Math.floor(i/cols)+.5)*height/rows,angle=random()*Math.PI*2,speed=30+random()*35;model.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,highlight:0});}
  return model;
 }
 function resize(model,width,height){const sx=width/model.width,sy=height/model.height;model.particles.forEach(p=>{p.x*=sx;p.y*=sy});model.flashes=[];model.width=width;model.height=height;}
 function step(model,dt){
  const frames=Math.max(1,Math.ceil(dt/.004)),h=dt/frames,r=model.radius;
  for(let t=0;t<frames;t++){
   model.flashes.forEach(f=>f.life-=h);model.flashes=model.flashes.filter(f=>f.life>0);
   for(const p of model.particles){p.highlight=Math.max(0,p.highlight-h);p.x+=p.vx*h;p.y+=p.vy*h;
    if(p.x<r){p.x=r;p.vx=model.warmSide==='right'?18+Math.abs(p.vx)*.25:75+Math.abs(p.vx)*.3;}
    if(p.x>model.width-r){p.x=model.width-r;p.vx=-(model.warmSide==='right'?75+Math.abs(p.vx)*.3:18+Math.abs(p.vx)*.25);}
    if(p.y<r){p.y=r;p.vy=Math.abs(p.vy)}if(p.y>model.height-r){p.y=model.height-r;p.vy=-Math.abs(p.vy)}
   }
   for(let i=0;i<model.particles.length;i++)for(let j=i+1;j<model.particles.length;j++){const a=model.particles[i],b=model.particles[j],event=collide(a,b,r);if(event){model.collisions++;model.energyExchanged+=Math.abs(event.deltaA);a.highlight=b.highlight=.55;model.flashes.push({...event,life:.28});}}
  }
 }
 return {create,resize,step,collide};
});
