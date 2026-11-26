/* Учебная модель tmux. Ввод не передаётся shell, PTY, процессам или серверу.
   Единственный источник структуры — дерево панелей; геометрия, фокус и DOM
   используют его одинаково. Это явно ограниченное подмножество tmux. */
(function(root){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const fail=message=>{throw new Error(message);};
  const nameOK=name=>typeof name==='string'&&/^[\p{L}\p{N}_-]{1,24}$/u.test(name);
  const aliases={new:'new-session',attach:'attach-session',a:'attach-session',ls:'list-sessions',neww:'new-window',splitw:'split-window',selectw:'select-window',selectp:'select-pane',renamew:'rename-window',rename:'rename-session',detach:'detach-client',killp:'kill-pane',killw:'kill-window',breakp:'break-pane',selectl:'select-layout',lsp:'list-panes',lsw:'list-windows',lsk:'list-keys'};
  const HELP='Учебный tmux: Ctrl+B отпустить, затем клавиша.\nc — окно; , — имя окна; n/p/цифра — переключение; % — панели рядом; " — панели сверху/снизу; o/стрелки — фокус; z — zoom; Space — раскладка; x — закрыть панель; d — detach; s — сессии; $ — имя сессии; ! — вынести панель; [ — история; ? — эта справка; : — команда.\nВыход из справки/истории — q или Esc.\nОболочка: echo, pwd, whoami, clear, help, demo-log и поддерживаемые команды tmux.';
  function words(text){
    if(typeof text!=='string'||text.length>1000||/[\r\n\0]/.test(text))fail('Введите одну строку до 1000 символов.');
    const result=[];let word='',quote=null,active=false;
    for(let n=0;n<text.length;n++){const c=text[n];
      if(quote){if(c===quote)quote=null;else if(c==='\\'&&quote==='"'&&['"','\\'].includes(text[n+1]))word+=text[++n];else word+=c;continue;}
      if(c==='"'||c==="'"){quote=c;active=true;continue;}
      if(c==='\\'){if(n+1===text.length)fail('После обратного слеша нужен символ.');word+=text[++n];active=true;continue;}
      if(/\s/.test(c)){if(active)result.push(word);word='';active=false;continue;}
      if(';|&><`()'.includes(c))fail('Составные shell-команды, перенаправления и подстановки не моделируются.');
      word+=c;active=true;
    }
    if(quote)fail('Кавычка не закрыта.');if(active)result.push(word);return result;
  }
  function options(args,allowed){
    const flags={},rest=[];let stopped=false;
    for(let n=0;n<args.length;n++){const arg=args[n];if(arg==='--'){stopped=true;continue;}
      if(!stopped&&arg.startsWith('-')&&arg!=='-'){
        if(arg.startsWith('--'))fail('Длинные параметры не поддерживаются.');
        for(let j=1;j<arg.length;j++){const key=arg[j];if(!(key in allowed))fail('Неизвестный параметр: -'+key);if(key in flags)fail('Параметр -'+key+' повторяется.');
          if(allowed[key]){const value=arg.slice(j+1)||args[++n];if(value===undefined)fail('После -'+key+' нужно значение.');flags[key]=value;break;}else flags[key]=true;
        }
      }else rest.push(arg);
    }return {flags,rest};
  }
  const leaves=node=>'pane' in node?[node.pane]:[...leaves(node.first),...leaves(node.second)];
  function changeLeaf(node,id,replacement){if('pane' in node)return node.pane===id?replacement:node;return {...node,first:changeLeaf(node.first,id,replacement),second:changeLeaf(node.second,id,replacement)};}
  function removeLeaf(node,id){if('pane' in node)return node.pane===id?null:node;const first=removeLeaf(node.first,id),second=removeLeaf(node.second,id);if(!first)return second;if(!second)return first;return {...node,first,second};}
  function even(ids,axis){if(ids.length===1)return {pane:ids[0]};return {axis,ratio:1/ids.length,first:{pane:ids[0]},second:even(ids.slice(1),axis)};}
  function tiled(ids){if(ids.length<=2)return even(ids,'x');const cut=Math.ceil(ids.length/2);return {axis:'y',ratio:.5,first:even(ids.slice(0,cut),'x'),second:even(ids.slice(cut),'x')};}
  function rectangles(node,box={x:0,y:0,w:100,h:100}){
    if('pane' in node)return [{id:node.pane,...box}];
    const r=node.ratio;
    return node.axis==='x'?[...rectangles(node.first,{...box,w:box.w*r}),...rectangles(node.second,{...box,x:box.x+box.w*r,w:box.w*(1-r)})]:[...rectangles(node.first,{...box,h:box.h*r}),...rectangles(node.second,{...box,y:box.y+box.h*r,h:box.h*(1-r)})];
  }
  class TmuxModel{
    constructor({empty=false}={}){
      this.state={sessions:[],attached:null,nextSession:0,nextWindow:0,nextPane:0,prefix:false,mode:'normal',prompt:'',choice:0,confirmPane:null,copyOffset:0,events:[],outside:{lines:['Учебная оболочка. Команды не запускаются на компьютере.'],input:''},message:'Нажмите на поле ввода, чтобы практиковаться.',error:false};
      if(!empty)this.newSession('learn',false,'shell');this.state.events=[];this.validate();
    }
    session(target=this.state.attached){const s=this.state.sessions.find(s=>s.id===target||s.name===target);if(!s)fail('Сессия не найдена. Укажите точное имя или создайте новую.');return s;}
    window(session=this.session()){const w=session.windows.find(w=>w.id===session.currentWindow);if(!w)fail('Текущее окно не найдено.');return w;}
    pane(window=this.window()){const pane=window.panes.find(p=>p.id===window.activePane);if(!pane)fail('Текущая панель не найдена.');return pane;}
    event(type,extra={}){this.state.events.push({type,...extra});this.state.events=this.state.events.slice(-120);}
    tell(message,error=false){this.state.message=message;this.state.error=error;}
    transaction(action){const before=this.snapshot();try{this.state.error=false;action();this.validate();return !this.state.error;}catch(error){this.state=before;this.tell(error.message||'Не удалось выполнить действие.',true);return false;}}
    createPane(){return {id:'%'+this.state.nextPane++,lines:['Учебная оболочка · echo, pwd, whoami, help'],input:'',cwd:'/home/student'};}
    createWindow(session,name='shell',pane=null){
      if(session.windows.length>=8)fail('В модели доступно до восьми окон на сессию.');if(!nameOK(name))fail('Имя: 1–24 буквы, цифры, _ или -.');
      let index=0;while(session.windows.some(w=>w.index===index))index++;
      const first=pane||this.createPane(),window={id:'@'+this.state.nextWindow++,index,name,panes:[first],tree:{pane:first.id},activePane:first.id,zoom:false,layout:'custom'};session.windows.push(window);session.windows.sort((a,b)=>a.index-b.index);return window;
    }
    newSession(name,detached=false,windowName='shell'){
      if(this.state.sessions.length>=5)fail('В модели доступно до пяти сессий.');if(!nameOK(name))fail('Имя: 1–24 буквы, цифры, _ или -.');if(this.state.sessions.some(s=>s.name===name))fail('Сессия с таким именем уже существует.');
      if(this.state.attached&&!detached)fail('Вложенные сессии не моделируются. Сначала detach или создайте новую с -d.');
      const session={id:'$'+this.state.nextSession++,name,windows:[],currentWindow:null,lastWindow:null};const window=this.createWindow(session,windowName);session.currentWindow=window.id;this.state.sessions.push(session);if(!detached)this.state.attached=session.id;this.event('new-session',{id:session.id,name});this.tell('Создана учебная сессия '+name+'.');return session;
    }
    attach(target){const session=target?this.session(target):this.state.sessions.at(-1);if(!session)fail('Нет сессий для подключения.');this.state.attached=session.id;this.clearMode();this.event('attach',{id:session.id});this.tell('Подключено к '+session.name+'. Окна и панели сохранены.');}
    detach(){const s=this.session();this.state.attached=null;this.clearMode();this.event('detach',{id:s.id});this.tell('Вы отключились. Учебная сессия '+s.name+' продолжает существовать.');}
    clearMode(){Object.assign(this.state,{mode:'normal',prefix:false,prompt:'',confirmPane:null,copyOffset:0});}
    selectWindow(window,session=this.session()){
      if(session.currentWindow!==window.id){session.lastWindow=session.currentWindow;session.currentWindow=window.id;}this.event('select-window',{id:window.id});this.tell('Окно '+window.index+':'+window.name+'.');
    }
    windowTarget(target){
      if(!target)return {session:this.session(),window:this.window()};
      for(const session of this.state.sessions){const window=session.windows.find(w=>w.id===target);if(window)return {session,window};}
      let session,name=target;
      if(target.includes(':')){const parts=target.split(':');if(parts.length!==2)fail('Цель окна: сессия:индекс.');session=parts[0]?this.session(parts[0]):this.session();name=parts[1];}else session=this.session();
      const candidates=session.windows.filter(w=>String(w.index)===name||w.name===name);if(candidates.length!==1)fail('Окно не найдено или имя неоднозначно.');return {session,window:candidates[0]};
    }
    paneTarget(target){
      if(!target){const session=this.session(),window=this.window();return {session,window,pane:this.pane(window)};}
      for(const session of this.state.sessions)for(const window of session.windows){const pane=window.panes.find(p=>p.id===target);if(pane)return {session,window,pane};}
      let window,session,index;
      if(target.includes('.')){const parts=target.split('.');if(parts.length!==2)fail('Цель панели: сессия:окно.индекс.');({session,window}=this.windowTarget(parts[0]));index=parts[1];}
      else{session=this.session();window=this.window();index=target;}
      if(!/^\d+$/.test(index))fail('Укажите %ID или числовой индекс панели.');const id=leaves(window.tree)[Number(index)],pane=window.panes.find(p=>p.id===id);if(!pane)fail('Панель не найдена.');return {session,window,pane};
    }
    split(axis,target){const {window,pane}=this.paneTarget(target);if(window.panes.length>=8)fail('В модели доступно до восьми панелей на окно.');const rect=rectangles(window.tree).find(r=>r.id===pane.id);if((axis==='x'?rect.w:rect.h)/2<12)fail('Панель слишком мала для нового разделения в учебной геометрии.');const next=this.createPane();window.panes.push(next);window.tree=changeLeaf(window.tree,pane.id,{axis,ratio:.5,first:{pane:pane.id},second:{pane:next.id}});window.activePane=next.id;window.zoom=false;window.layout='custom';this.event('split',{axis,id:next.id});this.tell(axis==='x'?'Панели расположены рядом.':'Панели расположены сверху и снизу.');}
    focus(direction){
      const w=this.window(),rects=rectangles(w.tree),active=rects.find(r=>r.id===w.activePane);let target;
      if(direction==='next'){const ids=leaves(w.tree);target=ids[(ids.indexOf(w.activePane)+1)%ids.length];}
      else{
        const horizontal=['L','R'].includes(direction),positive=['R','D'].includes(direction),axis=horizontal?'x':'y',size=horizontal?'w':'h',cross=horizontal?'y':'x',crossSize=horizontal?'h':'w';
        const center=active[axis]+active[size]/2;
        const candidates=rects.filter(r=>r.id!==active.id&&(positive?r[axis]+r[size]/2>center:r[axis]+r[size]/2<center)&&Math.min(r[cross]+r[crossSize],active[cross]+active[crossSize])>Math.max(r[cross],active[cross])+0.001);
        candidates.sort((a,b)=>Math.abs(a[axis]+a[size]/2-center)-Math.abs(b[axis]+b[size]/2-center));target=candidates[0]?.id;
      }
      if(!target){this.tell('В этом направлении нет соседней панели.');return;}w.activePane=target;this.event('select-pane',{id:target});this.tell('Активна панель '+target+'.');
    }
    layout(name){const w=this.window(),names=['even-horizontal','even-vertical','tiled'];if(!names.includes(name))fail('В модели доступны even-horizontal, even-vertical, tiled.');const ids=leaves(w.tree);w.tree=name==='tiled'?tiled(ids):even(ids,name==='even-horizontal'?'x':'y');w.zoom=false;w.layout=name;this.event('layout',{name});this.tell('Раскладка: '+name+'.');}
    killWindow(session,window){
      session.windows=session.windows.filter(w=>w.id!==window.id);
      if(!session.windows.length){this.state.sessions=this.state.sessions.filter(s=>s.id!==session.id);if(this.state.attached===session.id)this.state.attached=null;}
      else if(session.currentWindow===window.id){session.currentWindow=session.windows[0].id;session.lastWindow=null;}
      if(session.lastWindow===window.id)session.lastWindow=null;this.clearMode();this.event('kill-window',{id:window.id});
    }
    killPane(id){const {session,window,pane}=this.paneTarget(id);if(window.panes.length===1)this.killWindow(session,window);else{window.tree=removeLeaf(window.tree,pane.id);window.panes=window.panes.filter(p=>p.id!==pane.id);if(window.activePane===pane.id)window.activePane=leaves(window.tree)[0];window.zoom=false;window.layout='custom';this.clearMode();}this.event('kill-pane',{id});this.tell('Учебная панель '+id+' закрыта. На компьютере ничего не завершалось.');}
    breakPane(){const session=this.session(),w=this.window(),pane=this.pane(w);if(w.panes.length===1)fail('Нельзя вынести единственную панель окна.');if(session.windows.length>=8)fail('Достигнут лимит окон.');w.tree=removeLeaf(w.tree,pane.id);w.panes=w.panes.filter(p=>p.id!==pane.id);w.activePane=leaves(w.tree)[0];w.zoom=false;w.layout='custom';const next=this.createWindow(session,'shell',pane);this.selectWindow(next,session);this.event('break-pane',{id:pane.id});this.tell('Панель перенесена в отдельное окно без потери текста.');}
    output(text){const box=this.state.attached?this.pane():this.state.outside;box.lines.push(...String(text).split('\n'));box.lines=box.lines.slice(-60);}
    command(source){return this.transaction(()=>this.runCommand(source));}
    runCommand(source){
      const args=words(source);if(!args.length)return;const first=args.shift(),cmd=aliases[first]||first;
      const read=(allowed={})=>options(args,allowed);const noRest=rest=>{if(rest.length)fail('Лишние аргументы. Произвольные программы внутри tmux не запускаются.');};
      if(cmd==='new-session'){const {flags,rest}=read({s:true,n:true,d:false});noRest(rest);this.newSession(flags.s||String(this.state.nextSession),!!flags.d,flags.n||'shell');}
      else if(cmd==='attach-session'){const {flags,rest}=read({t:true});noRest(rest);if(this.state.attached)fail('Вы уже подключены. Используйте switch-client или сначала detach.');this.attach(flags.t);}
      else if(cmd==='detach-client'){const {rest}=read();noRest(rest);this.detach();}
      else if(cmd==='list-sessions'){const {rest}=read();noRest(rest);const result=this.state.sessions.map(s=>s.name+': '+s.windows.length+' окон'+(this.state.attached===s.id?' (подключена)':'')).join('\n')||'Нет учебных сессий.';this.output(result);this.event('list-sessions');this.tell('Список учебных сессий выведен.');}
      else if(cmd==='new-window'){
        const {flags,rest}=read({n:true,t:true,d:false});noRest(rest);const session=flags.t?this.session(flags.t.replace(/:$/,'')):this.session();const window=this.createWindow(session,flags.n||'shell');if(!flags.d)this.selectWindow(window,session);this.event('new-window',{id:window.id});this.tell('Создано окно '+window.index+':'+window.name+'.');
      }else if(cmd==='rename-window'||cmd==='rename-session'){
        const {flags,rest}=read({t:true});if(rest.length!==1||!nameOK(rest[0]))fail('Укажите имя: 1–24 буквы, цифры, _ или -.');
        if(cmd==='rename-window'){this.windowTarget(flags.t).window.name=rest[0];this.event('rename-window');}
        else{const session=flags.t?this.session(flags.t):this.session();if(this.state.sessions.some(s=>s.id!==session.id&&s.name===rest[0]))fail('Сессия с этим именем уже есть.');session.name=rest[0];this.event('rename-session');}this.tell('Имя изменено на '+rest[0]+'.');
      }else if(cmd==='next-window'||cmd==='previous-window'||cmd==='last-window'){
        const {rest}=read();noRest(rest);const s=this.session(),index=s.windows.findIndex(w=>w.id===s.currentWindow);const w=cmd==='last-window'?s.windows.find(w=>w.id===s.lastWindow):s.windows[(index+(cmd==='next-window'?1:s.windows.length-1))%s.windows.length];if(!w)fail('Предыдущее окно пока не задано.');this.selectWindow(w,s);
      }else if(cmd==='select-window'){const {flags,rest}=read({t:true});noRest(rest);if(!flags.t)fail('Укажите -t индекс окна.');const {session,window}=this.windowTarget(flags.t);if(this.state.attached!==session.id)fail('Сначала подключитесь к целевой сессии.');this.selectWindow(window,session);}
      else if(cmd==='split-window'){const {flags,rest}=read({h:false,v:false,t:true});noRest(rest);if(flags.h&&flags.v)fail('Выберите -h или -v.');this.split(flags.h?'x':'y',flags.t);}
      else if(cmd==='select-pane'){const {flags,rest}=read({L:false,R:false,U:false,D:false,t:true});noRest(rest);const directions=['L','R','U','D'].filter(d=>flags[d]);if(directions.length>1||directions.length&&flags.t)fail('Выберите одно направление или одну цель.');if(flags.t){const {window,pane}=this.paneTarget(flags.t);if(window.id!==this.window().id)fail('Сначала выберите окно целевой панели.');window.activePane=pane.id;this.event('select-pane',{id:pane.id});this.tell('Активна панель '+pane.id+'.');}else this.focus(directions[0]||'next');}
      else if(cmd==='resize-pane'){const {flags,rest}=read({Z:false});noRest(rest);if(!flags.Z)fail('В модели resize-pane поддерживает только -Z (zoom).');const w=this.window();w.zoom=!w.zoom;this.event('zoom',{enabled:w.zoom});this.tell(w.zoom?'Панель временно развёрнута.':'Обычная раскладка восстановлена.');}
      else if(cmd==='select-layout'){const {flags,rest}=read();if(rest.length!==1)fail('Укажите название раскладки.');this.layout(rest[0]);}
      else if(cmd==='next-layout'){const {rest}=read();noRest(rest);const names=['even-horizontal','even-vertical','tiled'],index=names.indexOf(this.window().layout);this.layout(names[(index+1)%names.length]);}
      else if(cmd==='kill-pane'){const {flags,rest}=read({t:true});noRest(rest);this.killPane(this.paneTarget(flags.t).pane.id);}
      else if(cmd==='kill-window'){const {flags,rest}=read({t:true});noRest(rest);const {session,window}=this.windowTarget(flags.t);this.killWindow(session,window);this.tell('Учебное окно закрыто.');}
      else if(cmd==='kill-session'){const {flags,rest}=read({t:true});noRest(rest);const s=flags.t?this.session(flags.t):this.session();this.state.sessions=this.state.sessions.filter(item=>item.id!==s.id);if(this.state.attached===s.id)this.state.attached=null;this.clearMode();this.event('kill-session',{id:s.id});this.tell('Учебная сессия закрыта.');}
      else if(cmd==='switch-client'){const {flags,rest}=read({t:true});noRest(rest);this.session();if(!flags.t)fail('Укажите -t имя сессии.');this.attach(flags.t);}
      else if(cmd==='break-pane'){const {rest}=read();noRest(rest);this.breakPane();}
      else if(cmd==='list-windows'){const {flags,rest}=read({t:true});noRest(rest);const s=flags.t?this.session(flags.t):this.session();this.output(s.windows.map(w=>w.index+':'+w.name+(w.id===s.currentWindow?'*':'')+' ('+w.panes.length+' панелей)').join('\n'));this.event('list-windows');this.tell('Окна перечислены.');}
      else if(cmd==='list-panes'){const {rest}=read();noRest(rest);const w=this.window();this.output(leaves(w.tree).map((id,n)=>n+': '+id+(id===w.activePane?' (активна)':'')).join('\n'));this.event('list-panes');this.tell('Панели перечислены.');}
      else if(cmd==='list-keys'){const {rest}=read();noRest(rest);this.output(HELP);this.event('help');this.tell('Учебная памятка выведена.');}
      else if(cmd==='copy-mode'){const {rest}=read();noRest(rest);this.window();this.state.mode='copy';this.state.copyOffset=0;this.event('copy-enter');this.tell('Просмотр истории: Up/PageUp, Down/PageDown. Выход q или Esc.');}
      else fail('Команда tmux '+cmd+' не поддерживается. Смотрите памятку.');
    }
    submit(text=this.getInput()){
      return this.transaction(()=>{
        if(typeof text!=='string'||text.length>1000||/[\r\n\0]/.test(text))fail('Введите одну строку до 1000 символов.');
        const mode=this.state.mode;
        if(['prompt','rename-window','rename-session'].includes(mode)){
          this.state.mode='normal';this.state.prompt='';if(mode==='prompt'){this.runCommand(text);this.event('prompt-command');}else{if(!nameOK(text))fail('Имя: 1–24 буквы, цифры, _ или -.');this.runCommand((mode==='rename-window'?'rename-window ':'rename-session ')+text);}return;
        }
        if(mode!=='normal')fail('В этом режиме используйте экранные клавиши или Esc.');
        const args=words(text);if(!args.length)return;const box=this.state.attached?this.pane():this.state.outside;box.input='';this.output('$ '+text);
        if(args[0]==='tmux'){this.runCommand(text.slice(text.indexOf('tmux')+4).trim()||'new-session');return;}
        if(args[0]==='echo')this.output(args.slice(1).join(' '));
        else if(args[0]==='pwd'&&args.length===1)this.output('/home/student');
        else if(args[0]==='whoami'&&args.length===1)this.output('student');
        else if(args[0]==='clear'&&args.length===1)box.lines=[];
        else if(args[0]==='help'&&args.length===1)this.output(HELP);
        else if(args[0]==='demo-log'&&args.length===1)this.output(Array.from({length:30},(_,i)=>'Журнал '+String(i+1).padStart(2,'0')+' · учебное событие').join('\n'));
        else fail('Это учебная оболочка: доступны echo, pwd, whoami, clear, help, demo-log и tmux. Программы ОС не запускаются.');
        this.tell('Учебная команда выполнена.');
      });
    }
    getInput(){if(['prompt','rename-window','rename-session'].includes(this.state.mode))return this.state.prompt;if(this.state.mode!=='normal')return '';return this.state.attached?this.pane().input:this.state.outside.input;}
    setInput(value){if(typeof value!=='string'||value.length>1000||/[\r\n\0]/.test(value))return false;if(['prompt','rename-window','rename-session'].includes(this.state.mode))this.state.prompt=value;else if(this.state.mode==='normal'){const box=this.state.attached?this.pane():this.state.outside;box.input=value;}return true;}
    choose(index){return this.transaction(()=>{if(this.state.mode!=='choose-session')fail('Сначала откройте список сессий.');const session=this.state.sessions[index];if(!session)fail('Сессия не найдена.');this.attach(session.id);this.event('choose-session');});}
    key(key){const prefixed=this.state.prefix;const ok=this.transaction(()=>this.keyAction(key));if(!ok&&prefixed)this.state.prefix=false;return ok;}
    keyAction(key){
      const s=this.state;
      if(key==='Escape'){this.clearMode();this.tell('Режим или незавершённый префикс отменён.');return;}
      if(s.mode==='confirm'){
        if(key.toLowerCase()==='y'){const id=s.confirmPane;this.killPane(id);}else if(key.toLowerCase()==='n'){this.clearMode();this.tell('Закрытие панели отменено.');}else this.tell('Подтвердите y или отмените n/Esc.',true);return;
      }
      if(s.mode==='choose-session'){
        if(['ArrowDown','j'].includes(key))s.choice=(s.choice+1)%s.sessions.length;
        else if(['ArrowUp','k'].includes(key))s.choice=(s.choice+s.sessions.length-1)%s.sessions.length;
        else if(key==='Enter'){const target=s.sessions[s.choice];this.attach(target.id);this.event('choose-session');}
        else this.tell('Выберите сессию стрелками и Enter, выход Esc.',true);return;
      }
      if(s.mode==='help'){if(key==='q')this.clearMode();else this.tell('Учебная памятка открыта. Выход — q или Esc.');return;}
      if(s.mode==='copy'){
        if(key==='q'){this.clearMode();this.event('copy-exit');this.tell('Вы вернулись из истории к вводу.');}
        else if(['ArrowUp','PageUp','ArrowDown','PageDown'].includes(key)){const delta=key==='ArrowUp'?1:key==='PageUp'?8:key==='ArrowDown'?-1:-8;s.copyOffset=Math.max(0,Math.min(Math.max(0,this.pane().lines.length-8),s.copyOffset+delta));this.event('copy-scroll');this.tell('История: смещение '+s.copyOffset+' строк.');}
        else this.tell('В модели истории доступны Up/Down/PageUp/PageDown и q/Esc; выделение и буфер копирования не моделируются.',true);return;
      }
      if(['prompt','rename-window','rename-session'].includes(s.mode)){
        if(key==='Enter')this.submit(s.prompt);else if(key==='Backspace')s.prompt=Array.from(s.prompt).slice(0,-1).join('');else if(Array.from(key).length===1&&s.prompt.length<1000)s.prompt+=key;else this.tell('Введите текст, затем Enter; отмена Esc.',true);return;
      }
      if(key==='Ctrl-b'){
        this.session();if(s.prefix){s.prefix=false;this.event('send-prefix');this.tell('Ctrl+B передан учебной оболочке; это не новая команда tmux.');}else{s.prefix=true;this.event('prefix');this.tell('Префикс активен. Отпустите Ctrl, затем нажмите клавишу команды.');}return;
      }
      if(s.prefix){
        s.prefix=false;
        const commands={c:'new-window',n:'next-window',p:'previous-window',l:'last-window','%':'split-window -h','"':'split-window -v',o:'select-pane',ArrowLeft:'select-pane -L',ArrowRight:'select-pane -R',ArrowUp:'select-pane -U',ArrowDown:'select-pane -D',z:'resize-pane -Z',' ':'next-layout',d:'detach-client','!':'break-pane','[':'copy-mode'};
        if(key in commands){this.runCommand(commands[key]);return;}
        if(/^\d$/.test(key)){this.runCommand('select-window -t '+key);return;}
        if(key===','||key==='$'||key===':'){s.mode=key===','?'rename-window':key==='$'?'rename-session':'prompt';s.prompt='';this.tell(key===','?'Новое имя окна и Enter.':key==='$'?'Новое имя сессии и Enter.':'Команда tmux без начального tmux, затем Enter.');return;}
        if(key==='x'){s.mode='confirm';s.confirmPane=this.pane().id;this.tell('Закрыть учебную панель '+s.confirmPane+'? (y/n)');return;}
        if(key==='s'){s.mode='choose-session';s.choice=s.sessions.findIndex(item=>item.id===s.attached);this.tell('Выберите сессию стрелками, затем Enter.');return;}
        if(key==='?'){s.mode='help';this.event('help');this.tell('Справка открыта. Выход — q или Esc.');return;}
        this.tell('После префикса клавиша '+key+' не поддерживается в модели.',true);return;
      }
      if(key==='Enter'){this.submit();return;}
      if(key==='Backspace'){this.setInput(Array.from(this.getInput()).slice(0,-1).join(''));return;}
      if(Array.from(key).length===1){this.setInput(this.getInput()+key);return;}
      this.tell('Команды tmux требуют Ctrl+B. Tab выводит фокус из поля.',true);
    }
    feed(notation){
      const tokens={'<C-b>':'Ctrl-b','<Enter>':'Enter','<CR>':'Enter','<Esc>':'Escape','<Up>':'ArrowUp','<Down>':'ArrowDown','<Left>':'ArrowLeft','<Right>':'ArrowRight','<PageUp>':'PageUp','<PageDown>':'PageDown','<Space>':' '};
      let rest=notation;while(rest){const token=Object.keys(tokens).find(t=>rest.startsWith(t));if(token){this.key(tokens[token]);rest=rest.slice(token.length);}else{const char=Array.from(rest)[0];this.key(char);rest=rest.slice(char.length);}}return this;
    }
    snapshot(){return copy(this.state);}
    validate(){
      const s=this.state;if(!s||!Array.isArray(s.sessions)||s.sessions.length>5)fail('Некорректные сессии.');
      const sessionIds=new Set(),names=new Set(),windowIds=new Set(),paneIds=new Set();let total=0;
      const textOK=value=>typeof value==='string'&&value.length<=1000&&!/[\r\n\0]/.test(value);
      const boxOK=box=>box&&Array.isArray(box.lines)&&box.lines.length<=60&&box.lines.every(value=>typeof value==='string'&&value.length<=1200&&!/[\r\n\0]/.test(value))&&textOK(box.input);
      for(const session of s.sessions){
        if(!session||!/^\$\d+$/.test(session.id)||sessionIds.has(session.id)||!nameOK(session.name)||names.has(session.name)||!Array.isArray(session.windows)||!session.windows.length||session.windows.length>8)fail('Некорректная сессия.');sessionIds.add(session.id);names.add(session.name);
        const indexes=new Set();for(const w of session.windows){
          if(!w||!/^@\d+$/.test(w.id)||windowIds.has(w.id)||!Number.isInteger(w.index)||w.index<0||w.index>99||indexes.has(w.index)||!nameOK(w.name)||!Array.isArray(w.panes)||!w.panes.length||w.panes.length>8||typeof w.zoom!=='boolean'||!['custom','even-horizontal','even-vertical','tiled'].includes(w.layout))fail('Некорректное окно.');windowIds.add(w.id);indexes.add(w.index);
          const local=new Set();for(const pane of w.panes){if(!pane||!/^%\d+$/.test(pane.id)||paneIds.has(pane.id)||!boxOK(pane)||pane.cwd!=='/home/student')fail('Некорректная панель.');paneIds.add(pane.id);local.add(pane.id);total+=pane.lines.join('').length+pane.input.length;}
          if(!local.has(w.activePane))fail('Нет активной панели.');
          const seen=[];const visit=(n,depth=0)=>{if(!n||typeof n!=='object'||depth>8)fail('Некорректное дерево панелей.');if('pane' in n){if(!local.has(n.pane)||seen.includes(n.pane))fail('Лист дерева не соответствует панели.');seen.push(n.pane);}else{if(!['x','y'].includes(n.axis)||typeof n.ratio!=='number'||!Number.isFinite(n.ratio)||n.ratio<.01||n.ratio>.99)fail('Некорректное разделение.');visit(n.first,depth+1);visit(n.second,depth+1);}};visit(w.tree);if(seen.length!==w.panes.length)fail('Не все панели включены в дерево.');
        }
        if(!session.windows.some(w=>w.id===session.currentWindow)||!(session.lastWindow===null||session.windows.some(w=>w.id===session.lastWindow)))fail('Некорректный указатель окна.');
      }
      if(total>1000000||!(s.attached===null||sessionIds.has(s.attached))||!boxOK(s.outside)||typeof s.prefix!=='boolean'||typeof s.error!=='boolean'||!textOK(s.prompt)||typeof s.message!=='string'||s.message.length>3000)fail('Некорректное состояние клиента.');
      if(!['normal','prompt','rename-window','rename-session','confirm','choose-session','copy','help'].includes(s.mode)||(!s.attached&&s.mode!=='normal')||!Number.isInteger(s.choice)||s.choice<0||!Number.isInteger(s.copyOffset)||s.copyOffset<0||s.copyOffset>60)fail('Некорректный режим клиента.');
      if(s.prefix&&!s.attached||s.mode==='choose-session'&&s.choice>=s.sessions.length)fail('Некорректный префикс или выбор сессии.');
      if(s.mode==='confirm'&&!paneIds.has(s.confirmPane))fail('Некорректная панель подтверждения.');
      if(!Array.isArray(s.events)||s.events.length>120||s.events.some(e=>!e||typeof e.type!=='string'))fail('Некорректные наблюдения.');
      for(const key of ['nextSession','nextWindow','nextPane'])if(!Number.isInteger(s[key])||s[key]<0||s[key]>1000000)fail('Некорректный счётчик.');
      if([...sessionIds].some(id=>Number(id.slice(1))>=s.nextSession)||[...windowIds].some(id=>Number(id.slice(1))>=s.nextWindow)||[...paneIds].some(id=>Number(id.slice(1))>=s.nextPane))fail('Счётчик конфликтует с существующим ID.');
    }
    static restore(snapshot){const model=new TmuxModel({empty:true});model.state=copy(snapshot);model.validate();return model;}
  }
  const api={TmuxModel,leaves,rectangles,HELP,words};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TmuxWorkshop=api;
})(typeof globalThis!=='undefined'?globalThis:this);
