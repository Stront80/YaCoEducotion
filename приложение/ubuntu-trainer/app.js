(function(){
  'use strict';
  const {Terminal,HOME,modeText}=window.UbuntuSim;
  const {lessons,check}=window.UbuntuCourse;
  const $=id=>document.getElementById(id);
  const KEY='ubuntu-workshop-v1';
  const fresh=()=>({version:1,last:lessons[0].id,completed:[],sessions:{}});
  let data=fresh(),index=0,terminal,historyIndex=0,pendingInput='',selectedFile=null,saving=true;
  const current=()=>lessons[index];
  const session=()=>data.sessions[current().id];
  const validLog=log=>log&&typeof log.command==='string'&&log.command.length<=3100&&typeof log.output==='string'&&log.output.length<=66000&&typeof log.error==='boolean';
  function warning(message){$('storage-warning').hidden=false;$('storage-warning').textContent=message;}
  try {
    const raw=localStorage.getItem(KEY);
    if(raw){
      const parsed=JSON.parse(raw);
      if(parsed.version!==1||!parsed.sessions||typeof parsed.sessions!=='object'||Array.isArray(parsed.sessions)||!Array.isArray(parsed.completed))throw new Error('Формат');
      const clean=fresh();clean.last=lessons.some(l=>l.id===parsed.last)?parsed.last:lessons[0].id;
      clean.completed=[...new Set(parsed.completed.filter(id=>lessons.some(l=>l.id===id)))];
      for(const l of lessons){
        const s=parsed.sessions[l.id];if(!s)continue;
        if(!Array.isArray(s.logs)||s.logs.length>60||!s.logs.every(validLog)||!Array.isArray(s.history)||s.history.length>60||s.history.some(v=>typeof v!=='string'||v.length>2000)||typeof s.input!=='string'||s.input.length>2000)throw new Error('Сеанс');
        clean.sessions[l.id]={state:Terminal.restore(s.state).snapshot(),logs:s.logs,history:s.history,input:s.input};
      }
      data=clean;
    }
  }catch{
    saving=false;
    warning('Сохранение недоступно или повреждено. Можно продолжать в этом сеансе; прогресс после закрытия может потеряться. Прежняя запись не перезаписывается.');
  }
  function save(){
    session().state=terminal.snapshot();session().input=$('command').value;
    if(!saving){$('save-status').textContent='Только в памяти';return;}
    try{localStorage.setItem(KEY,JSON.stringify(data));$('save-status').textContent='Сохранено локально';}
    catch{saving=false;warning('Браузер не смог сохранить данные. Вы можете продолжить, но изменения после закрытия могут потеряться.');$('save-status').textContent='Только в памяти';}
  }
  function shortPath(path){return path===HOME?'~':path.startsWith(HOME+'/')?'~'+path.slice(HOME.length):path;}
  function make(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
  function renderMenu(){
    for(const group of ['Первые шаги','Файлы и текст','Поиск и инструменты','Итоговая практика']){
      const section=make('section','course-group');section.append(make('h3','',group));
      lessons.filter(l=>l.group===group).forEach((l,n)=>{
        const button=make('button','lesson-link');button.dataset.id=l.id;button.dataset.number=String(n+1).padStart(2,'0');
        const mark=make('span','',button.dataset.number);mark.setAttribute('aria-hidden','true');button.append(mark,make('span','',l.title));
        button.addEventListener('click',()=>{select(lessons.indexOf(l));if(matchMedia('(max-width:650px)').matches){$('course-menu').open=false;$('lesson').focus();}});section.append(button);
      });$('course-nav').append(section);
    }
  }
  function progress(){
    $('progress-count').textContent=data.completed.length;$('progress').value=data.completed.length;
    $('progress-text').textContent=data.completed.length===lessons.length?'Весь курс пройден. Отличная работа!':data.completed.length?'Каждая команда — новый навык.':'Начните с первой команды.';
    const done=data.completed.includes(current().id);$('lesson-status').textContent=done?'Пройдено':'Практика';$('lesson-status').classList.toggle('done',done);
    document.querySelectorAll('.lesson-link').forEach(b=>{
      const completed=data.completed.includes(b.dataset.id);b.classList.toggle('complete',completed);b.firstChild.textContent=completed?'✓':b.dataset.number;
      const l=lessons.find(l=>l.id===b.dataset.id);b.setAttribute('aria-label',l.title+(completed?', пройдено':''));
      if(b.dataset.id===current().id)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');
    });
  }
  function pane(name,focus=false){
    $('panels').dataset.pane=name;
    document.querySelectorAll('[role=tab][data-pane]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.pane===name));b.tabIndex=b.dataset.pane===name?0:-1;});
    if(focus)$('command').focus();
  }
  function renderOutput(){
    const area=$('terminal-output');area.replaceChildren();
    if(!session().logs.length){const intro=make('div','intro');intro.append(make('p','','Добро пожаловать в учебный терминал.'),make('p','','Введите команду из задания или help. Реальные файлы компьютера здесь недоступны.'));area.append(intro);}
    for(const log of session().logs){const entry=make('div','terminal-entry');entry.append(make('pre','input-line',log.command));if(log.output)entry.append(make('pre',log.error?'error-output':'command-output',log.output));area.append(entry);}
    area.scrollTop=area.scrollHeight;$('prompt').textContent='student@ubuntu:'+shortPath(terminal.state.cwd)+'$';
  }
  function inspectFile(path){
    const n=terminal.state.fs[path];if(!n||n.type!=='file')return;
    selectedFile=path;$('file-name').textContent=shortPath(path)+' · '+modeText(n.mode);
    // Панель — визуальный инспектор, а не cat: на наблюдения урока не влияет.
    $('file-content').textContent=n.mode&0o400?n.content||'(Пустой файл)':'Нет права чтения (r). Исправьте права в терминале.';
    $('file-details').open=true;
  }
  function renderFiles(){
    const tree=$('file-tree');tree.replaceChildren();tree.append(make('div','tree-path','/home/student'));
    const paths=Object.keys(terminal.state.fs).filter(p=>p===HOME||p.startsWith(HOME+'/')).sort((a,b)=>a===HOME?-1:b===HOME?1:a.localeCompare(b,'en'));
    // Порядок лексикографический по полному пути: родители остаются рядом с
    // потомками. Отступ ограничен, чтобы длинный путь не расширял страницу.
    for(const path of paths){
      const n=terminal.state.fs[path],depth=path===HOME?0:path.slice(HOME.length+1).split('/').length;
      const row=make(n.type==='file'?'button':'div','tree-row '+(n.type==='file'?'file':'directory'));
      if(path===terminal.state.cwd)row.classList.add('current');
      const prefix='  '.repeat(Math.min(depth,5));row.append(make('span','tree-icon',prefix+(n.type==='dir'?'▱':'·')),make('span','tree-label',path===HOME?'~ / student':path.slice(path.lastIndexOf('/')+1)));
      row.title=path;if(n.type==='file'){row.type='button';row.addEventListener('click',()=>inspectFile(path));}
      tree.append(row);
    }
    const etc=make('button','tree-row file','▱ /etc/os-release');etc.type='button';etc.addEventListener('click',()=>inspectFile('/etc/os-release'));tree.append(etc);
    if(selectedFile&&terminal.state.fs[selectedFile]?.type==='file')inspectFile(selectedFile);
    else{selectedFile=null;$('file-details').open=false;$('file-name').textContent='Выберите файл';$('file-content').textContent='Нажмите имя файла, чтобы прочитать его содержимое.';}
    $('package-state').textContent='Пакетов в модели: '+terminal.state.packages.length;
    $('process-state').textContent='Учебных процессов: '+terminal.state.processes.length;
  }
  function select(n){
    if(terminal)save();index=n;data.last=current().id;
    if(!data.sessions[current().id]){const t=new Terminal(current().seed);data.sessions[current().id]={state:t.snapshot(),logs:[],history:[],input:''};}
    terminal=Terminal.restore(session().state);historyIndex=session().history.length;pendingInput='';selectedFile=null;
    $('command').value=session().input;
    $('lesson-category').textContent=current().group==='Итоговая практика'?'ИТОГОВАЯ ПРАКТИКА':current().group.toUpperCase()+' · УРОК '+(index%6+1)+' ИЗ 6';
    for(const name of ['theory','task','hint','explanation'])$(name).textContent=current()[name];
    $('lesson-title').textContent=current().title;$('lesson-command').textContent=current().command;$('solution-code').textContent=current().solution.join('\n');
    document.querySelectorAll('.help').forEach(d=>d.open=false);
    $('previous').disabled=index===0;$('next').disabled=index===lessons.length-1;$('lesson-position').textContent=(index+1)+' из '+lessons.length;
    $('feedback').replaceChildren(make('p','','Выполните задание в терминале, затем нажмите «Проверить задание».'));
    pane('task');progress();renderOutput();renderFiles();save();
  }
  function execute(command){
    const prompt='student@ubuntu:'+shortPath(terminal.state.cwd)+'$ ';
    const result=terminal.run(command);if(result.empty)return;
    if(result.clear)session().logs=[];
    else session().logs.push({command:prompt+command,output:result.output,error:result.error});
    // Храним последние 60 записей; это также ограничивает объём localStorage.
    session().logs=session().logs.slice(-60);
    if(session().history.at(-1)!==command)session().history.push(command);session().history=session().history.slice(-60);
    historyIndex=session().history.length;pendingInput='';$('command').value='';renderOutput();renderFiles();save();
    $('terminal-announcement').textContent=(result.error?'Ошибка. ':'')+(result.output||'Команда выполнена без вывода.');
  }
  $('command-form').addEventListener('submit',event=>{event.preventDefault();const command=$('command').value;if(!command.trim())return;execute(command);});
  $('command').addEventListener('input',save);
  $('command').addEventListener('keydown',event=>{
    const history=session().history;
    if(event.key==='ArrowUp'){event.preventDefault();if(historyIndex===history.length)pendingInput=$('command').value;if(historyIndex>0)$('command').value=history[--historyIndex];}
    else if(event.key==='ArrowDown'){event.preventDefault();if(historyIndex<history.length){historyIndex++;$('command').value=historyIndex===history.length?pendingInput:history[historyIndex];}}
    else if(event.ctrlKey&&event.key.toLowerCase()==='l'){event.preventDefault();session().logs=[];renderOutput();save();}
  });
  $('clear-screen').addEventListener('click',()=>{session().logs=[];renderOutput();save();$('terminal-announcement').textContent='Экран очищен. Файлы и прогресс сохранены.';});
  $('check').addEventListener('click',()=>{
    const results=check(current(),terminal.state),success=results.every(r=>r.pass),area=$('feedback');area.replaceChildren();
    area.append(make('h3',success?'success-title':'',success?'Получилось! Все цели выполнены.':'Ещё немного практики. Проверьте цели:'));
    const list=make('ul');for(const r of results)list.append(make('li',r.pass?'pass':'fail',(r.pass?'✓ ':'○ ')+r.label));area.append(list);
    if(success&&!data.completed.includes(current().id))data.completed.push(current().id);progress();save();
  });
  $('reset').addEventListener('click',()=>{
    if(!confirm('Восстановить виртуальные файлы и историю этого урока? Состояние урока будет заменено. Отметка о прохождении сохранится.'))return;
    const t=new Terminal(current().seed);data.sessions[current().id]={state:t.snapshot(),logs:[],history:[],input:''};terminal=null;select(index);
  });
  $('show-help').addEventListener('click',()=>{pane('terminal');execute('help');$('command').focus();});
  document.querySelectorAll('[data-insert]').forEach(b=>b.addEventListener('click',()=>{pane('terminal');$('command').value=b.dataset.insert;save();$('command').focus();$('lesson').scrollIntoView({block:'start'});}));
  document.querySelectorAll('[role=tab][data-pane]').forEach(b=>b.addEventListener('click',()=>pane(b.dataset.pane)));
  document.querySelector('.mobile-tabs').addEventListener('keydown',event=>{
    const tabs=[...document.querySelectorAll('.mobile-tabs button')],i=tabs.indexOf(document.activeElement);let n;
    if(event.key==='ArrowRight')n=(i+1)%tabs.length;else if(event.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')n=0;else if(event.key==='End')n=tabs.length-1;else return;
    event.preventDefault();tabs[n].click();tabs[n].focus();
  });
  $('previous').addEventListener('click',()=>select(index-1));$('next').addEventListener('click',()=>select(index+1));document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();select(0);});
  if(matchMedia('(max-width:650px)').matches)$('course-menu').open=false;
  renderMenu();select(lessons.findIndex(l=>l.id===data.last));
})();
