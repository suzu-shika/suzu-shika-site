import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parse} from 'parse5';
import sharp from 'sharp';
import {workImageUrl} from '../src/lib/work-image.mjs';

const out = process.env.WORKS_CHECK_OUTPUT || '../入稿準備/2026-11-06_PNG最適化プレビュー';
const fixture = JSON.parse(await fs.readFile('../入稿準備/2026-11-06_公開前再取得5件.json','utf8'));
const work = fixture['tokorozawa-biz-community'];
assert(work && !work.testimonialQuotes);
const plain = {url:'https://images.microcms-assets.io/assets/test.png',width:600};
const scaled = new URL(workImageUrl(plain,800));
assert.equal(scaled.searchParams.get('w'),'600');
assert.equal(scaled.searchParams.get('fm'),'webp');
assert.equal(new URL(workImageUrl(plain,300)).searchParams.get('w'),'300');
for (const url of ['https://images.microcms-assets.io/a.webp','https://images.microcms-assets.io/a.svg','https://example.com/a.png']) {
  assert.equal(workImageUrl({url},600),url);
}
assert.throws(()=>workImageUrl(plain,0));

function nodes(n,p,result=[]) { if(p(n))result.push(n); for(const c of n.childNodes||[])nodes(c,p,result); return result; }
const attr=(n,key)=>n.attrs?.find(a=>a.name===key)?.value;
const html=await fs.readFile(out+'/works/'+work.id+'/index.html','utf8');
const doc=parse(html);
assert.equal(nodes(doc,n=>attr(n,'class')?.split(' ').includes('works-voice')).length,0);
assert(!html.includes('works-voice-signature'));
assert(!html.includes('CTA（行動喚起）セクションのの'));
assert(html.includes('https://suzu-shika.com/works/'+work.id));
await assert.rejects(fs.access(out+'/works/kvvcpkalgl/index.html'));
const imgs=nodes(doc,n=>n.tagName==='img' && attr(n,'src')?.startsWith('https://images.microcms-assets.io/'));
assert.equal(imgs.length,5);
for(const image of imgs)assert.equal(new URL(attr(image,'src')).searchParams.get('fm'),'webp');
for(const route of ['index.html','works/index.html']) {
  const listing=await fs.readFile(out+'/'+route,'utf8');
  assert(listing.includes('/works/'+work.id));
  assert(!listing.includes('/works/kvvcpkalgl'));
  assert(listing.includes('fm=webp'));
}
const sitemap=await fs.readFile(out+'/sitemap-0.xml','utf8');
assert(sitemap.includes('/works/'+work.id));
assert(!sitemap.includes('kvvcpkalgl'));
const oita=await fs.readFile(out+'/works/oita-campus-link/index.html','utf8');
assert(!oita.includes('読みやすさをし最優先'));
assert(oita.includes('読みやすさを最優先'));
console.log('Image URL, optional voice, corrected copy and routes: PASS');

if(process.argv.includes('--http')) {
  const results=[];
  for(const [field,width] of [['thumbnail',800],['pcImage1',600],['pcImage2',600],['spImage1',180],['spImage2',180]]) {
    const image=work[field];
    const pair=[];
    for(const [variant,url] of [['original',image.url],['webp',workImageUrl(image,width)]]) {
      const res=await fetch(url,{signal:AbortSignal.timeout(30000)});
      assert.equal(res.status,200);
      const bytes=Buffer.from(await res.arrayBuffer());
      const meta=await sharp(bytes).metadata();
      assert.equal(meta.format,variant==='original'?'png':'webp');
      assert.equal(meta.width,image.width); assert.equal(meta.height,image.height);
      if(variant==='webp')assert.match(res.headers.get('content-type'),/^image\/webp/);
      pair.push({variant,status:res.status,type:res.headers.get('content-type'),bytes:bytes.length,width:meta.width,height:meta.height});
      await fs.writeFile('../入稿準備/2026-11-06_'+field+'_'+variant+(variant==='original'?'.png':'.webp'),bytes);
    }
    const result={field,original:pair[0],optimized:pair[1],reductionPercent:Math.round((1-pair[1].bytes/pair[0].bytes)*1000)/10};
    results.push(result); console.log(JSON.stringify(result));
  }
  await fs.writeFile('../入稿準備/2026-11-06_画像API検証結果.json',JSON.stringify(results,null,2)+'\n');
}
