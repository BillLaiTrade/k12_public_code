// 真實材料標籤搭配常溫附近的代表性比熱模型，不模擬相變或散熱。
export const SAMPLE_IDS=Object.freeze(['a','b','c','d']);
export const SAMPLE_NAMES=Object.freeze({a:'鋁塊',b:'玻璃塊',c:'鐵塊',d:'銅塊'});
export const MATERIAL_SPECIFIC_HEATS=Object.freeze({'鋁塊':.22,'玻璃塊':.20,'鐵塊':.11,'銅塊':.09,'鎂塊':.24,'石墨塊':.17,'鈦塊':.12,'木塊':.42});
export const MATERIAL_IMAGES=Object.freeze({'鋁塊':'unknown-sample-aluminum.webp','玻璃塊':'unknown-sample-glass.webp','鐵塊':'unknown-single-bench.webp','銅塊':'unknown-sample-copper.webp','鎂塊':'unknown-sample-magnesium.webp','石墨塊':'unknown-sample-graphite.webp','鈦塊':'unknown-sample-titanium.webp','木塊':'unknown-sample-wood.webp'});
export const DEFAULT_HEATS=Object.freeze(Object.values(SAMPLE_NAMES).map(name=>MATERIAL_SPECIFIC_HEATS[name]));
export const INITIAL_TEMPERATURE=20;
export const LIMITS=Object.freeze({mass:Object.freeze([100,350]),heat:Object.freeze([100,3000])});
export function validSetting(value,key){const bounds=LIMITS[key];return Boolean(bounds)&&Number.isFinite(value)&&value>=bounds[0]&&value<=bounds[1];}
export function observeSample(specificHeat,mass,heat,progress){
 if(!Number.isFinite(specificHeat)||specificHeat<=0||!validSetting(mass,'mass')||!validSetting(heat,'heat')||!Number.isFinite(progress)||progress<0||progress>1)throw new RangeError('樣品或觀察條件無效');
 const absorbed=heat*progress;return {heat:absorbed,temperature:INITIAL_TEMPERATURE+absorbed/(mass*specificHeat)};
}
export function gradeSample(record,specificHeat,value){
 if(value===undefined||value===null||String(value).trim()==='')return 'missing';
 const n=Number(value);if(!Number.isFinite(n)||n<=0)return 'invalid';if(!record)return 'unobserved';
 // 接受使用螢幕上四捨五入讀值計算的結果，也接受模型原始值。
 const displayedRise=Number(record.temperature)-INITIAL_TEMPERATURE;
 const inferred=record.heat/(record.mass*displayedRise);
 return Math.abs(n-specificHeat)<=.005000001||Math.abs(n-inferred)<=.005000001?'correct':'incorrect';
}
export function gradeRanking(specificHeats,order){
 if(!Array.isArray(order)||order.length!==SAMPLE_IDS.length||order.some(x=>!SAMPLE_IDS.includes(x)))return 'missing';
 if(new Set(order).size!==SAMPLE_IDS.length)return 'duplicate';
 const sorted=[...SAMPLE_IDS].sort((a,b)=>specificHeats[b]-specificHeats[a]);
 return order.every((id,i)=>id===sorted[i])?'correct':'incorrect';
}
