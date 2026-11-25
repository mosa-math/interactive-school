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

export const ink={sel:[],overlay:null,tool:'view',color:COLORS[0][0],hl:HIGHLIGHTS[0][0],size:SIZES[1][1],key:'',strokes:[],undo:[],canvas:null,live:null,saveT:0};

function stroke(ctx,s,W,H){if(!s.p.length)return;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  if(s.t==='hl'){ctx.globalAlpha=.38;ctx.globalCompositeOperation='multiply';ctx.lineWidth=s.w*W*4.5;ctx.lineCap='butt';}else ctx.lineWidth=s.w*W;
  ctx.strokeStyle=s.c;ctx.beginPath();const [x0,y0]=s.p[0];ctx.moveTo(x0*W,y0*H);
  if(s.p.length===1){ctx.lineTo(x0*W+.1,y0*H+.1);}else for(let i=1;i<s.p.length-1;i++){const [x1,y1]=s.p[i],[x2,y2]=s.p[i+1];ctx.quadraticCurveTo(x1*W,y1*H,(x1+x2)/2*W,(y1+y2)/2*H);}
  if(s.p.length>1){const [xl,yl]=s.p[s.p.length-1];ctx.lineTo(xl*W,yl*H);}ctx.stroke();ctx.restore();}
export function redraw(){const cv=ink.canvas;if(!cv)return;const ctx=cv.getContext('2d'),W=cv.width,H=cv.height;ctx.clearRect(0,0,W,H);
  for(const s of ink.strokes.filter(s=>s.t==='hl'))stroke(ctx,s,W,H);for(const s of ink.strokes.filter(s=>s.t!=='hl'))stroke(ctx,s,W,H);if(ink.live)stroke(ctx,ink.live,W,H);drawOverlay();}
function persist(){clearTimeout(ink.saveT);const key=ink.key,data=ink.strokes.slice();ink.saveT=setTimeout(()=>saveStrokes(key,data),250);}

export async function attach(canvas,key,overlay){ink.canvas=canvas;ink.overlay=overlay||null;if(ink.key!==key){ink.key=key;ink.undo=[];ink.sel=[];ink.strokes=await loadStrokes(key);}redraw();bind(canvas);updateCursor();}
export function updateCursor(){const cv=ink.canvas;if(!cv)return;cv.style.pointerEvents=ink.tool==='view'?'none':'auto';cv.style.cursor=ink.tool==='erase'?'cell':ink.tool==='laser'?'none':ink.tool==='select'?'default':'crosshair';if(ink.tool!=='select')ink.sel=[];laser.pts=[];drawOverlay();}
/* التحديد والمؤشر */
const laser={pts:[],raf:0,hover:null};
const lasso={pts:null,drag:null};
function bbox(idx){let x0=1,y0=1,x1=0,y1=0;for(const i of idx)for(const [x,y] of ink.strokes[i]?.p||[]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}const pad=.01;return idx.length?[x0-pad,y0-pad,x1+pad,y1+pad]:null;}
function inPoly([x,y],poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;}
export function drawOverlay(){const o=ink.overlay,cv=ink.canvas;if(!o||!cv)return;if(o.width!==cv.width||o.height!==cv.height){o.width=cv.width;o.height=cv.height;}const ctx=o.getContext('2d'),W=o.width,H=o.height,d=W/(parseFloat(o.style.width)||W);ctx.clearRect(0,0,W,H);
  if(lasso.pts&&lasso.pts.length>1){ctx.save();ctx.setLineDash([6*d,5*d]);ctx.lineWidth=1.6*d;ctx.strokeStyle='#0F6E64';ctx.fillStyle='rgba(15,110,100,.06)';ctx.beginPath();lasso.pts.forEach(([x,y],i)=>i?ctx.lineTo(x*W,y*H):ctx.moveTo(x*W,y*H));ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
  const b=bbox(ink.sel);if(b){ctx.save();ctx.setLineDash([7*d,5*d]);ctx.lineWidth=1.8*d;ctx.strokeStyle='#0F6E64';ctx.fillStyle='rgba(15,110,100,.07)';ctx.fillRect(b[0]*W,b[1]*H,(b[2]-b[0])*W,(b[3]-b[1])*H);ctx.strokeRect(b[0]*W,b[1]*H,(b[2]-b[0])*W,(b[3]-b[1])*H);ctx.restore();}
  const now=performance.now();laser.pts=laser.pts.filter(p=>now-p[2]<650);
  if(laser.pts.length>1){ctx.save();ctx.lineCap='round';ctx.lineJoin='round';for(let i=1;i<laser.pts.length;i++){const [x0,y0,t0]=laser.pts[i-1],[x1,y1]=laser.pts[i],a=Math.max(0,1-(now-t0)/650);ctx.strokeStyle=`rgba(239,35,35,${(a*.55).toFixed(3)})`;ctx.lineWidth=(3+5*a)*d;ctx.beginPath();ctx.moveTo(x0*W,y0*H);ctx.lineTo(x1*W,y1*H);ctx.stroke();}ctx.restore();}
  const h=laser.hover;if(ink.tool==='laser'&&h){ctx.save();const g=ctx.createRadialGradient(h[0]*W,h[1]*H,0,h[0]*W,h[1]*H,16*d);g.addColorStop(0,'rgba(255,40,40,1)');g.addColorStop(.35,'rgba(255,40,40,.9)');g.addColorStop(1,'rgba(255,40,40,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(h[0]*W,h[1]*H,16*d,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(h[0]*W,h[1]*H,2.2*d,0,Math.PI*2);ctx.fill();ctx.restore();}
  cancelAnimationFrame(laser.raf);if(laser.pts.length)laser.raf=requestAnimationFrame(drawOverlay);}
export const hasSelection=()=>ink.sel.length>0;
export function deleteSelection(){if(!ink.sel.length)return;ink.undo.push(ink.strokes.slice());const s=new Set(ink.sel);ink.strokes=ink.strokes.filter((_,i)=>!s.has(i));ink.sel=[];redraw();persist();}
export function recolorSelection(c){if(!ink.sel.length)return;ink.undo.push(ink.strokes.slice());ink.strokes=ink.strokes.map((s,i)=>ink.sel.includes(i)&&s.t!=='hl'?{...s,c}:s);redraw();persist();}
export function duplicateSelection(){if(!ink.sel.length)return;ink.undo.push(ink.strokes.slice());const copies=ink.sel.map(i=>({...ink.strokes[i],p:ink.strokes[i].p.map(([x,y])=>[Math.min(1,x+.02),Math.min(1,y+.02)])}));const start=ink.strokes.length;ink.strokes=ink.strokes.concat(copies);ink.sel=copies.map((_,k)=>start+k);redraw();persist();}
export function clearSelection(){ink.sel=[];drawOverlay();}
export function undo(){const last=ink.undo.pop();if(!last)return false;ink.strokes=last;ink.sel=[];redraw();persist();return true;}
export function clearPage(){if(!ink.strokes.length)return;ink.undo.push(ink.strokes.slice());ink.strokes=[];ink.sel=[];redraw();persist();}

function bind(cv){if(cv._bound)return;cv._bound=true;
  const pt=e=>{const r=cv.getBoundingClientRect();return [Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))];};
  let erasing=false,changed=false;
  const eraseAt=([x,y])=>{const r=cv.getBoundingClientRect(),tol=14/r.width,ar=r.height/r.width;const keep=ink.strokes.filter(s=>!s.p.some(([a,b])=>Math.hypot(a-x,(b-y)*ar)<tol+s.w*(s.t==='hl'?2.3:.5)));if(keep.length!==ink.strokes.length){if(!changed)ink.undo.push(ink.strokes.slice());changed=true;ink.strokes=keep;redraw();}};
  cv.addEventListener('pointerdown',e=>{if(ink.tool==='view')return;if(e.pointerType==='touch'&&e.isPrimary===false)return;e.preventDefault();cv.setPointerCapture(e.pointerId);
    if(ink.tool==='laser'){laser.hover=pt(e);laser.down=true;laser.pts.push([...laser.hover,performance.now()]);drawOverlay();return;}
    if(ink.tool==='select'){const p=pt(e),b=bbox(ink.sel);if(b&&p[0]>=b[0]&&p[0]<=b[2]&&p[1]>=b[1]&&p[1]<=b[3]){lasso.drag={start:p,orig:ink.strokes.slice(),moved:false};}else{ink.sel=[];lasso.pts=[p];}drawOverlay();return;}
    if(ink.tool==='erase'){erasing=true;changed=false;eraseAt(pt(e));return;}
    ink.live={t:ink.tool==='hl'?'hl':'pen',c:ink.tool==='hl'?ink.hl:ink.color,w:ink.size,p:[pt(e)]};redraw();});
  cv.addEventListener('pointermove',e=>{
    if(ink.tool==='laser'){laser.hover=pt(e);if(laser.down||e.pointerType==='mouse'){for(const ev of (e.getCoalescedEvents?.()||[e]))laser.pts.push([...pt(ev),performance.now()]);}drawOverlay();return;}
    if(ink.tool==='select'){const p=pt(e);if(lasso.drag){const dx=p[0]-lasso.drag.start[0],dy=p[1]-lasso.drag.start[1];lasso.drag.moved=true;const s=new Set(ink.sel);ink.strokes=lasso.drag.orig.map((st,i)=>s.has(i)?{...st,p:st.p.map(([x,y])=>[x+dx,y+dy])}:st);redraw();}else if(lasso.pts){lasso.pts.push(p);drawOverlay();}return;}
    if(erasing){eraseAt(pt(e));return;}if(!ink.live)return;const evs=e.getCoalescedEvents?.()||[e];for(const ev of evs){const p=pt(ev),l=ink.live.p[ink.live.p.length-1];if(Math.hypot(p[0]-l[0],p[1]-l[1])>.0012)ink.live.p.push(p);}redraw();});
  const end=()=>{
    if(ink.tool==='laser'){laser.down=false;drawOverlay();return;}
    if(ink.tool==='select'){if(lasso.drag){if(lasso.drag.moved){ink.undo.push(lasso.drag.orig);ink.strokes=ink.strokes.map(st=>({...st,p:st.p.map(([x,y])=>[Math.round(Math.min(1,Math.max(0,x))*1e4)/1e4,Math.round(Math.min(1,Math.max(0,y))*1e4)/1e4])}));persist();}lasso.drag=null;redraw();}
      else if(lasso.pts){const poly=lasso.pts;lasso.pts=null;if(poly.length>2)ink.sel=ink.strokes.map((st,i)=>[st,i]).filter(([st])=>st.p.filter(q=>inPoly(q,poly)).length>=Math.max(1,st.p.length*.5)).map(([,i])=>i);drawOverlay();}
      cv.dispatchEvent(new CustomEvent('ink-selection'));return;}
    if(erasing){erasing=false;if(changed)persist();return;}if(!ink.live)return;const s=ink.live;ink.live=null;
    if(s.t==='hl'&&s.p.length>1){const [x0,y0]=s.p[0],[x1,y1]=s.p[s.p.length-1];if(Math.abs(y1-y0)<.02)s.p=[[x0,(y0+y1)/2],[x1,(y0+y1)/2]];}
    s.p=s.p.map(([x,y])=>[Math.round(x*1e4)/1e4,Math.round(y*1e4)/1e4]);ink.undo.push(ink.strokes.slice());if(ink.undo.length>50)ink.undo.shift();ink.strokes.push(s);redraw();persist();};
  cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);cv.addEventListener('pointerleave',e=>{if(ink.tool==='laser'){laser.hover=null;laser.down=false;drawOverlay();return;}if(e.buttons===0)end();});}
