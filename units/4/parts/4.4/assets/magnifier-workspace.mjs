import {bindBenchRuler} from './convex-bench-workspace.mjs?v=20261104-bench-proportion1';
// Keep the observer fixed while the object moves outward through the focal point.
export const observations=Object.freeze({
 near:{object:50,screenIn:false},
 focus:{object:90,screenIn:false},
 outside:{object:150,screenIn:false}
});
export function createMagnifierWorkspace(root,{G,move,observe}){
 let current={object:50,eye:G.eye,screen:50};const layout=createMagnifierLayout(root),rulers=[];
 for(const key of ['object']){
  const track=root.querySelector(`[data-mag-ruler-track=${key}]`),handle=root.querySelector(`[data-mag-device=${key}]`);
  rulers.push({key,handle,update:bindBenchRuler({track,handle,key,min:G[key+'Min'],max:G[key+'Max'],reverse:key==='object',get:()=>current[key],move})});
 }
 const rows=[...root.querySelectorAll('[data-mag-observation]')];rows.forEach(row=>row.addEventListener('click',()=>observe(observations[row.dataset.magObservation])));
 return {layout:layout.layout,safeRect:layout.safeRect,update(state,rays,extensions){
  current=state;for(const r of rulers){r.update(state[r.key]);r.handle.setAttribute('aria-valuetext',`${r.key==='object'?'圖卡':r.key==='eye'?'眼睛':'比較屏幕'} ${Number((state[r.key]/G.f).toFixed(3))}F`);}
  for(const row of rows){const p=observations[row.dataset.magObservation],active=state.object===p.object&&state.screenIn===p.screenIn;row.dataset.active=String(active);row.querySelector('button').setAttribute('aria-pressed',String(active));}
 }};
}

function createMagnifierLayout(root){
 const viewport=root.querySelector('[data-mag-viewport]'),observer=root.querySelector('.magnifier-observer');
 function layout(){const width=root.clientWidth;root.dataset.narrow=String(width<680);root.dataset.compact=String(width<1000);}
 new ResizeObserver(layout).observe(root);layout();
 return {layout,safeRect(){const tools=root.querySelector('.magnifier-tools'),top=tools.offsetTop+tools.offsetHeight+10,view=viewport.getBoundingClientRect(),panel=observer.getBoundingClientRect(),left=14,overlaps=panel.top<view.bottom&&panel.bottom>view.top,right=Math.min(view.width-14,overlaps?panel.left-view.left-12:view.width-14);return {left,top,width:Math.max(60,right-left),height:Math.max(60,viewport.clientHeight-top-42)};}};
}
