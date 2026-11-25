export const groups=[
['home','الرئيسية',[['home','نظرة عامة']]],
['preparation','التحضير',[['textbooks','الكتب الدراسية'],['lesson-prep','تحضير الدروس'],['plans','الخطط']]],
['content','المحتوى',[['presentations','العروض التفاعلية'],['video','الفيديو التفاعلي'],['games','الألعاب التعليمية']]],
['assessment','التقويم',[['question-bank','بنك الأسئلة'],['tests','الاختبارات'],['worksheets','أوراق العمل']]],
['classes','صفوفي',[['classes','الصفوف والطلاب'],['performance','ملخص الأداء']]],
['classroom','أدوات الحصة',[['classroom-tools','أدوات الحصة']]],
['profile','ملفي',[['evidence','ملف الشواهد'],['backup','النسخ الاحتياطي'],['settings','الإعدادات']]]];
const links=items=>items.map(([route,label])=>`<a href="#${route}">${label}</a>`).join('');
export function renderPortal(){document.getElementById('portal-navigation').innerHTML=groups.map(([,title,items])=>`<details open><summary>${title}</summary>${links(items)}</details>`).join('');document.getElementById('mobile-navigation').innerHTML=groups.map(([id,title])=>id==='home'?'<a href="#home">الرئيسية</a>':`<button data-nav-group="${id}" aria-expanded="false">${title}</button>`).join('');markCurrent();}
function markCurrent(){const hash=location.hash;document.querySelectorAll('#portal-navigation a,#mobile-drawer a').forEach(a=>{a.toggleAttribute('aria-current',a.getAttribute('href')===hash);if(a.hasAttribute('aria-current'))a.setAttribute('aria-current','page')});const active=groups.find(([, ,items])=>items.some(([r])=>'#'+r===hash));document.querySelectorAll('#mobile-navigation [data-nav-group]').forEach(b=>b.classList.toggle('active',b.dataset.navGroup===active?.[0]));}
document.addEventListener('click',e=>{const b=e.target.closest('[data-nav-group]'),drawer=document.getElementById('mobile-drawer');if(b){const g=groups.find(x=>x[0]===b.dataset.navGroup),close=!drawer.hidden&&drawer.dataset.group===g[0];document.querySelectorAll('[data-nav-group]').forEach(x=>x.setAttribute('aria-expanded','false'));drawer.hidden=close;drawer.dataset.group=g[0];drawer.innerHTML=`<h2>${g[1]}</h2>${links(g[2])}<button data-close-nav>إغلاق القائمة</button>`;b.setAttribute('aria-expanded',String(!close));markCurrent();}if(e.target.closest('#mobile-drawer a,[data-close-nav]')){drawer.hidden=true;document.querySelectorAll('[data-nav-group]').forEach(x=>x.setAttribute('aria-expanded','false'));}});
window.addEventListener('hashchange',markCurrent);renderPortal();
