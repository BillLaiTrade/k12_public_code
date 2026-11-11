/* Controlled construction comparisons. The particle animation is a qualitative
   mechanism model; plotted curves are not measured bottle temperatures. */
(() => {
  'use strict';
  const root=document.getElementById('insulation-lab');if(!root)return;
  const $=id=>document.getElementById(id),play=$('insulation-play'),sources=['a','b'].map(k=>$(`insulation-source-${k}`));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const comparisons={
    gap:{title:'夾層剖面示意',a:{label:'空氣夾層',gas:true,lining:false},b:{label:'真空夾層',gas:false,lining:false},note:'空氣分子隨機運動並碰撞傳能；抽氣後，這條氣體傳熱路徑減少。',discovery:'抽去大部分空氣，會減少氣體傳熱；輻射和瓶口的固體傳熱仍存在。'},
    lining:{title:'兩瓶皆為真空夾層',a:{label:'無亮面層',gas:false,lining:false},b:{label:'有亮面層',gas:false,lining:true},note:'看 B 瓶：熱輻射碰到銀亮層後，有一部分折返，只有較少部分繼續向外；瓶口、支撐仍能傳熱。',discovery:'B 瓶的亮面層反射大部分熱輻射，減少向外的輻射換熱；瓶口與支撐仍會傳熱。'}
  };
  const assets={bench:{src:$('insulation-bench').dataset.src,status:'idle',request:0},matte:{src:'assets/insulation-flask-steel.webp?v=mockup-20261110',status:'idle',request:0},lining:{src:'assets/insulation-flask-lining.webp?v=flask-1',status:'idle',request:0}};
  let comparison='gap',inspectedLayer=null,time=0,playing=false,frame=0,previous=null;
  const mechanism=$('insulation-mechanism'),liningPanel=$('insulation-lining-focus');
  mechanism.after(liningPanel);
  const bottleGrid=root.querySelector('.insulation-bottle-grid');
  new ResizeObserver(alignCalloutGuides).observe(bottleGrid);
  let guideFrame=0,guideUntil=0;
  function updateMovingGuides(now){alignCalloutGuides();if(now<guideUntil)guideFrame=requestAnimationFrame(updateMovingGuides);else guideFrame=0;}
  bottleGrid.addEventListener('transitionrun',event=>{if(event.propertyName!=='transform')return;guideUntil=performance.now()+450;if(!guideFrame)guideFrame=requestAnimationFrame(updateMovingGuides);});
  bottleGrid.addEventListener('transitionend',event=>{if(event.propertyName==='transform')alignCalloutGuides();});
  // A and B use the same equal-mass collision rules; fewer particles represent the evacuated gap.
  const microNS='http://www.w3.org/2000/svg',microModels=new Map();
  function svgNode(tag,attrs){const n=document.createElementNS(microNS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n;}
  function prepareMicro(panel){
    const svg=panel.querySelector('.micro-simulation'),w=svg.clientWidth,h=svg.clientHeight;if(w<60||h<35)return;
    const innerW=w-20,innerH=h-29;let item=microModels.get(panel.dataset.micro);
    if(!item){
      const model=GasCollisionModel.create(innerW,innerH,panel.dataset.micro==='a'?18:2,panel.dataset.micro==='a'?'right':'left'),group=svg.querySelector('.micro-simulation-particles');
      const nodes=model.particles.map(()=>{const circle=svgNode('circle',{class:'micro-lens-particle',r:model.radius});group.append(circle);return {circle};});
      item={svg,model,nodes};microModels.set(panel.dataset.micro,item);
    }else if(Math.abs(item.model.width-innerW)>.5||Math.abs(item.model.height-innerH)>.5){GasCollisionModel.resize(item.model,innerW,innerH);}
    const warmRight=panel.dataset.micro==='a',warmX=warmRight?w-10:10,coolX=warmRight?10:w-10;
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    svg.querySelector('.micro-wall-warm').setAttribute('x',warmRight?w-7:0);svg.querySelector('.micro-wall-cool').setAttribute('x',warmRight?0:w-7);
    const warmLabel=svg.querySelector('.micro-side-warm'),coolLabel=svg.querySelector('.micro-side-cool');warmLabel.setAttribute('x',warmX);warmLabel.setAttribute('text-anchor',warmRight?'end':'start');coolLabel.setAttribute('x',coolX);coolLabel.setAttribute('text-anchor',warmRight?'start':'end');
    const y=18,start=warmRight?w-11:10,end=warmRight?10:w-11,direction=warmRight?-1:1,span=Math.abs(end-start);let path=`M${start} ${y}`;for(let x=0;x<span;x+=16){const length=Math.min(16,span-x)*direction;path+=`q${length/4} -4 ${length/2} 0t${length/2} 0`;}
    svg.querySelector('.micro-radiation-base').setAttribute('d',path);svg.querySelector('.micro-lens-radiation').setAttribute('d',path);svg.querySelector('.micro-radiation-arrow').setAttribute('d',`M${end-direction*6} ${y-4}L${end} ${y} ${end-direction*6} ${y+4}`);
    return item;
  }
  const microResize=new ResizeObserver(entries=>entries.forEach(({target})=>{const panel=target.closest('.insulation-micro-panel');if(panel&&!panel.hidden)prepareMicro(panel);}));
  root.querySelectorAll('.insulation-micro-panel svg').forEach(svg=>microResize.observe(svg));
  let closeupFrame=0,closeupTime=0,closeupPrevious=null;
  function animateCloseup(now){
    closeupFrame=0;if(mechanism.hidden||document.hidden){closeupPrevious=null;return;}
    const panel=mechanism.querySelector('.insulation-micro-panel:not([hidden])'),item=panel&&prepareMicro(panel);if(!item){closeupFrame=requestAnimationFrame(animateCloseup);return;}
    const dt=closeupPrevious===null?0:Math.min(.05,(now-closeupPrevious)/1000)*(reduced.matches?.65:1);closeupPrevious=now;closeupTime+=dt;GasCollisionModel.step(item.model,dt);
    item.model.particles.forEach((p,i)=>{const {circle}=item.nodes[i],x=p.x+10,y=p.y+25;circle.setAttribute('cx',x.toFixed(2));circle.setAttribute('cy',y.toFixed(2));});
    const flashes=item.svg.querySelector('.micro-simulation-flashes');flashes.replaceChildren(...item.model.flashes.map(f=>svgNode('circle',{class:'micro-impact-flash',cx:(f.x+10).toFixed(1),cy:(f.y+25).toFixed(1),r:6,opacity:(f.life/.28).toFixed(2)})));
    item.svg.dataset.collisions=String(item.model.collisions);item.svg.dataset.energyExchanged=item.model.energyExchanged.toFixed(2);item.svg.querySelector('.micro-lens-radiation').style.strokeDashoffset=String(-closeupTime*20);
    closeupFrame=requestAnimationFrame(animateCloseup);
  }
  function updateCloseup(){if(!mechanism.hidden&&!document.hidden&&!closeupFrame){closeupPrevious=null;closeupFrame=requestAnimationFrame(animateCloseup);}else if(mechanism.hidden&&closeupFrame){cancelAnimationFrame(closeupFrame);closeupFrame=0;closeupPrevious=null;}}
  let liningFrame=0,liningPrevious=null,liningTime=0,activeLiningAnimation=null;
  function animateLining(now){
    liningFrame=0;if(liningPanel.hidden||document.hidden){liningPrevious=null;return;}
    const panel=liningPanel.querySelector('[data-lining-zoom]:not([hidden])');if(!panel)return;
    const dt=liningPrevious===null?0:Math.min(.05,(now-liningPrevious)/1000)*(reduced.matches?.65:1);liningPrevious=now;liningTime+=dt;
    const role=panel.dataset.liningZoom,phase=role==='a'?(liningTime%2)/2:(liningTime%3)/3;
    const place=(kind,progress,visible)=>{const group=panel.querySelector('.lining-pulse-'+kind);if(!group)return;const path=panel.querySelector(kind==='out'?'.lining-compare-wave':'.lining-compare-return');const point=path.getPointAtLength(path.getTotalLength()*progress),circle=group.querySelector('circle');circle.setAttribute('cx',point.x.toFixed(2));circle.setAttribute('cy',point.y.toFixed(2));group.setAttribute('opacity',visible?'1':'0');};
    place('out',role==='a'?phase:Math.min(1,phase*2),role==='a'||phase<.5);
    if(role==='b')place('back',Math.max(0,(phase-.5)*2),phase>=.5);
    liningFrame=requestAnimationFrame(animateLining);
  }
  function updateLining(){
    const selected=!liningPanel.hidden?inspectedLayer:null;
    if(selected!==activeLiningAnimation){activeLiningAnimation=selected;liningTime=0;liningPrevious=null;}
    if(selected&&!document.hidden&&!liningFrame)liningFrame=requestAnimationFrame(animateLining);
    else if((!selected||document.hidden)&&liningFrame){cancelAnimationFrame(liningFrame);liningFrame=0;liningPrevious=null;}
  }
  const WINDOW=14/3,moleculeGroups=[...root.querySelectorAll('.micro-particles')].map((group,index)=>({group,index}));
  const energyPulses=['a','b'].flatMap(role=>{const motion=$(`insulation-motion-${role}`),solid=[...motion.querySelectorAll('.insulation-solid-motion .insulation-heat-line')],radiation=$(`insulation-radiation-${role}`).querySelector('.insulation-heat-line');return [...motion.querySelectorAll('.insulation-energy-pulses [data-route]')].map(group=>{const route=group.dataset.route==='radiation'?radiation:solid[group.dataset.route==='neck'?0:1];return{group,path:route,length:route.getTotalLength(),phase:Number(group.dataset.phase||0)};});});
  const reflectionPulses=['in','back'].map(name=>({name,path:$('insulation-reflection-demo').querySelector('.insulation-ray-'+name)}));
  const setText=(id,text)=>{const n=$(id);if(n.textContent!==text)n.textContent=text;};
  const required=()=>comparison==='lining'?['bench','matte','lining']:['bench','matte'];
  const assetState=()=>required().some(k=>assets[k].status==='error')?'error':required().every(k=>assets[k].status==='ready')?'ready':'loading';
  function putImage(node,url){if(node.getAttribute('href')!==url)node.setAttribute('href',url);}
  // Both comparisons use the same normalized drawing template. It makes no
  // quantitative claim about the relative benefit of vacuum versus a coating.
  function ordinate(role,p){return Math.exp(-(role==='a'?2.05:1.5)*p);}
  function reflect(position,min,max){const span=max-min,cycle=((position-min)%(span*2)+span*2)%(span*2);return min+(cycle<=span?cycle:span*2-cycle);}
  function moveMolecules(){
    moleculeGroups.forEach(({group,index})=>group.querySelectorAll('circle').forEach((node,i)=>{
      const seed=i+index*11+1,x0=48+((seed*47)%198),y0=20+((seed*31)%54),vx=((seed*17)%29-14)*.11,vy=((seed*23)%27-13)*.12;
      node.setAttribute('cx',reflect(x0+time*vx,40,260).toFixed(1));node.setAttribute('cy',reflect(y0+time*vy,14,82).toFixed(1));
      node.setAttribute('opacity','.82');
    }));
    energyPulses.forEach(({group,path,length,phase})=>{const distance=((time*48+phase*length)%length+length)%length,point=path.getPointAtLength(distance);group.setAttribute('transform',`translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);});
    reflectionPulses.forEach(({name,path})=>{const length=path.getTotalLength(),forward=name==='back'?1:1,distance=(time*(34))%length,pt=path.getPointAtLength(forward*distance);path.dataset.pulseX=pt.x.toFixed(1);path.dataset.pulseY=pt.y.toFixed(1);});
  }
  function alignCalloutGuides(){
    const guides=$('insulation-callout-guides'),visible=(comparison==='gap'?!mechanism.hidden:!liningPanel.hidden);
    guides.toggleAttribute('hidden',!visible);if(!visible)return;
    const scene=root.querySelector('.insulation-scene'),bounds=scene.getBoundingClientRect();guides.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
    for(const role of ['a','b']){
      const active=inspectedLayer===role;
      for(const selector of ['[data-guide]','[data-target]','[data-joint]'])guides.querySelector(`${selector}[${selector==='[data-guide]'?'data-guide':selector==='[data-target]'?'data-target':'data-joint'}=\"${role}\"]`).toggleAttribute('hidden',!active);
      if(!active)continue;
      const bottle=$(`insulation-bottle-${role}`),point=bottle.createSVGPoint();point.x=comparison==='gap'&&role==='b'?301:139;point.y=440;
      const screen=point.matrixTransform(bottle.getScreenCTM()),x=screen.x-bounds.left,y=screen.y-bounds.top;
      const panel=(comparison==='gap'?mechanism:liningPanel).getBoundingClientRect(),anchorX=(role==='a'?panel.left+12:panel.right-12)-bounds.left,anchorY=panel.top+18-bounds.top;
      const edge=role==='a'?4:bounds.width-4;
      const d=`M${x.toFixed(1)} ${y.toFixed(1)} C${x.toFixed(1)} ${(y+20).toFixed(1)} ${edge.toFixed(1)} ${(y+20).toFixed(1)} ${edge.toFixed(1)} ${(y+48).toFixed(1)} L${edge.toFixed(1)} ${(anchorY-12).toFixed(1)} Q${edge.toFixed(1)} ${anchorY.toFixed(1)} ${anchorX.toFixed(1)} ${anchorY.toFixed(1)}`;
      guides.querySelector(`[data-guide="${role}"]`).setAttribute('d',d);
      guides.querySelector(`[data-target="${role}"]`).setAttribute('cx',x.toFixed(1));guides.querySelector(`[data-target="${role}"]`).setAttribute('cy',y.toFixed(1));
      guides.querySelector(`[data-joint="${role}"]`).setAttribute('cx',anchorX.toFixed(1));guides.querySelector(`[data-joint="${role}"]`).setAttribute('cy',anchorY.toFixed(1));
    }
  }
  function plot(){
    const p=Math.min(1,time/WINDOW);root.dataset.progress=p.toFixed(4);
    ['a','b'].forEach(role=>{
      const ps=[];for(let x=0;x<p;x+=.012)ps.push(x);ps.push(p);
      const d=ps.map((x,i)=>`${i?'L':'M'}${(72+783*x).toFixed(2)} ${(224-179*ordinate(role,x)).toFixed(2)}`).join('');
      $(`insulation-curve-${role}`).setAttribute('d',d);
      const y=224-179*ordinate(role,p),point=$(`insulation-point-${role}`);point.setAttribute('cx',(72+783*p).toFixed(2));point.setAttribute('cy',y.toFixed(2));point.hidden=false;
      const tag=$(`insulation-tag-${role}`);tag.style.top=(y/280*100).toFixed(3)+'%';tag.hidden=p<1;
    });
  }
  function render(){
    const cfg=comparisons[comparison],status=assetState(),started=playing||time>0;
    root.dataset.comparison=comparison;root.dataset.assets=status;root.dataset.playing=String(playing);root.dataset.started=String(started);root.dataset.elapsed=time.toFixed(3);root.dataset.stage=!started?'ready':time<WINDOW?'comparing':'observed';
    root.dataset.gasA=String(cfg.a.gas);root.dataset.gasB=String(cfg.b.gas);root.dataset.liningA=String(cfg.a.lining);root.dataset.liningB=String(cfg.b.lining);root.dataset.focus=inspectedLayer||'both';
    root.setAttribute('aria-busy',String(status==='loading'));play.disabled=status!=='ready';sources.forEach(n=>n.disabled=status!=='ready');play.setAttribute('aria-pressed',String(playing));
    $('insulation-plot-prompt').hidden=started;
    setText('insulation-play',playing?'暫停觀察':time>0?'繼續觀察':'開始觀察');
    const liningNote=inspectedLayer?`已展開 ${inspectedLayer.toUpperCase()} 瓶的反射層剖面；亮面層減少輻射換熱，瓶口與支撐仍會傳熱。`:started?cfg.note:'兩瓶都是真空夾層，只差有沒有亮面層。點瓶身看熱輻射路徑，再按「開始觀察」比較降溫曲線。';
    const gapLayerNote=inspectedLayer==='a'?'A 空氣夾層：分子碰撞會傳遞能量，輻射也能穿過。按「開始觀察」比較降溫曲線。':'B 真空夾層：氣體分子很少，氣體傳熱減少；輻射仍能穿過。按「開始觀察」比較降溫曲線。';
    const note=comparison==='lining'?liningNote:inspectedLayer?gapLayerNote:started?cfg.note:'點選 A 或 B 瓶身夾層查看局部比較，按「開始觀察」對照降溫曲線。';
    setText('insulation-scene-heading',cfg.title);setText('insulation-note',note);setText('insulation-takeaway',comparison==='gap'?'抽去大部分空氣，減少氣體傳熱；輻射與瓶口傳熱仍存在。':'瓶口與支撐仍會傳熱，水溫逐漸接近室溫。');
    setText('insulation-chart-title',comparison==='gap'?'比較降溫快慢':'亮面層會讓熱水降溫變慢嗎？');setText('insulation-chart-caveat',comparison==='gap'?'定性示意，非實測數據':'曲線為定性示意，非實測數據');
    root.querySelectorAll('[data-insulation-comparison]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.insulationComparison===comparison)));
    ['a','b'].forEach(role=>{
      const c=cfg[role];setText(`insulation-label-${role}`,c.label);setText(`insulation-legend-${role}`,c.label);
      const layerDescription=comparison==='gap'?(role==='a'?'藍色氣體分子在夾層中移動，橘色輻射波也能通過。':'夾層中氣體極少，橘色輻射波仍能通過。'):'夾層剖面與熱輻射路徑示意。';$(`insulation-bottle-${role}`).setAttribute('aria-label',`${role.toUpperCase()}瓶：${c.label}；${layerDescription}`);
      const source=$(`insulation-source-${role}`),isInspected=inspectedLayer===role;
      source.setAttribute('aria-label',`選取${role.toUpperCase()}瓶的${c.label}並查看局部比較`);source.setAttribute('aria-pressed',String(isInspected));source.setAttribute('aria-expanded',String(isInspected));source.setAttribute('aria-controls',comparison==='gap'?'insulation-mechanism':'insulation-lining-focus');const hint=root.querySelector(`[data-bottle="${role}"] .insulation-inspect-hint`);if(hint)hint.textContent=isInspected?'已選取':'點夾層看局部';
      $(`insulation-motion-${role}`).setAttribute('opacity',started&&status==='ready'?'1':'0');
      const fade=Math.max(.25,ordinate(role,Math.min(1,time/WINDOW)));
      $(`insulation-motion-${role}`).querySelector('.insulation-solid-motion').setAttribute('stroke-dashoffset',(-time*36).toFixed(2));
      const reflectionMode=comparison==='lining'&&role==='b'&&status==='ready';
      const demo=$('insulation-reflection-demo');demo.toggleAttribute('hidden',!reflectionMode);
      const ray=$(`insulation-radiation-${role}`);
      ray.toggleAttribute('hidden',reflectionMode);
      if(reflectionMode)reflectionPulses.forEach(({name,path})=>{path.style.strokeDasharray=started?('36 10'):'none';path.style.strokeDashoffset=String(name==='back'?time*26:-time*26);path.style.opacity='1';});

      ray.setAttribute('opacity',((c.lining?.45:1)*(.5+.5*fade)).toFixed(3));ray.setAttribute('stroke-dasharray','12 7');ray.setAttribute('stroke-dashoffset',(-time*30).toFixed(2));
      if(assets.matte.status==='ready')putImage($(`insulation-matte-${role}`),assets.matte.url);
      if(assets.bench.status==='ready')putImage($(`insulation-local-bench-${role}`),assets.bench.url);
    });
    const reflectionPathsVisible=comparison==='lining'&&status==='ready';
    $('insulation-outgoing-demo').toggleAttribute('hidden',!reflectionPathsVisible);
    if(assets.bench.status==='ready'&&$('insulation-bench').getAttribute('src')!==assets.bench.url)$('insulation-bench').src=assets.bench.url;
    if(assets.lining.status==='ready')putImage($('insulation-lining-photo'),assets.lining.url);
    $('insulation-lining-photo').toggleAttribute('hidden',!cfg.b.lining);
    $('insulation-gas-motion').toggleAttribute('hidden',!cfg.a.gas);
    const liningFocus=comparison==='lining'&&inspectedLayer!==null&&status==='ready',gapFocus=comparison==='gap'&&inspectedLayer!==null&&status==='ready';
    mechanism.hidden=!gapFocus;root.querySelectorAll('.insulation-micro-panel').forEach(panel=>{const selected=gapFocus&&panel.dataset.micro===inspectedLayer;panel.hidden=!selected;if(selected)prepareMicro(panel);});updateCloseup();
    liningPanel.hidden=!liningFocus;liningPanel.querySelectorAll('[data-lining-zoom]').forEach(panel=>panel.hidden=!liningFocus||panel.dataset.liningZoom!==inspectedLayer);
    updateLining();
    setText('insulation-lining-focus-title',inspectedLayer==='a'?'A 無亮面層放大':'B 有亮面層放大');setText('insulation-mechanism-title',inspectedLayer==='a'?'A 空氣夾層放大':inspectedLayer==='b'?'B 真空夾層放大':'夾層局部比較');
    root.querySelector('.insulation-lining-explanation').textContent=inspectedLayer==='a'?'熱輻射穿越真空夾層，到達較冷的外壁。':'亮面層反射部分輻射，減少輻射換熱。';
    setText('insulation-micro-explanation',inspectedLayer==='a'?'分子碰撞交換能量，整體由較暖側傳向較冷側。':'真空夾層氣體極少，氣體傳熱減少；輻射仍能穿過。');
    const routeKey=root.querySelector('.insulation-route-key'),liningMode=comparison==='lining';routeKey.querySelectorAll('[data-route-key]').forEach(node=>node.hidden=liningMode);routeKey.querySelectorAll('.insulation-reflection-key').forEach(node=>node.hidden=!liningMode);routeKey.hidden=false;alignCalloutGuides();
    moveMolecules();
    plot();$('insulation-discovery').hidden=time<WINDOW;setText('insulation-discovery-text',cfg.discovery);
    setText('insulation-loading-text',status==='error'?'比較場景未能載入，請重新載入或切換比較。':'比較場景載入中…');$('insulation-retry').hidden=status!=='error';
  }
  function tick(now){if(!playing)return;const dt=previous===null?0:Math.max(0,Math.min(.05,(now-previous)/1000));previous=now;time+=dt*(reduced.matches?.55:1);render();frame=requestAnimationFrame(tick);}
  function start(){if(playing||assetState()!=='ready')return;playing=true;previous=null;render();frame=requestAnimationFrame(tick);}
  function stop(){playing=false;cancelAnimationFrame(frame);frame=0;previous=null;render();}
  function reset(){stop();time=0;inspectedLayer=null;render();}
  function loadAssets(retry=false){
    required().forEach(key=>{const a=assets[key];if(a.status==='ready'||a.status==='loading')return;const request=++a.request,url=a.src+(retry?`&retry=${request}`:'');a.status='loading';
      const image=new Image();image.onload=()=>{if(request!==a.request)return;a.status=image.naturalWidth?'ready':'error';if(a.status==='ready')a.url=url;render();};image.onerror=()=>{if(request!==a.request)return;a.status='error';render();};image.src=url;
    });render();
  }
  play.addEventListener('click',()=>{if(playing)stop();else start();});sources.forEach((n,index)=>n.addEventListener('click',()=>{if(assetState()!=='ready')return;const selected=['a','b'][index];inspectedLayer=inspectedLayer===selected?null:selected;render();}));$('insulation-reset').addEventListener('click',reset);
  root.querySelectorAll('[data-insulation-comparison]').forEach(n=>n.addEventListener('click',()=>{if(n.dataset.insulationComparison===comparison)return;stop();comparison=n.dataset.insulationComparison;inspectedLayer=null;time=0;root.querySelector('details').open=false;render();loadAssets();}));
  document.addEventListener('pointerdown',event=>{if(inspectedLayer===null)return;const target=event.target;if(!(target instanceof Element)||target.closest('.insulation-bottle-hit, #insulation-mechanism, #insulation-lining-focus, .insulation-control-row, .insulation-tabs'))return;inspectedLayer=null;render();});
  $('insulation-retry').addEventListener('click',()=>loadAssets(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();updateCloseup();updateLining();});addEventListener('pagehide',stop);
  render();loadAssets();
})();
