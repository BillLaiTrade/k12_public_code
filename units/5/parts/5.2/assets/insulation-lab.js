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
  // Local diagrams stretch to stay low and wide; compensate their particle shapes.
  const microAspectObserver=new ResizeObserver(entries=>entries.forEach(({target,contentRect})=>{
    const view=target.viewBox.baseVal;if(!contentRect.width||!contentRect.height||!view.width||!view.height)return;
    target.style.setProperty('--micro-particle-aspect',((contentRect.width/view.width)/(contentRect.height/view.height)).toFixed(3));
  }));
  root.querySelectorAll('.insulation-micro-panel svg').forEach(svg=>microAspectObserver.observe(svg));
  // The close-up runs independently of the cooling graph while it is visible.
  const closeupParticles=[...mechanism.querySelectorAll('.micro-lens-particle')].map((node,i)=>({node,x:Number(node.getAttribute('cx')),y:Number(node.getAttribute('cy')),i}));
  closeupParticles.forEach(({node})=>node.querySelectorAll('animate').forEach(animation=>animation.remove()));
  let closeupFrame=0,closeupTime=0,closeupPrevious=null;
  function animateCloseup(now){
    closeupFrame=0;
    if(mechanism.hidden||document.hidden){closeupPrevious=null;return;}
    const dt=closeupPrevious===null?0:Math.min(.05,(now-closeupPrevious)/1000);closeupPrevious=now;closeupTime+=dt*(reduced.matches?.45:1);
    closeupParticles.forEach(({node,x,y,i})=>{node.setAttribute('cx',(x+14*Math.sin(closeupTime*.9+i*1.7)).toFixed(2));node.setAttribute('cy',(y+16*Math.sin(closeupTime*.7+i*2.1)).toFixed(2));});
    mechanism.querySelectorAll('.micro-lens-radiation').forEach(wave=>wave.style.strokeDashoffset=String(-closeupTime*20));
    closeupFrame=requestAnimationFrame(animateCloseup);
  }
  function updateCloseup(){if(!mechanism.hidden&&!document.hidden&&!closeupFrame){closeupPrevious=null;closeupFrame=requestAnimationFrame(animateCloseup);}else if(mechanism.hidden&&closeupFrame){cancelAnimationFrame(closeupFrame);closeupFrame=0;closeupPrevious=null;}}
  const WINDOW=14,moleculeGroups=[...root.querySelectorAll('.micro-particles')].map((group,index)=>({group,index}));
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
      const active=comparison!=='gap'||inspectedLayer===role;
      for(const selector of ['[data-guide]','[data-target]','[data-joint]'])guides.querySelector(`${selector}[${selector==='[data-guide]'?'data-guide':selector==='[data-target]'?'data-target':'data-joint'}=\"${role}\"]`).toggleAttribute('hidden',!active);
      if(!active)continue;
      const bottle=$(`insulation-bottle-${role}`),point=bottle.createSVGPoint();point.x=139;point.y=440;
      const screen=point.matrixTransform(bottle.getScreenCTM()),x=screen.x-bounds.left,y=screen.y-bounds.top;
      const panel=root.querySelector(comparison==='gap'?`.insulation-micro-panel[data-micro="${role}"]`:`.insulation-lining-zoom[data-lining-zoom="${role}"]`).getBoundingClientRect(),anchorX=panel.left+panel.width/2-bounds.left,anchorY=panel.top-bounds.top;
      const d=`M${x.toFixed(1)} ${y.toFixed(1)} C${x.toFixed(1)} ${(y+38).toFixed(1)} ${anchorX.toFixed(1)} ${(anchorY-38).toFixed(1)} ${anchorX.toFixed(1)} ${anchorY.toFixed(1)}`;
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
    const liningNote=inspectedLayer?'已展開 A、B 反射層比較；亮面層減少輻射換熱，瓶口與支撐仍會傳熱。':started?cfg.note:'兩瓶都是真空夾層，只差有沒有亮面層。點瓶身看熱輻射路徑，再按「開始觀察」比較降溫曲線。';
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
    mechanism.hidden=!gapFocus;root.querySelectorAll('.insulation-micro-panel').forEach(panel=>{const selected=gapFocus&&panel.dataset.micro===inspectedLayer;panel.hidden=!selected;const svg=panel.querySelector('svg');if(selected&&!reduced.matches)svg.unpauseAnimations();else svg.pauseAnimations();});updateCloseup();
    liningPanel.hidden=!liningFocus;liningPanel.querySelectorAll('[data-lining-zoom]').forEach(panel=>panel.hidden=!liningFocus);
    setText('insulation-lining-focus-title','反射層局部比較');setText('insulation-mechanism-title',inspectedLayer==='a'?'A 空氣夾層局部放大':inspectedLayer==='b'?'B 真空夾層局部放大':'夾層局部比較');
    setText('insulation-micro-explanation',inspectedLayer==='a'?'空氣分子碰撞傳能；輻射也能穿過夾層。':'真空夾層氣體極少，氣體傳熱減少；輻射仍能穿過。');
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
  play.addEventListener('click',()=>{if(playing)stop();else start();});sources.forEach((n,index)=>n.addEventListener('click',()=>{const selected=['a','b'][index];inspectedLayer=inspectedLayer===selected?null:selected;render();}));$('insulation-reset').addEventListener('click',reset);
  root.querySelectorAll('[data-insulation-comparison]').forEach(n=>n.addEventListener('click',()=>{if(n.dataset.insulationComparison===comparison)return;stop();comparison=n.dataset.insulationComparison;inspectedLayer=null;time=0;root.querySelector('details').open=false;render();loadAssets();}));
  document.addEventListener('pointerdown',event=>{if(inspectedLayer===null)return;const target=event.target;if(!(target instanceof Element)||target.closest('.insulation-bottle-hit, #insulation-mechanism, #insulation-lining-focus, .insulation-control-row, .insulation-tabs'))return;inspectedLayer=null;render();});
  $('insulation-retry').addEventListener('click',()=>loadAssets(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();updateCloseup();});addEventListener('pagehide',stop);
  render();loadAssets();
})();
