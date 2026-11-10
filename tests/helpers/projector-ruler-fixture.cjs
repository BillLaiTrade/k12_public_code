async function moveProjectorWithRuler(root,key,value){
 await root.locator(`[data-projector-select=${key}]`).click();
 const ruler=root.locator(`[data-projector-position=rail]`),range=await ruler.evaluate(e=>({min:Number(e.dataset.rangeMin),max:Number(e.dataset.rangeMax)})),box=await ruler.boundingBox(),page=ruler.page();
 const x=Math.max(.1,Math.min(box.width-.1,(Number(value)-range.min)/(range.max-range.min)*box.width));
 await ruler.click({position:{x,y:box.height/2}});
 for(let i=0;i<4;i++){
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const current=Number(await root.getAttribute(`data-${key}`)),difference=Number(value)-current;
  if(Math.abs(difference)<.001)return;
  await ruler.press(difference>0?'ArrowRight':'ArrowLeft');
 }
}
module.exports={moveProjectorWithRuler};
