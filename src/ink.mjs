// طبقة الكتابة فوق صفحات الكتاب (مثل GoodNotes): قلم، تظليل، ممحاة، أشكال، نص، تحديد (حر/مستطيل)، مؤشر شرح (نقطة/خط).
// العناصر تُحفظ بإحداثيات نسبية (٠ إلى ١) لكل صفحة في قاعدة محلية منفصلة (book-notes-v1) على هذا الجهاز فقط.
// أنواع العناصر: pen وhl {p:[[x,y]]} · shape {k,x0,y0,x1,y1,c,w,fill} · text {x,y,mw,s,c,fs,font,b,i,align,lh}
const DB='book-notes-v1',STORE='pages';
function db(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function tx(mode,fn){const d=await db();try{return await new Promise((res,rej)=>{const t=d.transaction(STORE,mode),r=fn(t.objectStore(STORE));t.oncomplete=()=>res(r?.result);t.onerror=()=>rej(t.error);});}finally{d.close();}}
export const loadStrokes=key=>tx('readonly',s=>s.get(key)).then(v=>Array.isArray(v)?v:[]).catch(()=>[]);
const saveStrokes=(key,items)=>tx('readwrite',s=>items.length?s.put(items,key):s.delete(key)).catch(()=>{});

export const COLORS=[['#17212D','أسود'],['#1D4ED8','أزرق'],['#C81E1E','أحمر'],['#0F6E64','أخضر'],['#B45309','برتقالي']];
export const HIGHLIGHTS=[['#FDE047','أصفر'],['#86EFAC','أخضر فاتح'],['#F9A8D4','وردي'],['#93C5FD','أزرق فاتح']];
export const SIZES=[['رفيع',0.0025],['متوسط',0.0045],['عريض',0.008]];
export const SHAPES=[['rect','مستطيل'],['ellipse','دائرة'],['tri','مثلث'],['diamond','معيّن'],['round','مستطيل بزوايا دائرية'],['line','خط مستقيم'],['arrow','سهم'],['elbow','موصل بزاوية'],['curve','موصل منحني']];
export const FONTS=[['modern','عصري','"IBM Plex Sans Arabic","Segoe UI",Tahoma,sans-serif'],['naskh','نسخ','"Traditional Arabic","Times New Roman","Noto Naskh Arabic",serif'],['plain','بسيط','Tahoma,Arial,sans-serif']];
export const FONT_SIZES=[14,18,24,32,40,56];
const OPEN=['line','arrow','elbow','curve'];

const PREFS='ink-prefs-v1';
const defaults={tool:'view',color:COLORS[0][0],hl:HIGHLIGHTS[0][0],size:SIZES[1][1],shape:'rect',fill:false,lasso:'free',laser:'line',pencilOnly:false,text:{c:COLORS[0][0],fs:24,font:'modern',b:false,i:false,align:'right',lh:1.5}};
function loadPrefs(){try{const p=JSON.parse(localStorage.getItem(PREFS)||'{}');return {...defaults,...p,tool:'view',text:{...defaults.text,...(p.text||{})}};}catch{return {...defaults,text:{...defaults.text}};}}
export const ink={...loadPrefs(),key:'',strokes:[],undo:[],sel:[],canvas:null,overlay:null,live:null,saveT:0,editing:null};
export function savePrefs(){try{const {color,hl,size,shape,fill,lasso,laser,text,pencilOnly}=ink;localStorage.setItem(PREFS,JSON.stringify({color,hl,size,shape,fill,lasso,laser,text,pencilOnly}));}catch{}}

/* هندسة */
const fontOf=it=>(FONTS.find(f=>f[0]===it.font)||FONTS[0])[2];
const lerp=(a,b,t)=>a+(b-a)*t;
function shapeOutline(it){const {x0,y0,x1,y1}=it,cx=(x0+x1)/2,cy=(y0+y1)/2,pts=[];
  const poly=v=>{for(let i=0;i<v.length;i++){const a=v[i],b=v[(i+1)%v.length];for(let k=0;k<8;k++)pts.push([lerp(a[0],b[0],k/8),lerp(a[1],b[1],k/8)]);}};
  if(it.k==='rect'||it.k==='round')poly([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]);
  else if(it.k==='tri')poly([[cx,y0],[x1,y1],[x0,y1]]);
  else if(it.k==='diamond')poly([[cx,y0],[x1,cy],[cx,y1],[x0,cy]]);
  else if(it.k==='ellipse')for(let i=0;i<32;i++){const t=i/32*Math.PI*2;pts.push([cx+Math.cos(t)*(x1-x0)/2,cy+Math.sin(t)*(y1-y0)/2]);}
  else if(it.k==='elbow'){for(let k=0;k<=12;k++)pts.push([lerp(x0,x1,k/12),y0]);for(let k=1;k<=12;k++)pts.push([x1,lerp(y0,y1,k/12)]);}
  else if(it.k==='curve')for(let k=0;k<=24;k++){const t=k/24;pts.push([(1-t)**2*x0+2*(1-t)*t*x1+t*t*x1,(1-t)**2*y0+2*(1-t)*t*y0+t*t*y1]);}
  else for(let k=0;k<=16;k++)pts.push([lerp(x0,x1,k/16),lerp(y0,y1,k/16)]);
  return pts;}
function textBox(it){return [it.x,it.y,it.x+(it.mw||.3),it.y+(it.bh||it.fs*it.lh*1.1)];}
export function points(it){if(it.t==='shape')return shapeOutline(it);if(it.t==='text'){const [a,b,c,d]=textBox(it);return [[a,b],[c,b],[a,d],[c,d],[(a+c)/2,(b+d)/2],[(a+c)/2,b],[(a+c)/2,d],[a,(b+d)/2],[c,(b+d)/2]];}return it.p||[];}
function translate(it,dx,dy){if(it.t==='shape')return {...it,x0:it.x0+dx,y0:it.y0+dy,x1:it.x1+dx,y1:it.y1+dy};if(it.t==='text')return {...it,x:it.x+dx,y:it.y+dy};return {...it,p:it.p.map(([x,y])=>[x+dx,y+dy])};}
const r4=v=>Math.round(Math.min(1.2,Math.max(-.2,v))*1e4)/1e4;
function tidy(it){if(it.t==='shape')return {...it,x0:r4(it.x0),y0:r4(it.y0),x1:r4(it.x1),y1:r4(it.y1)};if(it.t==='text')return {...it,x:r4(it.x),y:r4(it.y)};return {...it,p:it.p.map(([x,y])=>[r4(x),r4(y)])};}

/* الرسم */
function drawPen(ctx,s,W,H){if(!s.p?.length)return;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  if(s.t==='hl'){ctx.globalAlpha=.38;ctx.globalCompositeOperation='multiply';ctx.lineWidth=s.w*W*4.5;ctx.lineCap='butt';}else ctx.lineWidth=s.w*W;
  ctx.strokeStyle=s.c;ctx.beginPath();const [x0,y0]=s.p[0];ctx.moveTo(x0*W,y0*H);
  if(s.p.length===1){ctx.lineTo(x0*W+.1,y0*H+.1);}else for(let i=1;i<s.p.length-1;i++){const [x1,y1]=s.p[i],[x2,y2]=s.p[i+1];ctx.quadraticCurveTo(x1*W,y1*H,(x1+x2)/2*W,(y1+y2)/2*H);}
  if(s.p.length>1){const [xl,yl]=s.p[s.p.length-1];ctx.lineTo(xl*W,yl*H);}ctx.stroke();ctx.restore();}
function drawShape(ctx,it,W,H){const X0=it.x0*W,Y0=it.y0*H,X1=it.x1*W,Y1=it.y1*H,l=Math.min(X0,X1),t=Math.min(Y0,Y1),w=Math.abs(X1-X0),h=Math.abs(Y1-Y0),cx=(X0+X1)/2,cy=(Y0+Y1)/2;
  ctx.save();ctx.lineWidth=it.w*W;ctx.strokeStyle=it.c;ctx.fillStyle=it.c;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  if(it.k==='rect')ctx.rect(l,t,w,h);
  else if(it.k==='round'){const r=Math.min(w,h)*.22;if(ctx.roundRect)ctx.roundRect(l,t,w,h,r);else ctx.rect(l,t,w,h);}
  else if(it.k==='ellipse')ctx.ellipse(cx,cy,w/2,h/2,0,0,Math.PI*2);
  else if(it.k==='tri'){ctx.moveTo(cx,Y0);ctx.lineTo(X1,Y1);ctx.lineTo(X0,Y1);ctx.closePath();}
  else if(it.k==='diamond'){ctx.moveTo(cx,Y0);ctx.lineTo(X1,cy);ctx.lineTo(cx,Y1);ctx.lineTo(X0,cy);ctx.closePath();}
  else if(it.k==='elbow'){ctx.moveTo(X0,Y0);ctx.lineTo(X1,Y0);ctx.lineTo(X1,Y1);}
  else if(it.k==='curve'){ctx.moveTo(X0,Y0);ctx.quadraticCurveTo(X1,Y0,X1,Y1);}
  else{ctx.moveTo(X0,Y0);ctx.lineTo(X1,Y1);}
  if(!OPEN.includes(it.k)&&it.fill){ctx.globalAlpha=.18;ctx.fill();ctx.globalAlpha=1;}
  ctx.stroke();
  if(it.k==='arrow'){const a=Math.atan2(Y1-Y0,X1-X0),L=Math.max(10,it.w*W*4);ctx.beginPath();ctx.moveTo(X1,Y1);ctx.lineTo(X1-L*Math.cos(a-.45),Y1-L*Math.sin(a-.45));ctx.moveTo(X1,Y1);ctx.lineTo(X1-L*Math.cos(a+.45),Y1-L*Math.sin(a+.45));ctx.stroke();}
  ctx.restore();}
function wrapLines(ctx,text,maxW){const out=[];for(const para of String(text).split('\n')){const words=para.split(/(\s+)/);let line='';for(const w of words){const test=line+w;if(line.trim()&&ctx.measureText(test).width>maxW&&w.trim()){out.push(line.trimEnd());line=w.trimStart();}else line=test;}out.push(line);}return out;}
function drawText(ctx,it,W,H){if(it===ink.editing?.item)return;const fs=it.fs*W;ctx.save();ctx.font=`${it.i?'italic ':''}${it.b?'700':'400'} ${fs}px ${fontOf(it)}`;ctx.fillStyle=it.c;ctx.direction='rtl';ctx.textBaseline='top';
  const lines=wrapLines(ctx,it.s,it.mw*W),lh=fs*it.lh;ctx.textAlign=it.align==='center'?'center':it.align==='left'?'left':'right';
  const x=it.align==='center'?(it.x+it.mw/2)*W:it.align==='left'?it.x*W:(it.x+it.mw)*W;
  lines.forEach((ln,k)=>ctx.fillText(ln,x,it.y*H+k*lh+(lh-fs)/2));ctx.restore();it.bh=Math.max(lh,lines.length*lh)/H;}
function drawItem(ctx,it,W,H){if(it.t==='shape')drawShape(ctx,it,W,H);else if(it.t==='text')drawText(ctx,it,W,H);else drawPen(ctx,it,W,H);}
export function redraw(){const cv=ink.canvas;if(!cv)return;const ctx=cv.getContext('2d'),W=cv.width,H=cv.height;ctx.clearRect(0,0,W,H);
  for(const s of ink.strokes)if(s.t==='hl')drawItem(ctx,s,W,H);for(const s of ink.strokes)if(s.t!=='hl')drawItem(ctx,s,W,H);drawOverlay();}
function persist(){clearTimeout(ink.saveT);const key=ink.key,data=ink.strokes.map(({bh,...rest})=>rest);ink.saveT=setTimeout(()=>saveStrokes(key,data),250);}
function commit(prev){ink.undo.push(prev);if(ink.undo.length>60)ink.undo.shift();persist();}

/* الصفحة */
export async function attach(canvas,key,overlay){finishText();ink.canvas=canvas;ink.overlay=overlay||null;if(ink.key!==key){ink.key=key;ink.undo=[];ink.sel=[];ink.strokes=await loadStrokes(key);}redraw();bind(canvas);updateCursor();}
export function updateCursor(){const cv=ink.canvas;if(!cv)return;cv.style.pointerEvents=ink.tool==='view'?'none':'auto';
  cv.style.cursor={erase:'cell',laser:'none',select:'default',text:'text'}[ink.tool]||'crosshair';if(ink.tool!=='select')ink.sel=[];if(ink.tool!=='text')finishText();laser.pts=[];drawOverlay();}
export function undo(){finishText();const last=ink.undo.pop();if(!last)return false;ink.strokes=last;ink.sel=[];redraw();persist();return true;}
export function clearPage(){finishText();if(!ink.strokes.length)return;commit(ink.strokes.slice());ink.strokes=[];ink.sel=[];redraw();}

/* التحديد والمؤشر */
const laser={pts:[],raf:0,hover:null,down:false};
const lasso={pts:null,rect:null,drag:null};
function bbox(idx){let x0=1,y0=1,x1=0,y1=0;for(const i of idx)for(const [x,y] of points(ink.strokes[i]||{})){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}const pad=.01;return idx.length?[x0-pad,y0-pad,x1+pad,y1+pad]:null;}
function inPoly([x,y],poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;}
export function drawOverlay(){const o=ink.overlay,cv=ink.canvas;if(!o||!cv)return;if(o.width!==cv.width||o.height!==cv.height){o.width=cv.width;o.height=cv.height;}const ctx=o.getContext('2d'),W=o.width,H=o.height,d=W/(parseFloat(o.style.width)||W);ctx.clearRect(0,0,W,H);
  if(ink.live)drawItem(ctx,ink.live,W,H);
  ctx.save();ctx.setLineDash([6*d,5*d]);ctx.lineWidth=1.6*d;ctx.strokeStyle='#0F6E64';ctx.fillStyle='rgba(15,110,100,.06)';
  if(lasso.pts&&lasso.pts.length>1){ctx.beginPath();lasso.pts.forEach(([x,y],i)=>i?ctx.lineTo(x*W,y*H):ctx.moveTo(x*W,y*H));ctx.closePath();ctx.fill();ctx.stroke();}
  if(lasso.rect){const [a,b,c,e]=lasso.rect,x=Math.min(a,c)*W,y=Math.min(b,e)*H,w=Math.abs(c-a)*W,h=Math.abs(e-b)*H;ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);}
  const bx=bbox(ink.sel);if(bx){ctx.setLineDash([7*d,5*d]);ctx.lineWidth=1.8*d;ctx.fillStyle='rgba(15,110,100,.07)';ctx.fillRect(bx[0]*W,bx[1]*H,(bx[2]-bx[0])*W,(bx[3]-bx[1])*H);ctx.strokeRect(bx[0]*W,bx[1]*H,(bx[2]-bx[0])*W,(bx[3]-bx[1])*H);}
  ctx.restore();
  const now=performance.now();laser.pts=laser.pts.filter(p=>now-p[2]<650);
  if(ink.laser==='line'&&laser.pts.length>1){ctx.save();ctx.lineCap='round';ctx.lineJoin='round';for(let i=1;i<laser.pts.length;i++){const [x0,y0,t0]=laser.pts[i-1],[x1,y1]=laser.pts[i],a=Math.max(0,1-(now-t0)/650);ctx.strokeStyle=`rgba(239,35,35,${(a*.55).toFixed(3)})`;ctx.lineWidth=(3+5*a)*d;ctx.beginPath();ctx.moveTo(x0*W,y0*H);ctx.lineTo(x1*W,y1*H);ctx.stroke();}ctx.restore();}
  const h=laser.hover;if(ink.tool==='laser'&&h){ctx.save();const r=(ink.laser==='dot'?13:16)*d,g=ctx.createRadialGradient(h[0]*W,h[1]*H,0,h[0]*W,h[1]*H,r);g.addColorStop(0,'rgba(255,40,40,1)');g.addColorStop(.35,'rgba(255,40,40,.9)');g.addColorStop(1,'rgba(255,40,40,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(h[0]*W,h[1]*H,r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(h[0]*W,h[1]*H,2.2*d,0,Math.PI*2);ctx.fill();ctx.restore();}
  cancelAnimationFrame(laser.raf);if(ink.laser==='line'&&laser.pts.length)laser.raf=requestAnimationFrame(drawOverlay);}
let ovRaf=0;function scheduleOverlay(){if(ovRaf)return;ovRaf=requestAnimationFrame(()=>{ovRaf=0;drawOverlay();});}
export const hasSelection=()=>ink.sel.length>0;
export function deleteSelection(){if(!ink.sel.length)return;commit(ink.strokes.slice());const s=new Set(ink.sel);ink.strokes=ink.strokes.filter((_,i)=>!s.has(i));ink.sel=[];redraw();}
export function recolorSelection(c){if(!ink.sel.length)return;commit(ink.strokes.slice());ink.strokes=ink.strokes.map((s,i)=>ink.sel.includes(i)&&s.t!=='hl'?{...s,c}:s);redraw();}
export function duplicateSelection(){if(!ink.sel.length)return;commit(ink.strokes.slice());const copies=ink.sel.map(i=>tidy(translate(ink.strokes[i],.02,.02)));const start=ink.strokes.length;ink.strokes=ink.strokes.concat(copies);ink.sel=copies.map((_,k)=>start+k);redraw();}
export function clearSelection(){ink.sel=[];drawOverlay();}

/* النص */
function openEditor(item,isNew){const cv=ink.canvas,wrapper=cv?.parentElement;if(!cv||!wrapper)return;const Wc=cv.getBoundingClientRect().width,Hc=cv.getBoundingClientRect().height;
  const ta=document.createElement('textarea');ta.className='ink-text-edit';ta.dir='rtl';ta.value=item.s||'';ta.setAttribute('aria-label','اكتب النص');
  Object.assign(ta.style,{left:item.x*Wc+'px',top:item.y*Hc+'px',width:item.mw*Wc+'px',fontSize:item.fs*Wc+'px',lineHeight:String(item.lh),color:item.c,fontFamily:fontOf(item),fontWeight:item.b?'700':'400',fontStyle:item.i?'italic':'normal',textAlign:item.align});
  const fit=()=>{ta.style.height='auto';ta.style.height=Math.max(item.fs*Wc*item.lh+8,ta.scrollHeight)+'px';};
  ta.addEventListener('input',fit);ta.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();finishText();}});
  ta.addEventListener('blur',()=>setTimeout(()=>{if(ink.editing?.ta===ta&&!document.activeElement?.closest?.('#ink-bar'))finishText();},200));
  wrapper.append(ta);ink.editing={item,ta,isNew,prev:ink.strokes.slice()};redraw();fit();ta.focus();cv.dispatchEvent(new CustomEvent('ink-selection',{bubbles:true}));}
export function finishText(){const ed=ink.editing;if(!ed)return;setTimeout(()=>ink.canvas?.dispatchEvent(new CustomEvent('ink-selection',{bubbles:true})),0);ink.editing=null;const s=ed.ta.value.replace(/\s+$/,'');ed.ta.remove();
  const idx=ink.strokes.indexOf(ed.item);if(!s){if(idx>=0){ink.strokes.splice(idx,1);commit(ed.prev);}}else{const it={...ed.item,s:s.slice(0,4000)};if(idx>=0)ink.strokes[idx]=it;else ink.strokes.push(it);commit(ed.prev);}redraw();}
export function applyTextStyle(){const ed=ink.editing,T=ink.text;if(!ed)return;Object.assign(ed.item,{c:T.c,fs:T.fs/900,font:T.font,b:T.b,i:T.i,align:T.align,lh:T.lh});const ta=ed.ta,Wc=ink.canvas.getBoundingClientRect().width;Object.assign(ta.style,{fontSize:ed.item.fs*Wc+'px',lineHeight:String(T.lh),color:T.c,fontFamily:fontOf(ed.item),fontWeight:T.b?'700':'400',fontStyle:T.i?'italic':'normal',textAlign:T.align});ta.dispatchEvent(new Event('input'));ta.focus();}
export const editingText=()=>!!ink.editing;
export function cancelLive(){ink.live=null;drawOverlay();}

/* المؤشر واللمس */
function bind(cv){if(cv._bound)return;cv._bound=true;
  const pt=e=>{const r=cv.getBoundingClientRect();return [Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))];};
  let erasing=false,changed=false,prev=null;
  const eraseAt=([x,y])=>{const r=cv.getBoundingClientRect(),tol=14/r.width,ar=r.height/r.width;const keep=ink.strokes.filter(s=>{if(s.t==='text'){const [a,b,c,d]=textBox(s);return !(x>=a&&x<=c&&y>=b&&y<=d);}const w=s.t==='shape'?s.w*.5:s.w*(s.t==='hl'?2.3:.5);return !points(s).some(([a,b])=>Math.hypot(a-x,(b-y)*ar)<tol+w);});if(keep.length!==ink.strokes.length){if(!changed)prev=ink.strokes.slice();changed=true;ink.strokes=keep;redraw();}};
  const textAt=([x,y])=>{for(let i=ink.strokes.length-1;i>=0;i--){const s=ink.strokes[i];if(s.t!=='text')continue;const [a,b,c,d]=textBox(s);if(x>=a&&x<=c&&y>=b&&y<=d)return s;}return null;};
  const pan={id:null,x:0,y:0};
  cv.addEventListener('pointerdown',e=>{if(ink.tool==='view')return;
    if(e.pointerType==='pen'&&!ink.pencilOnly){ink.pencilOnly=true;savePrefs();cv.dispatchEvent(new CustomEvent('ink-selection',{bubbles:true}));}
    if(e.pointerType==='touch'&&(ink.pencilOnly||ink.live||erasing)){if(ink.pencilOnly&&e.isPrimary){pan.id=e.pointerId;pan.x=e.clientX;pan.y=e.clientY;}return;}
    if(e.pointerType==='touch'&&e.isPrimary===false)return;
    if(ink.tool==='text'){e.preventDefault();const p=pt(e);if(ink.editing){finishText();return;}const hit=textAt(p);
      if(hit){Object.assign(ink.text,{c:hit.c,fs:Math.round(hit.fs*900),font:hit.font,b:hit.b,i:hit.i,align:hit.align,lh:hit.lh});cv.dispatchEvent(new CustomEvent('ink-selection',{bubbles:true}));openEditor(hit,false);return;}
      const T=ink.text,mw=Math.min(.5,Math.max(.18,p[0]-.02));openEditor({t:'text',x:Math.max(0,p[0]-mw),y:Math.max(0,p[1]-T.fs/900*.6),mw,s:'',c:T.c,fs:T.fs/900,font:T.font,b:T.b,i:T.i,align:T.align,lh:T.lh},true);return;}
    e.preventDefault();try{cv.setPointerCapture(e.pointerId);}catch{}
    if(ink.tool==='laser'){laser.hover=pt(e);laser.down=true;if(ink.laser==='line')laser.pts.push([...laser.hover,performance.now()]);drawOverlay();return;}
    if(ink.tool==='select'){const p=pt(e),b=bbox(ink.sel);if(b&&p[0]>=b[0]&&p[0]<=b[2]&&p[1]>=b[1]&&p[1]<=b[3]){lasso.drag={start:p,orig:ink.strokes.slice(),moved:false};}else{ink.sel=[];if(ink.lasso==='rect')lasso.rect=[...p,...p];else lasso.pts=[p];}drawOverlay();return;}
    if(ink.tool==='erase'){erasing=true;changed=false;eraseAt(pt(e));return;}
    const p=pt(e);
    if(ink.tool==='shape'){ink.live={t:'shape',k:ink.shape,x0:p[0],y0:p[1],x1:p[0],y1:p[1],c:ink.color,w:ink.size,fill:ink.fill};drawOverlay();return;}
    ink.live={t:ink.tool==='hl'?'hl':'pen',c:ink.tool==='hl'?ink.hl:ink.color,w:ink.size,p:[p]};drawOverlay();});
  cv.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch'&&ink.pinching)return;
    if(e.pointerType==='touch'&&pan.id===e.pointerId){const stage=cv.closest('.reader-stage');stage?.scrollBy(pan.x-e.clientX,0);window.scrollBy(0,pan.y-e.clientY);pan.x=e.clientX;pan.y=e.clientY;return;}
    if(e.pointerType==='touch'&&ink.pencilOnly)return;
    if(ink.tool==='laser'){laser.hover=pt(e);if(ink.laser==='line'&&(laser.down||e.pointerType==='mouse')){for(const ev of (e.getCoalescedEvents?.()||[e]))laser.pts.push([...pt(ev),performance.now()]);}drawOverlay();return;}
    if(ink.tool==='select'){const p=pt(e);if(lasso.drag){const dx=p[0]-lasso.drag.start[0],dy=p[1]-lasso.drag.start[1];lasso.drag.moved=true;const s=new Set(ink.sel);ink.strokes=lasso.drag.orig.map((st,i)=>s.has(i)?translate(st,dx,dy):st);redraw();}else if(lasso.rect){lasso.rect[2]=p[0];lasso.rect[3]=p[1];drawOverlay();}else if(lasso.pts){lasso.pts.push(p);drawOverlay();}return;}
    if(erasing){eraseAt(pt(e));return;}if(!ink.live)return;
    if(ink.live.t==='shape'){let [x,y]=pt(e);if(e.shiftKey&&!OPEN.includes(ink.live.k)){const ar=cv.height/cv.width,d=Math.max(Math.abs(x-ink.live.x0),Math.abs(y-ink.live.y0)*ar);x=ink.live.x0+Math.sign(x-ink.live.x0||1)*d;y=ink.live.y0+Math.sign(y-ink.live.y0||1)*d/ar;}ink.live.x1=x;ink.live.y1=y;drawOverlay();return;}
    const evs=e.getCoalescedEvents?.()||[e];for(const ev of evs){const p=pt(ev),l=ink.live.p[ink.live.p.length-1];if(Math.hypot(p[0]-l[0],p[1]-l[1])>.0012)ink.live.p.push(p);}scheduleOverlay();});
  const end=e=>{
    if(e?.pointerType==='touch'&&ink.pinching){pan.id=null;return;}
    if(e?.pointerType==='touch'&&(pan.id===e.pointerId||ink.pencilOnly)){if(pan.id===e?.pointerId)pan.id=null;return;}
    if(ink.tool==='laser'){laser.down=false;drawOverlay();return;}
    if(ink.tool==='select'){if(lasso.drag){if(lasso.drag.moved){commit(lasso.drag.orig);ink.strokes=ink.strokes.map(tidy);persist();}lasso.drag=null;redraw();}
      else if(lasso.pts||lasso.rect){let inside=null;if(lasso.rect){const [a,b,c,d]=lasso.rect,x0=Math.min(a,c),x1=Math.max(a,c),y0=Math.min(b,d),y1=Math.max(b,d);lasso.rect=null;if(x1-x0>.005&&y1-y0>.005)inside=([x,y])=>x>=x0&&x<=x1&&y>=y0&&y<=y1;}else{const poly=lasso.pts;lasso.pts=null;if(poly.length>2)inside=q=>inPoly(q,poly);}
        if(inside)ink.sel=ink.strokes.map((st,i)=>[points(st),i]).filter(([ps])=>ps.filter(inside).length>=Math.max(1,ps.length*.5)).map(([,i])=>i);drawOverlay();}
      cv.dispatchEvent(new CustomEvent('ink-selection',{bubbles:true}));return;}
    if(erasing){erasing=false;if(changed)commit(prev);return;}if(!ink.live)return;let s=ink.live;ink.live=null;
    if(s.t==='shape'){if(Math.hypot(s.x1-s.x0,s.y1-s.y0)<.006){drawOverlay();return;}if(!OPEN.includes(s.k))s={...s,x0:Math.min(s.x0,s.x1),x1:Math.max(s.x0,s.x1),y0:Math.min(s.y0,s.y1),y1:Math.max(s.y0,s.y1)};}
    else if(s.t==='hl'&&s.p.length>1){const [x0,y0]=s.p[0],[x1,y1]=s.p[s.p.length-1];if(Math.abs(y1-y0)<.02)s.p=[[x0,(y0+y1)/2],[x1,(y0+y1)/2]];}
    const before=ink.strokes.slice();ink.strokes.push(tidy(s));commit(before);redraw();};
  cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
  cv.addEventListener('pointerleave',e=>{if(ink.tool==='laser'){laser.hover=null;laser.down=false;drawOverlay();return;}if(e.pointerType==='touch')return;if(e.buttons===0&&ink.tool!=='text')end(e);});
  cv.addEventListener('contextmenu',e=>e.preventDefault());}
