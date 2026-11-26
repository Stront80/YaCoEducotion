(function(){
  'use strict';
  const {VPS,IP,FP,SSH,config,route,user}=window.VPSSim;
  const {lessons,create,check,describe}=window.VPSCourse;
  const $=id=>document.getElementById(id),KEY='vps-workshop-v1';
  const fresh=()=>({version:1,last:lessons[0].id,completed:[],sessions:{}});
  let data=fresh(),index=0,vps,saving=true,historyIndex=0,pendingInput='';
  const current=()=>lessons[index],session=()=>data.sessions[current().id];
  function el(tag,css,text){const node=document.createElement(tag);if(css)node.className=css;if(text!==undefined)node.textContent=text;return node;}
  function warn(message){$('storage-warning').textContent=message;$('storage-warning').hidden=false;}
  try{
    const raw=localStorage.getItem(KEY);if(raw){
      if(raw.length>6000000)throw new Error('Размер');const parsed=JSON.parse(raw);
      if(parsed?.version!==1||!Array.isArray(parsed.completed)||!parsed.sessions||typeof parsed.sessions!=='object'||Array.isArray(parsed.sessions))throw new Error('Формат');
      const clean=fresh();clean.last=lessons.some(l=>l.id===parsed.last)?parsed.last:lessons[0].id;clean.completed=[...new Set(parsed.completed.filter(id=>lessons.some(l=>l.id===id)))];
      for(const l of lessons){const s=parsed.sessions[l.id];if(!s)continue;
        if(!Array.isArray(s.logs)||s.logs.length>60||s.logs.some(r=>!r||typeof r.command!=='string'||r.command.length>2200||typeof r.output!=='string'||r.output.length>20000||typeof r.error!=='boolean')||!Array.isArray(s.history)||s.history.length>60||s.history.some(x=>typeof x!=='string'||x.length>2000)||typeof s.input!=='string'||s.input.length>2000||typeof s.editText!=='string'||s.editText.length>8000||typeof s.providerOpen!=='boolean')throw new Error('Сеанс');
        clean.sessions[l.id]={...s,state:VPS.restore(s.state).snapshot()};
      }data=clean;
    }
  }catch{saving=false;warn('Сохранение недоступно или повреждено. Можно продолжать в памяти. Прежняя запись не перезаписывается; после закрытия новые изменения могут потеряться.');}
  function save(){
    if(!vps)return;session().state=vps.snapshot();session().input=$('command').value;
    if(vps.state.editor)session().editText=$('config-text').value;
    if(!saving){$('save-status').textContent='Только в памяти';return;}
    try{localStorage.setItem(KEY,JSON.stringify(data));$('save-status').textContent='Сохранено локально';}
    catch{saving=false;warn('Не удалось сохранить изменения в браузере. Работа продолжится в памяти; после закрытия новые данные могут потеряться.');$('save-status').textContent='Только в памяти';}
  }
  function pane(name,focus=false){
    $('panels').dataset.pane=name;
    document.querySelectorAll('.mobile-tabs button').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.pane===name));b.tabIndex=b.dataset.pane===name?0:-1;});if(focus)$('command').focus();
  }
  function progress(){
    $('progress-count').textContent=data.completed.length;$('progress').value=data.completed.length;
    $('progress-text').textContent=data.completed.length===19?'Курс пройден. Сверяйте реальную среду перед настройкой VPS.':data.completed.length?'Практика складывается в уверенный порядок действий.':'Начните с паспорта учебного VPS.';
    const done=data.completed.includes(current().id);$('lesson-status').textContent=done?'Пройдено':'Практика';$('lesson-status').classList.toggle('done',done);
    document.querySelectorAll('.lesson-link').forEach(b=>{const completed=data.completed.includes(b.dataset.id);b.firstChild.textContent=completed?'✓':b.dataset.number;b.classList.toggle('complete',completed);b.setAttribute('aria-label',b.dataset.title+(completed?', пройдено':''));if(b.dataset.id===current().id)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  }
  function menu(){
    for(const group of [...new Set(lessons.map(l=>l.group))]){
      const section=el('section','course-group');section.append(el('h3','',group));
      lessons.filter(l=>l.group===group).forEach((l,n)=>{const b=el('button','lesson-link');Object.assign(b.dataset,{id:l.id,title:l.title,number:String(n+1).padStart(2,'0')});const mark=el('span','',b.dataset.number);mark.setAttribute('aria-hidden','true');b.append(mark,el('span','',l.title));b.addEventListener('click',()=>{select(lessons.indexOf(l));if(matchMedia('(max-width:650px)').matches){$('course-menu').open=false;$('lesson').focus();}});section.append(b);});$('course-nav').append(section);
    }
  }
  function log(command,output,error=false){session().logs.push({command,output:String(output).slice(0,20000),error});session().logs=session().logs.slice(-60);$('terminal-announcement').textContent=(error?'Ошибка. ':'')+(output||'Выполнено.');}
  function render(){
    const s=vps.state,b=s.server,area=$('terminal-output');area.replaceChildren();
    if(!session().logs.length)area.append(el('p','intro','Только учебная модель. Используйте команды задания или help. Локальная вкладка и серверный сеанс — разные контексты.'));
    for(const r of session().logs){const item=el('div','terminal-entry');item.append(el('pre','input-line',r.command));if(r.output)item.append(el('pre',r.error?'error-output':'command-output',r.output));area.append(item);}area.scrollTop=area.scrollHeight;
    $('prompt').textContent=vps.prompt();$('terminal-context').textContent=s.context==='client'?'Локальный компьютер':s.context==='console'?'Консоль провайдера':s.context+' · '+user(s)+'@'+b.hostname;
    $('context-note').textContent=s.pending?'Ожидается ответ на подтверждение. Введите '+(s.pending.type==='host'?'yes или no. Сначала сверьте отпечаток.':'y или n.'):s.context==='client'?'Вы на локальном компьютере модели. Здесь выполняются ssh, ssh-keygen, ssh-copy-id и scp.':'Вы на VPS модели. '+(s.context==='console'?'Консоль независима от SSH/UFW; аутентификация провайдера пропущена.':'Сохраните этот сеанс, пока не проверили новое подключение.');
    $('session-tabs').replaceChildren();for(const connection of s.sessions.filter(x=>x.open)){const button=el('button','',connection.id+' · '+connection.user+' · '+(connection.auth==='key'?'ключ':'пароль'));button.type='button';button.setAttribute('aria-pressed',String(s.context===connection.id));button.addEventListener('click',()=>action('session',connection.id));$('session-tabs').append(button);}
    document.querySelector('[data-action=client]').setAttribute('aria-pressed',String(s.context==='client'));
    $('provider-panel').hidden=!session().providerOpen;document.querySelector('[data-action=provider]').setAttribute('aria-expanded',String(session().providerOpen));$('provider-info').textContent='IP: '+IP+'\nОбраз сценария: Ubuntu 24.04 LTS\nHost key: '+FP+'\nВсе значения учебные; настоящего VPS нет.';
    $('snapshot-state').textContent=s.snapshot?'Учебный снимок есть. Восстановление заменит состояние VPS и закроет сеансы.':'Снимок ещё не создан.';
    $('config-panel').hidden=!s.editor;$('command').disabled=!!s.editor;document.querySelector('#command-form button').disabled=!!s.editor;
    if(s.editor)$('config-path').textContent=s.editor;
    const facts=[['Система',b.hostname+' · Ubuntu 24.04'],['Новый SSH: сеть/служба',route(s)?'Маршрут открыт; нужен разрешённый способ входа':'Заблокирован: проверьте firewall/службу'],['Активный SSH','root '+(b.ssh.root?'разрешён':'запрещён')+' · пароль '+(b.ssh.password?'да':'нет')+' · ключ '+(b.ssh.pubkey?'да':'нет')],['Firewall',b.ufw.enabled?'UFW включён · '+b.ufw.incoming+' incoming':'UFW выключен'],['Обновления',b.upgraded?'Установлены'+(b.rebootRequired?' · нужен reboot':''):'Не устанавливались в этой среде'],['Службы','SSH: '+(b.services.ssh.active?'работает':'остановлен')+' · nginx: '+(b.services.nginx.active?'работает':'не работает')]];
    const dl=el('dl');for(const [name,value]of facts){const row=el('div');row.append(el('dt','',name),el('dd','',value));dl.append(row);}$('vps-status').replaceChildren(dl);
    let disk;try{const c=config(b.files[SSH].text);disk=Object.entries(c).map(([k,v])=>k+': '+(v?'yes':'no')).join('\n');}catch(e){disk='Ошибка: '+e.message;}
    $('ssh-state').textContent='На диске (ревизия '+b.revision+'):\n'+disk+'\n\nПрименено (ревизия '+b.sshRevision+'):\n'+Object.entries(b.ssh).map(([k,v])=>k+': '+(v?'yes':'no')).join('\n')+'\nsshd -T в модели рассчитывает именно диск, не активную память.';
    $('user-state').textContent=Object.entries(b.users).map(([name,u])=>name+': '+(u.sudo?'sudo':'обычный')+', public key '+(u.key?'есть':'нет')+', права '+u.dirMode.toString(8)+'/'+u.keyMode.toString(8)).join('\n')+'\n\nАрхивов на VPS: '+Object.keys(b.archives).length+'\nКопий на локальной стороне: '+Object.keys(s.client.downloads).length+'\nСнимок провайдера: '+(s.snapshot?'есть':'нет');
  }
  function select(n){
    if(vps)save();index=n;data.last=current().id;
    if(!session())data.sessions[current().id]={state:create(current()).snapshot(),logs:[],history:[],input:'',editText:'',providerOpen:false};
    vps=VPS.restore(session().state);historyIndex=session().history.length;pendingInput='';$('command').value=session().input;$('config-text').value=session().editText;
    $('lesson-category').textContent=current().group==='Итоговая практика'?'ИТОГОВАЯ ПРАКТИКА':current().group.toUpperCase()+' · УРОК '+(index%6+1)+' ИЗ 6';
    $('lesson-title').textContent=current().title;$('lesson-command').textContent=current().command;for(const name of ['theory','task','hint','explanation'])$(name).textContent=current()[name];$('solution-code').textContent=describe(current().solution);
    document.querySelectorAll('.help').forEach(d=>d.open=false);$('feedback').replaceChildren(el('p','','Выполните учебные действия, затем нажмите «Проверить задание».'));
    $('previous').disabled=index===0;$('next').disabled=index===18;$('lesson-position').textContent=(index+1)+' из 19';pane('task');render();progress();save();
  }
  function execute(command){
    if(!command.trim())return;const prompt=vps.prompt();const r=vps.run(command);if(command.trim()==='clear'&&!r.error)session().logs=[];else log(prompt+' '+command,r.output,r.error);
    if(session().history.at(-1)!==command)session().history.push(command);session().history=session().history.slice(-60);historyIndex=session().history.length;pendingInput='';$('command').value='';
    if(vps.state.editor){$('config-text').value=vps.state.server.files[vps.state.editor].text;session().editText=$('config-text').value;}
    render();save();if(vps.state.editor)$('config-text').focus();
  }
  function action(name,id){
    if(name==='restore'&&!confirm('Восстановить учебный снимок? Изменения VPS после снимка потеряются, SSH-сеансы закроются. Отметки курса останутся.'))return;
    if(name==='snapshot'&&vps.state.snapshot&&!confirm('Заменить существующий учебный снимок текущим состоянием VPS?'))return;
    try{const output=vps.action(name,id);if(name==='provider')session().providerOpen=!session().providerOpen;else if(name==='snapshot'||name==='restore')session().providerOpen=true;log('[Интерфейс: '+name+']',output);}
    catch(e){log('[Интерфейс]',e.message,true);}render();save();
    if(['client','console','session'].includes(name)){$('command').focus();}
  }
  $('command-form').addEventListener('submit',event=>{event.preventDefault();execute($('command').value);});$('command').addEventListener('input',save);
  $('command').addEventListener('keydown',event=>{
    const history=session().history;if(event.key==='ArrowUp'){event.preventDefault();if(historyIndex===history.length)pendingInput=$('command').value;if(historyIndex>0)$('command').value=history[--historyIndex];save();}
    else if(event.key==='ArrowDown'){event.preventDefault();if(historyIndex<history.length){historyIndex++;$('command').value=historyIndex===history.length?pendingInput:history[historyIndex];}save();}
  });
  document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.action)));
  $('config-text').addEventListener('input',save);
  $('save-config').addEventListener('click',()=>{try{log('[Редактор]',vps.saveFile($('config-text').value));}catch(e){log('[Редактор]',e.message,true);}render();save();$('command').focus();});
  $('cancel-config').addEventListener('click',()=>{vps.cancelEdit();render();save();$('command').focus();});
  $('clear-screen').addEventListener('click',()=>{session().logs=[];render();save();});
  $('check').addEventListener('click',()=>{
    const rows=check(current(),vps.state),success=rows.every(r=>r.pass),area=$('feedback');area.replaceChildren(el('h3',success?'success-title':'',success?'Получилось! Все цели выполнены.':'Проверьте оставшиеся цели:'));const ul=el('ul');for(const row of rows)ul.append(el('li',row.pass?'pass':'fail',(row.pass?'✓ ':'○ ')+row.label));area.append(ul);
    if(success&&!data.completed.includes(current().id))data.completed.push(current().id);progress();save();
  });
  $('reset').addEventListener('click',()=>{if(!confirm('Сбросить модель, историю и черновики этого урока? Отметка прохождения сохранится.'))return;data.sessions[current().id]={state:create(current()).snapshot(),logs:[],history:[],input:'',editText:'',providerOpen:false};vps=null;select(index);});
  $('show-help').addEventListener('click',()=>{pane('terminal');execute('help');$('command').focus();});
  document.querySelectorAll('[data-insert]').forEach(b=>b.addEventListener('click',()=>{pane('terminal');if(vps.state.editor){$('config-text').focus();return;}$('command').value=b.dataset.insert;save();$('command').focus();$('lesson').scrollIntoView({block:'start'});}));
  document.querySelectorAll('.mobile-tabs button').forEach(b=>b.addEventListener('click',()=>pane(b.dataset.pane)));
  document.querySelector('.mobile-tabs').addEventListener('keydown',event=>{const tabs=[...document.querySelectorAll('.mobile-tabs button')],i=tabs.indexOf(document.activeElement);let n;if(event.key==='ArrowRight')n=(i+1)%tabs.length;else if(event.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')n=0;else if(event.key==='End')n=tabs.length-1;else return;event.preventDefault();tabs[n].click();tabs[n].focus();});
  $('previous').addEventListener('click',()=>select(index-1));$('next').addEventListener('click',()=>select(index+1));document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();select(0);});
  if(matchMedia('(max-width:650px)').matches)$('course-menu').open=false;menu();select(lessons.findIndex(l=>l.id===data.last));
})();
