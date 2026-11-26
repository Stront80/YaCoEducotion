(function(){
  'use strict';
  const {VimModel}=window.VimWorkshop,{lessons,check}=window.VimCourse;
  const $=id=>document.getElementById(id),KEY='vim-workshop-v1';
  let data={version:1,last:lessons[0].id,completed:[],sessions:{}},index=0,model,saving=true,composing=false;
  const current=()=>lessons[index];
  const make=(tag,css,text)=>{const n=document.createElement(tag);if(css)n.className=css;if(text!==undefined)n.textContent=text;return n;};
  function warn(message){$('storage-warning').hidden=false;$('storage-warning').textContent=message;}
  // Повреждённое сохранение не затирается. Учебный сеанс продолжает работать
  // в памяти; допустимые состояния проходят ту же валидацию, что новые буферы.
  try{
    const raw=localStorage.getItem(KEY);
    if(raw){const p=JSON.parse(raw);if(p.version!==1||!Array.isArray(p.completed)||!p.sessions||typeof p.sessions!=='object'||Array.isArray(p.sessions))throw new Error('Формат');
      data.last=lessons.some(l=>l.id===p.last)?p.last:lessons[0].id;data.completed=[...new Set(p.completed.filter(id=>lessons.some(l=>l.id===id)))];
      for(const l of lessons){if(p.sessions[l.id])data.sessions[l.id]=VimModel.restore(p.sessions[l.id]).snapshot();}
    }
  }catch{saving=false;warn('Сохранение недоступно или повреждено. Можно продолжать в этом сеансе, но прогресс после закрытия может потеряться. Прежняя запись не перезаписывается.');}
  function save(){data.sessions[current().id]=model.snapshot();if(!saving){$('browser-save').textContent='Только в памяти';return;}
    try{localStorage.setItem(KEY,JSON.stringify(data));$('browser-save').textContent='Сохранено в браузере';}
    catch{saving=false;warn('Браузер не смог сохранить изменения. Продолжайте в этом сеансе; после закрытия данные могут потеряться.');$('browser-save').textContent='Только в памяти';}
  }
  function pane(name){$('panels').dataset.pane=name;if(name==='reference')$('reference-panel').open=true;document.querySelectorAll('.mobile-tabs button').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.pane===name));b.tabIndex=b.dataset.pane===name?0:-1;});}
  function progress(){
    $('progress-count').textContent=data.completed.length;$('progress').value=data.completed.length;
    $('progress-text').textContent=data.completed.length===19?'Все занятия пройдены. Продолжайте практику!':data.completed.length?'Одна команда — ещё один навык.':'Первый шаг — нажать Esc.';
    const done=data.completed.includes(current().id);$('lesson-state').textContent=done?'Пройдено':'Практика';$('lesson-state').classList.toggle('done',done);
    document.querySelectorAll('.lesson-link').forEach(b=>{const completed=data.completed.includes(b.dataset.id);b.classList.toggle('complete',completed);b.querySelector('.number').textContent=completed?'✓':b.dataset.number;b.setAttribute('aria-label',b.dataset.title+(completed?', пройдено':''));if(b.dataset.id===current().id)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  }
  function menu(){for(const group of ['Первые движения','Редактируем уверенно','Работаем с текстом','Итоговая практика']){const section=make('section','course-group');section.append(make('h3','',group));lessons.filter(l=>l.group===group).forEach((l,n)=>{const b=make('button','lesson-link');Object.assign(b.dataset,{id:l.id,title:l.title,number:String(n+1).padStart(2,'0')});const mark=make('span','number');mark.setAttribute('aria-hidden','true');b.append(mark,make('span','',l.title));b.addEventListener('click',()=>{select(lessons.indexOf(l));if(matchMedia('(max-width:650px)').matches){$('course-menu').open=false;$('workspace').focus();}});section.append(b);});$('lessons').append(section);}}
  function focusEditor(){pane('practice');if(model.state.closed)$('reopen').focus();else $('keyboard').focus({preventScroll:true});}
  function updateFocus(){const active=document.activeElement===$('keyboard');$('editor-focus').textContent=active?'Клавиатура активна · Tab выводит фокус из редактора':'Нажмите на редактор, чтобы передать ему клавиатуру';}
  function renderBuffer(){
    const s=model.state,buffer=$('buffer');buffer.replaceChildren();
    const visual=s.mode==='visual'||s.mode==='visual-line',range=visual?model.visualRange():null;
    let offset=0;
    s.lines.forEach((line,row)=>{
      const item=make('div','vim-row'),number=make('span','line-number',String(row+1));number.setAttribute('aria-hidden','true');item.append(number);
      const content=make('span','vim-line'),chars=Array.from(line),length=chars.length;
      // Объединяем соседние обычные/выделенные символы: даже длинная строка
      // не создаёт DOM-узел на каждую букву. Курсор — отдельный видимый span.
      let accumulated='',lastClass=null;
      const flush=()=>{if(!accumulated)return;content.append(lastClass?make('span',lastClass,accumulated):document.createTextNode(accumulated));accumulated='';};
      for(let col=0;col<Math.max(length,1)+(s.mode==='insert'&&row===s.row&&s.col===length&&length>0?1:0);col++){
        const cursor=row===s.row&&col===s.col;
        const selected=range&&(range.linewise?row>=range.first&&row<=range.last:offset+col>=range.start&&offset+col<range.end);
        const css=[cursor?'vim-cursor':'',cursor&&s.mode==='insert'?'insert-cursor':'',selected?'vim-selection':''].filter(Boolean).join(' ');
        if(css!==lastClass){flush();lastClass=css;}accumulated+=chars[col]??' ';
      }
      flush();item.append(content);buffer.append(item);offset+=length+1;
    });
    // Прокручиваем только внутреннюю область. Страница не прыгает после
    // нажатия экранной клавиши или изменения курсора вне видимой практики.
    const cursor=buffer.querySelector('.vim-cursor'),viewport=$('editor-viewport');
    if(cursor&&viewport.offsetParent!==null){const c=cursor.getBoundingClientRect(),v=viewport.getBoundingClientRect();if(c.bottom>v.bottom)viewport.scrollTop+=c.bottom-v.bottom+10;if(c.top<v.top)viewport.scrollTop+=c.top-v.top-10;if(c.right>v.right)viewport.scrollLeft+=c.right-v.right+20;if(c.left<v.left)viewport.scrollLeft+=c.left-v.left-15;}
  }
  function render(){
    const s=model.state;renderBuffer();const names={normal:'NORMAL',insert:'INSERT',visual:'VISUAL','visual-line':'VISUAL LINE',command:'COMMAND',search:'SEARCH'};
    $('mode').textContent=s.closed?'ЗАКРЫТ':names[s.mode];document.querySelector('.vim-status').dataset.mode=s.mode;
    $('position').textContent=(s.row+1)+':'+(s.col+1)+' · '+s.lines.length+' стр.';
    $('pending').textContent=s.count+s.operator+s.motionCount+s.waiting;
    $('command-line').textContent=s.mode==='command'?':'+s.command:s.mode==='search'?'/'+s.command:' ';
    if($('editor-message').textContent!==s.message)$('editor-message').textContent=s.message;
    $('editor-message').classList.toggle('error',s.error);$('file-dirty').textContent=model.dirty()?'[+] Есть изменения':'Виртуально сохранён';
    $('closed-panel').hidden=!s.closed;$('keyboard').disabled=s.closed;
    document.querySelectorAll('[data-key]').forEach(b=>b.disabled=s.closed);
    const typing=!s.closed&&['insert','command','search'].includes(s.mode);$('type-text').disabled=!typing;
    $('insert-note').textContent=s.closed?'Файл закрыт':s.mode==='insert'?'Текст попадёт в виртуальный буфер':['command','search'].includes(s.mode)?'Затем нажмите Enter для выполнения':'Сначала включите Insert клавишей i';updateFocus();
  }
  function action(key){model.key(key);render();save();}
  function typeText(text){model.type(text.replace(/\r\n/g,'\n'));render();save();}
  function select(n){
    if(model)save();index=n;data.last=current().id;model=data.sessions[current().id]?VimModel.restore(data.sessions[current().id]):new VimModel(current().seed);
    $('lesson-category').textContent=current().group==='Итоговая практика'?'ИТОГОВАЯ ПРАКТИКА':current().group.toUpperCase()+' · УРОК '+(n%6+1)+' ИЗ 6';$('lesson-title').textContent=current().title;$('lesson-topic').textContent=current().topic;
    for(const name of ['theory','task','hint','explanation'])$(name).textContent=current()[name];
    $('solution-code').textContent=current().solution;document.querySelectorAll('.help').forEach(d=>d.open=false);
    $('keyboard').value='';$('insert-text').value='';$('previous').disabled=n===0;$('next').disabled=n===18;$('lesson-position').textContent=(n+1)+' из 19';$('feedback').replaceChildren(make('p','','Выполните задание в редакторе, затем нажмите «Проверить».'));
    $('reference-panel').open=false;pane('task');progress();render();save();
  }
  // Перехват действует только на фокусируемом поле редактора. Tab и системные
  // сочетания (кроме Vim redo Ctrl+R) остаются браузеру, глобальных слушателей нет.
  $('keyboard').addEventListener('keydown',event=>{
    if(composing||event.isComposing)return;
    if(event.key==='Tab')return;
    if(event.ctrlKey&&event.key.toLowerCase()==='r'){event.preventDefault();action('Ctrl-r');return;}
    if(event.ctrlKey&&event.key==='['){event.preventDefault();action('Escape');return;}
    if(event.ctrlKey||event.metaKey||event.altKey)return;
    if(['Escape','Enter','Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||Array.from(event.key).length===1){event.preventDefault();action(event.key);}
  });
  // Мобильные клавиатуры могут не выдавать символьный keydown. В этом случае
  // забираем фактически введённый текст один раз из textarea, после композиции.
  const commitInput=()=>{if(composing)return;const text=$('keyboard').value;if(text){$('keyboard').value='';typeText(text);}};
  $('keyboard').addEventListener('input',commitInput);
  $('keyboard').addEventListener('compositionstart',()=>{composing=true;});
  $('keyboard').addEventListener('compositionend',()=>{composing=false;queueMicrotask(commitInput);});
  $('keyboard').addEventListener('beforeinput',event=>{if(composing||event.isComposing)return;if(event.inputType==='deleteContentBackward'){event.preventDefault();action('Backspace');}else if(event.inputType==='deleteContentForward'){event.preventDefault();action('Delete');}else if(event.inputType==='insertLineBreak'){event.preventDefault();action('Enter');}});
  $('keyboard').addEventListener('paste',event=>{event.preventDefault();if(model.state.mode!=='insert'){model.tell('Вставка текста из буфера доступна в Insert. Сначала нажмите i.',true);render();return;}typeText(event.clipboardData.getData('text'));});
  $('keyboard').addEventListener('focus',updateFocus);$('keyboard').addEventListener('blur',updateFocus);
  $('editor-viewport').addEventListener('click',event=>{if(!model.state.closed&&!event.target.closest('button'))$('keyboard').focus({preventScroll:true});});
  const keys=['h','j','k','l','i','a','I','A','o','O','w','b','e','0','^','$','g','G','1','2','3','4','d','y','c','x','r','p','P','u','v','V','/',':','n','N'];
  for(const key of keys){const b=make('button','',key);b.dataset.key=key;b.setAttribute('aria-label','Клавиша '+key);$('letter-keys').append(b);}
  document.querySelectorAll('[data-key]').forEach(b=>b.addEventListener('click',()=>{action(b.dataset.key);focusEditor();}));
  $('type-text').addEventListener('click',()=>{if($('type-text').disabled)return;const text=$('insert-text').value;if(model.state.mode!=='insert'&&/[\r\n]/.test(text)){model.tell('Введите одну строку команды, затем нажмите Enter отдельно.',true);render();return;}typeText(text);$('insert-text').value='';focusEditor();});
  $('reopen').addEventListener('click',()=>{model.reopen();render();save();focusEditor();});$('focus-editor').addEventListener('click',focusEditor);
  $('check').addEventListener('click',()=>{const results=check(current(),model.state),success=results.every(r=>r.pass),area=$('feedback');area.replaceChildren(make('h3',success?'success-title':'',success?'Получилось! Все цели выполнены.':'Ещё немного практики. Проверьте цели:'));const list=make('ul');for(const r of results)list.append(make('li',r.pass?'pass':'fail',(r.pass?'✓ ':'○ ')+r.label));area.append(list);if(success&&!data.completed.includes(current().id))data.completed.push(current().id);progress();save();});
  $('reset').addEventListener('click',()=>{if(!confirm('Восстановить текст, виртуальное сохранение и историю этого урока? Текущее состояние заменится, отметка прохождения останется.'))return;data.sessions[current().id]=new VimModel(current().seed).snapshot();model=null;select(index);});
  document.querySelectorAll('.mobile-tabs button').forEach(b=>b.addEventListener('click',()=>pane(b.dataset.pane)));
  document.querySelector('.mobile-tabs').addEventListener('keydown',event=>{const tabs=[...document.querySelectorAll('.mobile-tabs button')],i=tabs.indexOf(document.activeElement);let n;if(event.key==='ArrowRight')n=(i+1)%tabs.length;else if(event.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')n=0;else if(event.key==='End')n=tabs.length-1;else return;event.preventDefault();tabs[n].click();tabs[n].focus();});
  $('previous').addEventListener('click',()=>select(index-1));$('next').addEventListener('click',()=>select(index+1));document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();select(0);});
  if(matchMedia('(max-width:650px)').matches)$('course-menu').open=false;
  menu();select(lessons.findIndex(l=>l.id===data.last));
})();
