(() => {
  'use strict';
  const lessons = window.TrainerLessons;
  const $ = id => document.getElementById(id);
  const storageKey = 'web-workshop-v1';
  let store = {version:1, last:lessons[0].id, drafts:{}, completed:[]};
  let index = 0, lang = 'html', busy = false, revision = 0;
  let savingAvailable = true;
  function warn(message) { $('storage-warning').hidden = false; $('storage-warning').textContent = message; }
  // При повреждении сохраняем исходную запись нетронутой: текущий сеанс остаётся
  // рабочим в памяти, а случайная загрузка страницы не уничтожает старый прогресс.
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version !== 1 || !parsed.drafts || typeof parsed.drafts !== 'object' || Array.isArray(parsed.drafts) || !Array.isArray(parsed.completed)) throw new Error('Формат');
      store.last = lessons.some(l=>l.id===parsed.last) ? parsed.last : lessons[0].id;
      store.completed = [...new Set(parsed.completed.filter(id=>lessons.some(l=>l.id===id)))];
      for (const lesson of lessons) {
        const draft = parsed.drafts[lesson.id];
        if (draft && ['html','css','js'].every(k=>typeof draft[k]==='string')) store.drafts[lesson.id] = {...draft};
      }
    }
  } catch {
    savingAvailable = false;
    warn('Сохранённые данные недоступны или повреждены. Можно учиться в этом сеансе, но прогресс после закрытия может не сохраниться. Существующая запись не перезаписывается.');
  }
  function save() {
    if (!savingAvailable) { $('draft-status').textContent = 'В памяти'; return; }
    try { localStorage.setItem(storageKey,JSON.stringify(store)); $('draft-status').textContent = 'Сохранено'; }
    catch { savingAvailable = false; warn('Браузер не разрешил сохранить прогресс. Продолжайте в этом сеансе; после закрытия изменения могут потеряться.'); $('draft-status').textContent = 'В памяти'; }
  }
  const current = () => lessons[index];
  const draft = () => store.drafts[current().id] ||= {...current().start};
  function updateProgress() {
    $('progress-count').textContent = store.completed.length;
    $('progress').value = store.completed.length;
    $('progress-text').textContent = store.completed.length === lessons.length ? 'Курс пройден. Теперь создайте что-то своё!' : store.completed.length ? 'Каждый урок приближает к своему сайту.' : 'Первый шаг — уже начало.';
    $('lesson-state').textContent = store.completed.includes(current().id) ? 'Пройдено' : 'Практика';
    $('lesson-state').classList.toggle('done',store.completed.includes(current().id));
    document.querySelectorAll('.lesson-link').forEach(button => {
      const done = store.completed.includes(button.dataset.id);
      button.classList.toggle('complete',done);
      button.querySelector('.number').textContent = done ? '✓' : button.dataset.number;
      button.setAttribute('aria-label',button.dataset.title+(done ? ', пройдено' : ''));
      if(button.dataset.id === current().id) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
    });
  }
  function renderMenu() {
    for(const group of ['HTML','CSS','JavaScript','Проект']) {
      const section = document.createElement('section'); section.className = 'course-group';
      const heading = document.createElement('h3'); heading.textContent = group;
      const count = document.createElement('span'); count.textContent = group === 'Проект' ? '01' : '06'; heading.append(count); section.append(heading);
      lessons.filter(l=>l.group===group).forEach((lesson,i)=> {
        const button = document.createElement('button'); button.className='lesson-link';
        Object.assign(button.dataset,{id:lesson.id,number:String(i+1).padStart(2,'0'),title:lesson.title});
        const number=document.createElement('span'); number.className='number'; number.setAttribute('aria-hidden','true');
        const title=document.createElement('span');title.textContent=lesson.title;button.append(number,title);
        button.addEventListener('click',()=> {select(lessons.indexOf(lesson));if(matchMedia('(max-width:650px)').matches){$('course-menu').open=false;$('workspace').focus();}});
        section.append(button);
      });
      $('lessons').append(section);
    }
  }
  function switchLang(next) {
    lang=next; $('editor').value=draft()[lang]; $('editor-label').textContent='Код '+lang.toUpperCase();
    $('editor-panel').setAttribute('aria-labelledby','tab-'+lang);
    document.querySelectorAll('[data-lang]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.lang===lang));b.tabIndex=b.dataset.lang===lang?0:-1;});
  }
  function switchView(view) {
    document.querySelector('.lesson-grid').dataset.view=view;
    document.querySelectorAll('[data-view][role=tab]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.view===view));b.tabIndex=b.dataset.view===view?0:-1;});
  }
  function select(next) {
    if (busy) return;
    index=next; revision++; store.last=current().id;
    $('lesson-category').textContent = current().group==='Проект' ? 'ИТОГОВЫЙ ПРОЕКТ' : current().group+' · УРОК '+(index%6+1)+' ИЗ 6';
    $('lesson-title').textContent=current().title;
    for(const name of ['theory','task','hint','explanation']) $(name).textContent=current()[name];
    $('solution-code').textContent=['HTML:\n'+current().solution.html,'CSS:\n'+current().solution.css,'JS:\n'+current().solution.js].join('\n\n');
    document.querySelectorAll('.help').forEach(d=>d.open=false);
    $('previous').disabled=index===0; $('next').disabled=index===lessons.length-1;
    $('lesson-position').textContent=(index+1)+' из '+lessons.length;
    switchLang(current().group==='CSS'?'css':current().group==='JavaScript'?'js':'html');
    switchView('task'); updateProgress();save();
    $('feedback').replaceChildren();const p=document.createElement('p');p.textContent='Измените код и нажмите «Запустить». Все изменения сохраняются как черновик.';$('feedback').append(p);
    run(false, true);
  }
  function feedback(result, checked) {
    const area=$('feedback'); area.replaceChildren();
    const success=checked && !result.errors.length && result.results.length && result.results.every(t=>t.pass);
    const p=document.createElement('p');p.textContent=success?'Отлично! Все условия выполнены.':result.errors.length?'В коде есть ошибка. Исправьте её и повторите запуск.':checked?'Пока не всё получилось. Проверьте условия ниже.':'Код запущен. Попробуйте изменить страницу или проверьте задание.';
    if(success)p.className='success-title';area.append(p);
    if(checked){const list=document.createElement('ul');for(const item of result.results){const li=document.createElement('li');li.className=item.pass?'pass':'fail';li.textContent=(item.pass?'✓ ':'○ ')+item.label;list.append(li);}area.append(list);}
    for(const error of result.errors){const line=document.createElement('p');line.className='fail';line.textContent=error;area.append(line);}
    if(success && !store.completed.includes(current().id)){store.completed.push(current().id);save();updateProgress();}
  }
  async function run(checked, initial=false) {
    if(busy)return;
    busy=true; $('editor').readOnly=true; const runRevision=revision;
    ['run','check','previous','next','reset','use-solution'].forEach(id=>$(id).disabled=true);
    document.querySelectorAll('.lesson-link').forEach(b=>b.disabled=true);
    const frame=document.createElement('iframe');$('preview').replaceChildren(frame);
    if(!initial){$('feedback').textContent=checked?'Проверяем результат…':'Запускаем код…';switchView('result');}
    try {
      const snapshot={...draft()};
      const result=await window.TrainerRunner.execute(frame,snapshot,checked?current().tests:[],message=>{$('feedback').textContent='Ошибка: '+message;});
      // Адаптивность проверяется на двух фиксированных ширинах независимо от
      // фактической ширины видимого редактора. Пробы не меняют черновик ученика.
      if(checked && current().id==='css-6') {
        for(const width of [360,900]) {
          const probe=document.createElement('iframe');probe.className='probe';probe.style.width=width+'px';document.body.append(probe);
          try {const extra=await window.TrainerRunner.execute(probe,snapshot,current().tests);result.results.push(...extra.results.map(t=>({...t,label:t.label+' ('+width+'px)'})));result.errors.push(...extra.errors);}
          finally {probe.remove();}
        }
      }
      if(runRevision===revision && !initial)feedback(result,checked);
      else if(result.errors.length)feedback(result,false);
    } catch(error) {feedback({results:[],errors:[error.message]},false);}
    finally {
      busy=false; $('editor').readOnly=false;['run','check','reset','use-solution'].forEach(id=>$(id).disabled=false);
      $('previous').disabled=index===0;$('next').disabled=index===lessons.length-1;
      document.querySelectorAll('.lesson-link').forEach(b=>b.disabled=false);
    }
  }
  $('editor').addEventListener('input',()=>{draft()[lang]=$('editor').value;revision++;save();});
  document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>switchLang(b.dataset.lang)));
  document.querySelectorAll('[data-view][role=tab]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
  // Стандартная навигация вкладок: стрелки, Home, End. Tab выходит из группы,
  // что оставляет редактор доступным без клавиатурной ловушки.
  document.querySelectorAll('[role=tablist]').forEach(group=>group.addEventListener('keydown',event=>{
    const tabs=[...group.querySelectorAll('[role=tab]')], i=tabs.indexOf(document.activeElement);
    let next;if(event.key==='ArrowRight')next=(i+1)%tabs.length;else if(event.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;
    event.preventDefault();tabs[next].click();tabs[next].focus();
  }));
  $('run').addEventListener('click',()=>run(false));$('check').addEventListener('click',()=>run(true));
  $('reset').addEventListener('click',()=>{if(!confirm('Восстановить стартовый код этого урока? Текущий черновик будет заменён.'))return;store.drafts[current().id]={...current().start};revision++;switchLang(lang);save();$('feedback').textContent='Стартовый код восстановлен. Нажмите «Запустить».';});
  $('use-solution').addEventListener('click',()=>{if(!confirm('Заменить черновик этого урока готовым решением?'))return;store.drafts[current().id]={...current().solution};revision++;switchLang(lang);save();$('feedback').textContent='Решение перенесено. Разберите код и запустите проверку.';switchView('code');});
  $('previous').addEventListener('click',()=>select(index-1));$('next').addEventListener('click',()=>select(index+1));
  document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();select(0);});
  if(matchMedia('(max-width:650px)').matches)$('course-menu').open=false;
  renderMenu(); select(lessons.findIndex(l=>l.id===store.last));
})();
