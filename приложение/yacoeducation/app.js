(function(){
  'use strict';
  const Core=window.EducationCore,$=id=>document.getElementById(id),KEY='yacoeducation-v1';
  let registry=null,states={},category='',query='',status='all',recent=null,saving=true,activeId=null,focusMode=false,request=0,pendingSection=null;
  const storage={getItem:key=>localStorage.getItem(key)};
  function warn(message){$('storage-warning').textContent=message;$('storage-warning').hidden=false;}
  try{const raw=storage.getItem(KEY);if(raw){const p=JSON.parse(raw);if(p?.version!==1||!(p.last===null||typeof p.last==='string'&&/^[a-z][a-z0-9-]{0,39}$/.test(p.last)))throw new Error('Формат');recent=p.last;}}
  catch{saving=false;warn('Локальные настройки каталога недоступны или повреждены. Можно продолжать; прежняя запись не перезаписывается.');}
  function remember(id){recent=id;if(!saving)return;try{localStorage.setItem(KEY,JSON.stringify({version:1,last:id}));}catch{saving=false;warn('Не удалось сохранить недавнюю мастерскую. Продолжайте в этом сеансе; браузер может не сохранить прогресс.');}}
  function el(tag,css,text){const n=document.createElement(tag);if(css)n.className=css;if(text!==undefined)n.textContent=text;return n;}
  const href=id=>'#/workshop/'+id;
  function progressLabel(p){return p.status==='unavailable'?'Сохранение недоступно':p.status==='untracked'?'Без общего счётчика':p.count+' из '+p.total+' занятий';}
  function refreshProgress(){
    if(!registry)return;states=Object.fromEntries(registry.workshops.map(w=>[w.id,Core.progress(w,storage)]));
    const sum=Object.values(states).reduce((n,p)=>n+p.count,0);$('completed-total').textContent=sum;
    for(const node of document.querySelectorAll('[data-progress]')){
      const p=states[node.dataset.progress];if(!p)continue;node.querySelector('.progress-label').textContent=progressLabel(p);const bar=node.querySelector('progress');bar.max=p.total;bar.value=p.count;bar.hidden=['unavailable','untracked'].includes(p.status);
    }
    if(activeId){const p=states[activeId];$('study-progress-text').textContent=progressLabel(p);$('study-progress').max=p.total;$('study-progress').value=p.count;$('study-progress').hidden=['unavailable','untracked'].includes(p.status);}
    if(Object.values(states).some(p=>p.status==='unavailable'))warn('Прогресс части мастерских недоступен или имеет несовместимый формат. Каталог не изменяет их сохранения; открыть мастерские можно.');
  }
  function progressBlock(w){const node=el('div','card-progress');node.dataset.progress=w.id;node.append(el('span','progress-label',progressLabel(states[w.id])));const bar=el('progress');bar.setAttribute('aria-label','Прогресс: '+w.title);bar.max=w.lessonCount;bar.value=states[w.id].count;bar.hidden=['unavailable','untracked'].includes(states[w.id].status);node.append(bar);return node;}
  function renderCards(){
    const list=Core.filter(registry.workshops,{query,category,status},states),grid=$('workshop-grid');grid.replaceChildren();
    for(const w of list){
      const card=el('article','workshop-card accent-'+w.accent);card.dataset.workshop=w.id;
      const top=el('div','card-top'),badge=el('span','workshop-badge',w.badge);badge.setAttribute('aria-hidden','true');top.append(badge,el('span','course-mode',w.mode));
      const text=el('div','card-copy');text.append(el('p','card-category',w.category),el('h3','',w.title),el('p','card-subtitle',w.subtitle),el('p','card-description',w.description));
      const topics=el('ul','topics');for(const topic of w.topics)topics.append(el('li','',topic));
      const foot=el('div','card-bottom');foot.append(el('span','level',w.level));const link=el('a','course-link',states[w.id].count?'Продолжить':'Открыть мастерскую');link.href=href(w.id);link.setAttribute('aria-label',(states[w.id].count?'Продолжить: ':'Открыть: ')+w.title);foot.append(link);
      card.append(top,text,topics,progressBlock(w),foot);grid.append(card);
    }
    $('empty').hidden=list.length!==0;$('result-count').textContent='Показано мастерских: '+list.length+' из '+registry.workshops.length;
  }
  function renderCategories(){const root=$('categories');root.replaceChildren();for(const name of ['',...new Set(registry.workshops.map(w=>w.category))]){const b=el('button','category',name||'Все направления');b.type='button';b.dataset.category=name;b.setAttribute('aria-pressed',String(category===name));b.addEventListener('click',()=>{category=name;document.querySelectorAll('.category').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.category===category)));renderCards();});root.append(b);}}
  function renderPaths(){const area=$('paths');area.replaceChildren();for(const path of registry.paths){const card=el('article','path-card');card.append(el('h3','',path.title),el('p','',path.description));const links=el('div','path-links');for(const id of path.workshops){const w=registry.workshops.find(w=>w.id===id),a=el('a','',w.title);a.href=href(id);links.append(a);}card.append(links);area.append(card);}}
  function renderRecent(){const w=registry.workshops.find(w=>w.id===recent);$('resume').hidden=!w;if(w){$('resume-title').textContent=w.title;$('resume-description').textContent='Недавно открывали · '+progressLabel(states[w.id]);$('resume-link').href=href(w.id);}}
  function setFocusMode(value){focusMode=value;document.body.classList.toggle('focus-mode',value);$('focus-mode').setAttribute('aria-pressed',String(value));$('focus-mode').textContent=value?'Обычный вид':'Режим практики';}
  function unmount(){
    // Удаление документа завершает его Workers и запускает pagehide курса.
    // Незавершённое выполнение не переносится в другую мастерскую.
    $('frame-host').replaceChildren();activeId=null;setFocusMode(false);
  }
  function navigate(){
    if(!registry)return;const route=Core.route(location.hash,registry.workshops);
    $('catalog').hidden=route.kind!=='catalog';$('study').hidden=route.kind!=='workshop';$('missing').hidden=route.kind!=='missing';$('footer').hidden=route.kind==='workshop';document.body.classList.toggle('studying',route.kind==='workshop');
    $('catalog-link').setAttribute('aria-current',route.kind==='catalog'?'page':'false');
    if(route.kind==='workshop'){
      const w=route.workshop;if(activeId===w.id)return;
      unmount();activeId=w.id;remember(w.id);$('workshop-select').value=w.id;$('study-title').textContent=w.title+' · YaCoEducation';document.title=w.title+' | YaCoEducation';$('standalone').href=w.url;$('frame-status').textContent='Открываем '+w.title+'…';
      const frame=el('iframe');frame.id='workshop-frame';frame.title=w.title+' — интерактивная мастерская';frame.src=w.url;frame.setAttribute('referrerpolicy','same-origin');
      frame.addEventListener('load',()=>{
        if(activeId!==w.id)return;
        try{const doc=frame.contentDocument;if(doc?.contentType!=='text/html'||!doc?.querySelector('title'))throw new Error('Страница недоступна');$('frame-status').textContent='Мастерская открыта · '+w.mode;}
        catch{$('frame-status').textContent='Не удалось подтвердить загрузку. Попробуйте открыть мастерскую отдельно или вернуться в каталог.';}
        refreshProgress();
      });$('frame-host').append(frame);refreshProgress();window.scrollTo(0,0);$('study-title').focus({preventScroll:true});
    }else{
      unmount();document.title='YaCoEducation — учиться, чтобы делать';refreshProgress();renderCards();renderRecent();window.scrollTo(0,0);$('main').focus({preventScroll:true});
      if(pendingSection){const section=pendingSection;pendingSection=null;requestAnimationFrame(()=>{document.getElementById(section).scrollIntoView({block:'start'});if(section==='how')$('how').focus({preventScroll:true});});}
    }
  }
  async function load(){
    const attempt=++request;$('loading').hidden=false;$('error').hidden=true;$('catalog').hidden=true;$('study').hidden=true;unmount();
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
    try{
      const response=await fetch('/api/workshops',{signal:controller.signal,cache:'no-store'});if(!response.ok)throw new Error('Каталог не ответил. Проверьте локальный сервер и реестр.');const value=Core.validate(await response.json());if(attempt!==request)return;registry=value;
      $('workshop-total').textContent=registry.workshops.length;$('lesson-total').textContent=registry.workshops.reduce((n,w)=>n+w.lessonCount,0);$('workshop-select').replaceChildren();for(const w of registry.workshops){const option=el('option','',w.title);option.value=w.id;$('workshop-select').append(option);}
      refreshProgress();renderCategories();renderPaths();$('loading').hidden=true;navigate();
    }catch(e){if(attempt!==request)return;registry=null;$('loading').hidden=true;$('error').hidden=false;$('error-message').textContent=e.name==='AbortError'?'Сервер не ответил за 5 секунд. Убедитесь, что запущен serve.py.':e.message;}
    finally{clearTimeout(timer);}
  }
  $('search').addEventListener('input',()=>{query=$('search').value;renderCards();});$('status-filter').addEventListener('change',()=>{status=$('status-filter').value;renderCards();});
  $('clear-filters').addEventListener('click',()=>{query='';category='';status='all';$('search').value='';$('status-filter').value='all';renderCategories();renderCards();$('search').focus();});
  $('workshop-select').addEventListener('change',()=>{location.hash=href($('workshop-select').value);});$('focus-mode').addEventListener('click',()=>setFocusMode(!focusMode));$('retry').addEventListener('click',load);
  $('explore').addEventListener('click',e=>{e.preventDefault();$('catalog-section').scrollIntoView({block:'start'});$('search').focus({preventScroll:true});});
  $('about-link').addEventListener('click',()=>{if(Core.route(location.hash,registry?.workshops||[]).kind==='catalog'&&registry){$('how').scrollIntoView({block:'start'});$('how').focus({preventScroll:true});}else{pendingSection='how';location.hash='#/';}});
  document.querySelector('.skip').addEventListener('click',e=>{e.preventDefault();$('main').focus();});
  addEventListener('hashchange',navigate);
  addEventListener('storage',event=>{
    if(registry&&(!event.key||registry.workshops.some(w=>w.progress?.storageKey===event.key))){refreshProgress();if(!activeId){renderCards();renderRecent();}}
  });
  addEventListener('focus',()=>{if(registry){refreshProgress();if(!activeId){renderCards();renderRecent();}}});
  load();
})();
