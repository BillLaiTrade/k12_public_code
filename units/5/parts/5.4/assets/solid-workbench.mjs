import {ballDiameter,ballPasses} from './thermal-model.mjs';

// A teaching model: water baths are held at fixed temperature. The time
// constant is accelerated and is not a measured heat-transfer coefficient.
export function advanceSolidTemperature(temp,target,seconds){
 const tau=target===80?4:target===20?7:4;
 return target+(temp-target)*Math.exp(-Math.max(0,seconds)/tau);
}
export function initSolidWorkbench(){
 const stage=document.getElementById('solid-stage'),container=document.getElementById('solid-balls'),lab=document.getElementById('solid-lab');
 const initial=[{id:'A',x:20,y:24},{id:'B',x:46,y:24},{id:'C',x:72,y:24}];
 let balls=[],selected=0,drag=null,last=0,active=true;
 const $=id=>document.getElementById(id),limit=(n,a,b)=>Math.min(b,Math.max(a,n));
 function updateBall(ball){
  const node=ball.node;node.style.left=ball.x+'%';node.style.top=ball.y+'%';
  node.dataset.zone=ball.zone;node.dataset.testResult=ball.testResult||'';node.dataset.testing=String(Boolean(ball.motion));node.dataset.temperature=ball.temp.toFixed(3);node.setAttribute('aria-pressed',String(balls[selected]===ball));
  node.setAttribute('aria-label',`銅球${ball.id}，${ball.temp.toFixed(1)}攝氏度，${ball.zone==='hot'?'在熱水浴':ball.zone==='cool'?'在室溫水浴':'在空氣中'}。按Enter拿起，再用方向鍵移動。`);
  node.querySelector('.solid-ball-label').textContent=`${ball.id} ${ball.temp.toFixed(1)}°C`;
 }
 function render(){
  for(const ball of balls)updateBall(ball);
  const ball=balls[selected];$('solid-selected').textContent=ball.id;$('solid-temp').textContent=ball.temp.toFixed(1)+'°C';$('solid-diameter').textContent=ballDiameter(ball.temp).toFixed(3)+' mm';
  lab.dataset.selected=ball.id;lab.dataset.temperature=ball.temp.toFixed(3);lab.dataset.passes=String(ballPasses(ball.temp));
 }
 function position(event){const r=stage.getBoundingClientRect();return {x:limit((event.clientX-r.left)/r.width*100,5,95),y:limit((event.clientY-r.top)/r.height*100,12,90)};}
 function drop(ball){
  ball.testResult='';
  if(ball.y>=44&&ball.y<=85&&ball.x>=11&&ball.x<=29){ball.zone='cool';ball.x=20+(selected-1)*3.3;ball.y=67+(selected-1)*2.5;$('solid-note').textContent=`銅球 ${ball.id} 放入 20°C 水浴，溫度會逐漸接近水溫。`;}
  else if(ball.y>=44&&ball.y<=85&&ball.x>=39&&ball.x<=58){ball.zone='hot';ball.x=48.5+(selected-1)*3.3;ball.y=67+(selected-1)*2.5;$('solid-note').textContent=`銅球 ${ball.id} 放入 80°C 水浴，溫度會逐漸接近水溫。`;}
  else if(ball.y>=38&&ball.y<=66&&ball.x>=70&&ball.x<=85){
   ball.zone='air';ball.x=77.5;const pass=ballPasses(ball.temp);ball.motion={elapsed:0,duration:1.5,start:ball.y,end:pass?61:45,result:pass?'pass':'blocked',testTemperature:ball.temp};
   $('solid-note').textContent=`銅球 ${ball.id} 正在嘗試通過金屬環。`;
  }else{ball.zone='air';$('solid-note').textContent=`銅球 ${ball.id} 已取出，會逐漸接近室溫；可繼續拖動測試。`;}
  render();
 }
 function setup(){container.replaceChildren();balls=initial.map(({id,x,y})=>({id,x,y,temp:20,zone:'air',node:null}));selected=0;drag=null;
  for(const [i,ball] of balls.entries()){
   const node=document.createElement('button');node.type='button';node.className='solid-ball';node.innerHTML='<span class="solid-ball-label"></span><span class="solid-ball-shape" aria-hidden="true"></span>';node.setAttribute('aria-pressed','false');ball.node=node;container.append(node);
   node.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();selected=i;const original={x:ball.x,y:ball.y,zone:ball.zone,testResult:ball.testResult};ball.zone='air';ball.testResult='';ball.motion=null;drag={ball,pointer:e.pointerId,original};node.setPointerCapture(e.pointerId);node.classList.add('is-dragging');render();});
   node.addEventListener('pointermove',e=>{if(!drag||drag.ball!==ball||drag.pointer!==e.pointerId)return;Object.assign(ball,position(e));render();});
   node.addEventListener('pointerup',e=>{if(!drag||drag.ball!==ball||drag.pointer!==e.pointerId)return;Object.assign(ball,position(e));drag=null;node.classList.remove('is-dragging');drop(ball);});
   node.addEventListener('pointercancel',()=>{if(drag&&drag.ball===ball){Object.assign(ball,drag.original);drag=null;node.classList.remove('is-dragging');render();}});
   node.addEventListener('focus',()=>{selected=i;render();});
   node.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();if(drag&&drag.ball===ball&&drag.keyboard){drag=null;node.classList.remove('is-dragging');drop(ball);}else if(!drag){drag={ball,keyboard:true,original:{x:ball.x,y:ball.y,zone:ball.zone,testResult:ball.testResult}};ball.zone='air';ball.testResult='';ball.motion=null;node.classList.add('is-dragging');$('solid-note').textContent=`已拿起銅球 ${ball.id}，使用方向鍵移動，再按 Enter 放下。`;render();}return;}
    if(!drag||drag.ball!==ball||!drag.keyboard)return;
    if(e.key==='Escape'){e.preventDefault();Object.assign(ball,drag.original);drag=null;node.classList.remove('is-dragging');$('solid-note').textContent='已取消移動。';render();return;}
    const delta={ArrowLeft:[-2,0],ArrowRight:[2,0],ArrowUp:[0,-2],ArrowDown:[0,2]}[e.key];if(delta){e.preventDefault();ball.x=limit(ball.x+delta[0],5,95);ball.y=limit(ball.y+delta[1],12,90);render();}
   });
  }render();
 }
 $('solid-reset').onclick=()=>{setup();$('solid-note').textContent='三顆銅球都回到室溫，可重新觀察。';};
 setup();
 const observer=new IntersectionObserver(entries=>{active=entries[0].isIntersecting;last=0;},{threshold:0});observer.observe(lab);
 document.addEventListener('visibilitychange',()=>{last=0;});
 function tick(now){if(active&&!document.hidden&&last){const dt=Math.min((now-last)/1000,.2);for(const ball of balls){const target=ball.zone==='hot'?80:20;ball.temp=advanceSolidTemperature(ball.temp,target,dt);if(ball.motion){const motion=ball.motion;motion.elapsed=Math.min(motion.duration,motion.elapsed+dt);const progress=motion.elapsed/motion.duration;ball.y=motion.elapsed<.3?motion.start+(35-motion.start)*(motion.elapsed/.3):35+(motion.end-35)*((motion.elapsed-.3)/(motion.duration-.3));if(progress===1){ball.testResult=motion.result;ball.motion=null;$('solid-note').textContent=`銅球 ${ball.id} 在 ${motion.testTemperature.toFixed(1)}°C 時${motion.result==='pass'?'能通過':'停在環上，不能通過'}；環維持 20°C。`;}}}render();}last=now;requestAnimationFrame(tick);}requestAnimationFrame(tick);
}
