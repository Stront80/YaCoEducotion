(function(){
  'use strict';
  const lessons=window.PythonCourse.lessons;
  const $=id=>document.getElementById(id);
  const KEY='python-workshop-v1';
  let data={version:1,last:lessons[0].id,completed:[],drafts:{}},index=0,busy=false,saving=true;
  const current=()=>lessons[index];
  function warn(message){$('storage-warning').textContent=message;$('storage-warning').hidden=false;}
  // Сохраняем повреждённую запись нетронутой. Новый сеанс остаётся рабочим
  // в памяти, не уничтожая данные пользователя молчаливым сбросом.
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){
      const p=JSON.parse(raw);
      if(p.version!==1||!Array.isArray(p.completed)||!p.drafts||typeof p.drafts!=='object'||Array.isArray(p.drafts))throw new Error('Формат');
      data.last=lessons.some(l=>l.id===p.last)?p.last:lessons[0].id;
      data.completed=[...new Set(p.completed.filter(id=>lessons.some(l=>l.id===id)))];
      for(const l of lessons){const draft=p.drafts[l.id];if(!draft)continue;
        if(typeof draft.source!=='string'||draft.source.length>20000||typeof draft.stdin!=='string'||draft.stdin.length>10000)throw new Error('Черновик');
        data.drafts[l.id]={source:draft.source,stdin:draft.stdin};
      }
    }
  }catch{saving=false;warn('Сохранение недоступно или повреждено. Можно продолжать в этом сеансе; после закрытия прогресс может потеряться. Прежняя запись не перезаписывается.');}
  function draft(){return data.drafts[current().id]||=( {source:current().start,stdin:current().stdin} );}
  function save(){
    if(!saving){$('draft-status').textContent='В памяти';return;}
    try{localStorage.setItem(KEY,JSON.stringify(data));$('draft-status').textContent='Сохранено';}
    catch{saving=false;warn('Не удалось сохранить изменения в браузере. Продолжайте в этом сеансе; после закрытия данные могут потеряться.');$('draft-status').textContent='В памяти';}
  }
  function el(tag,css,text){const n=document.createElement(tag);if(css)n.className=css;if(text!==undefined)n.textContent=text;return n;}
  function view(name){
    document.querySelector('.lesson-grid').dataset.view=name;
    document.querySelectorAll('.mobile-tabs button').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.view===name));b.tabIndex=b.dataset.view===name?0:-1;});
  }
  function progress(){
    $('progress-count').textContent=data.completed.length;$('progress').value=data.completed.length;
    $('progress-text').textContent=data.completed.length===19?'Курс пройден. Время для своих идей!':data.completed.length?'Каждая программа — ещё один шаг.':'Начните с простого print().';
    const done=data.completed.includes(current().id);$('lesson-state').textContent=done?'Пройдено':'Практика';$('lesson-state').classList.toggle('done',done);
    document.querySelectorAll('.lesson-link').forEach(b=>{
      const completed=data.completed.includes(b.dataset.id);b.classList.toggle('complete',completed);b.querySelector('.number').textContent=completed?'✓':b.dataset.number;
      b.setAttribute('aria-label',b.dataset.title+(completed?', пройдено':''));if(b.dataset.id===current().id)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');
    });
  }
  function menu(){
    for(const group of ['Первые программы','Решения и повторения','Данные и функции','Итоговый проект']){
      const section=el('section','course-group');section.append(el('h3','',group));
      lessons.filter(l=>l.group===group).forEach((l,n)=>{const b=el('button','lesson-link');Object.assign(b.dataset,{id:l.id,title:l.title,number:String(n+1).padStart(2,'0')});const mark=el('span','number');mark.setAttribute('aria-hidden','true');b.append(mark,el('span','',l.title));b.addEventListener('click',()=>{select(lessons.indexOf(l));if(matchMedia('(max-width:650px)').matches){$('course-menu').open=false;$('workspace').focus();}});section.append(b);});$('lessons').append(section);
    }
  }
  function cursor(){const before=$('editor').value.slice(0,$('editor').selectionStart),lines=before.split('\n');$('cursor-position').textContent='Строка '+lines.length+' · столбец '+(lines.at(-1).length+1);}
  function select(n){
    if(busy)return;index=n;data.last=current().id;
    $('lesson-category').textContent=current().group==='Итоговый проект'?'ИТОГОВЫЙ ПРОЕКТ':current().group.toUpperCase()+' · УРОК '+(n%6+1)+' ИЗ 6';
    $('lesson-title').textContent=current().title;$('lesson-topic').textContent=current().topic;
    for(const name of ['theory','task','hint','explanation'])$(name).textContent=current()[name];
    $('solution-code').textContent=current().solution;
    document.querySelectorAll('.help').forEach(d=>d.open=false);
    $('editor').value=draft().source;$('stdin').value=draft().stdin;
    $('output').textContent='Нажмите «Запустить», чтобы увидеть результат.';$('output-state').textContent='Ещё не запускали';$('python-error').hidden=true;
    $('feedback').replaceChildren(el('p','','Выполните задание и нажмите «Проверить».'));
    $('lesson-position').textContent=(n+1)+' из 19';$('previous').disabled=n===0;$('next').disabled=n===18;view('task');cursor();progress();save();
  }
  function runtimeStatus(state,message){
    $('execution-state').textContent=message;
    $('runtime-status').textContent=state==='ready'?'Python '+runner.version+' · локально':state==='loading'?'Загружаем Python…':state==='running'?'Python выполняет программу':state==='error'?'Python недоступен':runner.version?'Python '+runner.version+' · локально':'Python остановлен';
    $('stop').disabled=!['loading','running'].includes(state);
    $('retry').hidden=state!=='error';
  }
  const runner=new window.PythonRunner(runtimeStatus);
  function setBusy(value){
    busy=value;for(const id of ['run','check','reset','use-solution'])$(id).disabled=value;
    $('editor').readOnly=value;$('stdin').readOnly=value;
    document.querySelectorAll('.lesson-link').forEach(b=>b.disabled=value);
    $('previous').disabled=value||index===0;$('next').disabled=value||index===18;
  }
  function showPythonError(error){
    const explanations={SyntaxError:'Проверьте двоеточия, кавычки и скобки.',IndentationError:'Проверьте отступы внутри блоков: обычно четыре пробела.',NameError:'Проверьте имя переменной и место, где она создана.',TypeError:'Проверьте типы данных и аргументы функции.',ValueError:'Проверьте преобразование строки в число и допустимые значения.',EOFError:'Подготовьте достаточно строк в поле входных данных.',ZeroDivisionError:'На ноль делить нельзя.',OutputLimitError:'Сократите печать, особенно внутри циклов.'};
    $('python-error').textContent=error.type+(error.line?' · строка '+error.line:'')+'\n'+error.message+(explanations[error.type]?'\n'+explanations[error.type]:'');$('python-error').hidden=false;
  }
  function showChecks(result){
    const area=$('feedback');area.replaceChildren();
    const success=!result.error&&result.results.length===current().checks.length&&result.results.every(r=>r.pass);
    area.append(el('h3',success?'success-title':'',success?'Получилось! Все условия выполнены.':result.error?'Сначала исправьте ошибку Python.':'Не всё получилось. Проверьте условия:'));
    if(!result.error){const list=el('ul');for(const item of result.results){const li=el('li',item.pass?'pass':'fail',(item.pass?'✓ ':'○ ')+item.label);if(!item.pass&&item.detail)li.append(el('span','',item.detail));list.append(li);}area.append(list);}
    if(success&&!data.completed.includes(current().id)){data.completed.push(current().id);progress();save();}
  }
  async function execute(checked){
    if(busy)return;setBusy(true);save();view('result');$('python-error').hidden=true;$('output-state').textContent='Выполняется…';$('output').textContent='';$('feedback').textContent=checked?'Проверяем программу…':'Программа выполняется…';
    try{
      const request={source:draft().source,stdin:draft().stdin,checks:checked?current().checks:[]};
      const result=await runner.execute(request);
      if(!result||typeof result.stdout!=='string'||!Array.isArray(result.results))throw new Error('Не удалось прочитать результат Python.');
      $('output').textContent=result.stdout||'(Программа ничего не вывела)';$('output-state').textContent=result.error?'Ошибка Python':'Выполнено';
      if(result.error)showPythonError(result.error);
      if(checked)showChecks(result);else $('feedback').textContent=result.error?'Исправьте ошибку и повторите запуск.':'Код выполнен. Нажмите «Проверить», чтобы проверить задание.';
    }catch(error){
      $('output-state').textContent=error.name==='AbortError'?'Остановлено':'Запуск прерван';
      $('output').textContent=error.message;$('feedback').textContent=error.message;
    }finally{setBusy(false);}
  }
  $('editor').addEventListener('input',()=>{draft().source=$('editor').value;cursor();save();});
  $('stdin').addEventListener('input',()=>{draft().stdin=$('stdin').value;save();});
  for(const event of ['click','keyup','select'])$('editor').addEventListener(event,cursor);
  $('editor').addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();execute(false);}});
  $('run').addEventListener('click',()=>execute(false));$('check').addEventListener('click',()=>execute(true));$('stop').addEventListener('click',()=>runner.stop());
  $('retry').addEventListener('click',()=>runner.prepare().catch(()=>{}));
  $('reset').addEventListener('click',()=>{if(!confirm('Восстановить стартовый код и входные данные этого урока? Черновик будет заменён, отметка прохождения сохранится.'))return;data.drafts[current().id]={source:current().start,stdin:current().stdin};select(index);});
  $('use-solution').addEventListener('click',()=>{if(!confirm('Заменить текущий черновик и входные данные примером решения?'))return;data.drafts[current().id]={source:current().solution,stdin:current().stdin};$('editor').value=draft().source;$('stdin').value=draft().stdin;cursor();save();view('code');$('feedback').textContent='Пример перенесён. Разберите код и запустите проверку.';});
  document.querySelectorAll('.mobile-tabs button').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
  document.querySelector('.mobile-tabs').addEventListener('keydown',event=>{const tabs=[...document.querySelectorAll('.mobile-tabs button')],i=tabs.indexOf(document.activeElement);let n;if(event.key==='ArrowRight')n=(i+1)%tabs.length;else if(event.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')n=0;else if(event.key==='End')n=tabs.length-1;else return;event.preventDefault();tabs[n].click();tabs[n].focus();});
  $('previous').addEventListener('click',()=>select(index-1));$('next').addEventListener('click',()=>select(index+1));document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();select(0);});
  if(matchMedia('(max-width:650px)').matches)$('course-menu').open=false;
  menu();select(lessons.findIndex(l=>l.id===data.last));runner.prepare().catch(()=>{});
  addEventListener('pagehide',()=>runner.stop());
})();
