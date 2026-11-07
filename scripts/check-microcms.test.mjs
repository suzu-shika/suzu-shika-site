import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchPublishedWorks, requirePublishedWorks } from '../src/lib/microcms.mjs';
const env = { MICROCMS_SERVICE_DOMAIN: 'suzu-shika-site-astro', MICROCMS_API_KEY: 'fake-test-value' };
const page = (contents, totalCount = contents.length, offset = 0) => ({ok:true,json:async()=>({contents,totalCount,offset})});
test('GET pagination stays on approved host, disallows redirects, and returns all records', async()=>{
 let calls=0;
 const works=await fetchPublishedWorks(env,async(url,options)=>{
  assert.equal(url.origin,'https://suzu-shika-site-astro.microcms.io');
  assert.equal(options.method,'GET'); assert.equal(options.redirect,'error');
  assert.equal(url.searchParams.get('offset'),String(calls*100));
  const offset=calls++*100;
  return page(Array.from({length:offset===0?100:1},(_,i)=>({id:`work-${offset+i}`,displayOrder:offset+i})),101,offset);
 }); assert.equal(works.length,101);assert.equal(calls,2);
});
test('missing key or unapproved domain never makes a request',async()=>{
 for(const config of [{},{...env,MICROCMS_SERVICE_DOMAIN:'unapproved'}])
  await assert.rejects(fetchPublishedWorks(config,()=>assert.fail('must not fetch')),/CMS_(ENV_MISSING|DOMAIN_INVALID)/);
});
test('network and HTTP errors do not expose raw secrets or response bodies',async()=>{
 await assert.rejects(fetchPublishedWorks(env,async()=>{throw Error('fake-test-value')}), e=>e.message==='CMS_NETWORK: GET通信が失敗しました');
 await assert.rejects(fetchPublishedWorks(env,async()=>({ok:false,status:403,json:()=>assert.fail('must not read body')})),/CMS_HTTP_403/);
});
test('incomplete pages and duplicate ordering fail closed',async()=>{
 await assert.rejects(fetchPublishedWorks(env,async()=>page([],1)),/CMS_INCOMPLETE/);
 await assert.rejects(fetchPublishedWorks(env,async()=>page([{id:'one',displayOrder:1},{id:'two',displayOrder:1}])),/CMS_ORDER/);
});
test('empty GET is valid for connection check but not production generation',async()=>{
 const works=await fetchPublishedWorks(env,async()=>page([]));assert.deepEqual(works,[]);
 assert.throws(()=>requirePublishedWorks(works),/CMS_EMPTY/);
});
