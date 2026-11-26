(function(){
  'use strict';
  const {TmuxModel,leaves,HELP}=window.TmuxWorkshop,{lessons,create,check,describe}=window.TmuxCourse;
  const $=id=>document.getElementById(id),KEY='tmux-workshop-v1';
  const make=(tag,css,text)=>{const n=document.createElement(tag);if(css)n.className=css;if(text!==undefined)n.textContent=text;return n;};
  let data={version:1,last:lessons[0].id,completed:[],sessions:{}},index=0,model,saving=true;
  const current=()=>lessons[index];
  function warn(text){$('storage-warning').hidden=false;$('storage-warning').textContent=text;}
  // Не затираем повреждённое сохранение. Состояния проверяет тот же движок,
  // который создаёт новую среду; сеанс продолжает работу в памяти при отказе.
  try{const raw=localStorage.getItem(KEY);if(raw){const p=JSON.parse(raw);if(p.version!==1||!Array.isArray(p.completed)||!p.sessions||typeof p.sessions!=='object'||Array.isArray(p.sessions))throw new Error('Формат');data.last=lessons.some(l=>l.id===p.last)?p.last:lessons[0].id;data.completed=[...new Set(p.completed.filter(id=>lessons.some(l=>l.id===id)))];for(const l of lessons)if(p.sessions[l.id])data.sessions[l.id]=TmuxModel.restore(p.sessions[l.id]).snapshot();}}
  catch{saving=false;warn('Сохранение недоступно или повреждено. Продолжайте в этом сеансе; после закрытия прогресс может потеряться. Прежняя запись не перезаписывается.');}
  function save(){data.sessions[current().id]=model.snapshot();if(!saving){$('browser-save').textContent='Только в памяти';return;}try{localStorage.setItem(KEY,JSON.stringify(data));$('browser-save').textContent='Сохранено в браузере';}catch{saving=false;warn('Браузер не смог сохранить изменения. Можно продолжить в памяти; после закрытия данные могут потеряться.');$('browser-save').textContent='Только в памяти';}}
  function pane(name){$('panels').dataset.pane=name;document.querySelectorAll('.mobile-tabs button').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.pane===name));b.tabIndex=b.dataset.pane===name?0:-1;});}
  function focusTerminal(){pane('practice');$('terminal-input').focus({preventScroll:true});}
  function updateFocus(){const active=document.activeElement===$('terminal-input');$('terminal-focus').textContent=active?'Клавиатура активна · Ctrl+B перехватывается только здесь':'Нажмите на поле ввода — команды принимаются только при фокусе';}
  function progress(){
    $('progress-count').textContent=data.completed.length;$('progress').value=data.completed.length;$('progress-text').textContent=data.completed.length===19?'Все занятия пройдены. Рабочее место собрано!':data.completed.length?'Каждый шаг делает среду понятнее.':'Начните с Ctrl+B.';
    const done=data.completed.includes(current().id);$('lesson-state').textContent=done?'Пройдено':'Практика';$('lesson-state').classList.toggle('done',done);
    document.querySelectorAll('.lesson-link').forEach(b=>{const completed=data.completed.includes(b.dataset.id);b.classList.toggle('complete',completed);b.querySelector('.number').textContent=completed?'✓':b.dataset.number;b.setAttribute('aria-label',b.dataset.title+(completed?', пройдено':''));if(b.dataset.id===current().id)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  }
  function menu(){for(const group of ['Сессии и окна','Панели и раскладки','Управление средой','Итоговая практика']){const section=make('section','course-group');section.append(make('h3','',group));lessons.filter(l=>l.group===group).forEach((l,n)=>{const b=make('button','lesson-link');Object.assign(b.dataset,{id:l.id,title:l.title,number:String(n+1).padStart(2,'0')});const mark=make('span','number');mark.setAttribute('aria-hidden','true');b.append(mark,make('span','',l.title));b.addEventListener('click',()=>{select(lessons.indexOf(l));if(matchMedia('(max-width:650px)').matches){$('course-menu').open=false;$('workspace').focus();}});section.append(b);});$('lessons').append(section);}}
  function renderLeaf(pane,active=false,outside=false){
    const box=make('section','terminal-pane'+(active?' active':''));if(pane.id)box.dataset.id=pane.id;
    const header=make('div','pane-heading');header.append(make('span','',outside?'Внешняя оболочка':pane.id+' · shell'),make('span','',active?'Активна':'Учебная панель'));
    box.append(header,make('pre','pane-output',pane.lines.join('\n')),make('p','pane-input','$ '+pane.input));return box;
  }
  function renderNode(node,window){
    if(node.pane){const p=window.panes.find(p=>p.id===node.pane);return renderLeaf(p,p.id===window.activePane);}
    const branch=make('div','layout-node axis-'+node.axis);
    // Отношения — только числа из валидированного состояния, не CSS из ввода.
    for(const [child,ratio]of [[node.first,node.ratio],[node.second,1-node.ratio]]){const slot=make('div','layout-slot');slot.style.flexGrow=String(ratio);slot.append(renderNode(child,window));branch.append(slot);}return branch;
  }
  function renderOverlay(){
    const s=model.state;
    if(!['help','copy','choose-session'].includes(s.mode))return null;
    const overlay=make('section','terminal-overlay');
    if(s.mode==='help'){overlay.append(make('h3','','Учебная памятка tmux'),make('p','','Вернуться — q или Esc.'),make('pre','',HELP));}
    else if(s.mode==='choose-session'){
      overlay.append(make('h3','','Выберите сессию'),make('p','','Up/Down и Enter. На сенсорном экране можно нажать строку.'));
      const list=make('div','choice-list');s.sessions.forEach((session,n)=>{const b=make('button',n===s.choice?'current':'',session.name+' · '+session.windows.length+' окон'+(s.attached===session.id?' · подключена':''));b.dataset.choice=String(n);b.addEventListener('click',()=>{model.choose(n);render();save();focusTerminal();});list.append(b);});overlay.append(list);
    }else{
      const p=model.pane(),end=Math.max(0,p.lines.length-s.copyOffset),start=Math.max(0,end-12);overlay.append(make('h3','','История '+p.id+' · смещение '+s.copyOffset),make('p','','Up/PageUp — выше, Down/PageDown — ниже; q/Esc — выход. Выделение/копирование не моделируется.'),make('pre','',p.lines.slice(start,end).join('\n')));
    }return overlay;
  }
  function renderCanvas(){
    const s=model.state,canvas=$('terminal-canvas'),windows=$('window-bar'),status=$('tmux-status');canvas.replaceChildren();windows.replaceChildren();status.replaceChildren();
    if(s.attached){const session=model.session(),w=model.window();$('connection').textContent='Подключено: '+session.name;
      for(const item of session.windows)windows.append(make('span','window-tag'+(item.id===session.currentWindow?' current':''),item.index+':'+item.name+(item.id===session.currentWindow?'*':'')+(item.zoom?' Z':'')));
      canvas.append(w.zoom?renderLeaf(model.pane(),true):renderNode(w.tree,w));
      status.append(make('span','','['+session.name+']'),make('span','',session.windows.map(item=>item.index+':'+item.name+(item.id===session.currentWindow?'*':'')).join('  ')),make('span','',w.activePane+(w.zoom?' Z':'')));
    }else{$('connection').textContent='Внешняя учебная оболочка';windows.append(make('span','','Нет подключения · tmux new / tmux attach'));canvas.append(renderLeaf(s.outside,true,true));status.append(make('span','','[вне tmux]'),make('span','',s.sessions.length+' сохранённых сессий'));}
    const overlay=renderOverlay();if(overlay)canvas.append(overlay);
    canvas.querySelectorAll('.pane-output').forEach(p=>p.scrollTop=p.scrollHeight);
  }
  function renderStructure(){
    const tree=$('structure-tree');tree.replaceChildren();const s=model.state;
    if(!s.sessions.length){tree.append(make('p','','Сессий пока нет. Создайте первую через tmux new -s имя.'));return;}
    for(const session of s.sessions){const active=s.attached===session.id,card=make('section','structure-session'+(active?' attached':''));card.append(make('h4','',session.name+' '+session.id+(active?' · подключена':' · отключена')));
      for(const w of session.windows){const item=make('div','structure-window');item.append(make('strong','',w.index+':'+w.name+(w.id===session.currentWindow?' *':'')+(w.zoom?' · zoom':'')));item.append(make('p','',leaves(w.tree).map(id=>id+(id===w.activePane?' [активна]':'')).join(' · ')));card.append(item);}tree.append(card);
    }
  }
  function render(){
    renderCanvas();renderStructure();const s=model.state;
    $('prefix-state').textContent=s.prefix?'Ctrl+B · ждём команду':s.mode==='normal'?'Префикс не активен':({prompt:'Командная строка tmux','rename-window':'Имя окна','rename-session':'Имя сессии',copy:'История',help:'Справка',confirm:'Подтверждение','choose-session':'Выбор сессии'})[s.mode];
    $('prefix-state').classList.toggle('prefix-active',s.prefix);document.querySelector('[data-key="Ctrl-b"]').classList.toggle('prefix-active',s.prefix);
    const label=s.mode==='prompt'?'Команда tmux (без слова tmux)':s.mode==='rename-window'?'Новое имя окна':s.mode==='rename-session'?'Новое имя сессии':s.mode==='confirm'?'Закрытие панели: y или n':s.mode==='choose-session'?'Выберите сессию стрелками и Enter':s.mode==='copy'?'История: стрелки / PageUp, выход q':s.mode==='help'?'Справка: выход q или Esc':s.attached?'Команда для панели '+model.window().activePane:'Команда внешней учебной оболочки';
    $('input-label').textContent=label;$('terminal-input').readOnly=['help','copy','choose-session','confirm'].includes(s.mode);
    const value=model.getInput();if($('terminal-input').value!==value)$('terminal-input').value=value;
    $('send').textContent=['normal','prompt','rename-window','rename-session'].includes(s.mode)?'Выполнить':'Enter';
    if($('terminal-message').textContent!==s.message)$('terminal-message').textContent=s.message;$('terminal-message').classList.toggle('error',s.error);updateFocus();
  }
  function action(key){model.key(key);render();save();}
  function select(n){if(model)save();index=n;data.last=current().id;model=data.sessions[current().id]?TmuxModel.restore(data.sessions[current().id]):create(current());$('lesson-category').textContent=current().group==='Итоговая практика'?'ИТОГОВАЯ ПРАКТИКА':current().group.toUpperCase()+' · УРОК '+(n%6+1)+' ИЗ 6';$('lesson-title').textContent=current().title;$('lesson-topic').textContent=current().topic;for(const name of ['theory','task','hint','explanation'])$(name).textContent=current()[name];$('solution-code').textContent=describe(current().solution);document.querySelectorAll('.help,.tmux-reference').forEach(d=>d.open=false);$('previous').disabled=n===0;$('next').disabled=n===18;$('lesson-position').textContent=(n+1)+' из 19';$('feedback').replaceChildren(make('p','','Выполните задание в терминале, затем нажмите «Проверить».'));pane('task');progress();render();save();}
  // Перехват Ctrl+B и команд режима локален полю. В обычной строке браузер
  // редактирует текст сам, input-событие синхронизирует соответствующую панель.
  $('terminal-input').addEventListener('keydown',event=>{
    if(event.isComposing||event.key==='Tab')return;
    if(event.ctrlKey&&event.key.toLowerCase()==='b'){event.preventDefault();action('Ctrl-b');return;}
    if(event.ctrlKey||event.metaKey||event.altKey)return;
    const special=['Escape','Enter','Backspace','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown'];
    const modal=!['normal','prompt','rename-window','rename-session'].includes(model.state.mode);
    if(event.key==='Escape'||event.key==='Enter'||(model.state.prefix||modal)&&(special.includes(event.key)||Array.from(event.key).length===1)){event.preventDefault();action(event.key);}
  });
  $('terminal-input').addEventListener('beforeinput',event=>{if(event.isComposing)return;if(model.state.prefix&&event.data){event.preventDefault();for(const char of Array.from(event.data))model.key(char);render();save();}});
  $('terminal-input').addEventListener('input',event=>{if(event.isComposing)return;model.setInput($('terminal-input').value);render();save();});
  $('command-form').addEventListener('submit',event=>{event.preventDefault();action('Enter');});
  $('terminal-input').addEventListener('focus',updateFocus);$('terminal-input').addEventListener('blur',updateFocus);
  $('terminal-canvas').addEventListener('click',event=>{if(!event.target.closest('button'))$('terminal-input').focus({preventScroll:true});});
  const keys=['c',',','n','p','l','0','1','2','%','"','o','z','d','s','$','!','[','x','y','q',':','?'];
  for(const key of keys){const b=make('button','',key);b.dataset.key=key;b.setAttribute('aria-label','Клавиша '+key);$('letter-keys').append(b);}
  document.querySelectorAll('[data-key]').forEach(b=>b.addEventListener('click',()=>{action(b.dataset.key);focusTerminal();}));
  $('focus-terminal').addEventListener('click',focusTerminal);
  $('check').addEventListener('click',()=>{const results=check(current(),model.state),success=results.every(r=>r.pass),area=$('feedback');area.replaceChildren(make('h3',success?'success-title':'',success?'Получилось! Все цели выполнены.':'Ещё немного практики. Проверьте цели:'));const list=make('ul');for(const r of results)list.append(make('li',r.pass?'pass':'fail',(r.pass?'✓ ':'○ ')+r.label));area.append(list);if(success&&!data.completed.includes(current().id))data.completed.push(current().id);progress();save();});
  $('reset').addEventListener('click',()=>{if(!confirm('Восстановить учебные сессии, окна, панели и историю этого урока? Текущее состояние заменится, отметка прохождения останется.'))return;data.sessions[current().id]=create(current()).snapshot();model=null;select(index);});
  document.querySelectorAll('.mobile-tabs button').forEach(b=>b.addEventListener('click',()=>pane(b.dataset.pane)));
  document.querySelector('.mobile-tabs').addEventListener('keydown',event=>{const tabs=[...document.querySelectorAll('.mobile-tabs button')],i=tabs.indexOf(document.activeElement);let n;if(event.key==='ArrowRight')n=(i+1)%tabs.length;else if(event.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')n=0;else if(event.key==='End')n=tabs.length-1;else return;event.preventDefault();tabs[n].click();tabs[n].focus();});
  $('previous').addEventListener('click',()=>select(index-1));$('next').addEventListener('click',()=>select(index+1));document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();select(0);});
  if(matchMedia('(max-width:650px)').matches)$('course-menu').open=false;
  menu();select(lessons.findIndex(l=>l.id===data.last));
})();
