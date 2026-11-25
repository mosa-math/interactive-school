// قارئ الكتاب داخل الموقع: يعرض ملف PDF المحفوظ في متصفح المعلم فقط (IndexedDB)، ولا يُرفع الكتاب إلى أي مكان.
import {record} from './data/database.mjs';
import {curriculum,pagesLabel} from './data/curriculum.mjs';
import {escape as esc,digit as n} from '../lesson-core.mjs';
import {ink,attach,undo,clearPage,updateCursor,savePrefs,COLORS,HIGHLIGHTS,SIZES,SHAPES,FONTS,FONT_SIZES,hasSelection,deleteSelection,recolorSelection,duplicateSelection,clearSelection,applyTextStyle,editingText,finishText,cancelLive} from './ink.mjs';

const cache={id:'',doc:null,loading:null};
let task=null,state={g:null,page:1,zoom:1,total:0};

async function loadPDF(bytes){const lib=await import('../vendor/pdf.mjs');lib.GlobalWorkerOptions.workerSrc=new URL('../vendor/pdf.worker.mjs',import.meta.url).href;return lib.getDocument({data:new Uint8Array(bytes),wasmUrl:new URL('../vendor/wasm/',import.meta.url).href,isEvalSupported:false}).promise;}
async function openDoc(bookId){if(cache.id===bookId&&cache.doc)return cache.doc;if(cache.id===bookId&&cache.loading)return cache.loading;
  cache.id=bookId;cache.doc=null;cache.loading=(async()=>{const book=await record('books','readonly',s=>s.get(bookId));if(!book?.blob)return null;const doc=await loadPDF(await book.blob.arrayBuffer());cache.doc=doc;return doc;})().catch(e=>{cache.id='';throw e}).finally(()=>{cache.loading=null});return cache.loading;}

const ico={select:'<path d="M5 4c6-2 14 0 14 5s-6 6-9 5-5 2-3 4"/><path d="M7 18l-2 3"/><circle cx="7" cy="18" r="1.6"/>',laser:'<circle cx="12" cy="12" r="3.2" fill="#EF2323" stroke="none"/><circle cx="12" cy="12" r="7" stroke-opacity=".45"/>',copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',hand:'<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v8.5a6.5 6.5 0 0 1-13 0V12a1.5 1.5 0 0 1 3 0v1"/>',pen:'<path d="m4 20 4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',hl:'<path d="m9 11-5 5v4h4l5-5"/><path d="m14 6 4 4-5 5-4-4z"/><path d="M3 21h7"/>',erase:'<path d="m7 21-4-4L14 6l6 6-9 9z"/><path d="M7 21h13M9 11l6 6"/>',undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/>',trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',next:'<path d="m15 6-6 6 6 6"/>',prev:'<path d="m9 6 6 6-6 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',full:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'};
const svg=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ico[k]}</svg>`;
Object.assign(ico,{shape:'<rect x="3" y="11" width="9" height="9" rx="1"/><circle cx="16" cy="8" r="5"/>',text:'<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  s_rect:'<rect x="4" y="6" width="16" height="12" rx="1"/>',s_ellipse:'<circle cx="12" cy="12" r="8"/>',s_tri:'<path d="M12 4 21 20H3z"/>',s_diamond:'<path d="m12 3 9 9-9 9-9-9z"/>',s_round:'<rect x="4" y="6" width="16" height="12" rx="4"/>',s_line:'<path d="M5 19 19 5"/>',s_arrow:'<path d="M5 19 19 5M10 5h9v9"/>',s_elbow:'<path d="M4 6h14v13"/><circle cx="4" cy="6" r="1.6"/><circle cx="18" cy="19" r="1.6"/>',s_curve:'<path d="M4 6c10 0 14 4 14 13"/><circle cx="4" cy="6" r="1.6"/><circle cx="18" cy="19" r="1.6"/>',
  free:'<path d="M5 9c2-5 12-6 14-1s-4 8-8 7-6-2-6-6z" stroke-dasharray="3 2.5"/>',rectsel:'<rect x="4" y="5" width="16" height="14" rx="1.5" stroke-dasharray="3 2.5"/>',dot:'<circle cx="12" cy="12" r="3.5" fill="#EF2323" stroke="none"/>',lline:'<path d="M3 14c4 4 8-6 12-2s4 2 6 0" stroke="#EF2323"/>',
  bold:'<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>',italic:'<path d="M14 5h-4M14 19h-4M13 5l-2 14"/>',ar:'<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>',ac:'<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>',al:'<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>',fill:'<rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" fill-opacity=".25"/>'});
const TOOLS=[['view','hand','تصفح'],['pen','pen','قلم'],['hl','hl','تظليل'],['erase','erase','ممحاة'],['select','select','تحديد'],['shape','shape','أشكال'],['text','text','نص'],['laser','laser','مؤشر الشرح']];
const pressed=v=>`aria-pressed="${!!v}"`;
const swatches=(list,cur,attr,label='')=>`<div class="ink-group">${list.map(([c,name])=>`<button class="ink-sw" style="background:${c}" data-${attr}="${c}" aria-label="${label}${name}" ${pressed(c===cur)}></button>`).join('')}</div>`;
const sizes=()=>`<div class="ink-group">${SIZES.map(([label,w])=>`<button class="ink-size" data-ink-size="${w}" ${pressed(w===ink.size)} aria-label="${label}"><i style="width:${Math.round(w*1600)}px;height:${Math.round(w*1600)}px"></i></button>`).join('')}</div>`;
const seg=(items,cur,attr)=>`<div class="ink-seg">${items.map(([v,i,label])=>`<button class="ink-tool" data-${attr}="${v}" ${pressed(v===cur)}>${svg(i)}<span>${label}</span></button>`).join('')}</div>`;
function options(){const t=ink.tool,T=ink.text;
  if(t==='pen')return swatches(COLORS,ink.color,'ink-color')+sizes();
  if(t==='hl')return swatches(HIGHLIGHTS,ink.hl,'ink-hl');
  if(t==='erase')return `<span class="ink-hint">مرّر الممحاة على الخط أو الشكل أو النص لمسحه.</span>`;
  if(t==='shape')return `<div class="ink-group ink-shapes">${SHAPES.map(([k,label])=>`<button class="ink-icon" data-ink-shape="${k}" ${pressed(ink.shape===k)} aria-label="${label}" title="${label}">${svg('s_'+k)}</button>`).join('')}</div><div class="ink-group"><button class="ink-icon" data-ink-fill ${pressed(ink.fill)} aria-label="تعبئة الشكل" title="تعبئة الشكل">${svg('fill')}</button></div>`+swatches(COLORS,ink.color,'ink-color')+sizes();
  if(t==='text')return swatches(COLORS,T.c,'text-color','لون النص: ')+`<div class="ink-group"><select data-text-font aria-label="نوع الخط">${FONTS.map(([k,l])=>`<option value="${k}"${T.font===k?' selected':''}>${l}</option>`).join('')}</select><select data-text-size aria-label="حجم الخط">${FONT_SIZES.map(z=>`<option value="${z}"${T.fs===z?' selected':''}>${n(z)}</option>`).join('')}</select></div>
    <div class="ink-group"><button class="ink-icon" data-text-b ${pressed(T.b)} aria-label="عريض">${svg('bold')}</button><button class="ink-icon" data-text-i ${pressed(T.i)} aria-label="مائل">${svg('italic')}</button></div>
    <div class="ink-group">${[['right','ar','محاذاة لليمين'],['center','ac','توسيط'],['left','al','محاذاة لليسار']].map(([v,i,l])=>`<button class="ink-icon" data-text-align="${v}" ${pressed(T.align===v)} aria-label="${l}">${svg(i)}</button>`).join('')}<select data-text-lh aria-label="تباعد الأسطر">${[[1.2,'١٫٢'],[1.5,'١٫٥'],[2,'٢']].map(([v,l])=>`<option value="${v}"${T.lh===v?' selected':''}>تباعد ${l}</option>`).join('')}</select></div>
    <span class="ink-hint">${editingText()?'اكتب، ثم اضغط خارج المربع للحفظ.':'اضغط على الصفحة لإضافة نص، أو على نص موجود لتعديله.'}</span>`;
  if(t==='select')return seg([['free','free','تحديد حر'],['rect','rectsel','مستطيل']],ink.lasso,'ink-lasso')+(hasSelection()?swatches(COLORS,null,'sel-color','تلوين المحدد: ')+`<div class="ink-group"><button class="ink-tool" data-sel-copy>${svg('copy')}<span>نسخ</span></button><button class="ink-tool" data-sel-delete>${svg('trash')}<span>حذف</span></button><button class="ink-tool" data-sel-none><span>إلغاء التحديد</span></button></div>`:`<span class="ink-hint">${ink.lasso==='rect'?'اسحب مستطيلًا حول ما تريد':'ارسم دائرة حول ما تريد'}، ثم اسحبه لتحريكه.</span>`);
  if(t==='laser')return seg([['dot','dot','نقطة'],['line','lline','خط']],ink.laser,'ink-laser')+`<span class="ink-hint">${ink.laser==='dot'?'نقطة حمراء تتبع القلم بلا أثر.':'نقطة حمراء يتبعها أثر يختفي وحده.'}</span>`;
  return `<span class="ink-hint">اختر أداة للكتابة على الصفحة، أو «تصفح» لتقليب الصفحات.</span>`;}
function inkBar(){return `<div class="ink-row"><div class="ink-group">${TOOLS.map(([k,i,label])=>`<button class="ink-tool" data-ink-tool="${k}" ${pressed(ink.tool===k)} title="${label}">${svg(i)}<span>${label}</span></button>`).join('')}</div>
  <div class="ink-group"><button class="ink-tool" data-ink-pencil ${pressed(ink.pencilOnly)} title="عند التفعيل يكتب القلم فقط، والإصبع يحرّك الصفحة">${svg('pen')}<span>القلم فقط</span></button><button class="ink-tool" data-ink-undo title="تراجع">${svg('undo')}<span>تراجع</span></button><button class="ink-tool" data-ink-clear title="مسح الصفحة">${svg('trash')}<span>مسح الصفحة</span></button></div></div>
  <div class="ink-sub">${options()}</div>`;}
function refreshBar(){const bar=document.getElementById('ink-bar');if(bar)bar.innerHTML=inkBar();updateCursor();document.getElementById('rd-stage')?.classList.toggle('drawing',ink.tool!=='view');}
function refreshOptions(){const sub=document.querySelector('#ink-bar .ink-sub');if(sub)sub.innerHTML=options();}
function lessonAt(gid,page){const c=curriculum[gid];if(!c)return null;for(const [ci,ch] of c.chapters.entries())for(const [ii,it] of ch.items.entries())if(page>=it.from&&page<=it.to)return {it,ci,ii,ch};return null;}

export async function renderReader(root,g,startPage){
  state={g,page:Math.max(1,Number(startPage)||1),zoom:state.g?.id===g.id?state.zoom:1,total:0,focus:false};document.body.classList.remove('reading-focus');
  const c=curriculum[g.id];
  root.innerHTML=`<nav class="mx-crumbs" aria-label="المسار"><a href="#home">صفوفي</a><span aria-hidden="true">/</span><a href="#grade/${g.id}">الصف ${esc(g.name)}</a><span aria-hidden="true">/</span><span>الكتاب</span></nav>
  <section class="reader" id="reader"><div class="reader-bar">
    <div class="reader-nav"><button class="btn btn-outline btn-sm icon-btn" data-rd="prev" aria-label="الصفحة السابقة">${svg('prev')}</button><label class="pg"><span>صفحة</span><input id="rd-page" type="number" min="1" inputmode="numeric" value="${state.page}" aria-label="رقم الصفحة"><span id="rd-total"></span></label><button class="btn btn-outline btn-sm icon-btn" data-rd="next" aria-label="الصفحة التالية">${svg('next')}</button></div>
    ${c?`<select id="rd-lesson" aria-label="انتقل إلى درس"><option value="">انتقل إلى درس…</option>${c.chapters.map(ch=>`<optgroup label="الفصل ${n(ch.number)}: ${esc(ch.title)}">${ch.items.map(it=>`<option value="${it.from}">${it.code?n(it.code)+' ':''}${esc(it.title)} · ص ${n(it.from)}</option>`).join('')}</optgroup>`).join('')}</select>`:''}
    <div class="reader-nav"><button class="btn btn-outline btn-sm icon-btn" data-rd="out" aria-label="تصغير">${svg('minus')}</button><button class="btn btn-outline btn-sm icon-btn" data-rd="in" aria-label="تكبير">${svg('plus')}</button><button class="btn btn-outline btn-sm" data-rd="full">${svg('full')}ملء الشاشة</button></div>
  </div>
  <div class="ink-bar" id="ink-bar" role="toolbar" aria-label="أدوات الكتابة على الكتاب">${inkBar()}</div>
  <div class="reader-lesson" id="rd-here"></div>
  <div class="reader-stage" id="rd-stage"><p class="mx-muted" id="rd-msg">جارٍ فتح الكتاب…</p><div class="page-wrap" id="rd-wrap" hidden><canvas id="rd-canvas"></canvas><canvas id="rd-ink" class="ink" aria-label="طبقة الكتابة على الصفحة"></canvas><canvas id="rd-over" class="ink over" aria-hidden="true"></canvas></div></div></section>`;
  try{const doc=g.bookId?await openDoc(g.bookId):null;
    if(!doc){document.getElementById('rd-stage').innerHTML=`<div class="mx-empty"><p>ملف الكتاب غير مرفق على هذا الجهاز بعد. أرفقه مرة واحدة، فيُفتح هنا في كل مرة من هذا المتصفح.</p><label class="btn btn-primary" for="grade-pdf" style="cursor:pointer">إرفاق ملف الكتاب (PDF)</label><input id="grade-pdf" data-owner="${g.id}" data-reader="1" type="file" accept="application/pdf,.pdf" hidden><p id="grade-status" role="status"></p></div>`;return;}
    state.total=doc.numPages;document.getElementById('rd-total').textContent=`من ${n(doc.numPages)}`;document.getElementById('rd-page').max=doc.numPages;
    refreshBar();await show(state.page);
  }catch(e){document.getElementById('rd-stage').innerHTML=`<div class="mx-empty"><p>تعذر فتح الكتاب: ${esc(e.message)}</p></div>`;}
}
async function show(p){finishText();const doc=cache.doc,cv=document.getElementById('rd-canvas');if(!doc||!cv)return;state.page=Math.min(Math.max(1,p),doc.numPages);
  const input=document.getElementById('rd-page');if(input)input.value=state.page;history.replaceState(null,'',`#book/${state.g.id}/${state.page}`);
  const here=lessonAt(state.g.id,state.page),box=document.getElementById('rd-here');
  if(box)box.innerHTML=here?`<span><span class="glabel">الفصل ${n(here.ch.number)}</span> ${here.it.code?`<span class="lcode">${n(here.it.code)}</span> `:''}<b>${esc(here.it.title)}</b> <span class="item-sub">صفحة ${n(pagesLabel(here.it))}</span></span><button class="btn btn-soft btn-sm" data-prepare-grade="${state.g.id}" data-ci="${here.ci}" data-ii="${here.ii}">حضّر هذا الدرس</button>`:'';
  const page=await doc.getPage(state.page),stage=document.getElementById('rd-stage');if(!stage)return;
  const base=page.getViewport({scale:1}),fs=state.focus,avail=stage.clientWidth-8,reader=document.getElementById('reader'),bars=fs?(reader?.querySelector('.reader-bar')?.offsetHeight||0)+(reader?.querySelector('.ink-bar')?.offsetHeight||0)+40:0,availH=fs&&window.innerWidth>window.innerHeight?window.innerHeight-bars:Infinity;
  let scale=Math.min(avail/base.width,availH/base.height)*state.zoom;if(!fs)scale=Math.min(avail,900)/base.width*state.zoom;
  let dpr=Math.min(window.devicePixelRatio||1,2);const area=base.width*base.height*(scale*dpr)**2,MAX=9e6;if(area>MAX)dpr*=Math.sqrt(MAX/area);const v=page.getViewport({scale:scale*dpr});
  task?.cancel?.();const off=document.createElement('canvas');off.width=Math.ceil(v.width);off.height=Math.ceil(v.height);
  task=page.render({canvasContext:off.getContext('2d'),viewport:v});try{await task.promise}catch(e){if(e?.name==='RenderingCancelledException')return;throw e}
  cv.width=off.width;cv.height=off.height;cv.getContext('2d').drawImage(off,0,0);cv.style.width=(v.width/dpr)+'px';cv.style.height=(v.height/dpr)+'px';const ic=document.getElementById('rd-ink');ic.width=off.width;ic.height=off.height;ic.style.width=cv.style.width;ic.style.height=cv.style.height;document.getElementById('rd-wrap').hidden=false;document.getElementById('rd-msg')?.remove();const oc=document.getElementById('rd-over');oc.style.width=cv.style.width;oc.style.height=cv.style.height;await attach(ic,`${state.g.bookId}:${state.page}`,oc);
  if(state.page<doc.numPages)doc.getPage(state.page+1).catch(()=>{});}

export function forgetBook(id){if(cache.id===id){cache.id='';cache.doc=null;}}
document.addEventListener('pointerdown',e=>{if(editingText()&&e.target.closest?.('#ink-bar button'))e.preventDefault();},true);
document.addEventListener('click',e=>{const k=e.target.closest('#ink-bar button');if(k&&document.getElementById('reader')){const d=k.dataset,T=ink.text;let textChange=false;
  if(d.inkTool){if(ink.tool!==d.inkTool){ink.tool=d.inkTool;refreshBar();}return;}
  if(d.inkColor)ink.color=d.inkColor;if(d.inkHl)ink.hl=d.inkHl;if(d.inkSize)ink.size=Number(d.inkSize);if(d.inkShape)ink.shape=d.inkShape;if('inkFill' in d)ink.fill=!ink.fill;
  if('inkPencil' in d){ink.pencilOnly=!ink.pencilOnly;savePrefs();refreshBar();return;}if(d.inkLasso){ink.lasso=d.inkLasso;clearSelection();}if(d.inkLaser)ink.laser=d.inkLaser;
  if(d.textColor){T.c=d.textColor;textChange=true;}if('textB' in d){T.b=!T.b;textChange=true;}if('textI' in d){T.i=!T.i;textChange=true;}if(d.textAlign){T.align=d.textAlign;textChange=true;}
  if(d.selColor)recolorSelection(d.selColor);if('selCopy' in d)duplicateSelection();if('selDelete' in d)deleteSelection();if('selNone' in d)clearSelection();
  if('inkUndo' in d)undo();if('inkClear' in d&&ink.strokes.length&&confirm('مسح كل ما على هذه الصفحة؟'))clearPage();
  savePrefs();if(textChange)applyTextStyle();refreshOptions();return;}
  const b=e.target.closest('[data-rd]');if(!b||!document.getElementById('reader'))return;const a=b.dataset.rd;
  if(a==='next')show(state.page+1);if(a==='prev')show(state.page-1);
  if(a==='in'){state.zoom=Math.min(ZMAX,state.zoom+.25);show(state.page);}if(a==='out'){state.zoom=Math.max(ZMIN,state.zoom-.25);show(state.page);}
  if(a==='full')setFocus(!state.focus);});
document.addEventListener('change',e=>{const d=e.target.dataset||{};if('textFont' in d||'textSize' in d||'textLh' in d){const T=ink.text;if('textFont' in d)T.font=e.target.value;if('textSize' in d)T.fs=Number(e.target.value);if('textLh' in d)T.lh=Number(e.target.value);savePrefs();applyTextStyle();return;}if(e.target.id==='rd-page')show(Number(e.target.value)||1);if(e.target.id==='rd-lesson'&&e.target.value){show(Number(e.target.value));e.target.value='';}});
document.addEventListener('ink-selection',()=>{refreshOptions();const b=document.querySelector('[data-ink-pencil]');if(b)b.setAttribute('aria-pressed',String(!!ink.pencilOnly));},true);
document.addEventListener('keydown',e=>{if(!document.getElementById('reader')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if((e.key==='Delete'||e.key==='Backspace')&&hasSelection()){e.preventDefault();deleteSelection();refreshOptions();return;}if(e.key==='Escape'&&hasSelection()){clearSelection();refreshOptions();return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();refreshOptions();return;}if(e.key==='ArrowLeft'||e.key==='PageDown'){e.preventDefault();show(state.page+1);}if(e.key==='ArrowRight'||e.key==='PageUp'){e.preventDefault();show(state.page-1);}});
/* ملء الشاشة: وضع عرض ثابت يغطي الشاشة ولا يخرج بالسحب. على الحاسب فقط يُطلب أيضًا ملء الشاشة الحقيقي لإخفاء شريط المتصفح. */
const touchDevice=()=>navigator.maxTouchPoints>0;
function setFocus(on){state.focus=on;const r=document.getElementById('reader');if(!r)return;r.classList.toggle('focus',on);document.body.classList.toggle('reading-focus',on);
  const b=r.querySelector('[data-rd=full]');if(b)b.innerHTML=on?`${svg('full')}خروج من ملء الشاشة`:`${svg('full')}ملء الشاشة`;
  if(!touchDevice()){try{if(on&&!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{});if(!on&&document.fullscreenElement)document.exitFullscreen?.();}catch{}}
  show(state.page);}
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&state.focus&&!touchDevice())setFocus(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.focus&&!editingText()&&!hasSelection())setFocus(false);});
window.addEventListener('hashchange',()=>{if(state.focus&&!location.hash.startsWith('#book/')){state.focus=false;document.body.classList.remove('reading-focus');}});
let rz;window.addEventListener('resize',()=>{if(!document.getElementById('reader'))return;clearTimeout(rz);rz=setTimeout(()=>show(state.page),200);});
/* التكبير والتصغير بإصبعين */
const ZMIN=.5,ZMAX=4,pinch={on:false,d0:0,z0:1,z:1,fx:.5,fy:.5,mx:0,my:0};
const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY),mid=t=>[(t[0].clientX+t[1].clientX)/2,(t[0].clientY+t[1].clientY)/2];
document.addEventListener('touchstart',e=>{if(e.touches.length!==2||!e.target.closest?.('#rd-stage'))return;const wrap=document.getElementById('rd-wrap');if(!wrap||wrap.hidden)return;
  e.preventDefault();sx=null;finishText();cancelLive();ink.pinching=true;const r=wrap.getBoundingClientRect(),[mx,my]=mid(e.touches);
  Object.assign(pinch,{on:true,d0:dist(e.touches)||1,z0:state.zoom,z:state.zoom,mx,my,fx:(mx-r.left)/r.width,fy:(my-r.top)/r.height});wrap.style.transformOrigin=`${pinch.fx*100}% ${pinch.fy*100}%`;},{passive:false,capture:true});
document.addEventListener('touchmove',e=>{if(!pinch.on||e.touches.length<2)return;e.preventDefault();const wrap=document.getElementById('rd-wrap');if(!wrap)return;
  pinch.z=Math.min(ZMAX,Math.max(ZMIN,pinch.z0*dist(e.touches)/pinch.d0));const [mx,my]=mid(e.touches);wrap.style.transform=`translate(${mx-pinch.mx}px,${my-pinch.my}px) scale(${pinch.z/pinch.z0})`;pinch.cx=mx;pinch.cy=my;},{passive:false,capture:true});
async function endPinch(){if(!pinch.on)return;pinch.on=false;const wrap=document.getElementById('rd-wrap'),stage=document.getElementById('rd-stage');const mx=pinch.cx??pinch.mx,my=pinch.cy??pinch.my;
  state.zoom=Math.round(pinch.z*100)/100;await show(state.page);if(wrap){wrap.style.transform='';wrap.style.transformOrigin='';}
  const r=document.getElementById('rd-wrap')?.getBoundingClientRect();if(r&&stage){stage.scrollBy(r.left+pinch.fx*r.width-mx,0);(state.focus?document.getElementById('reader'):window).scrollBy(0,r.top+pinch.fy*r.height-my);}
  setTimeout(()=>{ink.pinching=false;},50);pinch.cx=pinch.cy=undefined;}
document.addEventListener('touchend',e=>{if(pinch.on&&e.touches.length<2)endPinch();},{capture:true});
document.addEventListener('touchcancel',()=>{if(pinch.on)endPinch();},{capture:true});
let sx=null;document.addEventListener('touchstart',e=>{if(ink.tool==='view'&&e.target.closest?.('#rd-stage')&&e.touches.length===1&&state.zoom<=1)sx=e.touches[0].clientX;},{passive:true});
document.addEventListener('touchend',e=>{if(sx===null||pinch.on||ink.pinching){sx=null;return;}const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>60)show(state.page+(dx>0?1:-1));},{passive:true});
