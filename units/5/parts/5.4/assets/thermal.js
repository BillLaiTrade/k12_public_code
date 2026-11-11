import {HEAT,heating,PHASES,waterVolume,waterDensity,gasVolume,thermometer,REACTIONS,QUIZ,grade} from './thermal-model.mjs';
import {HEATING_STEPS,heatingStep,observedHeatChart,observedMeltingChart,observedHeatScene,heatObservation} from './heating-observation.mjs?v=thermo-sync-20261109';
import {COMPARISON,phaseComparison,comparisonScene,extensionScene} from './phase-comparison.mjs?v=finite-baths-20261107';
import {liquidVolumeArt,gasVolumeArt} from './volume-art.mjs?v=thermo-sync-20261109';
const $=id=>document.getElementById(id),write=(id,s)=>$(id).textContent=s;
const pressed=(selector,value,key)=>document.querySelectorAll(selector).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===String(value))));
// Each animated experiment owns its state. Interruptions preserve data but never auto-resume.
const animations=new Map();
function stop(id){const a=animations.get(id);if(a){cancelAnimationFrame(a.frame);animations.delete(id);a.end(false);}}
function run(id,duration,step,end){
 stop(id);const start=performance.now();const a={frame:0,end};animations.set(id,a);
 const frame=now=>{if(!animations.has(id))return;const p=Math.min(1,(now-start)/duration);step(p);if(p<1)a.frame=requestAnimationFrame(frame);else{animations.delete(id);end(true);}};a.frame=requestAnimationFrame(frame);
}
let energy=0,heatApparatus=null,fullHeatChart=false;
function renderHeat(){
 const state=heating(energy),playing=animations.has('heat-lab'),step=heatingStep(energy),complete=energy>=HEATING_STEPS[2].end;
 const observation=heatObservation(energy,playing);
 $('heat-fallback').innerHTML=observedHeatScene(energy,playing);
 const ice=state.ice.toFixed(0);write('heat-ice-label','目前 '+ice+' g');
 $('heat-ice-bar').style.width=state.ice/50*100+'%';$('heat-ice-bar').parentElement.setAttribute('aria-label',`目前冰量約${ice}克，起初50克`);
 $('heat-reference').hidden=energy<HEATING_STEPS[1].end;
 if(heatApparatus)heatApparatus.update(state,playing,energy);
 const canZoom=energy<=HEAT.melt,zoom=canZoom&&!fullHeatChart;
 $('heat-chart').innerHTML=zoom?observedMeltingChart(energy):observedHeatChart(energy);
 write('heat-chart-title',zoom?'融冰階段・局部放大':'完整加熱曲線');
 $('heat-chart-toggle').hidden=!canZoom;$('heat-chart-toggle').setAttribute('aria-pressed',String(fullHeatChart));
 write('heat-chart-toggle',zoom?'查看完整加熱曲線':'返回融冰局部圖');
 write('heat-chart-note',zoom?'此處放大融冰階段；完整圖維持固定尺度。':'只記錄已觀察的過程；橙色為最新線段。');
 write('heat-energy',Math.round(energy/4.18).toLocaleString('en-US')+' cal');$('heat-transfer').hidden=!playing;
 write('heat-water','約 '+state.water.toFixed(0)+' g');
 write('heat-temp',state.temperature.toFixed(1)+'°C');
 $('heat-scene').setAttribute('aria-label',`冰水加熱器材；樣品溫度${state.temperature.toFixed(1)}攝氏度；${observation.caption}`);
 Object.assign($('heat-lab').dataset,{phase:energy===0?'準備觀察':state.phase,energy:String(energy),playing:String(playing),complete:String(complete)});
 for(let i=0;i<3;i++){
  const el=$('heat-step-'+i),done=energy>=HEATING_STEPS[i].end;
  el.querySelector('button').disabled=energy<=(i?HEATING_STEPS[i-1].end:0);
  el.dataset.done=String(done);if(i===step&&!complete)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
  const start=i?HEATING_STEPS[i-1].end:0;
  el.querySelector('small').textContent=done?'已完成・點選重看':i===step?(playing?'觀察中':energy===start?(i?'待開始':'待觀察'):'已暫停'):'尚未觀察';
  el.querySelector('.heat-step-number').textContent=done?'✓':String(i+1);
 }
 write('heat-caption',observation.caption);
 if($('heat-note').textContent!==observation.note)write('heat-note',observation.note);
 $('heat-discovery').hidden=!observation.discovery;write('heat-discovery-text',observation.discovery);
 $('heat-play').querySelector('[aria-hidden]').textContent=playing?'Ⅱ':'▶';
 write('heat-play-label',playing?'暫停加熱':complete?'觀察完成':energy>0?'繼續加熱':'開始加熱');$('heat-play').disabled=complete;
}
$('heat-play').onclick=()=>{
 if(animations.has('heat-lab')){stop('heat-lab');return;}
 const initial=energy,index=heatingStep(energy),target=HEATING_STEPS[index],start=index?HEATING_STEPS[index-1].end:0;
 if(initial>=HEATING_STEPS[2].end)return;
 run('heat-lab',target.duration*(target.end-initial)/(target.end-start),p=>{energy=p===1?target.end:initial+(target.end-initial)*p;renderHeat();},renderHeat);renderHeat();
};
HEATING_STEPS.forEach((_,i)=>{ $('heat-step-'+i).querySelector('button').onclick=()=>{stop('heat-lab');energy=i?HEATING_STEPS[i-1].end:0;fullHeatChart=false;renderHeat();}; });
$('heat-reset').onclick=()=>{stop('heat-lab');energy=0;fullHeatChart=false;renderHeat();};
$('heat-chart-toggle').onclick=()=>{fullHeatChart=!fullHeatChart;renderHeat();};
// Photo textures and dynamic state are optional; image failure preserves SVG.
import('./photo-apparatus.mjs?v=readable-labels-20261109').then(({createPhotoHeating})=>{try{heatApparatus=createPhotoHeating($('heat-scene'));renderHeat();}catch{ $('heat-scene').classList.remove('has-photo'); }}).catch(()=>{});
let bathMode='warm';
const bathProgress={warm:0,cold:0},comparisonApparatus={};
function bathChart(key,progress){
 const x=p=>60+320*p,y=t=>205-(t+15)*3,initial=phaseComparison(0)[key].bathTemperature,current=phaseComparison(progress)[key].bathTemperature;
 const count=Math.max(1,Math.ceil(progress*40)),points=Array.from({length:count+1},(_,i)=>{const p=progress*i/count;return `${x(p).toFixed(1)},${y(phaseComparison(p)[key].bathTemperature).toFixed(1)}`;}).join(' ');
 const ticks=[-10,0,20,40].map(t=>`<line x1="60" y1="${y(t)}" x2="380" y2="${y(t)}" stroke="#dde7db"/><text x="50" y="${y(t)+5}" text-anchor="end">${t}</text>`).join('');
 return `<svg viewBox="0 0 420 250" aria-hidden="true"><text x="10" y="18">溫度（°C）</text>${ticks}<path d="M60 20V205H380" fill="none" stroke="#788b79" stroke-width="1.5"/><polyline points="${points}" fill="none" stroke="${key==='warm'?'#b75b22':'#28718b'}" stroke-width="4" stroke-linecap="round"/><line x1="60" y1="${y(0)}" x2="${x(progress)}" y2="${y(0)}" stroke="#397447" stroke-width="4"/><circle cx="60" cy="${y(initial)}" r="4.5" fill="${key==='warm'?'#b75b22':'#28718b'}"/><circle cx="${x(progress)}" cy="${y(current)}" r="4.5" fill="${key==='warm'?'#b75b22':'#28718b'}"/><circle cx="${x(progress)}" cy="${y(0)}" r="4.5" fill="#397447"/><text x="60" y="225">起點</text><text x="380" y="225" text-anchor="end">觀察進度</text></svg>`;
}
function renderComparison(){
 const progress=bathProgress[bathMode],playing=animations.has('comparison-lab'),state=phaseComparison(progress)[bathMode];
 Object.assign($('comparison-lab').dataset,{progress:String(progress),playing:String(playing),mode:bathMode});
 for(const key of ['warm','cold']){
  const current=phaseComparison(bathProgress[key])[key];$('comparison-'+key+'-panel').hidden=key!==bathMode;
  $('comparison-'+key+'-fallback').innerHTML=comparisonScene(key,current,false);
  if(comparisonApparatus[key])comparisonApparatus[key].update(current);
  $('comparison-'+key+'-scene').setAttribute('aria-label',`杯內冰水約0攝氏度，${key==='warm'?'暖水浴':'預冷鹽水'}目前${current.bathTemperature.toFixed(1)}攝氏度，冰量約${current.ice.toFixed(0)}克`);
 }
 pressed('[data-bath]',bathMode,'bath');
 $('comparison-chart').innerHTML=bathChart(bathMode,progress);
 $('comparison-chart').setAttribute('aria-label',`${bathMode==='warm'?'暖水':'鹽水'}起初${bathMode==='warm'?'40':'負10'}攝氏度，目前${state.bathTemperature.toFixed(1)}攝氏度；杯內冰水維持約0攝氏度。曲線只顯示已觀察的過程。`);
 write('comparison-bath-start',bathMode==='warm'?'40.0°C':'-10.0°C');write('comparison-bath',state.bathTemperature.toFixed(1)+'°C');write('comparison-ice-value',state.ice.toFixed(0)+' g');
 $('comparison-play').querySelector('[aria-hidden]').textContent=playing?'Ⅱ':'▶';$('comparison-play').disabled=!playing&&progress>=1;
 write('comparison-play-label',playing?'暫停觀察':progress>=1?'觀察完成':progress>0?'繼續觀察':'開始觀察');
 const note=playing?'觀察外浴溫度與杯內冰量如何改變，也可以隨時暫停。':progress===0?'按「開始觀察」，或切換另一種外浴。':progress>=1?'觀察完成；可切換另一種外浴，或回到起點重看。':'觀察已暫停；切換外浴時會保留各自的觀察進度。';
 if($('comparison-note').textContent!==note)write('comparison-note',note);
}
for(const b of document.querySelectorAll('[data-bath]'))b.onclick=()=>{stop('comparison-lab');bathMode=b.dataset.bath;renderComparison();};
$('comparison-play').onclick=()=>{
 if(animations.has('comparison-lab')){stop('comparison-lab');return;}
 const key=bathMode,initial=bathProgress[key];if(initial>=1)return;
 run('comparison-lab',COMPARISON.duration*(1-initial),p=>{bathProgress[key]=initial+(1-initial)*p;renderComparison();},renderComparison);renderComparison();
};
$('comparison-reset').onclick=()=>{stop('comparison-lab');bathProgress[bathMode]=0;renderComparison();};
import('./photo-apparatus.mjs?v=readable-labels-20261109').then(({createPhotoBath})=>{for(const key of ['warm','cold'])try{comparisonApparatus[key]=createPhotoBath($('comparison-'+key+'-scene'),key);}catch{ $('comparison-'+key+'-scene').classList.remove('has-photo'); }renderComparison();}).catch(()=>{});
let mode='evaporate',phaseProgress=0;
function renderPhase(){const s=PHASES[mode];$('phase-scene').innerHTML=extensionScene(mode,phaseProgress);write('phase-sample',s.sample);write('phase-condition',s.environment);write('phase-before',s.before);write('phase-after',s.after);write('phase-temp',s.temperature);pressed('[data-phase]',mode,'phase');write('phase-play',animations.has('phase-lab')?'停止觀察':phaseProgress>=1?'再次觀察':phaseProgress>0?'繼續觀察':'開始觀察');write('phase-note',phaseProgress>0?s.explanation:'準備觀察'+s.name+'；先認清研究對象，再看能量方向。');$('phase-lab').dataset.mode=mode;}
for(const b of document.querySelectorAll('[data-phase]'))b.onclick=()=>{stop('phase-lab');mode=b.dataset.phase;phaseProgress=0;renderPhase();};
$('phase-play').onclick=()=>{if(animations.has('phase-lab')){stop('phase-lab');return;}if(phaseProgress>=1)phaseProgress=0;const initial=phaseProgress;run('phase-lab',5000*(1-initial),p=>{phaseProgress=initial+(1-initial)*p;renderPhase();},renderPhase);renderPhase();};
$('phase-reset').onclick=()=>{stop('phase-lab');phaseProgress=0;renderPhase();};
import('./solid-workbench.mjs?v=thermo-sync-20261109').then(({initSolidWorkbench})=>initSolidWorkbench());
let thermoTemp=20;
const volumeTemps={liquid:20,gas:20},volumeTargets={liquid:20,gas:20};
function renderVolume(key){
 const temp=volumeTemps[key],running=animations.has('expand-'+key),isLiquid=key==='liquid',value=isLiquid?waterVolume(temp):gasVolume(temp);
 $('volume-'+(isLiquid?'water':'gas')+'-art').innerHTML=isLiquid?liquidVolumeArt(temp,volumeTargets[key]):gasVolumeArt(temp,volumeTargets[key]);
 document.querySelector('#expand-'+key+' .volume-scene').setAttribute('aria-label',isLiquid?`固定100克水，樣品${temp.toFixed(1)}攝氏度；細管液面與20度起點比較，變化放大示意。`:`固定量空氣，樣品${temp.toFixed(1)}攝氏度，體積約${value.toFixed(2)}毫升；活塞可移動、外壓近似不變。`);
write('volume-'+key+'-bath-label',volumeTargets[key].toFixed(1)+'°C');write('volume-'+key+'-temp',temp.toFixed(1)+'°C');write('volume-'+key+'-value',value.toFixed(2)+' mL');
 $('expand-'+key).dataset.temperature=temp.toFixed(3);$('expand-'+key).dataset.running=String(running);
 for(const b of document.querySelectorAll('[data-volume-'+key+']'))b.setAttribute('aria-pressed',String(Number(b.dataset[isLiquid?'volumeLiquid':'volumeGas'])===volumeTargets[key]));
 const note=running?'樣品正在接近水浴溫度，留意與起初標記的差異。':Math.abs(temp-volumeTargets[key])>.05?'調溫已暫停，可再次點選溫度繼續。':isLiquid?(temp>20?'液面高於起初；水與玻璃都會膨脹。':'比較細管液面與起初標記。'):(temp>20?'活塞比起初向外移動，空氣量維持不變。':'比較活塞與起初標記。');
 write('volume-'+key+'-note',note);
}
function renderExpand(){for(const key of ['liquid','gas'])renderVolume(key);for(const t of [0,4,20])write('volume-ex-'+t,waterVolume(t).toFixed(2)+' mL');}
for(const key of ['liquid','gas'])for(const b of document.querySelectorAll('[data-volume-'+key+']'))b.onclick=()=>{
 const id='expand-'+key,target=Number(b.dataset[key==='liquid'?'volumeLiquid':'volumeGas']);stop(id);volumeTargets[key]=target;const start=volumeTemps[key];
 if(Math.abs(target-start)<.001){volumeTemps[key]=target;renderVolume(key);return;}
 run(id,2200*Math.abs(target-start)/40,p=>{volumeTemps[key]=p===1?target:start+(target-start)*p;renderVolume(key);},()=>renderVolume(key));renderVolume(key);
};
function thermoWallArt(temp){
 // Keep the glass wall thin relative to the bottle radius. Exaggerate only
 // the displacement, with the same visual scale for both boundaries.
 const progress=(temp-20)/60, magnified=Math.sign(progress)*Math.sqrt(Math.abs(progress)),baseInner=185,baseOuter=193,inner=baseInner+16*magnified,outer=baseOuter+(16*baseOuter/baseInner)*magnified;
 const changed=Math.abs(temp-20)>.05,shrinking=temp<20,lo=Math.min(baseInner,inner),hi=Math.max(baseInner,inner),verb=shrinking?'縮小':'增加';
 const curve=x=>`M${x.toFixed(3)} 35 Q${(x+30).toFixed(3)} 165 ${x.toFixed(3)} 295`;
 const water=`M8 35 H${inner.toFixed(3)} Q${(inner+30).toFixed(3)} 165 ${inner.toFixed(3)} 295 H8 Z`;
 const glass=`M${inner.toFixed(3)} 35 Q${(inner+30).toFixed(3)} 165 ${inner.toFixed(3)} 295 H${outer.toFixed(3)} Q${(outer+30).toFixed(3)} 165 ${outer.toFixed(3)} 35 Z`;
 const arrows=changed?`<path d="M${(baseInner+4).toFixed(3)} 135 H${(inner+4).toFixed(3)}" stroke="#1f7145" stroke-width="3" marker-end="url(#thermo-wall-arrow)"/><path d="M${(baseOuter+4).toFixed(3)} 195 H${(outer+4).toFixed(3)}" stroke="#1f7145" stroke-width="3" marker-end="url(#thermo-wall-arrow)"/><path class="thermo-capacity-bracket" d="M${lo.toFixed(3)} 20 V30 M${hi.toFixed(3)} 20 V30 M${lo.toFixed(3)} 21 H${hi.toFixed(3)}" fill="none" stroke="#285e3d" stroke-width="2"/>`:'';
 return `<svg class="thermo-wall-diagram" viewBox="0 0 360 320" role="img" aria-label="瓶身右側薄玻璃壁的剖面。虛線為20攝氏度的內外壁，實線為目前${temp.toFixed(1)}攝氏度的位置；瓶內空間${changed?verb:'與起初相同'}；相對20攝氏度，${changed?'外壁位移幅度稍大於內壁；':''}位置差異放大。" data-progress="${progress.toFixed(3)}" data-inner="${inner.toFixed(3)}" data-outer="${outer.toFixed(3)}" data-base-inner="${baseInner}" data-base-outer="${baseOuter}">
 <defs>
  <marker id="thermo-wall-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#1f7145"/></marker>
  <clipPath id="thermo-water-clip"><path d="${water}"/></clipPath>
  <clipPath id="thermo-wall-background-clip"><rect x="8" y="35" width="344" height="260" rx="5"/></clipPath><filter id="thermo-wall-background-blur"><feGaussianBlur stdDeviation="3"/></filter>
  <linearGradient id="thermo-wall-background" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#e7e9df"/><stop offset=".55" stop-color="#c8cbc2"/><stop offset="1" stop-color="#eee9dd"/></linearGradient>
  <linearGradient id="thermo-wall-liquid" x1="0" x2="1"><stop stop-color="#48c3e7"/><stop offset=".82" stop-color="#24b1dd"/><stop offset="1" stop-color="#1594c4"/></linearGradient>
  <radialGradient id="thermo-water-light" cx="35%" cy="68%" r="70%"><stop stop-color="#b7f5ff" stop-opacity=".40"/><stop offset=".56" stop-color="#40d4f0" stop-opacity=".08"/><stop offset="1" stop-color="#006b9d" stop-opacity=".20"/></radialGradient>
  <linearGradient id="thermo-wall-glass" x1="0" x2="1"><stop stop-color="#ddf7f7" stop-opacity=".70"/><stop offset=".18" stop-color="#fff" stop-opacity=".95"/><stop offset=".32" stop-color="#8db2b3" stop-opacity=".72"/><stop offset=".57" stop-color="#e7f5f2" stop-opacity=".76"/><stop offset=".78" stop-color="#fff" stop-opacity=".96"/><stop offset="1" stop-color="#839e9d" stop-opacity=".72"/></linearGradient>
 </defs>
 <rect x="8" y="35" width="344" height="260" rx="5" fill="url(#thermo-wall-background)"/><g clip-path="url(#thermo-wall-background-clip)"><image href="assets/thermo-scene-left.webp" x="-336" y="-30" width="688" height="459" filter="url(#thermo-wall-background-blur)" opacity=".45"/><rect x="8" y="35" width="344" height="260" fill="#fffdf5" opacity=".20"/></g>
 <path class="thermo-wall-water" d="${water}" fill="url(#thermo-wall-liquid)"/><image href="assets/thermo-scene-left.webp" x="-630" y="-1135" width="2765" height="1843" preserveAspectRatio="none" clip-path="url(#thermo-water-clip)"/><path d="${water}" fill="url(#thermo-water-light)" opacity=".28"/><path class="thermo-glass-band" d="${glass}" fill="url(#thermo-wall-glass)"/>
 <path d="${curve(baseInner)} ${curve(baseOuter)}" fill="none" stroke="#7d8784" stroke-width="2.2" stroke-dasharray="6 4"/>
 <path class="thermo-inner-current" d="${curve(inner)}" fill="none" stroke="#216c41" stroke-width="2.3"/><path class="thermo-outer-current" d="${curve(outer)}" fill="none" stroke="#216c41" stroke-width="2.3"/>
 ${arrows}<path d="M${(outer+11).toFixed(3)} 95 L${(outer+33).toFixed(3)} 69 H${(outer+43).toFixed(3)}" fill="none" stroke="#174e2e" stroke-width="2"/><text x="${(outer+47).toFixed(3)}" y="75" font-size="16" font-weight="700" fill="#174e2e" paint-order="stroke" stroke="#f8faf1" stroke-width="4">玻璃壁</text>
 </svg><span class="wall-region wall-bottle" style="left:${((8+inner)/720*100).toFixed(2)}%" aria-hidden="true">瓶內（水）</span><span class="wall-region wall-outside" style="left:${((outer+360)/720*100).toFixed(2)}%" aria-hidden="true">瓶外</span>${changed?`<span class="thermo-capacity-label" aria-hidden="true">瓶內空間${verb}</span>`:'<span class="thermo-capacity-label thermo-overlap-label" aria-hidden="true">目前與起初位置重合</span>'}`;
}
function renderThermo(){
 const s=thermometer(thermoTemp),delta=thermoTemp-20,progress=delta/60,shownTemp=thermoTemp.toFixed(1),changed=Math.abs(delta)>.05,shrinking=delta<0;
 const waterCents=Math.round(Math.abs(s.water)*100),glassCents=Math.round(Math.abs(s.glass)*100),extraCents=waterCents-glassCents;
 const photo=$('thermo-photo');$('thermo-lab').dataset.temperature=thermoTemp.toFixed(3);photo.dataset.photoProgress=progress.toFixed(3);
 const level=310-s.extra*75,labelLevel=Math.max(60,level-150);
 $('thermo-art').innerHTML=`<svg viewBox="0 0 1536 1024" data-level="${level.toFixed(3)}" aria-hidden="true"><defs><linearGradient id="thermo-fluid"><stop stop-color="#009ed0"/><stop offset="1" stop-color="#009ed0"/></linearGradient></defs><path d="M445 ${level}H470V500H445Z" fill="url(#thermo-fluid)"/><path d="M445 ${level} Q457.5 ${level+7} 470 ${level}" fill="none" stroke="#d2f4ff" stroke-width="4"/><path d="M470 ${level}H500L535 ${labelLevel}" fill="none" stroke="#174b28" stroke-width="5"/><path d="M470 310H535" fill="none" stroke="#fff" stroke-width="9"/><path d="M470 310H535" fill="none" stroke="#333" stroke-width="4" stroke-dasharray="12 8"/></svg>`;
 photo.style.setProperty('--thermo-level',`${(labelLevel/1024*100).toFixed(3)}%`);
 photo.setAttribute('aria-label',`固定100克水，${shownTemp}°C熱平衡狀態；細管液面與20°C起初位置比較，變化放大。`);
 const range=$('thermo-range');range.value=shownTemp;range.setAttribute('aria-valuetext',`${shownTemp}°C`);$('thermo-minus').disabled=thermoTemp<=5;$('thermo-plus').disabled=thermoTemp>=80;
 write('thermo-control-value',`${shownTemp}°C`);write('thermo-current-liquid',`目前液面 ${shownTemp}°C`);write('thermo-photo-tag',`${shownTemp}°C・熱平衡`);
 $('thermo-wall-art').innerHTML=thermoWallArt(thermoTemp);write('thermo-wall-current',`${shownTemp}°C`);
 const waterVerb=changed?(shrinking?'水體積減少':'水體積增加'):'水體積變化',glassVerb=changed?(shrinking?'瓶內容量減少':'瓶內容量增加'):'瓶內容量變化',extraVerb=changed?(shrinking?'細管水量減少':'進入細管'):'細管水量變化';
 write('thermo-water-label',waterVerb);write('thermo-glass-label',glassVerb);write('thermo-extra-label',extraVerb);
 write('thermo-water',`約 ${(waterCents/100).toFixed(2)} mL`);write('thermo-glass',`約 ${(glassCents/100).toFixed(2)} mL`);write('thermo-extra',`約 ${(extraCents/100).toFixed(2)} mL`);
 write('thermo-note',!changed?'20°C 起點：液面與玻璃壁位置重合。':shrinking?'水收縮多於瓶內容量，液面下降。'+(thermoTemp<=7?'約 5～6°C 附近，液面可能微幅反向。':''):'水膨脹多於瓶內容量，液面上升。');
}
function setThermo(value){thermoTemp=Math.max(5,Math.min(80,Math.round(Number(value)*10)/10));renderThermo();}
$('thermo-range').addEventListener('input',e=>setThermo(e.target.value));
$('thermo-minus').onclick=()=>setThermo(thermoTemp-1);$('thermo-plus').onclick=()=>setThermo(thermoTemp+1);
let chemProgress=0;
const chemUnit=x=>Math.max(0,Math.min(1,x));
const chemEase=x=>{const t=chemUnit(x);return t*t*(3-2*t);};
const chemMix=(a,b,t)=>a+(b-a)*t;
const chemHydrationWater=[[280,235],[640,235],[280,330],[640,330],[450,430]];
const chemVaporWater=[[300,84],[375,60],[450,76],[525,60],[600,84]];
function crystalSulfate(x,y,rotate=0){return `<g transform="translate(${x} ${y}) rotate(${rotate})"><path class="chem-bond" d="M0 0L0 -29M0 0L26 0M0 0L0 29M0 0L-26 0"/><circle class="chem-s" r="12"/><circle class="chem-o" cx="0" cy="-29" r="8"/><circle class="chem-o" cx="26" r="8"/><circle class="chem-o" cx="0" cy="29" r="8"/><circle class="chem-o" cx="-26" r="8"/></g>`;}
function crystalWater(id,x,y){return `<g class="chem-water-particle" id="chem-water-${id}" transform="translate(${x} ${y})"><path class="chem-bond" d="M0 0L-15 -11M0 0L16 -10" stroke-width="3.5"/><circle class="chem-o" r="12"/><circle class="chem-h" cx="-15" cy="-11" r="7"/><circle class="chem-h" cx="16" cy="-10" r="7"/></g>`;}
function copperParticle(x,y){return `<circle class="chem-cu" cx="${x}" cy="${y}" r="20"/>`;}
function buildChemCrystalModel(){
 const svg=$('chem-crystal-model');
 const copperSites=[[195,120],[450,120],[705,120],[195,250],[450,250],[705,250],[195,380],[450,380],[705,380]];
 const sulfateSites=[[320,185],[575,185],[830,185],[320,315],[575,315],[830,315],[320,445],[575,445],[830,445]];
 const latticeBonds=sulfateSites.map(([sx,sy])=>copperSites.map(([cx,cy])=>({cx,cy,d:Math.hypot(cx-sx,cy-sy)})).filter(p=>p.d<165).map(({cx,cy})=>{const dx=cx-sx,dy=cy-sy,len=Math.hypot(dx,dy),ox=sx+dx/len*24,oy=sy+dy/len*20;return `<path class="chem-coordination" d="M${cx} ${cy}L${ox.toFixed(1)} ${oy.toFixed(1)}"/>`;}).join('')).join('');
 const copper=copperSites.map(([x,y])=>copperParticle(x,y)).join('');
 const sulfate=sulfateSites.map(([x,y],i)=>crystalSulfate(x,y,i%2?45:-45)).join('');
 const hydrate=`<g id="chem-hydrate-lattice">${latticeBonds}${sulfate}${copper}</g>`;
 const anhydrous=`<g id="chem-anhydrous-lattice" transform="translate(7 4) rotate(2 450 280)">${latticeBonds}${sulfateSites.map(([x,y],i)=>crystalSulfate(x,y,i%2?-45:45)).join('')}${copper}</g>`;
 const waters=chemHydrationWater.map(([x,y],i)=>crystalWater(i+1,x,y)).join('');
 svg.innerHTML=`<defs><linearGradient id="chem-model-wash" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffefa"/><stop offset="1" stop-color="#edf4eb"/></linearGradient><radialGradient id="chem-cu-shine" cx="30%" cy="26%"><stop stop-color="#8ad9ff"/><stop offset=".55" stop-color="#1688cf"/><stop offset="1" stop-color="#075b9e"/></radialGradient><radialGradient id="chem-s-shine" cx="28%" cy="24%"><stop stop-color="#fff19a"/><stop offset=".6" stop-color="#efba28"/><stop offset="1" stop-color="#c68a0d"/></radialGradient><radialGradient id="chem-o-shine" cx="30%" cy="25%"><stop stop-color="#ffb4a2"/><stop offset=".58" stop-color="#e94b3f"/><stop offset="1" stop-color="#b6272a"/></radialGradient></defs><rect x="0" y="0" width="900" height="580" rx="12" fill="url(#chem-model-wash)"/><text id="chem-model-phase-title" x="450" y="42" text-anchor="middle" class="chem-model-phase-title">含水硫酸銅晶體</text><g id="chem-model-single-lattice"><g id="chem-hydrate-lattice">${hydrate.slice(hydrate.indexOf('>')+1,hydrate.lastIndexOf('</g>'))}</g><g id="chem-anhydrous-lattice" transform="translate(7 4) rotate(2 450 280)" opacity="0">${latticeBonds}${sulfateSites.map(([x,y],i)=>crystalSulfate(x,y,i%2?-45:45)).join('')}${copper}</g></g><path id="chem-water-trail" class="chem-water-motion" d="M300 180Q370 105 450 150T600 120" opacity="0"/>${waters}<text id="chem-model-equation" x="450" y="525" text-anchor="middle" class="chem-model-equation">CuSO₄·5H₂O</text>`;
}
buildChemCrystalModel();
function renderChemCrystalModel(white){
 const svg=$('chem-crystal-model'),hydration=1-white,phase=white<.18?'hydrate':white<.82?'transition':'anhydrous';
 $('chem-hydrate-lattice').setAttribute('opacity',String(1-white));$('chem-anhydrous-lattice').setAttribute('opacity',String(white));
 $('chem-model-phase-title').textContent=phase==='hydrate'?'含水硫酸銅晶體':phase==='transition'?'結晶水逐漸離開':'無水硫酸銅・水蒸氣';
 $('chem-model-equation').textContent=phase==='hydrate'?'CuSO₄·5H₂O':phase==='transition'?'晶格中的水分子正在移動':'CuSO₄ ＋ 5H₂O';
 $('chem-water-trail').setAttribute('opacity',String(chemEase((white-.08)/.24)*(1-chemEase((white-.82)/.12))));
 chemHydrationWater.forEach(([sx,sy],i)=>{const [vx,vy]=chemVaporWater[i],p=chemEase(white),water=$('chem-water-'+(i+1));water.setAttribute('transform',`translate(${chemMix(sx,vx,p).toFixed(2)} ${chemMix(sy,vy,p).toFixed(2)})`);water.setAttribute('opacity','1');});
 svg.dataset.hydration=hydration.toFixed(3);svg.dataset.dehydration=white.toFixed(3);svg.dataset.hydrateLattice=(1-white).toFixed(3);svg.dataset.transitionLattice=chemEase(white*2)*(1-chemEase((white-.5)*2));svg.dataset.anhydrousLattice=white.toFixed(3);svg.dataset.activePhase=phase;
 svg.setAttribute('aria-label',`單一連續晶格示意：含水硫酸銅加熱時，結晶水逐漸離開同一晶格；加水時，水分子返回晶格。${phase==='hydrate'?'目前含水硫酸銅晶體含有結晶水。':phase==='transition'?'目前結晶水正離開晶格。':'目前晶格呈現無水硫酸銅，水分子在周圍。'}`);
}
function renderChem(){
 const lab=$('chem-lab'),playing=animations.has('chem-lab'),t=chemProgress*34;
 const heating=chemEase((t-7)/8),hydration=chemEase((t-25)/6),white=heating*(1-hydration);
 const entering=chemEase((t-2)/3),leaving=chemEase((t-16)/2);
 const burnerX=chemMix(1450,500,entering)+950*leaving;
 const pipetteIn=chemEase((t-19)/3),pipetteOut=chemEase((t-31)/2);
 const coverLift=chemEase((t-19)/2);
 const pipeX=chemMix(1450,633,pipetteIn)+817*pipetteOut,pipeY=chemMix(-80,110,pipetteIn)-190*pipetteOut;
 const flame=t>=5&&t<16?Math.min(1,(t-5)*2,(16-t)*2):0;
 const flicker=Math.sin(t*13)*7+Math.sin(t*21)*4;
 $('chem-burner').setAttribute('transform',`translate(${burnerX} 665)`);
 $('chem-open-scene').setAttribute('opacity',String(coverLift));$('chem-covered-scene').setAttribute('opacity',String(1-coverLift));
 const pipeTilt=2*chemEase((t-21.5)/1.5)-2*chemEase((t-24)/1.5);
 $('chem-pipette-object').setAttribute('transform',`translate(${pipeX} ${pipeY}) translate(87 271) rotate(${pipeTilt}) translate(-87 -271)`);
 $('chem-flame').setAttribute('opacity',String(flame));
 $('chem-flame').setAttribute('d',`M192 18 Q${160-flicker} -72 218 ${-165-flicker} Q${276+flicker} -75 240 18 Z`);
 const falling=t>=23&&t<24.4,fall=chemUnit((t-23)/1.4);
 $('chem-droplet').setAttribute('opacity',falling?'1':'0');$('chem-droplet').setAttribute('cy',String(385+fall*125));
 $('chem-condensation').setAttribute('opacity',String(chemEase((t-9)/5)*(1-chemEase((t-22)/3))));
 const radius=white*145;document.querySelectorAll('#chem-mask-spots circle').forEach((c,i)=>c.setAttribute('r',String(radius*chemUnit((white*2.1-i*.10)))));
 $('chem-mask-complete').setAttribute('opacity',String(chemEase((white-.86)/.14)));
 renderChemCrystalModel(white);
 const heatOut=chemEase((t-25)/1.5)*(1-chemEase((t-31)/2));
 $('chem-arrow-out').setAttribute('opacity',String(heatOut));
 lab.style.setProperty('--chem-out',heatOut);
 const stage=t<5?0:t<18?1:t<25?2:3;
 const notes=['藍色含水硫酸銅晶體。','加熱時水逐步離開晶體，脫水反應吸熱。','停止加熱，樣品冷卻後加入水。','水進入晶體形成含水硫酸銅，反應放熱。'];
 let modelTitle='含水硫酸銅',modelFormula='CuSO₄·5H₂O';
 if(t>=7&&t<18){modelTitle='吸熱脫水';modelFormula='水逐步離開晶體';}
 else if(t>=18&&t<25){modelTitle='無水硫酸銅＋水';modelFormula='CuSO₄ ＋ 5H₂O';}
 else if(t>=25&&t<32){modelTitle='放熱水合';modelFormula='水重新進入晶體';}
 lab.dataset.stage=String(stage);lab.dataset.progress=String(chemProgress);lab.dataset.playing=String(playing);
 lab.dataset.white=white.toFixed(3);lab.dataset.burnerX=burnerX.toFixed(1);lab.dataset.pipeX=pipeX.toFixed(1);
 write('chem-stage-title',modelTitle);write('chem-material','晶體局部結構示意，非依比例。');write('chem-equation',modelFormula);
 $('chem-progress-fill').style.width=(chemProgress*100)+'%';$('chem-progress').setAttribute('aria-valuenow',String(Math.round(chemProgress*100)));
 write('chem-progress-label',chemProgress>=1?'觀察完成・脫水與水合':`觀察階段 ${stage+1}／4・${modelTitle}`);write('chem-note',notes[stage]);
 write('chem-play',playing?'暫停觀察':chemProgress>=1?'再次觀察':chemProgress>0?'繼續觀察':'開始觀察');
}
$('chem-play').onclick=()=>{if(animations.has('chem-lab')){stop('chem-lab');return;}if(chemProgress>=1)chemProgress=0;const initial=chemProgress;run('chem-lab',34000*(1-initial),p=>{chemProgress=initial+(1-initial)*p;renderChem();},renderChem);renderChem();};
$('chem-reset').onclick=()=>{stop('chem-lab');chemProgress=0;renderChem();};
// One end-of-lesson assessment; answers persist between observation points.
let quizIndex=0,answers=Array(QUIZ.length).fill(null);
function clearQuizResult(){$('quiz-feedback').hidden=true;$('quiz-result').hidden=true;}
function renderQuiz(){const q=QUIZ[quizIndex];write('quiz-progress',`觀察點 ${quizIndex+1}／${QUIZ.length}・已記錄 ${answers.filter(a=>a!==null).length} 個解釋`);$('quiz-evidence').innerHTML=`<h3 tabindex="-1" id="quiz-observation-title">${q.title}</h3><p>${q.evidence}</p>`;$('quiz-options').innerHTML='<legend>哪個解釋符合觀察？</legend>'+q.options.map((o,i)=>`<label class="quiz-option"><input type="radio" name="quiz-answer" value="${i}" ${answers[quizIndex]===i?'checked':''}><span>${o}</span></label>`).join('');$('quiz-prev').disabled=quizIndex===0;write('quiz-next',quizIndex===QUIZ.length-1?'核對觀察':'下一個觀察點');$('quiz-options').onchange=e=>{answers[quizIndex]=Number(e.target.value);clearQuizResult();write('quiz-progress',`觀察點 ${quizIndex+1}／${QUIZ.length}・已記錄 ${answers.filter(a=>a!==null).length} 個解釋`);};}
$('quiz-prev').onclick=()=>{if(quizIndex>0)quizIndex--;clearQuizResult();renderQuiz();$('quiz-observation-title').focus({preventScroll:true});};
$('quiz-next').onclick=()=>{clearQuizResult();if(answers[quizIndex]===null){write('quiz-feedback','請先依觀察證據選一個解釋，再往下。');$('quiz-feedback').hidden=false;document.querySelector('#quiz-options input').focus();return;}if(quizIndex<QUIZ.length-1){quizIndex++;renderQuiz();$('quiz-observation-title').focus({preventScroll:true});return;}
 const results=grade(answers);const missing=results.findIndex(r=>!r.complete);if(missing>=0){quizIndex=missing;renderQuiz();write('quiz-feedback','這個觀察點尚未完成，請補上解釋。');$('quiz-feedback').hidden=false;return;}
 const correct=results.filter(r=>r.correct).length;write('quiz-result-note',correct===QUIZ.length?'你已能用不同觀察證據解釋這些變化。也回頭想想，每次研究的是哪個對象。':'有些解釋需要再比較。請對照下方理由，再回到相關學習區重新觀察。');$('quiz-review').innerHTML=QUIZ.map((q,i)=>`<li><strong>${q.title}：${results[i].correct?'解釋符合證據':'再想一想'}</strong><p>你選擇：${q.options[answers[i]]}</p><p>${q.reason}</p></li>`).join('');$('quiz-result').hidden=false;$('quiz-result-title').focus();};
$('quiz-reset').onclick=()=>{quizIndex=0;answers.fill(null);clearQuizResult();renderQuiz();};
// Navigation has a single source of heading text; background experiments pause.
for(const link of document.querySelectorAll('.route a')){const sec=document.querySelector(link.hash),h=sec.querySelector('h2');const sync=()=>{link.querySelector('span').textContent=link.classList.contains('quiz-nav')?'單元小測':h.textContent.trim();if(link.classList.contains('quiz-nav'))link.setAttribute('aria-label','單元小測：'+h.textContent.trim());};sync();new MutationObserver(sync).observe(h,{subtree:true,characterData:true,childList:true});}
const navLinks=[...document.querySelectorAll('.route a')];
const visibility=new IntersectionObserver(entries=>{for(const e of entries)if(!e.isIntersecting){for(const id of animations.keys())if(e.target.contains($(id)))stop(id);}}, {threshold:0});for(const sec of document.querySelectorAll('.lesson-card'))visibility.observe(sec);
let scrollFrame=0;const updateRoute=()=>{let current=navLinks[0];for(const a of navLinks)if(document.querySelector(a.hash).getBoundingClientRect().top<innerHeight*.45)current=a;for(const a of navLinks){if(a===current)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');}scrollFrame=0;};addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(updateRoute);},{passive:true});
const stopAll=()=>{for(const id of [...animations.keys()])stop(id);};document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll();});addEventListener('pagehide',stopAll);
for(const el of document.querySelectorAll('[data-control]'))el.disabled=false;
renderHeat();renderComparison();renderPhase();renderExpand();renderThermo();renderChem();renderQuiz();updateRoute();$('loading-note').hidden=true;
