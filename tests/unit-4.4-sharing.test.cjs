const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('4.4 分享網址與圖片指向正式網站',()=>{
 const base='https://billlaitrade.github.io/k12_public_code/units/4/parts/4.4/',html=fs.readFileSync(path.join(__dirname,'../units/4/parts/4.4/index.html'),'utf8');
 const meta=(attr,name)=>{const re=new RegExp(`<meta\\s+${attr}="${name}"\\s+content="([^"]+)"`);const match=html.match(re);assert.ok(match,`missing ${name}`);return match[1];};
 assert.ok(html.includes(`<link rel="canonical" href="${base}">`));assert.equal(meta('property','og:url'),base);
 const image=base+'assets/park-map-magnifier-cover-v2.webp';assert.equal(meta('property','og:image'),image);assert.equal(meta('name','twitter:image'),image);assert.ok(fs.existsSync(path.join(__dirname,'../units/4/parts/4.4/assets/park-map-magnifier-cover-v2.webp')));
});
