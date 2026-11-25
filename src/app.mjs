import {escape as esc,digit as n} from '../lesson-core.mjs';
import {getGrades,saveGrades,createGrade,presentationsForGrade} from './data/grades.mjs';
import {getLessons,putBook} from './data/database.mjs';
import {getRoster,saveRoster,parseNames,makeGroups} from './data/roster.mjs';

const root=document.getElementById('app');
let lessons=[];

/* أيقونات خطية */
const P={
  book:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
  screen:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  wheel:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/>',
  groups:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 20c0-2.2 1.3-4 3.5-4"/>',
  trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  pen:'<path d="m4 20 4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  play:'<path d="M7 4v16l13-8z" fill="currentColor" stroke="none"/>',
  back:'<path d="m9 6 6 6-6 6"/>',
  chevron:'<path d="m15 6-6 6 6 6"/>'
};
const ico=(k,cls='ico')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[k]}</svg>`;
const btnIco=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${P[k]}</svg>`;
const students=k=>k===1?'طالب واحد':k===2?'طالبان':k<=10?`${n(k)} طلاب`:`${n(k)} طالبًا`;
const settingsData=()=>{try{return JSON.parse(localStorage.getItem('teacher-school-settings')||'{}')}catch{return {}}};

function setNav(route){const map={home:'#home',grade:'#home',roster:'#home','new-grade':'#home',tools:'#tools','school-settings':'#school-settings'};document.querySelectorAll('.topnav a').forEach(a=>{if(a.getAttribute('href')===map[route])a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});}
function frame(body,{stage=false}={}){stopTimer();root.classList.remove('ws');root.classList.add('mx');document.body.classList.toggle('stage',stage);root.innerHTML=body;}
const gradeBadge=g=>g.cover?`<img class="gcover" src="${esc(g.cover)}" alt="غلاف كتاب الصف ${esc(g.name)}">`:`<span class="gbadge ${g.color}" aria-hidden="true">${esc((g.shortName||g.name).trim().charAt(0))}</span>`;
const sectionsLabel=g=>g.sections.length===1?'فصل واحد':`${n(g.sections.length)} ${g.sections.length<=10?'فصول':'فصلًا'}`;

/* الرئيسية */
function home(){
  const grades=getGrades(),s=settingsData(),hour=new Date().getHours();
  const hello=hour<12?'صباح الخير':'مساء الخير';
  const who=s.teacher?.trim()?`أ. ${esc(s.teacher.trim())}، ماذا تحضّر اليوم؟`:'ماذا تحضّر اليوم؟';
  frame(`<section class="mx-sec" style="gap:6px"><p class="mx-muted">${hello}</p><h1 class="mx-title">${who}</h1></section>
  <section class="mx-sec"><h2 class="mx-h2">صفوفي</h2><div class="mx-grades">${grades.map(g=>`
    <article class="gcard">
      <div class="gcard-head">${gradeBadge(g)}<div><a href="#grade/${g.id}"><h3 class="gname">الصف ${esc(g.name)}</h3></a><span class="glabel">${sectionsLabel(g)}</span></div></div>
      <div class="mx-sec" style="gap:8px"><span class="glabel">ابدأ حصة مع</span><div class="chips">${g.sections.map(sec=>`<a class="chip" href="#tools/${g.id}/${sec.id}">${esc(sec.name)}</a>`).join('')}</div></div>
      <div class="gactions">
        <a href="#grade/${g.id}/book">${ico('book')}الكتاب</a>
        <a href="#grade/${g.id}">${ico('screen')}الدروس</a>
        <a href="#tools/${g.id}/${g.sections[0].id}">${ico('timer')}أدوات الحصة</a>
      </div>
    </article>`).join('')}
    <a class="add-card" href="#new-grade"><span class="add-icon">${ico('plus')}</span>صف جديد<small>اختر الكتاب وعدد الفصول</small></a>
  </div></section>
  <section class="mx-sec"><div class="mx-row"><h2 class="mx-h2">أدوات سريعة للحصة</h2><a href="#tools" style="font-weight:600;text-decoration:none">كل الأدوات</a></div>
    <div class="mx-tools">
      <a class="tool" href="#tools">${ico('timer')}المؤقت</a>
      <a class="tool" href="#tools">${ico('wheel')}القرعة</a>
      <a class="tool" href="#tools">${ico('groups')}المجموعات</a>
      <a class="tool" href="#tools">${ico('trophy')}نقاط الفرق</a>
      <a class="tool" href="#tools">${ico('pen')}السبورة</a>
    </div></section>`);
}

/* صفحة الصف */
function gradePage(g,sub){
  window.selectWorkspaceGrade?.(g.name);
  const current=g.sections.find(s=>s.id===sub)?.id,tab=sub==='book'?'book':'lessons';
  frame(`<nav class="mx-crumbs" aria-label="المسار"><a href="#home">صفوفي</a><span aria-hidden="true">/</span><span>الصف ${esc(g.name)}</span></nav>
  <section class="mx-row">
    <div class="gcard-head">${gradeBadge(g)}<div><h1 class="mx-title">الصف ${esc(g.name)}</h1><p class="mx-muted">${sectionsLabel(g)}${g.sections.length>1?' · الكتاب والدروس مشتركة بينها':''}</p></div></div>
    <div class="chips"><button class="btn btn-outline" data-grade-book="${g.id}">${btnIco('book')}الكتاب</button><button class="btn btn-primary" data-new-grade-lesson="${g.id}">${btnIco('plus')}درس جديد من الكتاب</button></div>
  </section>
  <section class="mx-sec" style="gap:12px"><h2 class="mx-h2">الفصول</h2><div class="class-grid">${g.sections.map(s=>{const count=getRoster(s.id).length;return `
    <div class="class-tile${s.id===current?' current':''}"><div class="links"><span class="class-name">${esc(s.name)}</span><a href="#roster/${g.id}/${s.id}">${count?`الكشف · ${students(count)}`:'أضف أسماء الطلاب'}</a></div><a class="btn btn-soft btn-sm" href="#tools/${g.id}/${s.id}">ابدأ الحصة</a></div>`}).join('')}</div></section>
  <section class="mx-sec" style="gap:14px">
    <div class="mx-row"><h2 class="mx-h2">${tab==='book'?'الكتاب':'الدروس'}</h2><div class="tabs" role="tablist"><button role="tab" aria-selected="${tab==='lessons'}" data-grade-lessons="${g.id}">الدروس</button><button role="tab" aria-selected="${tab==='book'}" data-grade-book="${g.id}">الكتاب</button></div></div>
    <div id="grade-content">${tab==='book'?bookView(g):lessonList(g)}</div>
  </section>`);
}
function lessonList(g){const rows=presentationsForGrade(lessons,g);
  if(!rows.length)return `<div class="mx-empty"><p>لا توجد دروس محفوظة لهذا الصف بعد. اختر صفحات الدرس من الكتاب ليُبنى منها العرض.</p><button class="btn btn-primary" data-new-grade-lesson="${g.id}">${btnIco('plus')}درس جديد من الكتاب</button></div>`;
  return `<div class="mx-list">${rows.map(l=>`<div class="item"><div><div class="item-title">${esc(l.title)}</div><div class="item-sub">${n(l.sources?.length||0)} صفحات من الكتاب · ${n(l.slides?.length||0)} شرائح</div></div><div class="chips" style="align-items:center"><span class="status ${l.approved?'ready':'review'}">${l.approved?'جاهز':'يحتاج مراجعتك'}</span><button class="btn btn-dark btn-sm" data-open-grade-lesson="${esc(l.id)}" data-owner-grade="${g.id}">${btnIco('play')}فتح الدرس</button></div></div>`).join('')}</div>`;}
function bookView(g){return `<div class="mx-panel"><p>ملف الكتاب يُحفظ على جهازك فقط، ولا يُرفع إلى الموقع العام.</p>${g.bookUrl?`<a class="btn btn-outline" style="align-self:flex-start" href="${esc(g.bookUrl)}" target="_blank" rel="noopener">فتح رابط الكتاب</a>`:''}<label for="grade-pdf">إرفاق كتاب PDF على هذا الجهاز</label><input id="grade-pdf" data-owner="${g.id}" type="file" accept="application/pdf,.pdf"><p id="grade-status" role="status"></p><button class="btn btn-primary" style="align-self:flex-start" data-new-grade-lesson="${g.id}">${btnIco('book')}اختيار صفحات الدرس من الكتاب</button></div>`;}

/* صف جديد والإعدادات */
function newGrade(){frame(`<nav class="mx-crumbs"><a href="#home">صفوفي</a><span aria-hidden="true">/</span><span>صف جديد</span></nav><h1 class="mx-title">صف جديد</h1><form id="new-grade-form" class="mx-panel"><label for="grade-name">اسم الصف</label><input id="grade-name" required maxlength="80" placeholder="الخامس الابتدائي"><label for="grade-short">اسم الفصل المختصر</label><input id="grade-short" maxlength="60" placeholder="خامس"><label for="grade-count">عدد الفصول</label><input id="grade-count" type="number" min="1" max="20" value="1" required><label for="grade-color">اللون</label><select id="grade-color"><option value="green">أخضر</option><option value="orange">برتقالي</option></select><label for="grade-url">رابط الكتاب على بوابة عين، أو أرفق PDF أدناه</label><input id="grade-url" type="url" placeholder="https://" maxlength="1000"><label for="new-grade-pdf">أو كتاب PDF للاستخدام على هذا الجهاز فقط</label><input id="new-grade-pdf" type="file" accept="application/pdf,.pdf"><div class="chips"><button class="btn btn-primary" type="submit">إضافة الصف</button></div><p id="new-grade-status" role="status"></p></form>`);}
function settings(){const s=settingsData();frame(`<h1 class="mx-title">الإعدادات والنسخ الاحتياطي</h1><section class="mx-panel"><label for="school-teacher">اسم المعلم (يظهر في الرئيسية والطباعة)</label><input id="school-teacher" value="${esc(s.teacher||'')}" maxlength="100"><label for="school-header">ترويسة المدرسة</label><input id="school-header" value="${esc(s.school||'')}" maxlength="180"><div class="chips"><button class="btn btn-primary" data-folder-settings>حفظ الإعدادات</button></div><p id="settings-status" role="status"></p></section><section class="mx-panel"><h2 class="mx-h2">النسخ الاحتياطي</h2><p>ينزّل تنظيم الصفوف والإعدادات في ملف. كشوف الطلاب لا تدخل في هذا الملف، والكتب والدروس تُصدّر من أدواتها.</p><div class="chips"><button class="btn btn-outline" data-folder-export>تصدير الصفوف والإعدادات</button><button class="btn btn-outline" data-folder-import>استيراد الصفوف والإعدادات</button></div><input id="folder-import" type="file" accept="application/json,.json" hidden></section>`);}

/* كشف الفصل: محفوظ على هذا الجهاز فقط */
function rosterPage(g,s){const names=getRoster(s.id);frame(`<nav class="mx-crumbs"><a href="#home">صفوفي</a><span aria-hidden="true">/</span><a href="#grade/${g.id}">الصف ${esc(g.name)}</a><span aria-hidden="true">/</span><span>${esc(s.name)}</span></nav>
  <section class="mx-row"><div><h1 class="mx-title">كشف ${esc(s.name)}</h1><p class="mx-muted">${names.length?students(names.length):'لا توجد أسماء بعد'}</p></div><a class="btn btn-soft" href="#tools/${g.id}/${s.id}">${btnIco('timer')}ابدأ الحصة</a></section>
  <section class="mx-panel"><label for="roster-names">أسماء الطلاب، اسم في كل سطر</label><p class="mx-note">يمكنك لصق الأسماء من نظام نور أو من ملف Excel. تُحفظ على هذا الجهاز وهذا المتصفح فقط، ولا تُرفع إلى الموقع أو إلى أي خادم.</p><textarea id="roster-names" class="roster" maxlength="20000" placeholder="محمد أحمد&#10;عبدالله سعد&#10;...">${esc(names.join('\n'))}</textarea><div class="chips"><button class="btn btn-primary" data-save-roster="${s.id}" data-grade="${g.id}">حفظ الكشف</button><button class="btn btn-outline" data-clear-roster="${s.id}" data-grade="${g.id}">مسح الكشف</button></div><p id="roster-status" role="status"></p></section>`);}

/* أدوات الحصة */
function toolsChooser(){const grades=getGrades();frame(`<h1 class="mx-title">أدوات الحصة</h1><p class="mx-muted">اختر الفصل، فتستخدم القرعة والمجموعات أسماء طلابه.</p>${grades.map(g=>`<section class="mx-sec" style="gap:12px"><h2 class="mx-h2">الصف ${esc(g.name)}</h2><div class="class-grid">${g.sections.map(s=>`<a class="tool" href="#tools/${g.id}/${s.id}">${ico('timer')}${esc(s.name)}</a>`).join('')}</div></section>`).join('')}`);}
const T={secs:300,total:300,running:false,id:0,used:[],noRepeat:true,a:0,b:0,names:[],section:'',color:'#17212D',drawing:false};
function stopTimer(){clearInterval(T.id);T.id=0;T.running=false;}
function toolsPage(g,s){
  if(T.section!==s.id){Object.assign(T,{secs:300,total:300,used:[],a:0,b:0,section:s.id});}
  T.names=getRoster(s.id);
  frame(`<div class="stage-top"><div class="who"><a class="back" href="#grade/${g.id}" aria-label="رجوع إلى الصف ${esc(g.name)}">${btnIco('back')}</a><div><small>الصف ${esc(g.name)} · أدوات الحصة</small><strong>${esc(s.name)}</strong></div></div>
    <div class="chips" style="align-items:center"><div class="tool-tabs" role="group" aria-label="اختيار الأداة">${[['all','الكل'],['timer','المؤقت'],['pick','القرعة'],['groups','المجموعات'],['points','النقاط'],['board','السبورة']].map(([k,t])=>`<button data-show="${k}" aria-pressed="${k==='all'}">${t}</button>`).join('')}</div><button class="full" data-fullscreen>ملء الشاشة</button></div></div>
  <div class="stage-grid">
    <section class="panel-d wide" data-panel="timer"><div style="display:flex;flex-direction:column;gap:6px"><h2>المؤقت</h2><span class="clock" id="clock" role="timer" aria-live="off"></span></div>
      <div style="display:flex;flex-direction:column;gap:12px;min-width:min(300px,100%)"><div class="d-row">${[1,3,5,10].map(m=>`<button class="d-btn" data-min="${m}">${n(m)} د</button>`).join('')}</div><div class="d-row"><button class="d-btn big teal" id="timer-toggle" style="flex:2"></button><button class="d-btn big mute" data-timer-reset>إعادة</button></div></div></section>
    <section class="panel-d" data-panel="pick"><div class="mx-row"><h2>القرعة</h2><a href="#roster/${g.id}/${s.id}" style="color:#7DD3C4;font-size:14px">${T.names.length?`${students(T.names.length)} · تعديل الكشف`:'أضف الكشف'}</a></div>
      <div class="pick-box" id="pick-box" aria-live="polite">${T.names.length?'<span class="hint">اضغط لاختيار طالب</span>':`<span class="hint">لا توجد أسماء لهذا الفصل بعد.<br><a href="#roster/${g.id}/${s.id}">أضف كشف ${esc(s.name)}</a></span>`}</div>
      <div class="d-row"><button class="d-btn big amber" data-pick style="flex:2"${T.names.length?'':' disabled'}>اختر طالبًا</button><label class="chk"><input type="checkbox" id="no-repeat"${T.noRepeat?' checked':''}>بلا تكرار</label></div></section>
    <section class="panel-d" data-panel="points"><h2>نقاط الفرق</h2><div class="teams">${[['a','الفريق الأول','#1E443D','background:var(--dark-teal);color:#08201C'],['b','الفريق الثاني','#4A3A18','background:var(--dark-amber);color:#2A1A00']].map(([k,t,dec,inc])=>`<div class="team ${k}"><span>${t}</span><b class="pts" id="pts-${k}">${T[k]}</b><div class="d-row"><button class="sq" style="background:${dec}" data-team="${k}" data-d="-1" aria-label="إنقاص نقطة من ${t}">−</button><button class="sq" style="${inc}" data-team="${k}" data-d="1" aria-label="إضافة نقطة إلى ${t}">+</button></div></div>`).join('')}</div><button class="d-btn mute" data-points-reset>تصفير النقاط</button></section>
    <section class="panel-d" data-panel="groups" style="grid-column:1/-1"><div class="mx-row"><h2>المجموعات</h2><div class="d-row" style="align-items:center"><label for="group-count" style="margin:0;color:var(--dark-muted);font-weight:500">عدد المجموعات</label><select id="group-count">${[2,3,4,5,6,7,8].map(k=>`<option value="${k}"${k===4?' selected':''}>${n(k)}</option>`).join('')}</select><button class="d-btn teal" style="flex:none;padding:12px 20px;border:0" data-make-groups${T.names.length?'':' disabled'}>وزّع الطلاب</button></div></div><div class="groups-out" id="groups-out">${T.names.length?'':'<p style="color:var(--dark-muted);margin:0">أضف كشف الفصل لتوزيع الطلاب على مجموعات.</p>'}</div></section>
    <section class="panel-d board-wrap" data-panel="board"><div class="mx-row"><h2>السبورة</h2><div class="swatches" role="group" aria-label="لون القلم">${[['#17212D','أسود'],['#0F6E64','أخضر'],['#C2410C','برتقالي'],['#1D4ED8','أزرق']].map(([c,t],i)=>`<button class="sw" style="background:${c}" data-color="${c}" aria-label="${t}" aria-pressed="${i===0}"></button>`).join('')}<button class="d-btn mute" style="flex:none;padding:10px 16px" data-board-clear>مسح</button></div></div><canvas class="board" id="board" aria-label="سبورة للكتابة بالقلم أو الإصبع"></canvas></section>
  </div>`,{stage:true});
  drawClock();setupBoard();
}
function drawClock(){const c=document.getElementById('clock');if(!c)return;const mm=String(Math.floor(T.secs/60)).padStart(2,'0'),ss=String(T.secs%60).padStart(2,'0');c.textContent=mm+':'+ss;c.className='clock'+(T.secs===0?' done':T.secs<=30?' warn':'');const t=document.getElementById('timer-toggle');if(t)t.textContent=T.running?'إيقاف مؤقت':'ابدأ';}
function tick(){if(!T.running)return;T.secs=Math.max(0,T.secs-1);if(T.secs===0){stopTimer();try{navigator.vibrate?.(300)}catch{}}drawClock();}
function setupBoard(){const cv=document.getElementById('board');if(!cv)return;const fit=()=>{const r=cv.getBoundingClientRect(),d=window.devicePixelRatio||1;if(!r.width)return;const img=cv.width?cv.toDataURL():null;cv.width=r.width*d;cv.height=r.height*d;const x=cv.getContext('2d');x.scale(d,d);x.lineCap='round';x.lineJoin='round';x.lineWidth=4;if(img){const i=new Image();i.onload=()=>x.drawImage(i,0,0,r.width,r.height);i.src=img;}};fit();
  const ctx=()=>cv.getContext('2d'),pos=e=>{const r=cv.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top]};
  cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);T.drawing=true;const x=ctx(),[a,b]=pos(e);x.strokeStyle=T.color;x.beginPath();x.moveTo(a,b);x.lineTo(a+.1,b+.1);x.stroke();};
  cv.onpointermove=e=>{if(!T.drawing)return;const x=ctx(),[a,b]=pos(e);x.lineTo(a,b);x.stroke();};
  cv.onpointerup=cv.onpointercancel=()=>{T.drawing=false;};
  cv._fit=fit;}
function showPanels(k){document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=k!=='all'&&p.dataset.panel!==k);document.querySelectorAll('[data-show]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.show===k)));const cv=document.getElementById('board');if(cv&&(k==='all'||k==='board'))requestAnimationFrame(()=>cv._fit?.());}
function pickStudent(){const box=document.getElementById('pick-box');if(!T.names.length||!box)return;let pool=T.noRepeat?T.names.filter(x=>!T.used.includes(x)):T.names;let reset=false;if(!pool.length){T.used=[];pool=T.names;reset=true;}const name=pool[Math.floor(Math.random()*pool.length)];if(T.noRepeat)T.used.push(name);const left=T.names.length-T.used.length;box.innerHTML=`<small>${reset?'بدأت دورة جديدة · ':''}دور</small><span class="pick-name">${esc(name)}</span>${T.noRepeat?`<small>بقي ${n(left)} من ${n(T.names.length)}</small>`:''}`;}

/* التوجيه */
export async function renderFolders(){
  const [route,id,section]=location.hash.slice(1).split('/');
  if(!['home','grade','new-grade','school-settings','tools','roster'].includes(route)){stopTimer();root.classList.remove('mx');document.body.classList.remove('stage');setNav('');return;}
  setNav(route);
  try{lessons=await getLessons().catch(()=>[]);const grades=getGrades(),g=grades.find(x=>x.id===id),s=g?.sections.find(x=>x.id===section);
    if(route==='home')home();
    else if(route==='new-grade')newGrade();
    else if(route==='school-settings')settings();
    else if(route==='grade')g?gradePage(g,section):missing();
    else if(route==='roster')g&&s?rosterPage(g,s):missing();
    else if(route==='tools'){if(!id)toolsChooser();else g&&s?toolsPage(g,s):missing();}
  }catch(e){frame(`<h1 class="mx-title">تعذر فتح البيانات</h1><p>${esc(e.message)}</p>`);}
}
function missing(){frame(`<h1 class="mx-title">الصفحة غير موجودة</h1><p><a href="#home">العودة إلى صفوفي</a></p>`);}

async function localBook(file,id,gradeName){if(file.size>200*1024*1024)throw Error('حد الكتاب ٢٠٠ ميغابايت.');if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf'))throw Error('اختر ملف PDF.');const bookId=crypto.randomUUID();const g=getGrades().find(g=>g.id===id);await putBook({id:bookId,name:file.name,grade:gradeName||g?.name||'',blob:file,pages:0,outline:'',localOnly:true});return bookId;}

document.addEventListener('submit',async e=>{if(e.target.id!=='new-grade-form')return;e.preventDefault();try{const $=id=>document.getElementById(id),g=createGrade({name:$('grade-name').value,shortName:$('grade-short').value,count:Number($('grade-count').value),color:$('grade-color').value,bookUrl:$('grade-url').value.trim()});const file=$('new-grade-pdf').files[0];if(!file&&!g.bookUrl)throw Error('أضف رابط الكتاب أو أرفق PDF قبل إضافة الصف.');if(file)g.bookId=await localBook(file,g.id,g.name);saveGrades([...getGrades(),g]);location.hash='grade/'+g.id;}catch(err){document.getElementById('new-grade-status').textContent=err.message;}});

document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b||!root.classList.contains('mx'))return;try{const grades=getGrades(),content=document.getElementById('grade-content');
  const setTab=(label,html)=>{if(!content)return;content.innerHTML=html;const h=content.parentElement.querySelector('.mx-h2');if(h)h.textContent=label;content.parentElement.querySelectorAll('.tabs button').forEach(t=>t.setAttribute('aria-selected',String(t.textContent===label)));};
  if(b.dataset.gradeBook)setTab('الكتاب',bookView(grades.find(g=>g.id===b.dataset.gradeBook)));
  if(b.dataset.gradeLessons)setTab('الدروس',lessonList(grades.find(g=>g.id===b.dataset.gradeLessons)));
  if(b.dataset.newGradeLesson){const g=grades.find(g=>g.id===b.dataset.newGradeLesson);root.classList.remove('mx');await window.startGradeLesson?.(g);}
  if(b.dataset.openGradeLesson){const g=grades.find(g=>g.id===b.dataset.ownerGrade);root.classList.remove('mx');await window.openGradeLesson?.(b.dataset.openGradeLesson,g);}
  if(b.hasAttribute('data-folder-settings')){const old=settingsData();localStorage.setItem('teacher-school-settings',JSON.stringify({...old,school:document.getElementById('school-header').value.slice(0,180),teacher:document.getElementById('school-teacher').value.slice(0,100)}));document.getElementById('settings-status').textContent='حُفظت الإعدادات على جهازك.';}
  if(b.hasAttribute('data-folder-export')){const data={version:1,grades:getGrades(),settings:settingsData()},a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));a.href=url;a.download='teacher-grade-folders.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
  if(b.hasAttribute('data-folder-import'))document.getElementById('folder-import').click();
  if(b.dataset.saveRoster){const names=parseNames(document.getElementById('roster-names').value);saveRoster(b.dataset.saveRoster,names);T.section='';document.getElementById('roster-status').textContent=`حُفظ الكشف على هذا الجهاز: ${names.length?students(names.length):'لا أسماء'}.`;}
  if(b.dataset.clearRoster){if(!confirm('مسح كشف هذا الفصل من هذا الجهاز؟'))return;saveRoster(b.dataset.clearRoster,[]);T.section='';document.getElementById('roster-names').value='';document.getElementById('roster-status').textContent='مُسح الكشف.';}
  if(b.dataset.show)showPanels(b.dataset.show);
  if(b.hasAttribute('data-fullscreen')){if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});}
  if(b.dataset.min){stopTimer();T.secs=T.total=Number(b.dataset.min)*60;drawClock();}
  if(b.id==='timer-toggle'){if(T.running)stopTimer();else if(T.secs>0){T.running=true;T.id=setInterval(tick,1000);}drawClock();}
  if(b.hasAttribute('data-timer-reset')){stopTimer();T.secs=T.total;drawClock();}
  if(b.hasAttribute('data-pick'))pickStudent();
  if(b.dataset.team){const k=b.dataset.team;T[k]=Math.max(0,T[k]+Number(b.dataset.d));document.getElementById('pts-'+k).textContent=T[k];}
  if(b.hasAttribute('data-points-reset')){T.a=T.b=0;document.getElementById('pts-a').textContent=0;document.getElementById('pts-b').textContent=0;}
  if(b.hasAttribute('data-make-groups')){const out=document.getElementById('groups-out'),gs=makeGroups(T.names,Number(document.getElementById('group-count').value));out.innerHTML=gs.map((m,i)=>`<div class="group"><b>المجموعة ${n(i+1)}</b><div>${m.map(esc).join('<br>')}</div></div>`).join('');}
  if(b.dataset.color){T.color=b.dataset.color;document.querySelectorAll('[data-color]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}
  if(b.hasAttribute('data-board-clear')){const cv=document.getElementById('board');cv.getContext('2d').clearRect(0,0,cv.width,cv.height);}
}catch(err){alert(err.message);}});

document.addEventListener('change',async e=>{try{if(e.target.id==='no-repeat'){T.noRepeat=e.target.checked;T.used=[];}
  if(e.target.id==='grade-pdf'){const f=e.target.files[0];if(!f)return;const id=e.target.dataset.owner,bookId=await localBook(f,id);saveGrades(getGrades().map(g=>g.id===id?{...g,bookId}:g));document.getElementById('grade-status').textContent='حُفظ الكتاب على جهازك فقط.';}
  if(e.target.id==='folder-import'){const f=e.target.files[0];if(!f)return;if(f.size>1000000)throw Error('الملف أكبر من الحد المسموح.');const d=JSON.parse(await f.text());if(d.version!==1)throw Error('ملف غير صالح.');if(!confirm('استبدال تنظيم الصفوف بالإصدار المستورد؟ صدّر نسخة أولًا.'))return;saveGrades(d.grades);if(d.settings&&typeof d.settings.school==='string'&&typeof d.settings.teacher==='string')localStorage.setItem('teacher-school-settings',JSON.stringify({school:d.settings.school.slice(0,180),teacher:d.settings.teacher.slice(0,100)}));settings();}
}catch(err){alert(err.message);}});

window.addEventListener('resize',()=>document.getElementById('board')?._fit?.());
window.renderGradeHome=home;window.renderGradeFolders=renderFolders;window.addEventListener('hashchange',renderFolders);await renderFolders();
