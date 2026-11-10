export const MAGNIFIER_HOME=Object.freeze({azimuth:-.72,polar:1.46,zoom:1});
// Keep the framing around the card, lens, and fixed eye rather than empty rail ends.
export const MAGNIFIER_FRAME_BOUNDS=Object.freeze({minX:-2,maxX:2.3,minY:.25,maxY:3.15,minZ:-.5,maxZ:.5});
export const MAGNIFIER_ZOOM_HEADROOM=1.22;
export function fitMagnifier(THREE,camera,target){
 target.set(.15,1.65,0);camera.fov=38;camera.updateProjectionMatrix();
 const h=MAGNIFIER_HOME,direction=new THREE.Vector3(Math.sin(h.polar)*Math.sin(h.azimuth),Math.cos(h.polar),Math.sin(h.polar)*Math.cos(h.azimuth)),bounds=[];
 for(const x of [MAGNIFIER_FRAME_BOUNDS.minX,MAGNIFIER_FRAME_BOUNDS.maxX])for(const y of [MAGNIFIER_FRAME_BOUNDS.minY,MAGNIFIER_FRAME_BOUNDS.maxY])for(const z of [MAGNIFIER_FRAME_BOUNDS.minZ,MAGNIFIER_FRAME_BOUNDS.maxZ])bounds.push(new THREE.Vector3(x,y,z));
 let radius=5;for(let i=0;i<100;i++){camera.position.copy(target).addScaledVector(direction,radius);camera.lookAt(target);camera.updateMatrixWorld();if(bounds.every(p=>{const q=p.clone().project(camera);return Math.abs(q.x)<.93&&q.y>-.94&&q.y<.9;}))break;radius*=1.045;}
 // Leave room to zoom in before the active apparatus reaches the viewport edge.
 return radius*MAGNIFIER_ZOOM_HEADROOM;
}
export function clipProjectedRay(a,b,rect){
 let lo=0,hi=1;for(const [start,end,min,max]of [[a.x,b.x,rect.left,rect.left+rect.width],[a.y,b.y,rect.top,rect.top+rect.height]]){const d=end-start;if(Math.abs(d)<1e-9){if(start<min||start>max)return null;}else{const t1=(min-start)/d,t2=(max-start)/d;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi)return null;}}
 return {start:{x:a.x+(b.x-a.x)*lo,y:a.y+(b.y-a.y)*lo},end:{x:a.x+(b.x-a.x)*hi,y:a.y+(b.y-a.y)*hi},clipped:hi<1};
}
