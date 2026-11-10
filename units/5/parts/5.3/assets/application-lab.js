const root=document.getElementById('application-lab');
const get=id=>document.getElementById(id);
const views={chestnut:get('application-chestnut'),coast:get('application-coast'),coolant:get('application-coolant')};
const images={chestnut:get('chestnut-photo'),coolant:get('coolant-photo')};
const coastPhoto=get('coast-photo');
const coastSources={day:'application-coast-shore-day.webp',night:'application-coast-shore-night.webp'};
const sources={chestnut:'application-chestnut.webp',coolant:'application-coolant.webp'};
const questions={chestnut:'沙子如何幫助糖炒栗子加熱？',coast:'為什麼白天沙灘可能很燙，海水卻沒有那麼容易變熱？',coolant:'為什麼汽車冷卻液裡常含有水？'};
const assets={chestnut:{phase:'loading',attempt:0},coast:{phase:'loading',attempt:0},coolant:{phase:'loading',attempt:0}};
let current='chestnut',mode='day';
const coastQuestion=()=>mode==='day'?questions.coast:'為什麼夜晚沙灘可能明顯降溫，海水的溫度變化卻較小？';

const contactImage=get('chestnut-contact-image'),contactLoading=get('chestnut-contact-loading'),contactRetry=get('chestnut-contact-retry');
let contactAttempt=0,contactReady=false;
async function loadContact(retry=false){
  const attempt=++contactAttempt;
  contactLoading.hidden=false;contactLoading.textContent='正在準備接觸處放大圖…';contactRetry.hidden=true;
  if(retry)contactImage.src=new URL(`application-chestnut-contact.png?retry=${attempt}`,import.meta.url).href;
  try{await contactImage.decode();if(attempt!==contactAttempt)return;contactReady=true;contactLoading.hidden=true;}
  catch{if(attempt!==contactAttempt)return;contactReady=false;contactLoading.textContent='放大圖未能載入，請重新載入。';contactRetry.hidden=get('chestnut-contact').hidden;}
}
function selectChestnutMode(next){
  if(!['scene','contact'].includes(next))return;
  get('chestnut-scene').hidden=next!=='scene';get('chestnut-contact').hidden=next!=='contact';
  root.querySelectorAll('[data-chestnut-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chestnutMode===next)));
  get('chestnut-view-note').textContent=next==='contact'?'接觸處示意，砂粒已放大':'炒栗子場景示意';
  contactRetry.hidden=next!=='contact'||contactReady;
}

function renderAsset(key){
  const asset=assets[key],view=views[key],message=view.querySelector('[data-life-loading]');
  message.hidden=asset.phase==='ready';
  message.textContent=asset.phase==='error'?'場景未能載入，請點「重新載入場景」。':'正在準備生活場景…';
  view.querySelector('[data-life-retry]').hidden=asset.phase!=='error';
  view.setAttribute('aria-busy',String(asset.phase==='loading'));
  view.dataset.phase=asset.phase;
  if(key==='coolant')view.querySelectorAll('[data-coolant-stage]').forEach(b=>b.disabled=asset.phase!=='ready');
  if(key==='coast')view.querySelector('.coast-arrows').style.visibility=asset.phase==='ready'?'visible':'hidden';
}
async function loadAsset(key,retry=false){
  const asset=assets[key],attempt=++asset.attempt;
  asset.phase='loading';renderAsset(key);
  if(retry&&key!=='coast')images[key].src=new URL(`${sources[key]}?retry=${attempt}`,import.meta.url).href;
  try{
    if(key==='coast'){
      await Promise.all(Object.values(coastSources).map(src=>{const image=new Image();image.src=new URL(`${src}${retry?`?retry=${attempt}`:''}`,import.meta.url).href;return image.decode();}));
      if(attempt!==asset.attempt)return;
      coastPhoto.src=new URL(coastSources[mode],import.meta.url).href;
    }else await images[key].decode();
    if(attempt!==asset.attempt)return;
    asset.phase='ready';renderAsset(key);
  }catch{
    if(attempt!==asset.attempt)return;
    asset.phase='error';renderAsset(key);

  }
}

function selectApplication(key){
  if(!(key in views))return;
  current=key;root.dataset.scene=key;get('application-question').textContent=key==='coast'?coastQuestion():questions[key];
  Object.entries(views).forEach(([name,view])=>view.hidden=name!==key);
  root.querySelectorAll('.life-tabs [data-application]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.application===key)));
  if(assets[key].phase!=='ready')loadAsset(key);
}

function selectCoast(next){
  if(!['day','night'].includes(next)||next===mode)return;
  mode=next;
  const day=mode==='day';
  if(current==='coast')get('application-question').textContent=coastQuestion();
  views.coast.dataset.mode=mode;
  root.querySelectorAll('[data-coast-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.coastMode===mode)));
  if(assets.coast.phase==='ready')coastPhoto.src=new URL(coastSources[mode],import.meta.url).href;
  get('coast-condition').textContent=`模型：相同質量、${day?'吸收':'放出'}相同熱量`;
  get('coast-model').setAttribute('viewBox',day?'0 0 300 115':'0 85 300 115');
  get('coast-observation').textContent=day?'白天，沙灘可能變得燙腳，海水的溫度變化通常較小。':'夜晚，沙灘可能明顯降溫，海水的溫度變化通常較小。';
  root.querySelector('.coast-scene-label').textContent=day?'白天吸熱':'夜晚放熱';
  get('coast-heat-label').textContent=day?'熱量傳入海水與砂土':'熱量從海水與砂土散出';
  get('coast-water-caption').textContent=day?'溫升較小':'降溫較小';
  get('coast-sand-caption').textContent=day?'溫升較大':'降溫較大';
  for(const [name,height] of [['water',35],['sand',88]]){
    get('coast-'+name+'-level').setAttribute('y',day?100-height:100);
    get('coast-'+name+'-level').setAttribute('height',height);
  }
  const paths=day?['M270 175V430','M760 175V430']:['M270 430V175','M760 430V175'];
  root.querySelectorAll('[data-coast-arrow]').forEach((path,i)=>path.setAttribute('d',paths[i%2]));
  get('coast-conclusion').textContent=day?'在這個模型中，水的比熱較大，吸收相同熱量時，溫升較小。':'在這個模型中，水的比熱較大，放出相同熱量時，降溫較小。';
  get('coast-model').setAttribute('aria-label',`兩者初溫相同，${day?'吸收':'放出'}相同熱量後，水${day?'溫升':'降溫'}較小、砂土${day?'溫升':'降溫'}較大。`);
  if(assets.coast.phase!=='ready')loadAsset('coast');
}

function selectCoolant(stage){
  if(!['engine','radiator'].includes(stage)||assets.coolant.phase!=='ready')return;
  views.coolant.dataset.stage=stage;
  root.querySelectorAll('[data-coolant-stage]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.coolantStage===stage)));
  get('coolant-focus').textContent=stage==='engine'?'冷卻液流經引擎吸收熱，再把熱帶往散熱器。':'冷卻液流經散熱器，把熱傳給周圍空氣，降溫後再流回引擎。';
}

root.querySelectorAll('.life-tabs [data-application]').forEach(b=>b.addEventListener('click',()=>selectApplication(b.dataset.application)));
root.querySelectorAll('[data-coast-mode]').forEach(b=>b.addEventListener('click',()=>selectCoast(b.dataset.coastMode)));
root.querySelectorAll('[data-coolant-stage]').forEach(b=>b.addEventListener('click',()=>selectCoolant(b.dataset.coolantStage)));
root.querySelectorAll('[data-chestnut-mode]').forEach(b=>b.addEventListener('click',()=>selectChestnutMode(b.dataset.chestnutMode)));
contactRetry.addEventListener('click',()=>loadContact(true));
Object.entries(views).forEach(([key,view])=>view.querySelector('[data-life-retry]').addEventListener('click',()=>loadAsset(key,true)));

loadAsset('chestnut');
loadContact();
