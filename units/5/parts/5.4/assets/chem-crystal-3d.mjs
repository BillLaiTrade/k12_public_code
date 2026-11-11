import * as THREE from '../../../../4/parts/4.1/assets/vendor/three/build/three.module.js';

// The local coordination environment is illustrative, not a crystallographic reconstruction.
export function createCrystalScene(stage, initialWater, vaporWater){
 const canvas=document.createElement('canvas');canvas.className='chem-model-canvas';canvas.setAttribute('aria-hidden','true');
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-450,450,380,-380,.1,3000);camera.position.set(0,0,1000);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xffffff,0x7392a4,2));
 const light=new THREE.DirectionalLight(0xffffff,2.5);light.position.set(-350,400,650);scene.add(light);
 const rim=new THREE.DirectionalLight(0xc4d8ff,1);rim.position.set(400,-200,150);scene.add(rim);
 const sphere=new THREE.SphereGeometry(1,32,24),cylinder=new THREE.CylinderGeometry(1,1,1,20),root=new THREE.Group();root.scale.setScalar(1.25);root.position.y=3;scene.add(root);
 const materials={cu:new THREE.MeshPhysicalMaterial({color:0x0677d1,metalness:.18,roughness:.17,clearcoat:1,clearcoatRoughness:.12}),o:new THREE.MeshPhysicalMaterial({color:0xe02b29,metalness:.05,roughness:.2,clearcoat:1}),h:new THREE.MeshPhysicalMaterial({color:0xf2f3f4,roughness:.24,clearcoat:.7}),s:new THREE.MeshPhysicalMaterial({color:0xf3bc0b,metalness:.1,roughness:.24,clearcoat:.7}),sBond:new THREE.MeshPhysicalMaterial({color:0xe6ad1e,roughness:.25}),waterBond:new THREE.MeshPhysicalMaterial({color:0xe9dddd,roughness:.24}),coord:new THREE.MeshPhysicalMaterial({color:0xd77d96,roughness:.25,transparent:true,depthWrite:false}),axial:new THREE.MeshPhysicalMaterial({color:0xd77d96,roughness:.25}),tetra:new THREE.MeshPhysicalMaterial({color:0xf3be2d,roughness:.3,transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false})};
 // Match the existing SVG projection so Chinese callouts remain aligned.
 const pos=(x,y,z=0)=>new THREE.Vector3((x-450)*1.14,290-(302+(y-302)*1.14),z);
 function ball(parent,point,r,material){const m=new THREE.Mesh(sphere,material);m.position.copy(point);m.scale.setScalar(r);parent.add(m);return m;}
 function setRod(m,a,b,r){const d=new THREE.Vector3().subVectors(b,a);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize());m.scale.set(r,d.length(),r);}
 function rod(parent,a,b,r,material){const m=new THREE.Mesh(cylinder,material);setRod(m,a,b,r);parent.add(m);return m;}
 function sulfate(y){const c=pos(450,y,0),vertices=[pos(450,y-64,0),pos(505,y-42,-36),pos(450,y+48,20),pos(395,y-42,-36)];const group=new THREE.Group();root.add(group);
  const verts=[];for(const [a,b,d] of [[0,1,2],[0,2,3],[0,3,1],[1,3,2]])for(const i of [a,b,d])verts.push(vertices[i].x,vertices[i].y,vertices[i].z);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.computeVertexNormals();group.add(new THREE.Mesh(geo,materials.tetra));
  for(const vertex of vertices){rod(group,c,vertex,5,materials.sBond);ball(group,vertex,13,materials.o);}ball(group,c,19,materials.s);return group;
 }
 const upper=sulfate(151),lower=sulfate(461);
 const center=pos(450,302,30),axial=[pos(450,199,20),pos(450,397,0)],axialRods=axial.map(a=>rod(root,center,a,7,materials.axial));
 const createWaters=()=>initialWater.map((p,i)=>{const group=new THREE.Group(),o=ball(group,new THREE.Vector3(),16,materials.o),a=new THREE.Vector3(-20,18,6),b=new THREE.Vector3(20,18,6);rod(group,new THREE.Vector3(),a,5,materials.waterBond);rod(group,new THREE.Vector3(),b,5,materials.waterBond);ball(group,a,9,materials.h);ball(group,b,9,materials.h);group.position.copy(pos(...p,i<4?20:5));group.rotation.z=[-.45,.45,.35,-.35,.55][i];root.add(group);return group;});
 const outgoing=createWaters(),incoming=createWaters();incoming.forEach(g=>g.visible=false);
 const connectors=new THREE.Group();root.add(connectors);const ligandRods=initialWater.slice(0,4).map(([x,y])=>rod(connectors,center,pos(x,y,20),7,materials.coord));ball(root,center,45,materials.cu);
 function resize(){const width=stage.clientWidth,height=stage.clientHeight;if(width&&height){renderer.setSize(width,height,false);renderer.render(scene,camera);}}
 const observer=new ResizeObserver(resize);observer.observe(stage);stage.append(canvas);stage.classList.add('has-crystal-3d');
 function ease(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}
 function update(white,heating=0,rehydration=0){
  const p=ease(white),released=ease(heating),entered=ease(rehydration),fade=Math.min(1,p/.2);
  materials.coord.opacity=1-fade*fade*(3-2*fade);
  // The same local solid remains connected as its arrangement contracts.
  upper.position.y=-40*1.14*p;lower.position.y=40*1.14*p;
  setRod(axialRods[0],center,pos(450,199+40*p,20),7);setRod(axialRods[1],center,pos(450,397-40*p,0),7);
  initialWater.forEach(([sx,sy],i)=>{const [ex,ey]=vaporWater[i],z=i<4?20:5;
   outgoing[i].position.copy(pos(sx+(ex-sx)*released,sy+(ey-sy)*released,z));
   incoming[i].position.copy(pos(ex+(sx-ex)*entered,ey+(sy-ey)*entered,z));
   outgoing[i].visible=rehydration<=0&&heating<1;incoming[i].visible=rehydration>0;
   if(i<4)setRod(ligandRods[i],center,(rehydration>0?incoming:outgoing)[i].position,7);
  });
  renderer.render(scene,camera);
 }
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();stage.classList.remove('has-crystal-3d');canvas.remove();observer.disconnect();});
 resize();return {update};
}
