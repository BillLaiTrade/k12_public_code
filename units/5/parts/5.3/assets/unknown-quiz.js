import {SAMPLE_IDS,SAMPLE_NAMES,MATERIAL_SPECIFIC_HEATS,MATERIAL_IMAGES,DEFAULT_HEATS,INITIAL_TEMPERATURE,validSetting,observeSample,gradeSample,gradeRanking} from './unknown-explore-model.mjs?v=real-materials-visual-1';

const get=id=>document.getElementById(id),root=get('unknown-quiz-lab'),form=get('heat-quiz');
const massInput=get('unknown-mass'),heatInput=get('unknown-heat'),play=get('unknown-observe'),newButton=get('unknown-new'),image=get('unknown-image');
const toNumber=value=>String(value).trim()===''?NaN:Number(value),sampleName=id=>sampleNames[id];
const fmt=value=>Number(value).toLocaleString('zh-TW',{maximumFractionDigits:15});
const createSamples=()=>Object.fromEntries(SAMPLE_IDS.map(id=>[id,{mass:'100',heat:'500',progress:0,run:null,record:null}]));
let sampleNames={...SAMPLE_NAMES},samples=createSamples(),heats=Object.fromEntries(SAMPLE_IDS.map((id,i)=>[id,DEFAULT_HEATS[i]])),selected='a',ready=false,active=false,frame=0,last=0,lastPaint=0,attempt=0;

function clearFeedback(){
 for(const id of SAMPLE_IDS){const node=get(`unknown-feedback-${id}`);node.hidden=true;node.textContent='';delete node.dataset.correct;get(`unknown-c-${id}`).removeAttribute('aria-invalid');}
 for(const select of form.querySelectorAll('select'))select.removeAttribute('aria-invalid');
 const rank=get('unknown-rank-feedback');rank.hidden=true;rank.textContent='';delete rank.dataset.correct;
 const result=get('quiz-result');result.hidden=true;result.textContent='';delete result.dataset.correct;
}
function settings(){const s=samples[selected],mass=toNumber(s.mass),heat=toNumber(s.heat);return{mass,heat,massValid:validSetting(mass,'mass'),heatValid:validSetting(heat,'heat')};}
function renderNames(){
 for(const node of root.querySelectorAll('[data-sample-name]'))node.textContent=sampleName(node.dataset.sampleName);
 get('unknown-photo-label').textContent=sampleName(selected);image.alt=`AI生成的樣品觀察台：探針接觸${sampleName(selected)}試塊，旁有加熱器與數位溫度計。`;
}
function renderRecords(){
 const tbody=get('unknown-records');tbody.replaceChildren();
 for(const id of SAMPLE_IDS){
  const s=samples[id],row=document.createElement('tr'),label=document.createElement('th');label.scope='row';label.textContent=sampleName(id);row.append(label);
  if(!s.record){const cell=document.createElement('td');cell.colSpan=3;cell.textContent='尚未觀察';row.append(cell);}
  else for(const value of [`${fmt(s.record.mass)} g`,`${fmt(s.record.heat)} cal`,`${s.record.temperature}°C`]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}
  tbody.append(row);get(`unknown-tab-${id}-status`).textContent=s.record?'已觀察':'未觀察';
 }
}
function render(force=false){
 const s=samples[selected],v=settings(),complete=SAMPLE_IDS.every(id=>Boolean(samples[id].record));
 root.dataset.phase=!ready?(root.dataset.phase==='error'?'error':'loading'):active?'running':s.progress>=1?'complete':s.progress>0?'interrupted':'ready';
 root.dataset.observed=String(complete);root.dataset.playing=String(active);
 get('unknown-photo-label').textContent=sampleName(selected);image.alt=`AI生成的樣品觀察台：探針接觸${sampleName(selected)}試塊，旁有加熱器與數位溫度計。`;
 for(const button of root.querySelectorAll('[data-unknown-sample]'))button.setAttribute('aria-pressed',String(button.dataset.unknownSample===selected));
 massInput.disabled=active;heatInput.disabled=active;massInput.setAttribute('aria-invalid',String(!v.massValid));heatInput.setAttribute('aria-invalid',String(!v.heatValid));
 const error=get('unknown-setting-error');error.hidden=v.massValid&&v.heatValid;error.textContent=!v.massValid&&!v.heatValid?'請輸入有效的質量與熱量。':!v.massValid?'質量請輸入 100～350 g。':!v.heatValid?'熱量請輸入 100～3,000 cal。':'';
 play.disabled=!ready||active||!v.massValid||!v.heatValid;play.textContent=active?'觀察中…':s.progress>0||s.record?'重新觀察':'開始觀察';newButton.disabled=!ready||active;
 for(const id of SAMPLE_IDS)get(`unknown-c-${id}`).disabled=!samples[id].record||active;
 get('unknown-ranking').disabled=!complete||active;get('unknown-check').disabled=!complete||active;
 get('unknown-answer-status').textContent=complete?'四份樣品都已觀察，可以填入比熱並核對排列。':'每份樣品完成觀察後可填比熱；四份都完成後可排列並核對。';
 const now=performance.now();if(force||!active||now-lastPaint>=350){lastPaint=now;const state=s.run?observeSample(heats[selected],s.run.mass,s.run.heat,s.progress):{temperature:INITIAL_TEMPERATURE,heat:0};const temperature=state.temperature.toFixed(2);get('unknown-meter').textContent=temperature;get('unknown-temperature').textContent=temperature;get('unknown-energy').textContent=active?Math.floor(state.heat).toLocaleString('zh-TW'):fmt(state.heat);}
}
function stop(message){if(!active)return;active=false;cancelAnimationFrame(frame);frame=0;render(true);get('unknown-status').textContent=message||'觀察已中斷；原有紀錄保留，可重新觀察。';}
function tick(now){
 frame=0;if(!active)return;const s=samples[selected];s.progress=Math.min(1,s.progress+Math.max(0,Math.min(100,now-last))/5000);last=now;
 if(s.progress>=1){active=false;const end=observeSample(heats[selected],s.run.mass,s.run.heat,1);s.record={mass:s.run.mass,heat:s.run.heat,temperature:end.temperature.toFixed(2)};renderRecords();clearFeedback();get('unknown-status').textContent=`${sampleName(selected)}觀察完成，紀錄已更新。`;}
 render(!active);if(active)frame=requestAnimationFrame(tick);
}
function start(){
 const v=settings();if(!ready||active||!v.massValid||!v.heatValid)return;
 const s=samples[selected];s.run={mass:v.mass,heat:v.heat};s.progress=0;active=true;last=performance.now();clearFeedback();render(true);get('unknown-status').textContent=`正在觀察${sampleName(selected)}；完成後更新這份紀錄。`;frame=requestAnimationFrame(tick);
}
function selectSample(id){
 if(!SAMPLE_IDS.includes(id)||id===selected)return;stop('已切換樣品；未完成的觀察已中斷，原有紀錄保留。');selected=id;const s=samples[id];massInput.value=s.mass;heatInput.value=s.heat;render(true);
 get('unknown-status').textContent=s.progress>0&&s.progress<1?`${sampleName(id)}的觀察先前已中斷，點「重新觀察」從初溫開始。`:s.record?`${sampleName(id)}已有紀錄，可更改條件後重新觀察。`:'設定質量與熱量，點「開始觀察」。';
 load();
}
function settingChanged(){const s=samples[selected];s.mass=massInput.value;s.heat=heatInput.value;s.progress=0;s.run=null;clearFeedback();render(true);get('unknown-status').textContent=s.record?'設定已改；原紀錄保留，完成新觀察後才更新。':'設定完成後，點「開始觀察」。';}
function nextGroup(){
 if(!ready||active)return;const previous=new Set(Object.values(sampleNames));let values;
 do{values=Object.keys(MATERIAL_SPECIFIC_HEATS);for(let i=values.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}values=values.slice(0,SAMPLE_IDS.length);}while(values.every(name=>previous.has(name)));
 sampleNames=Object.fromEntries(SAMPLE_IDS.map((id,i)=>[id,values[i]]));heats=Object.fromEntries(SAMPLE_IDS.map(id=>[id,MATERIAL_SPECIFIC_HEATS[sampleName(id)]]));samples=createSamples();selected='a';massInput.value='100';heatInput.value='500';form.reset();clearFeedback();renderNames();renderRecords();render(true);get('unknown-status').textContent='新一組樣品已準備好，選擇樣品並設定條件。';load();
}
async function load(retry=false){
 const version=++attempt;stop();ready=false;root.dataset.phase='loading';get('unknown-loading').hidden=false;get('unknown-loading').textContent='正在準備樣品觀察台…';get('unknown-retry').hidden=true;
 image.src=new URL(`${MATERIAL_IMAGES[sampleName(selected)]}${retry?`?retry=${version}`:''}`,import.meta.url).href;render(true);
 try{await image.decode();if(version!==attempt)return;ready=true;get('unknown-loading').hidden=true;render(true);const sample=samples[selected];get('unknown-status').textContent=sample.progress>0&&sample.progress<1?`${sampleName(selected)}的觀察先前已中斷，點「重新觀察」從初溫開始。`:sample.record?`${sampleName(selected)}已有紀錄，可更改條件後重新觀察。`:'選擇樣品、設定條件，再開始觀察。';}
 catch{if(version!==attempt)return;root.dataset.phase='error';get('unknown-loading').textContent='器材未能載入，請點「重新載入器材」。';get('unknown-retry').hidden=false;render(true);get('unknown-status').textContent='器材尚未就緒，重新載入後可開始觀察。';}
}
form.addEventListener('submit',event=>{
 event.preventDefault();if(active||!SAMPLE_IDS.every(id=>samples[id].record))return;let correct=true;
 for(const id of SAMPLE_IDS){const input=get(`unknown-c-${id}`),state=gradeSample(samples[id].record,heats[id],input.value),node=get(`unknown-feedback-${id}`);node.hidden=false;node.dataset.correct=String(state==='correct');node.textContent=state==='correct'?'比熱正確。':state==='missing'?'請先填入比熱。':state==='invalid'?'請輸入大於 0 的數字。':'請用該樣品的熱量、質量與溫升再算一次。';input.setAttribute('aria-invalid',String(state!=='correct'));if(state!=='correct')correct=false;}
 const selects=[...form.querySelectorAll('[name^="rank-"]')],rank=gradeRanking(heats,selects.map(input=>input.value)),node=get('unknown-rank-feedback');node.hidden=false;node.dataset.correct=String(rank==='correct');node.textContent=rank==='correct'?'排列正確。':rank==='missing'?'請完成四個名次。':rank==='duplicate'?'每份樣品只能選一次。':'請比較四份樣品的比熱，再檢查排列。';selects.forEach(input=>input.setAttribute('aria-invalid',String(rank!=='correct')));if(rank!=='correct')correct=false;
 const result=get('quiz-result');result.hidden=false;result.dataset.correct=String(correct);result.textContent=correct?'全部正確！你已算出並比較四份樣品的比熱。':'再檢查標示的欄位；也可以重新觀察或調整條件。';
});
form.addEventListener('input',clearFeedback);form.addEventListener('change',clearFeedback);form.addEventListener('reset',clearFeedback);
for(const input of [massInput,heatInput])input.addEventListener('input',settingChanged);
for(const button of root.querySelectorAll('[data-unknown-sample]'))button.addEventListener('click',()=>selectSample(button.dataset.unknownSample));
play.addEventListener('click',start);newButton.addEventListener('click',nextGroup);get('unknown-retry').addEventListener('click',()=>load(true));
window.addEventListener('blur',()=>stop());document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});document.querySelector('.route').addEventListener('click',event=>{const link=event.target.closest('a');if(link&&link.hash!=='#unit-quiz'&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey)stop();});
renderRecords();load();
