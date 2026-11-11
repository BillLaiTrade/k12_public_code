const root=document.getElementById('application-lab');
const get=id=>document.getElementById(id);
const views={chestnut:get('application-chestnut'),coast:get('application-coast'),coolant:get('application-coolant')};
const images={chestnut:get('chestnut-photo'),coolant:get('coolant-photo')};
const coastPhoto=get('coast-photo');
const coastSources={day:'application-coast-shore-day-sunless.webp',night:'application-coast-shore-night.webp'};
const sources={chestnut:'application-chestnut.webp',coolant:'application-coolant-labeled.webp'};
const questions={chestnut:'沙子如何幫助糖炒栗子加熱？',coast:'為什麼白天沙灘可能很燙，海水卻沒有那麼容易變熱？',coolant:'為什麼汽車冷卻液裡常含有水？'};
const assets={chestnut:{phase:'loading',attempt:0},coast:{phase:'loading',attempt:0},coolant:{phase:'loading',attempt:0}};
let current='chestnut',mode='day';
const coastQuestion=()=>mode==='day'?questions.coast:'為什麼夜晚沙灘可能明顯降溫，海水的溫度變化卻較小？';

const contactImage=get('chestnut-contact-image'),contactLoading=get('chestnut-contact-loading'),contactRetry=get('chestnut-contact-retry');
let contactAttempt=0,contactReady=false;
async function loadContact(retry=false){
  const attempt=++contactAttempt;
  contactLoading.hidden=false;contactLoading.textContent='正在準備接觸處放大圖…';contactRetry.hidden=true;
  if(retry)contactImage.src=new URL(`application-chestnut-contact.png?retry=${attempt}`,import.meta.url).href;
  try{await contactImage.decode();if(attempt!==contactAttempt)return;contactReady=true;contactLoading.hidden=true;}
  catch{if(attempt!==contactAttempt)return;contactReady=false;contactLoading.textContent='放大圖未能載入，請重新載入。';contactRetry.hidden=get('chestnut-contact').hidden;}
}
function selectChestnutMode(next){
  if(!['scene','contact'].includes(next))return;
  get('chestnut-scene').hidden=next!=='scene';get('chestnut-contact').hidden=next!=='contact';
  root.querySelectorAll('[data-chestnut-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chestnutMode===next)));
  get('chestnut-view-note').textContent=next==='contact'?'接觸處示意，砂粒已放大':'炒栗子場景示意';
  contactRetry.hidden=next!=='contact'||contactReady;
}

function renderAsset(key){
  const asset=assets[key],view=views[key],message=view.querySelector('[data-life-loading]');
  message.hidden=asset.phase==='ready';
  message.textContent=asset.phase==='error'?'場景未能載入，請點「重新載入場景」。':'正在準備生活場景…';
  view.querySelector('[data-life-retry]').hidden=asset.phase!=='error';
  view.setAttribute('aria-busy',String(asset.phase==='loading'));
  view.dataset.phase=asset.phase;
}
async function loadAsset(key,retry=false){
  const asset=assets[key],attempt=++asset.attempt;
  asset.phase='loading';renderAsset(key);
  if(retry&&key!=='coast')images[key].src=new URL(`${sources[key]}?retry=${attempt}`,import.meta.url).href;
  try{
    if(key==='coast'){
      await Promise.all(Object.values(coastSources).map(src=>{const image=new Image();image.src=new URL(`${src}${retry?`?retry=${attempt}`:''}`,import.meta.url).href;return image.decode();}));
      if(attempt!==asset.attempt)return;
      coastPhoto.src=new URL(coastSources.day,import.meta.url).href;
      get('coast-night-photo').src=new URL(coastSources.night,import.meta.url).href;
    }else await images[key].decode();
    if(attempt!==asset.attempt)return;
    asset.phase='ready';renderAsset(key);if(key==='coast')syncCoastCycle();
  }catch{
    if(attempt!==asset.attempt)return;
    asset.phase='error';renderAsset(key);

  }
}

function selectApplication(key){
  if(!(key in views))return;
  current=key;root.dataset.scene=key;get('application-question').textContent=key==='coast'?coastQuestion():questions[key];
  Object.entries(views).forEach(([name,view])=>view.hidden=name!==key);
  syncCoolantFlow();syncCoastCycle();
  root.querySelectorAll('.life-tabs [data-application]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.application===key)));
  if(assets[key].phase!=='ready')loadAsset(key);
}

// 一個完整循環先升溫再降溫；夜晚從白天結束時接續，不重設溫度。
let coastFrame=0,coastLastTime=null,coastElapsed=0;
let coastInView=!('IntersectionObserver' in window);
const coastCycleDuration=10000;
// 北緯23.5°、春分附近赤緯約0°：以時角推算高度角與方位角。
// 高度公式參考 NOAA solar equations；近滿月月出接近日落參考 NASA Moon Phases。
// https://gml.noaa.gov/grad/solcalc/solareqns.PDF
// https://science.nasa.gov/moon/moon-phases/
const coastLatitude=23.5*Math.PI/180;
const coastMaxAltitude=Math.PI/2-coastLatitude;
const coastSky=views.coast.querySelector('.coast-sky');
let coastSkyWidth=0,coastSkyHeight=0;
let coastArcTables=[];
function coastHorizonAt(x){
  const points=[[0,100],[50,100],[60,94],[70,86],[80,78],[90,70],[100,60]];
  for(let i=1;i<points.length;i++){
    const [x1,y1]=points[i-1],[x2,y2]=points[i];
    if(x<=x2)return y1+(y2-y1)*(x-x1)/(x2-x1);
  }
  return points[points.length-1][1];
}
function coastOrbitPosition(phase){
  const hourAngle=(phase-.5)*Math.PI;
  const altitude=Math.asin(Math.cos(coastLatitude)*Math.cos(hourAngle));
  let azimuth=Math.atan2(-Math.sin(hourAngle),-Math.sin(coastLatitude)*Math.cos(hourAngle));
  if(azimuth<0)azimuth+=2*Math.PI;
  const x=12+76*(azimuth-Math.PI/2)/Math.PI;
  // 方位角與高度角映射至面南的示意全景，局部地平線配合圖片地景。
  const y=coastHorizonAt(x)-76*altitude/coastMaxAltitude;
  return{x,y,altitude,azimuth};
}
function buildCoastArcTable(segment,width,height){
  const steps=720,points=[];let length=0,previous=null;
  for(let i=0;i<=steps;i++){
    const progress=i/steps,position=coastOrbitPosition(segment+progress);
    if(previous){
      const dx=(position.x-previous.x)*width/100,dy=(position.y-previous.y)*height/100;
      // 面南視野之外的方位角接縫在地平線下，略過全景左右邊界的投影跳接。
      if(Math.abs(position.x-previous.x)<50)length+=Math.hypot(dx,dy);
    }
    points.push({progress,length});previous=position;
  }
  return{points,length};
}
function measureCoastSky(){
  const rect=coastSky.getBoundingClientRect();
  if(Math.abs(rect.width-coastSkyWidth)<.1&&Math.abs(rect.height-coastSkyHeight)<.1)return;
  coastSkyWidth=rect.width;coastSkyHeight=rect.height;
  coastArcTables=coastSkyWidth&&coastSkyHeight?[0,1].map(segment=>buildCoastArcTable(segment,coastSkyWidth,coastSkyHeight)):[];
}
if('ResizeObserver' in window)new ResizeObserver(measureCoastSky).observe(coastSky);
else window.addEventListener('resize',measureCoastSky,{passive:true});
function coastArcPhase(cycleTime){
  const time=((cycleTime%1)+1)%1,segment=time<.5?0:1;
  const progress=time<.5?time*2:(time-.5)*2,table=coastArcTables[segment];
  if(!table||!table.length)return segment+progress;
  const target=progress*table.length;let low=0,high=table.points.length-1;
  while(low+1<high){const middle=(low+high)>>1;if(table.points[middle].length<target)low=middle;else high=middle;}
  const before=table.points[low],after=table.points[high],span=after.length-before.length;
  const fraction=span?(target-before.length)/span:0;
  return segment+before.progress+(after.progress-before.progress)*fraction;
}
function renderCoastBody(element,cycleTime){
  // 依畫面投影弧長前進，讓可見弧段每秒移動相同距離；地景遮住地平線下的路徑。
  if(!coastSkyWidth||!coastSkyHeight)measureCoastSky();
  const {x,y,altitude,azimuth}=coastOrbitPosition(coastArcPhase(cycleTime));
  element.style.setProperty('--coast-x',`${coastSkyWidth*x/100}px`);
  element.style.setProperty('--coast-y',`${coastSkyHeight*y/100}px`);
  element.dataset.x=x.toFixed(2);element.dataset.y=y.toFixed(2);
  element.dataset.altitude=(altitude*180/Math.PI).toFixed(2);
  element.dataset.azimuth=(azimuth*180/Math.PI).toFixed(2);
  element.style.visibility='visible';
}
function renderCoastCycle(){
  const t=(coastElapsed%coastCycleDuration)/coastCycleDuration;
  const change=(1-Math.cos(2*Math.PI*t))/2;
  const day=t<.5;
  const nextMode=day?'day':'night';
  if(mode!==nextMode){
    mode=nextMode;views.coast.dataset.mode=mode;
    if(current==='coast')get('application-question').textContent=coastQuestion();
    views.coast.querySelector('.coast-scene-label').textContent=day?'白天吸熱':'夜晚放熱';
    get('coast-cycle-status').textContent=day?'☀ 白天吸熱・溫度上升':'☾ 夜晚放熱・溫度下降';
  }
  // 以太陽高度連續調整天光，週期接合處的亮度也保持一致。
  const altitude=Math.sin(2*Math.PI*t);
  const lightProgress=Math.max(0,Math.min(1,(altitude+.4)/1.3));
  const daylightMix=lightProgress*lightProgress*(3-2*lightProgress);
  get('coast-night-photo').style.opacity=(1-daylightMix).toFixed(3);
  get('coast-twilight').style.opacity=(Math.max(0,1-Math.abs(altitude)/.55)*.7).toFixed(3);
  const darknessProgress=Math.max(0,Math.min(1,(-altitude-.05)/.55));
  get('coast-night-dark').style.opacity=(darknessProgress*darknessProgress*(3-2*darknessProgress)).toFixed(3);
  renderCoastBody(get('coast-sun'),t);
  renderCoastBody(get('coast-moon'),t+.5);
  get('coast-water-level').style.height=`${(change*25).toFixed(2)}%`;
  get('coast-sand-level').style.height=`${(change*75).toFixed(2)}%`;
}
function coastTick(now){
  coastFrame=0;
  if(current!=='coast'||!coastInView||document.hidden||assets.coast.phase!=='ready'){coastLastTime=null;return;}
  if(coastLastTime!==null)coastElapsed=(coastElapsed+Math.max(0,now-coastLastTime))%coastCycleDuration;
  coastLastTime=now;renderCoastCycle();coastFrame=requestAnimationFrame(coastTick);
}
function syncCoastCycle(){
  const running=current==='coast'&&coastInView&&!document.hidden&&assets.coast.phase==='ready';
  if(running&&!coastFrame)coastFrame=requestAnimationFrame(coastTick);
  if(!running){if(coastFrame)cancelAnimationFrame(coastFrame);coastFrame=0;coastLastTime=null;}
}
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{coastInView=entries[0].isIntersecting;syncCoastCycle();},{threshold:.01}).observe(views.coast);
document.addEventListener('visibilitychange',syncCoastCycle);
renderCoastCycle();

const coolantCircuit=get('coolant-circuit-path');
const coolantPackets=get('coolant-flow-packets');
const coolantFluidDefs=get('coolant-fluid-defs');
const coolantMotionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let coolantInView=!('IntersectionObserver' in window),coolantFrame=0,coolantLastTime=null,coolantDistance=0;
const coolantLength=coolantCircuit.getTotalLength();
const coolantPacketElements=Array.from({length:12},(_,index)=>{
  const group=document.createElementNS('http://www.w3.org/2000/svg','g');
  const body=document.createElementNS('http://www.w3.org/2000/svg','rect');
  const shine=document.createElementNS('http://www.w3.org/2000/svg','rect');
  const gradient=document.createElementNS('http://www.w3.org/2000/svg','linearGradient');
  const start=document.createElementNS('http://www.w3.org/2000/svg','stop'),end=document.createElementNS('http://www.w3.org/2000/svg','stop');
  gradient.id=`coolant-packet-gradient-${index}`;gradient.setAttribute('gradientUnits','userSpaceOnUse');gradient.setAttribute('x1','-14');gradient.setAttribute('y1','0');gradient.setAttribute('x2','14');gradient.setAttribute('y2','0');
  start.setAttribute('offset','0');end.setAttribute('offset','1');gradient.append(start,end);coolantFluidDefs.append(gradient);
  body.setAttribute('fill',`url(#${gradient.id})`);
  body.setAttribute('x','-14');body.setAttribute('y','-9');body.setAttribute('width','28');body.setAttribute('height','18');body.setAttribute('rx','9');body.setAttribute('stroke','#fff');body.setAttribute('stroke-width','1.4');
  shine.setAttribute('x','-9');shine.setAttribute('y','-4');shine.setAttribute('width','16');shine.setAttribute('height','2');shine.setAttribute('rx','1');shine.setAttribute('fill','#ffffff');shine.setAttribute('opacity','.75');
  group.append(body,shine);group.classList.add('coolant-packet');coolantPackets.append(group);return {group,start,end};
});
const clamp01=n=>Math.max(0,Math.min(1,n));
function coolantWarmth(point){
  // 顏色變化僅出現在設備的上下邊界之間；管路出口保持相應冷暖色。
  return clamp01((179-point.y)/100);
}
function coolantColor(warmth){
  return `rgb(${[[18,255],[132,165],[192,20]].map(([cool,warm])=>Math.round(cool+(warm-cool)*warmth)).join(',')})`;
}
function renderCoolantFlow(){
  coolantPacketElements.forEach(({group,start,end},index)=>{
    const distance=(coolantDistance+index*coolantLength/coolantPacketElements.length)%coolantLength;
    const point=coolantCircuit.getPointAtLength(distance),next=coolantCircuit.getPointAtLength((distance+1)%coolantLength);
    const behind=coolantCircuit.getPointAtLength((distance-14+coolantLength)%coolantLength),ahead=coolantCircuit.getPointAtLength((distance+14)%coolantLength);
    const angle=Math.atan2(next.y-point.y,next.x-point.x)*180/Math.PI, warmth=coolantWarmth(point);
    group.setAttribute('transform',`translate(${point.x.toFixed(2)} ${point.y.toFixed(2)}) rotate(${angle.toFixed(1)})`);
    group.dataset.warmth=warmth.toFixed(3);group.dataset.x=point.x.toFixed(2);group.dataset.y=point.y.toFixed(2);
    group.dataset.color=coolantColor(warmth);group.dataset.distance=distance.toFixed(3);
    start.setAttribute('stop-color',coolantColor(coolantWarmth(behind)));
    end.setAttribute('stop-color',coolantColor(coolantWarmth(ahead)));
  });
}
function coolantTick(now){
  coolantFrame=0;
  if(current!=='coolant'||!coolantInView||document.hidden){coolantLastTime=null;return;}
  if(coolantLastTime!==null)coolantDistance=(coolantDistance+Math.min(now-coolantLastTime,100)*(coolantMotionPreference.matches?.035:.06))%coolantLength;
  coolantLastTime=now;renderCoolantFlow();coolantFrame=requestAnimationFrame(coolantTick);
}
function syncCoolantFlow(){
  const running=current==='coolant'&&coolantInView&&!document.hidden;
  if(running&&!coolantFrame)coolantFrame=requestAnimationFrame(coolantTick);
  if(!running){if(coolantFrame)cancelAnimationFrame(coolantFrame);coolantFrame=0;coolantLastTime=null;}
}
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{coolantInView=entries[0].isIntersecting;syncCoolantFlow();},{threshold:.01}).observe(get('coolant-circuit-path'));
document.addEventListener('visibilitychange',syncCoolantFlow);
renderCoolantFlow();

root.querySelectorAll('.life-tabs [data-application]').forEach(b=>b.addEventListener('click',()=>selectApplication(b.dataset.application)));
root.querySelectorAll('[data-chestnut-mode]').forEach(b=>b.addEventListener('click',()=>selectChestnutMode(b.dataset.chestnutMode)));
contactRetry.addEventListener('click',()=>loadContact(true));
Object.entries(views).forEach(([key,view])=>view.querySelector('[data-life-retry]').addEventListener('click',()=>loadAsset(key,true)));

loadAsset('chestnut');
loadContact();
