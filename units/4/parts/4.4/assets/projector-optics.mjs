import {imageFor,rayAt} from './optics.mjs';

// The convex lens is fixed; students move the transparent card and the wall.
export const PROJECTOR=Object.freeze({f:2.4,lens:5.5,screenMin:6.4,screenMax:12,railMax:12,aperture:.76,axis:2.65,cardMin:.3,cardMax:4.6,step:.02,minGap:.9,paperWidth:4.8,paperHeight:4.6,artBounds:Object.freeze({left:-.49,right:.49,top:-.67,bottom:.59}),targetBounds:Object.freeze({left:-1.12,right:1.12,top:-1.52,bottom:1.38}),focusTolerance:.055});
export const initialProjector=()=>({card:PROJECTOR.lens-PROJECTOR.f,screen:PROJECTOR.lens+PROJECTOR.f,kind:'concave',flipped:false,rays:false});
export function projectorFocusMarks(state){
 const marks={};for(const side of ['left','right'])for(const multiple of [1,2]){
  const position=PROJECTOR.lens+(side==='left'?-1:1)*multiple*PROJECTOR.f;
  marks[`${side}-${multiple}`]=state.kind==='convex'&&position>=-1e-9&&position<=PROJECTOR.railMax+1e-9?Math.max(0,Math.min(PROJECTOR.railMax,position)):null;
 }
 return marks;
}
export function moveProjector(state,key,value){
 if(!['card','screen'].includes(key)||!Number.isFinite(value))return state;
 const min=key==='card'?PROJECTOR.cardMin:Math.max(PROJECTOR.screenMin,PROJECTOR.lens+PROJECTOR.minGap),max=key==='card'?Math.min(PROJECTOR.cardMax,PROJECTOR.lens-PROJECTOR.minGap):PROJECTOR.screenMax;
 return {...state,[key]:Math.min(max,Math.max(min,Math.round(value/PROJECTOR.step)*PROJECTOR.step))};
}
export function projectorState(state){
 const G=PROJECTOR,u=G.lens-state.card,s=state.screen-G.lens,f=state.kind==='convex'?G.f:-G.f,image=imageFor(f,u);
 const spread=G.aperture*Math.abs(1+s/u-s/f),scale=s/u;
 const clear=image.type==='real'&&spread<=G.focusTolerance;
 const upright=image.type==='real'&&!!state.flipped,large=image.type==='real'&&scale>1+1e-6;
 const sign=state.flipped?1:-1,xs=[G.artBounds.left,G.artBounds.right].map(x=>x*scale*sign),ys=[G.artBounds.top,G.artBounds.bottom].map(y=>y*scale*sign),target=G.targetBounds;
 const inTarget=image.type==='real'&&Math.min(...xs)>=target.left&&Math.max(...xs)<=target.right&&Math.min(...ys)>=target.top&&Math.max(...ys)<=target.bottom;
 const checks={clear,large,upright,inTarget};
 return {u,s,f,image,spread,scale,checks,success:Object.values(checks).every(Boolean)};
}
export function projectorRays(state){
 const g=projectorState(state),G=PROJECTOR;
 return [-.45,.45].flatMap(point=>[-G.aperture,0,G.aperture].map(h=>({point,from:[state.card,G.axis+point,0],lens:[G.lens,G.axis+h,0],end:[state.screen,G.axis+rayAt(g.f,g.u,point,h,g.s),0]})));
}
export function projectorHint(state){
 const g=projectorState(state);
 if(state.kind==='concave')return {text:'這片鏡片使光束更發散。試試另一種鏡片，觀察牆上的變化。',href:'#s5',label:'回看凹透鏡'};
 if(g.image.type!=='real')return {text:'圖卡到固定凸透鏡的距離，和焦距 F 有什麼關係？回想哪種情況下屏幕接不到實像。',href:'#s3',label:'回看凸透鏡成像'};
 if(!g.checks.clear)return {text:'清楚像的位置還沒有落在牆上。保持鏡片固定，調整圖卡與牆面的位置。',href:'#s3',label:'回看凸透鏡成像'};
 if(!g.checks.upright)return {text:'投影已經清楚。再對照屋頂與門窗，想想圖卡應該朝哪個方向。',href:'#s1',label:'回看倒立成像'};
 if(!g.checks.large)return {text:'圖案已清楚，但還沒有放大。調整圖卡與固定鏡片的距離，再移動牆面重新對焦。',href:'#s3',label:'回看像的大小'};
 if(!g.checks.inTarget)return {text:'方向和清晰度已符合目標。調整圖卡與牆面位置，讓圖案大小落入目標框。',href:'#s3',label:'回看像的大小'};
 return {text:'目前已符合目標，可以按「檢查成果」。',href:null,label:null};
}
