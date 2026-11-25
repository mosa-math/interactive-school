// طبقة الكتابة فوق صفحات الكتاب (مثل GoodNotes): قلم، قلم تظليل، ممحاة، تراجع.
// الخطوط تُحفظ إحداثيات نسبية في قاعدة محلية منفصلة (book-notes-v1) على هذا الجهاز فقط.
const DB='book-notes-v1',STORE='pages';
function db(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function tx(mode,fn){const d=await db();try{return await new Promise((res,rej)=>{const t=d.transaction(STORE,mode),r=fn(t.objectStore(STORE));t.oncomplete=()=>res(r?.result);t.onerror=()=>rej(t.error);});}finally{d.close();}}
export const loadStrokes=key=>tx('readonly',s=>s.get(key)).then(v=>Array.isArray(v)?v:[]).catch(()=>[]);
const saveStrokes=(key,strokes)=>tx('readwrite',s=>strokes.length?s.put(strokes,key):s.delete(key)).catch(()=>{});
export const countNotes=prefix=>tx('readonly',s=>s.getAllKeys()).then(keys=>(keys||[]).filter(k=>String(k).startsWith(prefix)).length).catch(()=>0);

export const COLORS=[['#17212D','أسود'],['#1D4ED8','أزرق'],['#C81E1E','أحمر'],['#0F6E64','أخضر'],['#B45309','برتقالي']];
export const HIGHLIGHTS=[['#FDE047','أصفر'],['#86EFAC','أخضر فاتح'],['#F9A8D4','وردي'],['#93C5FD','أزرق فاتح']];
export const SIZES=[['رفيع',0.0025],['متوسط',0.0045],['عريض',0.008]];

export const ink={tool:'view',color:COLORS[0][0],hl:HIGHLIGHTS[0][0],size:SIZES[1][1],key:'',strokes:[],undo:[],canvas:null,live:null,saveT:0};

function stroke(ctx,s,W,H){if(!s.p.length)return;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  if(s.t==='hl'){ctx.globalAlpha=.38;ctx.globalCompositeOperation='multiply';ctx.lineWidth=s.w*W*4.5;ctx.lineCap='butt';}else ctx.lineWidth=s.w*W;
  ctx.strokeStyle=s.c;ctx.beginPath();const [x0,y0]=s.p[0];ctx.moveTo(x0*W,y0*H);
  if(s.p.length===1){ctx.lineTo(x0*W+.1,y0*H+.1);}else for(let i=1;i<s.p.length-1;i++){const [x1,y1]=s.p[i],[x2,y2]=s.p[i+1];ctx.quadraticCurveTo(x1*W,y1*H,(x1+x2)/2*W,(y1+y2)/2*H);}
  if(s.p.length>1){const [xl,yl]=s.p[s.p.length-1];ctx.lineTo(xl*W,yl*H);}ctx.stroke();ctx.restore();}
export function redraw(){const cv=ink.canvas;if(!cv)return;const ctx=cv.getContext('2d'),W=cv.width,H=cv.height;ctx.clearRect(0,0,W,H);
  for(const s of ink.strokes.filter(s=>s.t==='hl'))stroke(ctx,s,W,H);for(const s of ink.strokes.filter(s=>s.t!=='hl'))stroke(ctx,s,W,H);if(ink.live)stroke(ctx,ink.live,W,H);}
function persist(){clearTimeout(ink.saveT);const key=ink.key,data=ink.strokes.slice();ink.saveT=setTimeout(()=>saveStrokes(key,data),250);}

export async function attach(canvas,key){ink.canvas=canvas;if(ink.key!==key){ink.key=key;ink.undo=[];ink.strokes=await loadStrokes(key);}redraw();bind(canvas);updateCursor();}
export function updateCursor(){const cv=ink.canvas;if(!cv)return;cv.style.pointerEvents=ink.tool==='view'?'none':'auto';cv.style.cursor=ink.tool==='erase'?'cell':'crosshair';}
export function undo(){const last=ink.undo.pop();if(!last)return false;ink.strokes=last;redraw();persist();return true;}
export function clearPage(){if(!ink.strokes.length)return;ink.undo.push(ink.strokes.slice());ink.strokes=[];redraw();persist();}

function bind(cv){if(cv._bound)return;cv._bound=true;
  const pt=e=>{const r=cv.getBoundingClientRect();return [Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))];};
  let erasing=false,changed=false;
  const eraseAt=([x,y])=>{const r=cv.getBoundingClientRect(),tol=14/r.width,ar=r.height/r.width;const keep=ink.strokes.filter(s=>!s.p.some(([a,b])=>Math.hypot(a-x,(b-y)*ar)<tol+s.w*(s.t==='hl'?2.3:.5)));if(keep.length!==ink.strokes.length){if(!changed)ink.undo.push(ink.strokes.slice());changed=true;ink.strokes=keep;redraw();}};
  cv.addEventListener('pointerdown',e=>{if(ink.tool==='view')return;if(e.pointerType==='touch'&&e.isPrimary===false)return;e.preventDefault();cv.setPointerCapture(e.pointerId);
    if(ink.tool==='erase'){erasing=true;changed=false;eraseAt(pt(e));return;}
    ink.live={t:ink.tool==='hl'?'hl':'pen',c:ink.tool==='hl'?ink.hl:ink.color,w:ink.size,p:[pt(e)]};redraw();});
  cv.addEventListener('pointermove',e=>{if(erasing){eraseAt(pt(e));return;}if(!ink.live)return;const evs=e.getCoalescedEvents?.()||[e];for(const ev of evs){const p=pt(ev),l=ink.live.p[ink.live.p.length-1];if(Math.hypot(p[0]-l[0],p[1]-l[1])>.0012)ink.live.p.push(p);}redraw();});
  const end=()=>{if(erasing){erasing=false;if(changed)persist();return;}if(!ink.live)return;const s=ink.live;ink.live=null;
    if(s.t==='hl'&&s.p.length>1){const [x0,y0]=s.p[0],[x1,y1]=s.p[s.p.length-1];if(Math.abs(y1-y0)<.02)s.p=[[x0,(y0+y1)/2],[x1,(y0+y1)/2]];}
    s.p=s.p.map(([x,y])=>[Math.round(x*1e4)/1e4,Math.round(y*1e4)/1e4]);ink.undo.push(ink.strokes.slice());if(ink.undo.length>50)ink.undo.shift();ink.strokes.push(s);redraw();persist();};
  cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);cv.addEventListener('pointerleave',e=>{if(e.buttons===0)end();});}
