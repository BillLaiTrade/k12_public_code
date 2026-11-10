const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),units=path.join(root,'units'),base='https://billlaitrade.github.io/k12_public_code/';
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function attrs(tag){return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)].map(m=>[m[1],m[2]]));}
test('所有單元頁面和程式不指向舊展示網站，分享網址與圖片可對應本庫',()=>{
 const paths=files(units),pages=paths.filter(p=>p.endsWith('/index.html'));let pagesWithMetadata=0,images=0;
 for(const file of paths.filter(p=>/\.(?:html|mjs|js|css)$/.test(p))){const content=fs.readFileSync(file,'utf8');assert.doesNotMatch(content,/https?:\/\/billlaitrade\.github\.io\/k12-learning-demos(?:\/|["'\s?#]|$)/i,file);}
 for(const page of pages){const html=fs.readFileSync(page,'utf8'),tags=[...html.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map(m=>attrs(m[0])),canonical=tags.find(a=>a.rel==='canonical')?.href,og=tags.find(a=>a.property==='og:url')?.content;
  if(canonical||og){pagesWithMetadata++;assert.equal(canonical,og,page);assert.ok(canonical.startsWith(base),page);const u=new URL(canonical),target=path.join(root,decodeURIComponent(u.pathname.slice('/k12_public_code/'.length)));assert.equal(path.resolve(target.endsWith('.html')?target:path.join(target,'index.html')),page,page);}
  for(const a of tags.filter(a=>a.property==='og:image'||a.name==='twitter:image')){images++;assert.ok(a.content.startsWith(base),page);const u=new URL(a.content),target=path.join(root,decodeURIComponent(u.pathname.slice('/k12_public_code/'.length)));assert.ok(fs.statSync(target).isFile(),`${page}: ${a.content}`);}
 }
 assert.ok(pages.length>=25);assert.ok(pagesWithMetadata>=16);assert.ok(images>=28);
});
test('2.1 的分享圖片與首頁封面、替代文字及尺寸一致',()=>{
 const page=path.join(units,'2/parts/2.1/index.html'),html=fs.readFileSync(page,'utf8');
 const tags=[...html.matchAll(/<(?:meta|img)\b[^>]*>/gi)].map(m=>attrs(m[0]));
 const meta=key=>tags.find(a=>a.property===key||a.name===key)?.content;
 const cover=tags.find(a=>a.src==='assets/unit-opening-cover.png');assert.ok(cover);
 const image=base+'units/2/parts/2.1/'+cover.src;assert.equal(meta('og:image'),image);assert.equal(meta('twitter:image'),image);
 assert.equal(meta('og:image:alt'),cover.alt);assert.equal(meta('twitter:image:alt'),cover.alt);assert.equal(meta('twitter:card'),'summary_large_image');
 const png=fs.readFileSync(path.join(units,'2/parts/2.1',cover.src));assert.equal(Number(meta('og:image:width')),png.readUInt32BE(16));assert.equal(Number(meta('og:image:height')),png.readUInt32BE(20));
});
