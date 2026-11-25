// يربط خطة التوزيع الأسبوعي المقدمة من المعلم بفهرس الكتاب، ليعرض دروس الأسبوع الحالي أو القادم.
import {suppliedPlans} from '../../features/preparation.mjs';
import {curriculum} from './curriculum.mjs';
const en=s=>String(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const day=s=>{const m=en(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);return m?Date.UTC(+m[1],+m[2]-1,+m[3]):NaN};
export const norm=s=>en(s).replace(/[ً-ْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[^ء-ي0-9]/g,'');
export function weekFor(gradeName,date=new Date()){const plan=suppliedPlans.find(p=>p.grade===gradeName);if(!plan)return null;const today=Date.UTC(date.getFullYear(),date.getMonth(),date.getDate());
  const weeks=plan.weeks.filter(w=>w.number&&Array.isArray(w.lessons)).map(w=>({...w,from:day(w.gregorianFrom),to:day(w.gregorianTo)})).filter(w=>!isNaN(w.from)).sort((a,b)=>a.from-b.from);
  const now=weeks.find(w=>today>=w.from&&today<=w.to+2*864e5);if(now)return {week:now,current:true};const next=weeks.find(w=>w.from>today);return next?{week:next,current:false}:null;}
export function matchLessons(gradeId,planLessons){const c=curriculum[gradeId];if(!c)return [];const items=c.chapters.flatMap((ch,ci)=>ch.items.map((it,ii)=>({...it,ci,ii,chapter:ch.title,key:norm(it.title.replace(/^استكشاف: |^توسع: /,''))})));
  return planLessons.map(text=>{const part=String(text).split('←').pop().trim(),chapter=String(text).includes('←')?norm(String(text).split('←')[0]):'',k=norm(part.replace(/^استكشاف: |^توسع: /,''));
    if(!k||['مراجعه','مراجعهعامه'].includes(k))return {text:part,item:null};
    const pool=items.filter(i=>!chapter||norm(i.chapter)===chapter),scope=pool.length?pool:items;
    const isExplore=/^استكشاف|^توسع/.test(part);
    const hit=scope.find(i=>i.key===k&&(i.kind==='X')===isExplore)||scope.find(i=>i.key===k)||scope.find(i=>k.length>5&&(i.key.includes(k)||k.includes(i.key))&&i.key.length>5);
    return {text:part,item:hit||null};});}
