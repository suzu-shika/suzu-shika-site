import {validateWork} from './work-validation.mjs';
import {fetchPublishedWorks,requirePublishedWorks} from './microcms.mjs';
export async function getWorks(){
 if(process.env.WORKS_LOCAL_FIXTURE==='1'){
  if(process.env.NETLIFY)throw Error('Fixture prohibited on Netlify');
  const {readFile}=await import('node:fs/promises');
  const data=JSON.parse(await readFile(process.cwd()+'/../入稿準備/2026-11-06_修正確認後5件fixture.json','utf8'));
  const originals=Object.values(data).sort((a,b)=>a.displayOrder-b.displayOrder);
  if(process.env.WORKS_OPTIONAL_EMPTY==='1')for(const work of originals)for(const key of ['siteUrl','problems','informationDesign','navigationDesign','operationDesign','productionNotes','reactions','recommendedFor','testimonialQuotes','testimonialRole','testimonialName','pcImage1','pcImage2','spImage1','spImage2'])delete work[key];
  const count=Number(process.env.WORKS_FIXTURE_COUNT||originals.length);
  if(!Number.isInteger(count)||count<1||count>100)throw Error('Invalid fixture count');
  return Array.from({length:count},(_,i)=>({...originals[i%originals.length],id:i<originals.length?originals[i].id:'fixture-'+(i+1),displayOrder:i+1,featured:process.env.WORKS_FEATURED_COUNT===undefined?originals[i%originals.length].featured:i<Number(process.env.WORKS_FEATURED_COUNT)})).map(validateWork);
 }
 return requirePublishedWorks(await fetchPublishedWorks({MICROCMS_SERVICE_DOMAIN:import.meta.env.MICROCMS_SERVICE_DOMAIN,MICROCMS_API_KEY:import.meta.env.MICROCMS_API_KEY})).map(validateWork);
}
