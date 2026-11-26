/* Учебная модель терминала. Здесь нет eval, shell, HTTP-запросов или доступа
   к файловой системе компьютера. Все изменения происходят в обычных JS-данных.
   Поддерживается явно описанное подмножество команд, а не полноценный Bash. */
(function (root) {
  'use strict';
  const HOME = '/home/student';
  const MAX_NODES = 256, MAX_CONTENT = 64000;
  const clone = value => JSON.parse(JSON.stringify(value));
  class SimError extends Error {}
  const fail = message => { throw new SimError(message); };
  const basename = path => path.slice(path.lastIndexOf('/') + 1);
  const dirname = path => path.slice(0, path.lastIndexOf('/')) || '/';
  const isInside = (path, parent) => parent === '/' ? path.startsWith('/') : path === parent || path.startsWith(parent + '/');
  const lines = text => text ? text.replace(/\n$/, '').split('\n') : [];
  const HELP = {
    pwd:'pwd — показать текущий путь.',
    ls:'ls [-a] [-l] [путь] — содержимое папки, -a включает скрытые имена, -l показывает права.',
    cd:'cd [путь] — сменить папку. Без пути — домой. Поддерживаются ~, .., абсолютные пути.',
    mkdir:'mkdir [-p] папка... — создать папки; -p создаёт родительские каталоги.',
    touch:'touch файл... — создать пустые файлы; содержимое существующих сохраняется.',
    cat:'cat [файл...] — прочитать файлы; в конвейере без пути принимает входной текст.',
    cp:'cp [-r|-R] источник назначение — копировать файл или папку. Без шаблонов имён.',
    mv:'mv источник назначение — переименовать или переместить. Существующий файл может быть заменён.',
    rm:'rm [-r] [-f] путь... — удалить виртуальные файлы; -r включает папки. Отмены в терминале нет.',
    rmdir:'rmdir папка... — удалить только пустые папки.',
    echo:'echo [-n] текст... — вывести текст. > файл заменяет содержимое, >> файл дописывает.',
    head:'head [-n число] [файл] — первые строки, по умолчанию 10. Поддерживается вход из конвейера.',
    tail:'tail [-n число] [файл] — последние строки, по умолчанию 10. Поддерживается вход из конвейера.',
    grep:'grep [-i] [-n] [-v] [-F] текст [файл] — поиск строк. В этом симуляторе только буквальный текст, без регулярных выражений.',
    find:'find [папка] [-name "шаблон"] — поиск имён; поддерживаются * и ?. Шаблон заключайте в кавычки.',
    wc:'wc -l [файл] — посчитать символы перевода строки; в конвейере считает вход.',
    chmod:'chmod ПРАВА файл — права из трёх восьмеричных цифр, например 640. Символьные формы не поддерживаются.',
    apt:'apt list --installed; sudo apt update; sudo apt install [-y] пакет... — только учебная имитация. Доступны tree, nano, curl.',
    sudo:'sudo apt update|install ... — имитация прав для APT. Другие команды sudo не поддерживаются; пароль не нужен.',
    ps:'ps [aux] — показать условные процессы. Это не процессы компьютера.',
    kill:'kill [-15|-TERM] PID — завершить учебный процесс. Процессы 1 и 120 защищены в модели.',
    whoami:'whoami — показать учебное имя student.',
    clear:'clear — очистить только экран, без сброса файлов и прогресса.',
    help:'help [команда] — поддерживаемые команды и ограничения.',
    man:'man команда — короткая учебная справка, а не полная man-страница.',
    tree:'tree [папка] — дерево виртуальных файлов; сначала установите учебный пакет tree.'
  };

  // Лексер сохраняет кавычки как признак: строка "a|b" — один аргумент,
  // а отдельный | связывает команды. Подстановки, списки команд и фон запрещены.
  function tokenize(input) {
    if (typeof input !== 'string' || input.length > 2000) fail('Команда слишком длинная (до 2000 символов).');
    const tokens = []; let value = '', active = false, quoted = false, quote = null;
    const flush = () => { if (active) tokens.push({value, quoted, op:false}); value=''; active=false; quoted=false; };
    for (let i=0; i<input.length; i++) {
      const c = input[i];
      if (c==='\n' || c==='\r' || c==='\0') fail('Введите одну строку команды.');
      if (quote) {
        if (c===quote) { quote=null; continue; }
        if (c==='\\' && quote==='"' && ['"','\\','$','`'].includes(input[i+1])) {value+=input[++i];continue;}
        if (quote==='"' && (c==='$'||c==='`')) fail('Подстановки переменных и команд в симуляторе не поддерживаются.');
        value+=c; continue;
      }
      if (c==='"'||c==="'") {quote=c;active=true;quoted=true;continue;}
      if (c==='\\') {if(i+1===input.length)fail('После обратного слеша нужен символ.');value+=input[++i];active=true;quoted=true;continue;}
      if (/\s/.test(c)) {flush();continue;}
      if (';&<`$()'.includes(c)) fail('Здесь поддерживаются одна команда, |, > и >>. Подстановки и составные списки команд не поддерживаются.');
      if (c==='|'||c==='>') {flush();let op=c;if(c==='>'&&input[i+1]==='>'){op='>>';i++;}tokens.push({value:op,op:true});continue;}
      value+=c;active=true;
    }
    if (quote) fail('Кавычка не закрыта. Закройте строку тем же символом.');
    flush(); return tokens;
  }
  function parse(input) {
    const tokens=tokenize(input); if(!tokens.length)return null;
    const parts=[[]];let redirect=null;
    for(let i=0;i<tokens.length;i++) {
      const t=tokens[i];
      if(!t.op) {parts.at(-1).push(t);continue;}
      if(t.value==='|') {if(!parts.at(-1).length)fail('До | нужна команда.');parts.push([]);continue;}
      if(redirect || i+2!==tokens.length || !tokens[i+1] || tokens[i+1].op)fail('После > или >> укажите один файл в конце строки.');
      redirect={append:t.value==='>>',target:tokens[++i].value};
    }
    if(parts.some(p=>!p.length))fail('После | нужна команда.');
    if(parts.length>5)fail('Учебный конвейер поддерживает до пяти команд.');
    // Шаблоны разворачиваются только внутри find -name; другие не имитируются.
    for(const part of parts) for(const arg of part.slice(1)) if(!arg.quoted && /[*?\[\]]/.test(arg.value))fail('Шаблоны оболочки не поддерживаются. Для find -name заключите шаблон в кавычки.');
    return {parts:parts.map(p=>p.map(t=>t.value)),redirect};
  }
  function flags(args, allowed) {
    const set=new Set(),rest=[];let stop=false;
    for(const arg of args) {
      if(!stop && arg==='--'){stop=true;continue;}
      if(!stop && arg.startsWith('-') && arg!=='-') {
        if(arg.startsWith('--'))fail('Неизвестный параметр: '+arg);
        for(const c of arg.slice(1)) {if(!allowed.includes(c))fail('Неизвестный параметр: -'+c);set.add(c);}
      } else rest.push(arg);
    }
    return {set,rest};
  }
  function modeText(mode) {
    return [6,3,0].map(shift=>{const n=(mode>>shift)&7;return (n&4?'r':'-')+(n&2?'w':'-')+(n&1?'x':'-');}).join('');
  }
  class Terminal {
    constructor(seed={}) {
      const fs=Object.create(null);
      for(const path of ['/','/home',HOME,HOME+'/Documents',HOME+'/Downloads','/etc'])fs[path]={type:'dir',mode:0o755};
      const files={
        [HOME+'/readme.txt']:'Добро пожаловать в Ubuntu-мастерскую!\nВсе файлы здесь виртуальные.\nНачните с pwd и ls.\n',
        [HOME+'/.profile']:'# Учебный профиль student\n',
        [HOME+'/Documents/notes.txt']:'Ubuntu\nтерминал\nпрактика\n',
        [HOME+'/Documents/events.log']:'INFO start\nERROR connection\nINFO ready\nERROR timeout\nINFO done\n',
        [HOME+'/Documents/todo.txt']:'Прочитать урок\nВыполнить задание\nПроверить результат\n',
        ['/etc/os-release']:'NAME="Ubuntu"\nPRETTY_NAME="Ubuntu (учебная модель)"\n'
      };
      for(const [path,content]of Object.entries(files))fs[path]={type:'file',mode:0o644,content};
      this.state={fs,cwd:HOME,previous:HOME,packages:['bash','coreutils'],updated:false,processes:[{pid:1,name:'systemd'},{pid:120,name:'terminal'},{pid:450,name:'demo-worker'}],events:[]};
      for(const [relative,node] of Object.entries(seed)) {
        const path=this.resolve(relative);
        if(!isInside(path,HOME))fail('Некорректное начальное состояние.');
        fs[path]=clone(node);
      }
      this.validate();
    }
    resolve(path='.') {
      if(typeof path!=='string'||!path||path.length>1024||/[\0\r\n]/.test(path))fail('Некорректный путь.');
      if(path==='~')path=HOME;else if(path.startsWith('~/'))path=HOME+path.slice(1);
      else if(path.startsWith('~'))fail('Поддерживается только домашний путь ~ текущего пользователя.');
      const result=[];
      for(const part of (path.startsWith('/')?path:this.state.cwd+'/'+path).split('/')) {
        if(part==='..')result.pop();else if(part && part!=='.')result.push(part);
      }
      return '/'+result.join('/');
    }
    node(path,type) {
      // Проверяем проход к узлу: у каталогов нужен бит x владельца.
      const parts=path.split('/').filter(Boolean);let current='';
      for(const part of parts.slice(0,-1)){current+='/'+part;const n=this.state.fs[current];if(!n)fail(current+': нет такого каталога');if(n.type!=='dir')fail(current+': не каталог');if(!(n.mode&0o100))fail(current+': нет права прохода (x)');}
      const n=this.state.fs[path];if(!n)fail(path+': нет такого файла или каталога');
      if(type && n.type!==type)fail(path+(type==='dir'?': не каталог':': это каталог'));
      return n;
    }
    writable(path,existing=false) {
      if(!isInside(path,HOME)||path===HOME)fail('В модели изменения доступны только внутри /home/student.');
      const parent=this.node(dirname(path),'dir');
      if(!(parent.mode&0o200)||!(parent.mode&0o100))fail(dirname(path)+': нет права записи/прохода');
      if(existing && this.state.fs[path] && !(this.state.fs[path].mode&0o200))fail(path+': нет права записи (w)');
    }
    read(path) {const n=this.node(path,'file');if(!(n.mode&0o400))fail(path+': нет права чтения (r)');return n.content;}
    write(path,content,append=false) {
      this.writable(path,true);if(this.state.fs[path]?.type==='dir')fail(path+': это каталог');
      const result=(append?(this.state.fs[path]?.content||''):'')+content;
      if(result.length>MAX_CONTENT)fail('Учебный файл ограничен 64000 символами.');
      if(!this.state.fs[path]&&Object.keys(this.state.fs).length>=MAX_NODES)fail('Достигнут лимит виртуальных файлов.');
      this.state.fs[path]={type:'file',mode:this.state.fs[path]?.mode??0o644,content:result};
    }
    event(type, data={}) {this.state.events.push({type,...data});this.state.events=this.state.events.slice(-200);}
    children(path) {this.node(path,'dir');return Object.keys(this.state.fs).filter(p=>p!=='/'&&dirname(p)===path).sort();}
    validate() {
      const s=this.state;
      if(!s || typeof s.fs!=='object' || Array.isArray(s.fs) || !s.fs || Object.keys(s.fs).length>MAX_NODES)fail('Некорректная виртуальная файловая система.');
      let total=0;
      for(const [path,n]of Object.entries(s.fs)) {
        if(!path.startsWith('/')||this.resolve(path)!==path||!n||!['dir','file'].includes(n.type)||!Number.isInteger(n.mode)||n.mode<0||n.mode>0o777)fail('Некорректный виртуальный узел.');
        if(path!=='/'&&s.fs[dirname(path)]?.type!=='dir')fail('Отсутствует родительская папка.');
        if(n.type==='file'){if(typeof n.content!=='string'||n.content.length>MAX_CONTENT)fail('Некорректное содержимое файла.');total+=n.content.length;}
      }
      if(total>1000000 || s.fs['/']?.type!=='dir' || s.fs[HOME]?.type!=='dir' || s.fs[s.cwd]?.type!=='dir' || this.resolve(s.cwd)!==s.cwd || typeof s.previous!=='string')fail('Некорректное состояние папок.');
      if(!Array.isArray(s.packages)||s.packages.some(p=>!['bash','coreutils','tree','nano','curl'].includes(p))||typeof s.updated!=='boolean')fail('Некорректное состояние пакетов.');
      if(!Array.isArray(s.processes)||s.processes.length>20||s.processes.some(p=>!Number.isInteger(p.pid)||typeof p.name!=='string'||p.name.length>100))fail('Некорректное состояние процессов.');
      if(!Array.isArray(s.events)||s.events.length>200||s.events.some(e=>!e||typeof e.type!=='string'))fail('Некорректная история действий.');
    }
    snapshot(){return clone(this.state);}
    static restore(snapshot){const terminal=new Terminal();terminal.state=clone(snapshot);terminal.validate();terminal.state.fs=Object.assign(Object.create(null),terminal.state.fs);return terminal;}
    run(input) {
      // Учебная строка атомарна: при ошибке возвращаем прежнее состояние.
      const before=this.snapshot();
      try {
        const parsed=parse(input);if(!parsed)return {output:'',error:false,empty:true};
        let output='',status=0;
        for(let i=0;i<parsed.parts.length;i++) {
          const part=parsed.parts[i];
          if(parsed.parts.length>1 && !['cat','head','tail','grep','wc','echo','pwd','ls','find','ps','whoami'].includes(part[0]))fail('Эта команда не поддерживается в учебном конвейере.');
          const result=this.command(part[0],part.slice(1),i?output:null);
          output=result.output;status=result.status||0;
          if(output.length>64000)fail('Учебный вывод ограничен 64000 символами. Уточните команду.');
        }
        if(parsed.parts.length>1)this.event('pipeline',{output,commands:parsed.parts.map(p=>p[0])});
        if(parsed.redirect){this.write(this.resolve(parsed.redirect.target),output,parsed.redirect.append);output='';}
        this.validate();return {output,error:false,status,clear:parsed.parts[0][0]==='clear'};
      } catch(error) {this.state=before;return {output:error instanceof SimError ? error.message : 'Не удалось выполнить команду в симуляторе.',error:true,status:1};}
    }
    command(name,args,stdin) {
      const out=output=>({output,status:0});
      const arity=(min,max=min)=>{if(args.length<min||args.length>max)fail('Использование: '+(HELP[name]||name));};
      const inputFile=rest=>{if(rest.length>1)fail('В этой команде поддерживается один файл.');if(rest.length)return this.read(this.resolve(rest[0]));if(stdin!==null)return stdin;fail('Укажите файл или передайте текст через |.');};
      if(args.includes('--help')){if(args.length!==1)fail('Используйте '+name+' --help отдельно.');if(!HELP[name])fail(name+': команда не поддерживается');this.event('help',{name});return out(HELP[name]+'\n');}
      switch(name) {
        case 'pwd':arity(0);this.event('pwd',{path:this.state.cwd});return out(this.state.cwd+'\n');
        case 'whoami':arity(0);return out('student\n');
        case 'clear':arity(0);return out('');
        case 'help': case 'man':{
          if(name==='man')arity(1);else arity(0,1);
          if(args[0]&&!HELP[args[0]])fail(args[0]+': учебной справки нет');
          this.event('help',{name:args[0]||'all'});
          return out(args[0]?HELP[args[0]]+'\n':'Учебные команды:\n'+Object.keys(HELP).join('  ')+'\n\nОдна строка за раз. Кавычки, пробелы, |, > и >> поддерживаются. Это симулятор, не Bash.\n');
        }
        case 'cd':{
          arity(0,1);const path=args[0]==='-'?this.state.previous:this.resolve(args[0]||'~');const node=this.node(path,'dir');if(!(node.mode&0o100))fail(path+': нет права прохода (x)');
          this.state.previous=this.state.cwd;this.state.cwd=path;this.event('cd',{path});return out(args[0]==='-'?path+'\n':'');
        }
        case 'ls':{
          const {set,rest}=flags(args,'al');if(rest.length>1)fail('В ls поддерживается один путь.');const path=this.resolve(rest[0]||'.');const n=this.node(path);
          if(!(n.mode&0o400))fail(path+': нет права чтения (r)');
          const list=n.type==='dir'?this.children(path).filter(p=>set.has('a')||!basename(p).startsWith('.')):[path];
          this.event('ls',{path,hidden:set.has('a'),long:set.has('l')});
          return out(list.map(p=>{const e=this.state.fs[p];const label=(n.type==='dir'?basename(p):rest[0])+(e.type==='dir'?'/':'');return set.has('l')?(e.type==='dir'?'d':'-')+modeText(e.mode)+'  student  '+String(e.content?.length||0).padStart(5)+'  '+label:label;}).join(set.has('l')?'\n':'  ')+(list.length?'\n':''));
        }
        case 'mkdir':{
          const {set,rest}=flags(args,'p');if(!rest.length)fail('mkdir: укажите папку');
          for(const raw of rest){const path=this.resolve(raw);if(this.state.fs[path]){if(set.has('p')&&this.state.fs[path].type==='dir')continue;fail(path+': уже существует');}
            const targets=set.has('p')?path.split('/').slice(1).map((_,i)=>'/'+path.split('/').slice(1,i+2).join('/')):[path];
            for(const target of targets){if(this.state.fs[target]){this.node(target,'dir');continue;}this.writable(target);if(Object.keys(this.state.fs).length>=MAX_NODES)fail('Достигнут лимит виртуальных файлов.');this.state.fs[target]={type:'dir',mode:0o755};}
          }return out('');
        }
        case 'touch':{
          const {rest}=flags(args,'');if(!rest.length)fail('touch: укажите файл');for(const raw of rest){const path=this.resolve(raw);this.writable(path,true);if(!this.state.fs[path])this.write(path,'');}return out('');
        }
        case 'cat':{
          const {rest}=flags(args,'');if(!rest.length){if(stdin===null)fail('cat: укажите файл');return out(stdin);}let text='';for(const raw of rest){const path=this.resolve(raw);text+=this.read(path);this.event('read',{path,command:'cat'});}return out(text);
        }
        case 'echo':{let values=args;let newline=true;if(values[0]==='-n'){values=values.slice(1);newline=false;}return out(values.join(' ')+(newline?'\n':''));}
        case 'cp':case 'mv':{
          const {set,rest}=flags(args,name==='cp'?'rR':'');if(rest.length!==2)fail(name+': укажите источник и назначение');
          const source=this.resolve(rest[0]);const n=this.node(source);let target=this.resolve(rest[1]);if(this.state.fs[target]?.type==='dir')target+=(target==='/'?'':'/')+basename(source);
          if(source===target)fail('Источник и назначение совпадают.');
          if(isInside(target,source))fail('Нельзя поместить папку внутрь самой себя.');
          if(n.type==='dir'&&name==='cp'&&!set.has('r')&&!set.has('R'))fail('Для копирования папки нужен cp -r.');
          if(this.state.fs[target]?.type==='dir'||(this.state.fs[target]&&n.type==='dir'))fail('Слияние существующих папок не поддерживается в модели.');
          this.writable(target,true);
          if(name==='mv'){this.writable(source);if(isInside(this.state.cwd,source))fail('Сначала выйдите из перемещаемой папки.');}
          const paths=Object.keys(this.state.fs).filter(p=>p===source||(n.type==='dir'&&isInside(p,source)));
          if(Object.keys(this.state.fs).length+(name==='cp'?paths.length:0)>MAX_NODES)fail('Достигнут лимит виртуальных файлов.');
          for(const path of paths){const item=this.node(path);if(item.type==='file')this.read(path);else if(!(item.mode&0o100)||!(item.mode&0o400))fail(path+': недостаточно прав');}
          for(const path of paths)this.state.fs[target+path.slice(source.length)]=clone(this.state.fs[path]);
          if(name==='mv')for(const path of paths)delete this.state.fs[path];
          return out('');
        }
        case 'rm':case 'rmdir':{
          const {set,rest}=flags(args,name==='rm'?'rf':'');if(!rest.length)fail(name+': укажите путь');
          for(const raw of rest){const path=this.resolve(raw);if(!this.state.fs[path]&&set.has('f'))continue;const n=this.node(path);this.writable(path);
            if(isInside(this.state.cwd,path))fail('Сначала выйдите из удаляемой папки.');
            if(name==='rmdir'){if(n.type!=='dir')fail(path+': не каталог');if(this.children(path).length)fail(path+': каталог не пуст');}
            else if(n.type==='dir'&&!set.has('r'))fail('Для удаления папки нужен rm -r.');
            for(const p of Object.keys(this.state.fs))if(p===path||(n.type==='dir'&&isInside(p,path)))delete this.state.fs[p];
          }return out('');
        }
        case 'head':case 'tail':{
          let count=10,rest=args;if(args[0]==='-n'){if(!/^\d+$/.test(args[1]||''))fail('После -n нужно неотрицательное число.');count=Number(args[1]);rest=args.slice(2);}else if(args[0]?.startsWith('-'))fail('Поддерживается формат -n число.');
          const value=inputFile(rest),all=lines(value);const selected=name==='head'?all.slice(0,count):(count?all.slice(-count):[]);
          this.event(name,{path:rest.length?this.resolve(rest[0]):null,count,output:selected.join('\n')});return out(selected.length?selected.join('\n')+((value.endsWith('\n')||(name==='head'&&selected.length<all.length))?'\n':''):'');
        }
        case 'grep':{
          const {set,rest}=flags(args,'invF');if(rest.length<1||rest.length>2)fail('grep: укажите текст поиска и, при необходимости, один файл');
          const pattern=set.has('i')?rest[0].toLowerCase():rest[0];const value=inputFile(rest.slice(1));const selected=lines(value).map((line,i)=>({line,i})).filter(({line})=>{const found=(set.has('i')?line.toLowerCase():line).includes(pattern);return set.has('v')?!found:found;});
          const output=selected.map(({line,i})=>(set.has('n')?(i+1)+':':'')+line).join('\n')+(selected.length?'\n':'');
          this.event('grep',{path:rest[1]?this.resolve(rest[1]):null,pattern:rest[0],insensitive:set.has('i'),output});return {output,status:selected.length?0:1};
        }
        case 'find':{
          let start='.',pattern='*';if(args[0]&&!args[0].startsWith('-'))start=args.shift();if(args.length){if(args.length!==2||args[0]!=='-name')fail('Поддерживается find папка -name "шаблон".');pattern=args[1];}
          if(/[\[\]]/.test(pattern))fail('В шаблоне поддерживаются только * и ?.');
          const path=this.resolve(start);this.node(path,'dir');for(const p of Object.keys(this.state.fs).filter(p=>isInside(p,path))){const n=this.node(p);if(n.type==='dir'&&(!(n.mode&0o400)||!(n.mode&0o100)))fail(p+': недостаточно прав для обхода');}const escaped=pattern.replace(/[.+^${}()|\\]/g,'\\$&').replaceAll('*','.*').replaceAll('?','.');const regex=new RegExp('^'+escaped+'$');
          const found=Object.keys(this.state.fs).filter(p=>(p===path||isInside(p,path))&&regex.test(basename(p))).sort();
          const output=found.map(p=>start.startsWith('/')?p:start.replace(/\/$/,'')+p.slice(path.length)).join('\n')+(found.length?'\n':'');
          this.event('find',{path,pattern,found});return out(output);
        }
        case 'wc':{if(args[0]!=='-l')fail('В симуляторе поддерживается wc -l [файл].');const rest=args.slice(1),value=inputFile(rest),count=(value.match(/\n/g)||[]).length;this.event('wc',{count,path:rest[0]?this.resolve(rest[0]):null});return out(count+(rest[0]?' '+rest[0]:'')+'\n');}
        case 'chmod':{arity(2);if(!/^[0-7]{3}$/.test(args[0]))fail('Задайте три восьмеричные цифры, например 640.');const path=this.resolve(args[1]);this.node(path);if(!isInside(path,HOME)||path===HOME)fail('Можно менять только права внутри домашней папки.');this.state.fs[path].mode=parseInt(args[0],8);return out('');}
        case 'sudo':{if(args[0]!=='apt')fail('Учебный sudo поддерживает только apt update/install. Никаких реальных прав он не выдаёт.');return this.apt(args.slice(1),true);}
        case 'apt':return this.apt(args,false);
        case 'ps':{if(args.length>1||(args[0]&&args[0]!=='aux'))fail('Используйте ps или ps aux.');this.event('ps');return out('PID   COMMAND\n'+this.state.processes.map(p=>String(p.pid).padEnd(6)+p.name).join('\n')+'\n');}
        case 'kill':{let rest=args;if(['-15','-TERM'].includes(args[0]))rest=args.slice(1);if(rest.length!==1||!/^\d+$/.test(rest[0]))fail('Используйте kill PID или kill -15 PID.');const pid=Number(rest[0]);if([1,120].includes(pid))fail('Этот процесс защищён в учебной модели.');if(!this.state.processes.some(p=>p.pid===pid))fail('Нет такого учебного процесса.');this.state.processes=this.state.processes.filter(p=>p.pid!==pid);return out('');}
        case 'tree':{if(!this.state.packages.includes('tree'))fail('tree: учебный пакет не установлен. Используйте sudo apt install tree.');arity(0,1);const path=this.resolve(args[0]||'.');this.node(path,'dir');return out(path+'\n'+Object.keys(this.state.fs).filter(p=>p!==path&&isInside(p,path)).sort().map(p=>'  '.repeat(p.slice(path.length+1).split('/').length)+'• '+basename(p)).join('\n')+'\n');}
        default:fail(name+': команда не поддерживается в симуляторе. Введите help.');
      }
    }
    apt(args, elevated) {
      if(args.length===2&&args[0]==='list'&&args[1]==='--installed')return {output:'Учебные установленные пакеты:\n'+this.state.packages.join('\n')+'\n'};
      if(!elevated)fail('APT изменяет систему. В учебной модели используйте sudo apt update/install.');
      if(args.length===1&&args[0]==='update'){this.state.updated=true;this.event('apt-update');return {output:'[Симуляция] Список учебных пакетов обновлён. Сетевых запросов нет.\n'};}
      if(args[0]==='install'){
        const names=args.slice(1).filter(p=>p!=='-y');if(!names.length)fail('Укажите учебный пакет: tree, nano или curl.');
        if(names.some(p=>!['tree','nano','curl'].includes(p)))fail('Учебный каталог содержит только tree, nano, curl.');
        if(!this.state.updated)fail('В этом упражнении сначала обновите список: sudo apt update.');
        for(const name of names)if(!this.state.packages.includes(name))this.state.packages.push(name);
        return {output:'[Симуляция] Установлено: '+names.join(', ')+'. На компьютере ничего не устанавливалось.\n'};
      }
      fail('Учебный APT: update, install или list --installed. Обновление самой ОС не моделируется.');
    }
  }
  const api={Terminal,HOME,HELP,parse,modeText};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.UbuntuSim=api;
})(typeof globalThis!=='undefined'?globalThis:this);
