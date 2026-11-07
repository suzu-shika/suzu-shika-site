import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {parse} from 'parse5';
const pkg=JSON.parse(fs.readFileSync('node_modules/astro/package.json'));
const bin='node_modules/astro/'+(typeof pkg.bin==='string'?pkg.bin:pkg.bin.astro);
function find(n,p,r=[]){if(p(n))r.push(n);for(const c of n.childNodes||[])find(c,p,r);return r;}
const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
const text=n=>n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join('');
const cases=[4,5,6,7,12,13].map(count=>({count})).concat([0,2,3,4].map(featured=>({count:5,featured})));
const results=[];
for(const c of cases){
  const label=c.featured===undefined?'count-'+c.count:'featured-'+c.featured;
  const out='../入稿準備/2026-11-07_境界_'+label;
  const env={...process.env,WORKS_LOCAL_FIXTURE:'1',WORKS_FIXTURE_COUNT:String(c.count)};
  delete env.WORKS_OPTIONAL_EMPTY;delete env.WORKS_FEATURED_COUNT;
  if(c.featured!==undefined)env.WORKS_FEATURED_COUNT=String(c.featured);
  const result=spawnSync(process.execPath,[bin,'build','--outDir',out],{env,encoding:'utf8'});
  fs.writeFileSync(out+'.log',result.stdout+result.stderr);
  assert.equal(result.status,0,label+' build');
  const pages=Math.ceil(c.count/6);
  for(let page=1;page<=pages;page++){
    const path=page===1?'/works/':'/works/'+page+'/';
    const doc=parse(fs.readFileSync(out+path+'index.html','utf8'));
    const canonical=attr(find(doc,n=>n.tagName==='link'&&attr(n,'rel')==='canonical')[0],'href');
    assert.equal(canonical,'https://suzu-shika.com'+path);
    assert(find(doc,n=>n.tagName==='title').some(n=>page===1||text(n).includes(page+'ページ目')));
    const data=find(doc,n=>n.tagName==='script'&&attr(n,'type')==='application/ld+json').flatMap(n=>JSON.parse(text(n)));
    assert.equal(data.find(n=>n['@type']==='WebPage')?.url,canonical);
    const crumbs=data.find(n=>n['@type']==='BreadcrumbList').itemListElement;
    assert.deepEqual(crumbs.map(n=>n.name),page===1?['ホーム','制作事例一覧']:['ホーム','制作事例一覧',page+'ページ目']);
    const nav=find(doc,n=>n.tagName==='nav'&&attr(n,'aria-label')==='制作事例のページ切り替え')[0];
    if(pages===1)assert(!nav);else{
      assert(nav);const links=find(nav,n=>n.tagName==='a');
      assert.equal(attr(links.find(n=>attr(n,'aria-current')==='page'),'href'),path);
      assert.equal(links.length,pages+(page>1?1:0)+(page<pages?1:0));
      for(const link of links)assert(!attr(link,'href').includes('/works/1/'));
    }
  }
  assert(!fs.existsSync(out+'/works/1/index.html'));
  const sitemap=fs.readFileSync(out+'/sitemap-0.xml','utf8');assert(!sitemap.includes('/works/1/'));
  for(let p=2;p<=pages;p++)assert(sitemap.includes('/works/'+p+'/'));
  const top=fs.readFileSync(out+'/index.html','utf8');
  if(c.featured!==undefined){assert.equal((top.match(/class="top-works-card"/g)||[]).length,Math.min(3,c.featured));if(c.featured===4)assert(/warn|警告|featured/i.test(result.stdout+result.stderr));}
  results.push({...c,pages,result:'PASS'});console.log(JSON.stringify(results.at(-1)));
}
fs.writeFileSync('../入稿準備/2026-11-07_境界テスト結果.json',JSON.stringify(results,null,2)+'\n');
