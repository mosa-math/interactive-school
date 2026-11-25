// قارئ الكتاب داخل الموقع: يعرض ملف PDF المحفوظ في متصفح المعلم فقط (IndexedDB)، ولا يُرفع الكتاب إلى أي مكان.
import {record} from './data/database.mjs';
import {curriculum,pagesLabel} from './data/curriculum.mjs';
import {escape as esc,digit as n} from '../lesson-core.mjs';
import {ink,attach,redraw,undo,clearPage,updateCursor,COLORS,HIGHLIGHTS,SIZES} from './ink.mjs';

const cache={id:'',doc:null,loading:null};
let task=null,state={g:null,page:1,zoom:1,total:0};

async function loadPDF(bytes){const lib=await import('../vendor/pdf.mjs');lib.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdf.worker.mjs',import.meta.url).href;return lib.getDocument({data:new Uint8Array(bytes),wasmUrl:new URL('../vendor/wasm/',import.meta.url).href,isEvalSupported:false}).promise;}
async function openDoc(bookId){if(cache.id===bookId&&cache.doc)return cache.doc;if(cache.id===bookId&&cache.loading)return cache.loading;
  cache.id=bookId;cache.doc=null;cache.loading=(async()=>{const book=await record('books','readonly',s=>s.get(bookId));if(!book?.blob)return null;const doc=await loadPDF(await book.blob.arrayBuffer());cache.doc=doc;return doc;})().catch(e=>{cache.id='';throw e}).finally(()=>{cache.loading=null});return cache.loading;}

const ico={hand:'<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v8.5a6.5 6.5 0 0 1-13 0V12a1.5 1.5 0 0 1 3 0v1"/>',pen:'<path d="m4 20 4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',hl:'<path d="m9 11-5 5v4h4l5-5"/><path d="m14 6 4 4-5 5-4-4z"/><path d="M3 21h7"/>',erase:'<path d="m7 21-4-4L14 6l6 6-9 9z"/><path d="M7 21h13M9 11l6 6"/>',undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/>',trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',next:'<path d="m15 6-6 6 6 6"/>',prev:'<path d="m9 6 6 6-6 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',full:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'};
const svg=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ico[k]}</svg>`;
function inkBar(){const t=ink.tool,tools=[['view','hand','تصفح'],['pen','pen','قلم'],['hl','hl','تظليل'],['erase','erase','ممحاة']];
  const sw=(list,cur,attr)=>list.map(([c,name])=>`<button class="ink-sw" style="background:${c}" data-${attr}="${c}" aria-label="${name}" aria-pressed="${c===cur}"></button>`).join('');
  return `<div class="ink-group">${tools.map(([k,i,label])=>`<button class="ink-tool" data-ink-tool="${k}" aria-pressed="${t===k}">${svg(i)}<span>${label}</span></button>`).join('')}</div>
  ${t==='pen'?`<div class="ink-group">${sw(COLORS,ink.color,'ink-color')}</div><div class="ink-group">${SIZES.map(([label,w])=>`<button class="ink-size" data-ink-size="${w}" aria-pressed="${w===ink.size}" aria-label="${label}"><i style="width:${Math.round(w*1600)}px;height:${Math.round(w*1600)}px"></i></button>`).join('')}</div>`:''}
  ${t==='hl'?`<div class="ink-group">${sw(HIGHLIGHTS,ink.hl,'ink-hl')}</div>`:''}
  <div class="ink-group"><button class="ink-tool" data-ink-undo>${svg('undo')}<span>تراجع</span></button><button class="ink-tool" data-ink-clear>${svg('trash')}<span>مسح الصفحة</span></button></div>`;}
function refreshBar(){const bar=document.getElementById('ink-bar');if(bar)bar.innerHTML=inkBar();updateCursor();document.getElementById('rd-stage')?.classList.toggle('drawing',ink.tool!=='view');}
function lessonAt(gid,page){const c=curriculum[gid];if(!c)return null;for(const [ci,ch] of c.chapters.entries())for(const [ii,it] of ch.items.entries())if(page>=it.from&&page<=it.to)return {it,ci,ii,ch};return null;}

export async function renderReader(root,g,startPage){
  state={g,page:Math.max(1,Number(startPage)||1),zoom:state.g?.id===g.id?state.zoom:1,total:0};
  const c=curriculum[g.id];
  root.innerHTML=`<nav class="mx-crumbs" aria-label="المسار"><a href="#home">صفوفي</a><span aria-hidden="true">/</span><a href="#grade/${g.id}">الصف ${esc(g.name)}</a><span aria-hidden="true">/</span><span>الكتاب</span></nav>
  <section class="reader" id="reader"><div class="reader-bar">
    <div class="reader-nav"><button class="btn btn-outline btn-sm icon-btn" data-rd="prev" aria-label="الصفحة السابقة">${svg('prev')}</button><label class="pg"><span>صفحة</span><input id="rd-page" type="number" min="1" inputmode="numeric" value="${state.page}" aria-label="رقم الصفحة"><span id="rd-total"></span></label><button class="btn btn-outline btn-sm icon-btn" data-rd="next" aria-label="الصفحة التالية">${svg('next')}</button></div>
    ${c?`<select id="rd-lesson" aria-label="انتقل إلى درس"><option value="">انتقل إلى درس…</option>${c.chapters.map(ch=>`<optgroup label="الفصل ${n(ch.number)}: ${esc(ch.title)}">${ch.items.map(it=>`<option value="${it.from}">${it.code?n(it.code)+' ':''}${esc(it.title)} · ص ${n(it.from)}</option>`).join('')}</optgroup>`).join('')}</select>`:''}
    <div class="reader-nav"><button class="btn btn-outline btn-sm icon-btn" data-rd="out" aria-label="تصغير">${svg('minus')}</button><button class="btn btn-outline btn-sm icon-btn" data-rd="in" aria-label="تكبير">${svg('plus')}</button><button class="btn btn-outline btn-sm" data-rd="full">${svg('full')}ملء الشاشة</button></div>
  </div>
  <div class="ink-bar" id="ink-bar" role="toolbar" aria-label="أدوات الكتابة على الكتاب">${inkBar()}</div>
  <div class="reader-lesson" id="rd-here"></div>
  <div class="reader-stage" id="rd-stage"><p class="mx-muted" id="rd-msg">جارٍ فتح الكتاب…</p><div class="page-wrap" id="rd-wrap" hidden><canvas id="rd-canvas"></canvas><canvas id="rd-ink" class="ink" aria-label="طبقة الكتابة على الصفحة"></canvas></div></div></section>`;
  try{const doc=g.bookId?await openDoc(g.bookId):null;
    if(!doc){document.getElementById('rd-stage').innerHTML=`<div class="mx-empty"><p>ملف الكتاب غير مرفق على هذا الجهاز بعد. أرفقه مرة واحدة، فيُفتح هنا في كل مرة من هذا المتصفح.</p><label class="btn btn-primary" for="grade-pdf" style="cursor:pointer">إرفاق ملف الكتاب (PDF)</label><input id="grade-pdf" data-owner="${g.id}" data-reader="1" type="file" accept="application/pdf,.pdf" hidden><p id="grade-status" role="status"></p></div>`;return;}
    state.total=doc.numPages;document.getElementById('rd-total').textContent=`من ${n(doc.numPages)}`;document.getElementById('rd-page').max=doc.numPages;
    refreshBar();await show(state.page);
  }catch(e){document.getElementById('rd-stage').innerHTML=`<div class="mx-empty"><p>تعذر فتح الكتاب: ${esc(e.message)}</p></div>`;}
}
async function show(p){const doc=cache.doc,cv=document.getElementById('rd-canvas');if(!doc||!cv)return;state.page=Math.min(Math.max(1,p),doc.numPages);
  const input=document.getElementById('rd-page');if(input)input.value=state.page;history.replaceState(null,'',`#book/${state.g.id}/${state.page}`);
  const here=lessonAt(state.g.id,state.page),box=document.getElementById('rd-here');
  if(box)box.innerHTML=here?`<span><span class="glabel">الفصل ${n(here.ch.number)}</span> ${here.it.code?`<span class="lcode">${n(here.it.code)}</span> `:''}<b>${esc(here.it.title)}</b> <span class="item-sub">صفحة ${n(pagesLabel(here.it))}</span></span><button class="btn btn-soft btn-sm" data-prepare-grade="${state.g.id}" data-ci="${here.ci}" data-ii="${here.ii}">حضّر هذا الدرس</button>`:'';
  const page=await doc.getPage(state.page),stage=document.getElementById('rd-stage');if(!stage)return;
  const base=page.getViewport({scale:1}),fs=!!document.fullscreenElement,avail=stage.clientWidth-8,availH=fs?window.innerHeight-90:Infinity;
  let scale=Math.min(avail/base.width,availH/base.height)*state.zoom;if(!fs)scale=Math.min(avail,900)/base.width*state.zoom;
  const dpr=Math.min(window.devicePixelRatio||1,2),v=page.getViewport({scale:scale*dpr});
  task?.cancel?.();const off=document.createElement('canvas');off.width=Math.ceil(v.width);off.height=Math.ceil(v.height);
  task=page.render({canvasContext:off.getContext('2d'),viewport:v});try{await task.promise}catch(e){if(e?.name==='RenderingCancelledException')return;throw e}
  cv.width=off.width;cv.height=off.height;cv.getContext('2d').drawImage(off,0,0);cv.style.width=(v.width/dpr)+'px';cv.style.height=(v.height/dpr)+'px';const ic=document.getElementById('rd-ink');ic.width=off.width;ic.height=off.height;ic.style.width=cv.style.width;ic.style.height=cv.style.height;document.getElementById('rd-wrap').hidden=false;document.getElementById('rd-msg')?.remove();await attach(ic,`${state.g.bookId}:${state.page}`);
  if(state.page<doc.numPages)doc.getPage(state.page+1).catch(()=>{});}

export function forgetBook(id){if(cache.id===id){cache.id='';cache.doc=null;}}
document.addEventListener('click',e=>{const k=e.target.closest('[data-ink-tool],[data-ink-color],[data-ink-hl],[data-ink-size],[data-ink-undo],[data-ink-clear]');if(k&&document.getElementById('reader')){const d=k.dataset;
  if(d.inkTool)ink.tool=d.inkTool;if(d.inkColor){ink.color=d.inkColor;}if(d.inkHl)ink.hl=d.inkHl;if(d.inkSize)ink.size=Number(d.inkSize);
  if(k.hasAttribute('data-ink-undo'))undo();if(k.hasAttribute('data-ink-clear')&&ink.strokes.length&&confirm('مسح كل ما كتبته على هذه الصفحة؟'))clearPage();
  refreshBar();return;}
  const b=e.target.closest('[data-rd]');if(!b||!document.getElementById('reader'))return;const a=b.dataset.rd;
  if(a==='next')show(state.page+1);if(a==='prev')show(state.page-1);
  if(a==='in'){state.zoom=Math.min(3,state.zoom+.25);show(state.page);}if(a==='out'){state.zoom=Math.max(.5,state.zoom-.25);show(state.page);}
  if(a==='full'){const r=document.getElementById('reader');if(document.fullscreenElement)document.exitFullscreen?.();else r.requestFullscreen?.().catch(()=>{});}});
document.addEventListener('change',e=>{if(e.target.id==='rd-page')show(Number(e.target.value)||1);if(e.target.id==='rd-lesson'&&e.target.value){show(Number(e.target.value));e.target.value='';}});
document.addEventListener('keydown',e=>{if(!document.getElementById('reader')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();return;}if(e.key==='ArrowLeft'||e.key==='PageDown'){e.preventDefault();show(state.page+1);}if(e.key==='ArrowRight'||e.key==='PageUp'){e.preventDefault();show(state.page-1);}});
document.addEventListener('fullscreenchange',()=>{if(document.getElementById('reader'))show(state.page);});
let rz;window.addEventListener('resize',()=>{if(!document.getElementById('reader'))return;clearTimeout(rz);rz=setTimeout(()=>show(state.page),200);});
let sx=null;document.addEventListener('touchstart',e=>{if(ink.tool==='view'&&e.target.closest?.('#rd-stage')&&e.touches.length===1&&state.zoom<=1)sx=e.touches[0].clientX;},{passive:true});
document.addEventListener('touchend',e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>60)show(state.page+(dx>0?1:-1));},{passive:true});
