import {imageFor,rayAt} from './optics.mjs';
// The preview normalizes the flower drawing to .25 of its optical size; this
// sensor frame can contain it up to 1.5× optical magnification.
export const CAMERA=Object.freeze({f:2,lens:5,flowerMin:5.9,flowerMax:12,railMax:12,sensorMin:.65,sensorMax:4.8,step:.05,aperture:.65,tolerance:.01,sensorFitMax:1.5});
export const initialCamera=()=>({flower:CAMERA.lens+CAMERA.f,sensor:CAMERA.lens-CAMERA.f,rays:true});
export function moveCamera(state,key,value){
 if(!Number.isFinite(value)||!['flower','sensor'].includes(key))return state;
 const min=key==='flower'?CAMERA.flowerMin:CAMERA.sensorMin,max=key==='flower'?CAMERA.flowerMax:CAMERA.sensorMax;
 return {...state,[key]:Math.max(min,Math.min(max,Number((Math.round(value/CAMERA.step)*CAMERA.step).toFixed(2))))};
}
export function cameraState(state){
 const {f,lens,aperture,tolerance,sensorFitMax}=CAMERA,u=state.flower-lens,s=state.sensor,image=imageFor(f,u),spread=aperture*Math.abs(1+s/u-s/f),scale=s/u;
 const checks={clear:image.type==='real'&&spread<=tolerance,small:image.type==='real'&&scale<.99,complete:image.type==='real'&&scale<=sensorFitMax};
 return {u,s,image,spread,scale,checks,success:Object.values(checks).every(Boolean)};
}
export function cameraRays(state){const g=cameraState(state);return [-1.05,1.05].flatMap(y=>[-.58,.58].map(h=>({y,h,end:rayAt(CAMERA.f,g.u,y,h,g.s)})));}
