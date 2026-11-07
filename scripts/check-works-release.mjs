import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {parse,parseFragment} from 'parse5';
import {fetchPublishedWorks} from '../src/lib/microcms.mjs';
import {validateWork} from '../src/lib/work-validation.mjs';
import {workImageUrl} from '../src/lib/work-image.mjs';

const out=process.env.WORKS_CHECK_OUTPUT || '../入稿準備/2026-11-06_公開前検証';
const raw=JSON.parse(await fs.readFile(process.env.WORKS_CHECK_DATA || '../入稿準備/2026-11-06_公開前再取得5件.json','utf8'));
// Apply the production ID/order checks to the original records, before fixture synthesis.
const works=await fetchPublishedWorks({MICROCMS_SERVICE_DOMAIN:'suzu-shika-site-astro',MICROCMS_API_KEY:'local-validation'},async()=>({ok:true,json:async()=>({contents:Object.values(raw),offset:0,totalCount:5})}));
assert.deepEqual(works.map(w=>w.id),['koyomi-yoga-pilates','oita-campus-link','tokorozawa-biz-community','alohilani','mahana']);
for(const work of works){validateWork(work);assert(!Object.hasOwn(work,'category'));}
assert.deepEqual(works.filter(w=>w.featured).map(w=>w.id),works.slice(0,3).map(w=>w.id));
function find(n,p,result=[]){if(p(n))result.push(n);for(const c of n.childNodes||[])find(c,p,result);return result;}
const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
const cls=(n,c)=>attr(n,'class')?.split(' ').includes(c);
const text=n=>n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join(' ');
const visibleText=n=>['script','style'].includes(n.tagName)?'':n.nodeName==='#text'?n.value:(n.childNodes||[]).map(visibleText).join(' ');
const norm=s=>s.replace(/\s/g,'');
const canon=doc=>find(doc,n=>n.tagName==='link'&&attr(n,'rel')==='canonical').map(n=>attr(n,'href'));
const json=doc=>find(doc,n=>n.tagName==='script'&&attr(n,'type')==='application/ld+json').flatMap(n=>JSON.parse(text(n)));
export function blockingRobots(doc){return find(doc,n=>n.tagName==='meta'&&(/^(robots|.*bot(?:-news)?)$/i.test(attr(n,'name')||'')||/^x-robots-tag$/i.test(attr(n,'http-equiv')||''))).filter(n=>(attr(n,'content')||'').split(/[\s,]+/).some(t=>/^(noindex|none)$/i.test(t)));}
for(const content of ['noindex','NOINDEX,follow','none','index, none'])assert.equal(blockingRobots(parse('<meta name="googlebot" content="'+content+'">')).length,1);
for(const content of ['index,follow','max-image-preview:none',''])assert.equal(blockingRobots(parse('<meta name="robots" content="'+content+'">')).length,0);
const results=[];
const sectionFields={problems:'works-problem',productionNotes:'works-production',reactions:'works-reaction',recommendedFor:'works-target',testimonialQuotes:'works-voice'};
for(const work of works){
  const doc=parse(await fs.readFile(out+'/works/'+work.id+'/index.html','utf8'));
  assert.equal(blockingRobots(doc).length,0,work.id+' has noindex');
  assert.deepEqual(canon(doc),['https://suzu-shika.com/works/'+work.id]);
  assert.equal(text(find(doc,n=>n.tagName==='title')[0]),work.seoTitle);
  assert.equal(attr(find(doc,n=>n.tagName==='meta'&&attr(n,'name')==='description')[0],'content'),work.seoDescription);
  const ld=json(doc); const page=ld.find(n=>n['@type']==='WebPage');
  assert(page);assert.equal(page.url,canon(doc)[0]);assert.equal(page.description,work.seoDescription);
  const crumb=ld.find(n=>n['@type']==='BreadcrumbList');assert(crumb);
  assert.deepEqual(crumb.itemListElement.map(n=>n.name),['ホーム','制作事例一覧',work.title]);
  const crumbDom=find(doc,n=>attr(n,'aria-label')==='パンくずリスト')[0];assert(crumbDom);
  assert.deepEqual(find(crumbDom,n=>n.tagName==='li').map(n=>text(n).trim()),['ホーム','制作事例一覧',work.title]);
  for(const [field,section] of Object.entries(sectionFields)){
    const node=find(doc,n=>cls(n,section))[0];
    if(!work[field])assert(!node,work.id+' unexpected '+section);
    else {assert(node);assert(norm(text(node)).includes(norm(text(parseFragment(work[field])))),work.id+' copy '+field);}
  }
  const images=find(doc,n=>n.tagName==='img'&&attr(n,'src')?.startsWith('https://images.microcms-assets.io/'));
  assert.equal(images.length,5);
  for(const [i,key] of ['thumbnail','pcImage1','pcImage2','spImage1','spImage2'].entries()){
    assert.equal(attr(images[i],'alt'),work[key+'Alt']);
    assert.equal(attr(images[i],'src'),workImageUrl(work[key],key==='thumbnail'?640:key.startsWith('pc')?600:180));
  }
  if(work.id!=='tokorozawa-biz-community'){
    const old=parse(await fs.readFile('../入稿準備/a-baseline/works/'+work.id+'/index.html','utf8'));
    for(const section of ['works-kv','works-overview','works-problem','works-basic-design','works-production','works-reaction','works-voice','works-target']){
      const a=find(old,n=>cls(n,section))[0],b=find(doc,n=>cls(n,section))[0];
      if(a&&b)assert.equal(norm(text(b)),norm(text(a)).replace('読みやすさをし最優先','読みやすさを最優先'),work.id+' legacy copy '+section);
    }
  }
  results.push({id:work.id,noindex:false,canonical:canon(doc)[0],seo:true,copy:true,images:5});
}
for(const route of ['index.html','works/index.html','lp-yoga-pilates/index.html','web-consultation/index.html','contact/index.html','privacy-policy/index.html']){
  const doc=parse(await fs.readFile(out+'/'+route,'utf8'));assert.equal(blockingRobots(doc).length,0,route+' noindex');
  if(route==='index.html'||route==='works/index.html'){
    const cards=find(doc,n=>cls(n,'top-works-card'));assert.equal(cards.length,route==='index.html'?3:5);
    assert.deepEqual(cards.map(n=>attr(n,'href')),works.slice(0,cards.length).map(w=>'/works/'+w.id));
    if(route==='works/index.html'){
      const page=json(doc).find(n=>n['@type']==='WebPage'); assert(page,'List WebPage JSON-LD missing');
      assert.equal(page.url,'https://suzu-shika.com/works/');assert.deepEqual(canon(doc),[page.url]);
    }
  }else{
    const old=parse(await fs.readFile('../入稿準備/a-baseline/'+route,'utf8'));
    assert.equal(norm(visibleText(find(doc,n=>n.tagName==='main')[0]||doc)),norm(visibleText(find(old,n=>n.tagName==='main')[0]||old)),route+' unchanged copy');
    assert.deepEqual(canon(doc),canon(old),route+' canonical unchanged');
  }
}
const sitemap=await fs.readFile(out+'/sitemap-0.xml','utf8');
for(const work of works)assert(sitemap.includes('https://suzu-shika.com/works/'+work.id));
assert(!/kvvcpkalgl|\/works\/1\/|fixture-/.test(sitemap));
const robots=await fs.readFile(out+'/robots.txt','utf8');assert(!/^Disallow:[\t ]*\S/im.test(robots));
if(process.env.WORKS_CHECK_URL){
  const base=new URL(process.env.WORKS_CHECK_URL);assert.equal(base.hostname,'127.0.0.1');
  const http=[];
  for(const path of ['/','/works/',...works.map(w=>'/works/'+w.id+'/'),'/lp-yoga-pilates/','/web-consultation/','/contact/','/privacy-policy/']){
    const res=await fetch(new URL(path,base),{signal:AbortSignal.timeout(15000)});
    assert.equal(res.status,200,path);const header=res.headers.get('x-robots-tag');assert(!header||!/(?:^|[\s,:])(noindex|none)(?:$|[\s,])/i.test(header),path+' X-Robots-Tag');
    http.push({path,status:res.status,xRobotsTag:header});await res.arrayBuffer();
  }
  await fs.writeFile(process.env.WORKS_HTTP_RESULT || '../入稿準備/2026-11-07_ローカルHTTP検査.json',JSON.stringify(http,null,2)+'\n');
}
console.log(JSON.stringify({result:'PASS',rawRecords:5,productionCandidateNoindex:false,details:results,unchangedPages:4},null,2));
