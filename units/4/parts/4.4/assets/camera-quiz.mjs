import {CAMERA as C,initialCamera,moveCamera,cameraState,cameraRays} from './camera-optics.mjs?v=20261109-audit1';
const root=document.querySelector('[data-camera-lab]');
if(root){
 const $=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)];let state=initialCamera(),selected='flower',checked=false,hint=false,model=null,started=false,drag=null,suppressClick=false;
 const X=x=>280+x*49,axis=235,Y=y=>axis-y*95,asF=n=>`${Number((n/C.f).toFixed(2))}F`;
 function layout(points){const stage=$('.camera-stage').getBoundingClientRect();for(const key of ['lens','sensor','flower']){const el=$(`[data-camera-label=${key}]`),p=points[key],visible=Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>0&&p.x<stage.width&&p.y>0&&p.y<stage.height;el.hidden=!visible;if(visible){el.style.left=`${Math.max(42,Math.min(stage.width-42,p.x))}px`;el.style.top=`${Math.max(60,Math.min(stage.height-43,p.y-12))}px`;}}}
 function position(railValue){const key=selected,value=key==='sensor'?C.lens-railValue:railValue,next=moveCamera(state,key,value);if(next[key]!==state[key]){state=next;checked=false;hint=false;render();}}
 function railPosition(){return selected==='sensor'?C.lens-state.sensor:state.flower;}
 function bounds(){return selected==='sensor'?[C.lens-C.sensorMax,C.lens-C.sensorMin]:[C.flowerMin,C.flowerMax];}
 function previewState(el,label,pass){const next=String(pass),previous=el.dataset.pass;el.textContent=label;el.dataset.pass=next;const changed=previous!==undefined&&previous!==next;if(changed)el.animate([{transform:'scale(1)',filter:'brightness(1)'},{transform:'scale(1.09)',filter:'brightness(1.35)'},{transform:'scale(1)',filter:'brightness(1)'}],{duration:260,easing:'ease-out'});return changed;}
 function render(){
  const g=cameraState(state),lens=X(C.lens),sensor=X(C.lens-state.sensor),flower=X(state.flower),track=$('[data-camera-track]'),name=selected==='flower'?'花朵':'感光元件',[min,max]=bounds(),value=railPosition();
  root.dataset.cameraReady='true';root.dataset.lens=C.lens;root.dataset.flower=state.flower;root.dataset.sensor=state.sensor;root.dataset.success=String(checked&&g.success);root.dataset.clear=String(g.checks.clear);
  $('[data-camera-body]').setAttribute('transform',`translate(${lens},0)`);$('[data-camera-sensor]').setAttribute('transform',`translate(${sensor},0)`);$('[data-camera-flower]').setAttribute('transform',`translate(${flower-X(C.flowerMax)},0)`);
  const rays=$('[data-camera-raypaths]');rays.toggleAttribute('hidden',!state.rays);rays.innerHTML=state.rays?cameraRays(state).map(r=>`<path d="M ${flower} ${Y(r.y)} L ${lens} ${Y(r.h)} L ${sensor} ${Y(r.end)}" class="${r.y>0?'camera-ray-top':'camera-ray-bottom'}"/>`).join(''):'';
  // The flower illustration is larger than the sensor reference box. Keep its
  // drawn height proportional to the optical image so the reduced image reads
  // clearly smaller than the enlarged projector image.
  $('[data-camera-preview-art]').setAttribute('transform',`translate(90 103) rotate(180) scale(${g.scale*.25})`);$('[data-camera-blur]').setAttribute('stdDeviation',String(Math.min(10,g.spread*32)));const previewFrame=$('[data-camera-preview-frame]');previewFrame.dataset.clear=String(g.checks.clear);const hasReal=g.image.type==='real';$('.camera-preview-pane svg').setAttribute('aria-label',hasReal?'感光元件上的倒立影像':'感光元件上的散開光線，尚無清楚實像');$('[data-camera-image-group]').toggleAttribute('hidden',!hasReal);$('[data-camera-scatter]').toggleAttribute('hidden',hasReal);const focusChanged=previewState($('[data-camera-state-focus]'),g.checks.clear?'已對焦':hasReal?'失焦':'尚無清楚實像',g.checks.clear);const size=$('[data-camera-state-size]'),fit=$('[data-camera-state-fit]');if(hasReal){const sizeLabel=g.scale>=.99&&g.scale<=1.01?'等大':g.scale<1?'縮小':'放大';previewState(size,sizeLabel,g.checks.small);previewState(fit,g.checks.complete?'完整':'超出感光面',g.checks.complete);}else{size.textContent='無法判斷';size.dataset.pass='pending';fit.textContent='無法判斷';fit.dataset.pass='pending';}if(focusChanged)previewFrame.animate([{strokeWidth:g.checks.clear?3:2,opacity:1},{strokeWidth:5,opacity:.55},{strokeWidth:g.checks.clear?3:2,opacity:1}],{duration:300,easing:'ease-out'});
  track.setAttribute('aria-label',`${name}在光軌上的位置`);track.setAttribute('aria-valuemin',min.toFixed(2));track.setAttribute('aria-valuemax',max.toFixed(2));track.setAttribute('aria-valuenow',value.toFixed(2));track.setAttribute('aria-valuetext',selected==='flower'?`花朵距固定鏡頭 ${asF(g.u)}`:`感光元件距固定鏡頭 ${asF(g.s)}`);
  for(const [key,x] of [['sensor',C.lens-state.sensor],['lens',C.lens],['flower',state.flower]]){$(`[data-camera-dot=${key}]`).style.left=`${x/C.railMax*100}%`;const marker=$(`[data-camera-marker=${key}]`);if(marker){marker.style.left=`${x/C.railMax*100}%`;marker.setAttribute('aria-pressed',String(key===selected));}}
  $('.camera-rail-fixed-lens').style.left=`${C.lens/C.railMax*100}%`;
  for(const [key,x] of [['left2',C.lens-2*C.f],['left1',C.lens-C.f],['right1',C.lens+C.f],['right2',C.lens+2*C.f]]){const mark=$(`[data-camera-focus=${key}]`),fade=Math.max(0,Math.min(1,x/.8,(C.railMax-x)/.8));mark.hidden=fade===0;if(!mark.hidden){mark.style.left=`${x/C.railMax*100}%`;mark.style.opacity=String(.72*fade);}}
  const allowed=$('[data-camera-allowed]');allowed.style.left=`${min/C.railMax*100}%`;allowed.style.width=`${(max-min)/C.railMax*100}%`;
  all('[data-camera-step]').forEach(b=>{const d=Number(b.dataset.cameraStep);b.disabled=d<0?value<=min+.001:value>=max-.001;b.setAttribute('aria-label',`${name}${selected==='sensor'?(d<0?'遠離':'靠近')+'鏡頭':(d<0?'靠近':'遠離')+'鏡頭'}微調`);});
  $('[data-camera-rays]').textContent=state.rays?'隱藏輔助光路':'顯示輔助光路';$('[data-camera-rays]').setAttribute('aria-pressed',String(state.rays));
  $('[data-camera-hint]').hidden=!hint;$('[data-camera-help]').setAttribute('aria-expanded',String(hint));$('[data-camera-help]').textContent=hint?'收起提示':'需要提示';
  const result=$('[data-camera-result]');result.hidden=!checked;result.textContent=!checked?'':g.success?'完成了！花朵在感光元件上形成清楚、完整的倒立縮小實像。':!g.checks.clear?'影像還不夠清楚。移動感光元件，讓光線在感光元件上會聚。':!g.checks.small?'影像尚未縮小，調整花朵與固定鏡頭的距離。':'影像尚未完整落在感光元件內，調整花朵位置後重新對焦。';result.dataset.success=String(g.success);model?.update(state);
 }
 function getPosition(){return railPosition();}
 root.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0||drag)return;const marker=e.target.closest('[data-camera-select]'),dot=e.target.closest('[data-camera-dot]'),key=marker?.dataset.cameraSelect||dot?.dataset.cameraDot;if(!['sensor','flower'].includes(key))return;
  suppressClick=false;selected=key;render();const target=marker||$('[data-camera-track]'),width=$('[data-camera-track]').getBoundingClientRect().width;if(!width)return;
  drag={id:e.pointerId,target,key,startX:e.clientX,startPosition:getPosition(),width,moved:false};target.setPointerCapture(e.pointerId);target.classList.add('camera-rail-dragging');e.preventDefault();
 });
 root.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.startX;if(!drag.moved&&Math.abs(dx)<4)return;drag.moved=true;position(drag.startPosition+dx/drag.width*C.railMax);e.preventDefault();});
 function endDrag(e){if(!drag||e.pointerId!==drag.id)return;const {target,moved}=drag;drag=null;target.classList.remove('camera-rail-dragging');if(target.hasPointerCapture(e.pointerId))target.releasePointerCapture(e.pointerId);if(moved){suppressClick=true;setTimeout(()=>{suppressClick=false;},0);}}
 root.addEventListener('pointerup',endDrag);root.addEventListener('pointercancel',endDrag);root.addEventListener('lostpointercapture',endDrag);
 root.addEventListener('click',e=>{
  if(suppressClick){suppressClick=false;return;}
  const marker=e.target.closest('[data-camera-select]'),dot=e.target.closest('[data-camera-dot]'),key=marker?.dataset.cameraSelect||dot?.dataset.cameraDot;if(['sensor','flower'].includes(key)){selected=key;render();return;}
  const track=e.target.closest('[data-camera-track]');if(track){const b=track.getBoundingClientRect(),f=Math.max(0,Math.min(1,(e.clientX-b.left)/b.width));position(f*C.railMax);return;}
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.cameraStep)position(getPosition()+Number(b.dataset.cameraStep)*C.step);
  else if(b.hasAttribute('data-camera-rays')){state={...state,rays:!state.rays};render();}
  else if(b.hasAttribute('data-camera-reset')){state=initialCamera();selected='flower';checked=false;hint=false;model?.resetView();render();}
  else if(b.hasAttribute('data-camera-help')){hint=!hint;render();}
 });
 root.addEventListener('keydown',e=>{const track=e.target.closest('[data-camera-track]');if(!track)return;const pos=getPosition(),step=C.step*(e.shiftKey?5:1),[min,max]=bounds();let value;if(['ArrowLeft','ArrowDown'].includes(e.key))value=pos-step;else if(['ArrowRight','ArrowUp'].includes(e.key))value=pos+step;else if(e.key==='Home')value=min;else if(e.key==='End')value=max;else return;e.preventDefault();position(value);});
 root.addEventListener('submit',e=>{e.preventDefault();checked=true;hint=false;render();});
 function failed(){model?.dispose();model=null;root.dataset.cameraRender='fallback';$('[data-camera-model]').hidden=true;$('[data-camera-fallback]').removeAttribute('hidden');$('[data-camera-viewbar]').hidden=true;$('[data-camera-labels]').hidden=true;const note=$('[data-camera-render-note]');note.hidden=false;note.textContent='目前以剖面圖呈現，操作與成像判定相同。';render();}
 function activate(){if(started)return;started=true;root.dataset.cameraRender='loading';import('./camera-model.mjs?v=20261109-audit1').then(({createCameraModel})=>{try{model=createCameraModel($('[data-camera-model]'),layout,failed);$('[data-camera-model]').hidden=false;$('[data-camera-fallback]').setAttribute('hidden','');$('[data-camera-viewbar]').hidden=false;$('[data-camera-labels]').hidden=false;root.dataset.cameraRender='3d';model.update(state);}catch{failed();}}).catch(failed);}
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();activate();}},{rootMargin:'300px'});observer.observe(root);render();
}
