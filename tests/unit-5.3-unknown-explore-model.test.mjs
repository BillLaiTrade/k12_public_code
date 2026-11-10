import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {DEFAULT_HEATS,SAMPLE_IDS,SAMPLE_NAMES,MATERIAL_SPECIFIC_HEATS,MATERIAL_IMAGES,observeSample,gradeSample,gradeRanking,validSetting} from '../units/5/parts/5.3/assets/unknown-explore-model.mjs';
test('真實材料標籤對應固定近似比熱，與樣品順序無關',()=>{
 assert.deepEqual(SAMPLE_NAMES,{a:'鋁塊',b:'玻璃塊',c:'鐵塊',d:'銅塊'});assert.deepEqual(MATERIAL_SPECIFIC_HEATS,{'鋁塊':.22,'玻璃塊':.20,'鐵塊':.11,'銅塊':.09,'鎂塊':.24,'石墨塊':.17,'鈦塊':.12,'木塊':.42});assert.deepEqual(DEFAULT_HEATS,[.22,.20,.11,.09]);assert.deepEqual(Object.keys(MATERIAL_IMAGES),Object.keys(MATERIAL_SPECIFIC_HEATS));
 for(const file of Object.values(MATERIAL_IMAGES))assert.equal(existsSync(new URL(`../units/5/parts/5.3/assets/${file}`,import.meta.url)),true,`${file} exists`);
});
test('自由質量與熱量的溫升、顯示精度及比熱排列',()=>{
 assert.equal(validSetting(99,'mass'),false);assert.equal(validSetting(350,'mass'),true);assert.equal(validSetting(3000.1,'heat'),false);
 for(const c of DEFAULT_HEATS)for(const [m,q] of [[350,100],[100,100],[100,3000],[175.5,750.5]]){
  const halfway=observeSample(c,m,q,.5),end=observeSample(c,m,q,1),record={mass:m,heat:q,temperature:end.temperature.toFixed(2)};
  assert.ok(Math.abs(halfway.temperature-20-(end.temperature-20)/2)<1e-10);
  assert.equal(gradeSample(record,c,(q/(m*(Number(record.temperature)-20))).toFixed(2)),'correct');
  assert.equal(gradeSample(record,c,''),'missing');assert.equal(gradeSample(record,c,'-1'),'invalid');
 }
 const heats=Object.fromEntries(SAMPLE_IDS.map((id,i)=>[id,DEFAULT_HEATS[i]]));
 assert.equal(gradeRanking(heats,['a','b','c','d']),'correct');assert.equal(gradeRanking(heats,['a','a','c','d']),'duplicate');assert.equal(gradeRanking(heats,['a','','c','d']),'missing');
});
