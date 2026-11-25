// كشوف الفصول: تُحفظ في هذا المتصفح فقط، ولا تُرفع إلى الموقع أو الخادم، ولا تدخل في ملف التصدير العام.
const KEY='class-rosters-v1';
const MAX_NAMES=60,MAX_LEN=80;
function all(){try{const d=JSON.parse(localStorage.getItem(KEY)||'{}');return d&&typeof d==='object'&&!Array.isArray(d)?d:{}}catch{return {}}}
export function parseNames(text){const seen=new Set(),out=[];for(const raw of String(text||'').split(/\r?\n|\t|،|,/)){const name=raw.replace(/^\s*\d+[\s.)\-–]*/,'').replace(/\s+/g,' ').trim().slice(0,MAX_LEN);if(name&&!seen.has(name)){seen.add(name);out.push(name);}if(out.length>=MAX_NAMES)break;}return out;}
export function getRoster(sectionId){const r=all()[sectionId];return Array.isArray(r)?r.filter(x=>typeof x==='string'&&x.length&&x.length<=MAX_LEN).slice(0,MAX_NAMES):[];}
export function saveRoster(sectionId,names){if(typeof sectionId!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(sectionId))throw Error('فصل غير صالح.');const d=all();if(names.length)d[sectionId]=names.slice(0,MAX_NAMES);else delete d[sectionId];localStorage.setItem(KEY,JSON.stringify(d));}
export function makeGroups(names,count,rand=Math.random){const k=Math.max(2,Math.min(8,Math.floor(count)||2)),a=[...names];for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}const groups=Array.from({length:Math.min(k,Math.max(1,a.length))},()=>[]);a.forEach((x,i)=>groups[i%groups.length].push(x));return groups;}
