/* Все команды ниже изменяют только JS-данные. Нет shell, eval, fetch, WebSocket
   или доступа к ОС. Состояние диска и применённого sshd намеренно разделено. */
(function(root){
  'use strict';
  const IP='203.0.113.10',FP='SHA256:DEMO-vps-fingerprint-not-a-real-key';
  const SSH='/etc/ssh/sshd_config.d/00-workshop.conf',AUTO='/etc/apt/apt.conf.d/20auto-upgrades';
  const DEFAULT_SSH='PermitRootLogin yes\nPasswordAuthentication yes\nKbdInteractiveAuthentication no\nPubkeyAuthentication yes\n';
  const HARDENED='PermitRootLogin no\nPasswordAuthentication no\nKbdInteractiveAuthentication no\nPubkeyAuthentication yes\n';
  const AUTO_TEXT='APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const fail=message=>{throw new Error(message);};
  const file=(text,owner='root',mode=0o644)=>({text,owner,mode});
  function initial(){return {
    version:1,client:{key:false,known:false,downloads:{}},context:'client',sessions:[],nextId:1,pending:null,editor:null,
    server:{hostname:'vps-new',users:{root:{sudo:true,key:false,password:true,dirMode:0o700,keyMode:0o600}},files:{
      [SSH]:file(DEFAULT_SSH),[AUTO]:file('APT::Periodic::Update-Package-Lists "0";\nAPT::Periodic::Unattended-Upgrade "0";\n'),
      '/srv/app/settings.conf':file('APP_MODE=production\nAPP_PORT=8080\n')},
      ssh:{root:true,password:true,kbd:false,pubkey:true},sshRevision:0,revision:0,validatedRevision:null,
      ufw:{enabled:false,incoming:'allow',outgoing:'allow',rules:[]},packages:['openssh-server','ufw'],updated:false,upgraded:false,rebootRequired:false,
      services:{ssh:{active:true,enabled:true},nginx:{active:false,enabled:false},'apt-daily-upgrade.timer':{active:true,enabled:true}},
      timezone:'Etc/UTC',archives:{},directories:[],boots:0,logs:['[учебный журнал] ssh: готов к подключению.']},
    snapshot:null,events:[]};}
  function parse(line){
    const tokens=[];let word='',quoted=false,quote=null,escape=false;
    for(const c of line.trim()){
      if(escape){word+=c;escape=false;quoted=true;continue;}
      if(c==='\\'&&quote!=="'"){escape=true;continue;}
      if(quote){if(c===quote)quote=null;else word+=c;quoted=true;continue;}
      if(c==='"'||c==="'"){quote=c;quoted=true;continue;}
      if(/\s/.test(c)){if(word||quoted){tokens.push(word);word='';quoted=false;}}else if(/[;|&<>`$]/.test(c))fail('Составные команды, перенаправления и подстановки не поддерживаются. Введите команды отдельно.');else word+=c;
    }
    if(quote||escape)fail('Незакрытая кавычка или экранирование.');if(word||quoted)tokens.push(word);return tokens;
  }
  function config(text){
    const result={root:true,password:true,kbd:false,pubkey:true},seen=new Set();
    const names={permitrootlogin:'root',passwordauthentication:'password',kbdinteractiveauthentication:'kbd',pubkeyauthentication:'pubkey'};
    for(const raw of text.split('\n')){
      const line=raw.replace(/#.*/,'').trim();if(!line)continue;
      const [name,value,...extra]=line.split(/\s+/),key=names[name.toLowerCase()];
      if(!key||extra.length||!['yes','no'].includes(value?.toLowerCase()))fail('sshd: неподдерживаемая или неверная директива: '+line);
      // OpenSSH использует первое значение большинства директив. Модель имеет
      // один ранний drop-in; остальные Include/Match явно не эмулируются.
      if(!seen.has(key)){result[key]=value.toLowerCase()==='yes';seen.add(key);}
    }
    return result;
  }
  function currentSession(s){return s.sessions.find(x=>x.id===s.context&&x.open);}
  function user(s){return s.context==='console'?'root':currentSession(s)?.user;}
  function permitted(s){const u=user(s);return !!u&&(u==='root'||currentSession(s)?.sudo);}
  function route(s){const f=s.server.ufw;return s.server.services.ssh.active&&(!f.enabled||f.rules.find(r=>r.port===22)?.action==='allow'||(!f.rules.some(r=>r.port===22)&&f.incoming==='allow'));}
  function auth(s,name,keyOnly=false){
    const u=s.server.users[name],c=s.server.ssh;if(!u||(name==='root'&&!c.root))return null;
    if(s.client.key&&u.key&&u.dirMode===0o700&&u.keyMode===0o600&&c.pubkey)return 'key';
    return !keyOnly&&u.password&&(c.password||c.kbd)?'password':null;
  }
  function event(s,type,extra={}){s.events.push({type,...extra});s.events=s.events.slice(-200);}
  function addLog(s,line){s.server.logs.push('[учебный журнал] '+line);s.server.logs=s.server.logs.slice(-60);}
  const HELP=`МОДЕЛЬ Ubuntu 24.04. Команды не исполняются в ОС.
Локальная вкладка: ssh [ -o PreferredAuthentications=publickey ] user@203.0.113.10, ssh-keygen -t ed25519, ssh-copy-id user@203.0.113.10, scp user@203.0.113.10:/home/user/app.tgz ./app.tgz, ls, help.
VPS: whoami, id [user], cat путь, hostnamectl [set-hostname имя], timedatectl [set-timezone UTC], df -h, free -h, ip -brief address, ss -lntp, exit.
Администратор: sudo команда, sudo -v, adduser имя, usermod -aG sudo имя, chmod 700 ~/.ssh, chmod 600 ~/.ssh/authorized_keys.
Пакеты: apt update, apt list --upgradable, apt upgrade [-y], apt install [ -y ] nginx|unattended-upgrades.
SSH: nano ${SSH}, cp источник копия, sshd -t, sshd -T, systemctl reload ssh.
Firewall: ufw default deny incoming, ufw default allow outgoing, ufw allow OpenSSH|22/tcp|80/tcp, ufw deny 22/tcp, ufw delete allow 22/tcp, ufw enable [затем y], ufw disable, ufw status [verbose].
Службы: systemctl status|start|stop|enable [--now]|is-enabled nginx, journalctl -u ssh|nginx --no-pager, curl http://localhost, reboot.
Автообновления: nano ${AUTO}, unattended-upgrade --dry-run --debug, systemctl status apt-daily-upgrade.timer.
Копия: tar -czf /home/admin/app.tgz -C /srv app, tar -tzf /home/admin/app.tgz, mkdir -p /tmp/restore-check, tar -xzf /home/admin/app.tgz -C /tmp/restore-check.
Панель провайдера, снимок/восстановление, локальная вкладка, сохранённые SSH-сеансы и консоль — кнопками интерфейса. nano открывает простой редактор.
Один ранний drop-in SSH, четыре yes/no-директивы, порт 22, IPv4/IPv6 модель без отдельных правил, без cloud-firewall/DNS/реальных процессов. Парольные шаги и ssh-keygen упрощены — не вводите секреты.`;
  class VPS{
    constructor(state){this.state=state?copy(state):initial();}
    snapshot(){return copy(this.state);}
    prompt(){const s=this.state;if(s.pending)return s.pending.type==='host'?'Подтверждение host key':'Подтверждение UFW';if(s.context==='client')return 'student@laptop:~$';const u=user(s);return (s.context==='console'?'[консоль] ':'')+u+'@'+s.server.hostname+':~'+(u==='root'?'#':'$');}
    action(name,id){
      const s=this.state;
      if(name==='client'){s.context='client';s.pending=null;s.editor=null;return 'Локальная вкладка. Существующие SSH-сеансы сохранены.';}
      if(name==='session'){if(!s.sessions.some(x=>x.id===id&&x.open))fail('Этот сеанс уже закрыт.');s.context=id;s.pending=null;s.editor=null;return 'Выбран SSH-сеанс '+id;}
      if(name==='provider'){event(s,'provider');return 'Учебный VPS: '+IP+'\nОтпечаток из панели: '+FP+'\nУсловный образ Ubuntu 24.04 LTS, первоначальный root-доступ задан провайдером только в этом сценарии.';}
      if(name==='console'){s.context='console';s.pending=null;s.editor=null;event(s,'console');return 'Консоль провайдера открыта. Учебная аутентификация пропущена. Доступ не зависит от SSH/UFW; реальный способ входа зависит от провайдера.';}
      if(name==='snapshot'){s.snapshot=copy(s.server);event(s,'snapshot');return 'Создан учебный снимок диска/конфигурации VPS. Это модель, не реальный snapshot. Отдельная внешняя копия всё равно нужна.';}
      if(name==='restore'){
        if(!s.snapshot)fail('Сначала создайте снимок.');s.server=copy(s.snapshot);s.sessions=[];s.context='client';s.pending=null;s.editor=null;event(s,'snapshot-restored');return 'Снимок восстановлен. Все прежние сеансы закрыты. Подключитесь заново; изменения после снимка потеряны.';
      }
      fail('Неизвестное действие.');
    }
    saveFile(text){
      const s=this.state;if(!s.editor||!permitted(s))fail('Нет открытого административного редактора.');
      if(typeof text!=='string'||text.length>8000)fail('Лимит файла 8000 символов.');
      const path=s.editor;s.server.files[path].text=text;if(path===SSH){s.server.revision++;s.server.validatedRevision=null;}
      s.editor=null;event(s,'edit',{path});return 'Файл сохранён на диске модели. Для SSH проверьте sshd -t и примените reload отдельно.';
    }
    cancelEdit(){this.state.editor=null;}
    run(line){
      if(typeof line!=='string'||line.length>2000)return {error:true,output:'Лимит команды 2000 символов.'};
      if(!line.trim())return {empty:true,output:'',error:false};
      const before=this.snapshot();
      try{return {output:this.execute(line),error:false};}catch(e){this.state=before;return {output:e.message,error:true};}
    }
    execute(line){
      const s=this.state,b=s.server;
      if(s.pending){
        if(s.pending.type==='ufw'){
          if(!/^(y|yes|n|no)$/i.test(line.trim()))fail('Ответьте y или n.');const yes=/^(y|yes)$/i.test(line.trim());s.pending=null;if(!yes)return 'Отменено.';
          b.ufw.enabled=true;event(s,'ufw-enabled');addLog(s,'UFW включён');return 'Firewall активен. '+(route(s)?'Новый SSH-вход по правилу доступен.':'ВНИМАНИЕ: новый SSH-вход заблокирован. Текущий сеанс модель сохраняет; используйте консоль.');
        }
        if(!/^(yes|no)$/i.test(line.trim()))fail('Ответьте yes или no.');
        const pending=s.pending;s.pending=null;if(line.trim().toLowerCase()==='no')return 'Подключение отменено.';
        if(!s.events.some(e=>e.type==='provider'))fail('Сначала откройте панель провайдера и сверьте отпечаток. В модели подтверждение без сверки не принимается.');
        s.client.known=true;event(s,'host-verified');return this.connect(pending.name,pending.keyOnly);
      }
      if(s.editor)fail('Сначала сохраните файл или отмените редактирование.');
      let a=parse(line);if(!a.length)return '';
      let command=a.shift();if(command==='help')return HELP;if(command==='clear')return '';
      if(s.context==='client')return this.local(command,a);
      let elevated=user(s)==='root';
      if(command==='sudo'){
        if(!permitted(s))fail('Пользователь не входит в группу sudo.');
        if(a[0]==='-v'&&a.length===1){event(s,'sudo-tested',{user:user(s)});return 'Учебная проверка sudo успешна. Реальный sudo может запросить пароль пользователя; здесь секреты не вводятся.';}
        elevated=true;command=a.shift();
      }
      const admin=()=>{if(!elevated)fail('Недостаточно прав. Используйте sudo.');};
      const exact=condition=>{if(!condition)fail('Неподдерживаемые аргументы. См. help: '+command);};
      const path=value=>value?.replace(/^~(?=\/|$)/,user(s)==='root'?'/root':'/home/'+user(s));
      if(command==='whoami'){exact(!a.length);event(s,'whoami');return elevated?'root':user(s);}
      if(command==='id'){
        exact(a.length<=1);const name=a[0]||user(s),u=b.users[name];if(!u)fail('Нет такого пользователя.');event(s,'id',{user:name});return 'uid='+(name==='root'?0:1000)+'('+name+') groups='+name+(u.sudo?',sudo':'');
      }
      if(command==='exit'){exact(!a.length);const active=currentSession(s);if(active)active.open=false;s.context='client';return 'Вы вернулись в локальную вкладку.';}
      if(command==='cat'){
        exact(a.length===1);const target=path(a[0]);event(s,'read',{path:target});
        if(target==='/etc/os-release')return 'PRETTY_NAME="Ubuntu 24.04 LTS"\nVERSION_ID="24.04"';
        if(target==='/var/run/reboot-required')return b.rebootRequired?'*** System restart required ***':fail('Файл отсутствует: в модели перезагрузка не требуется.');
        const f=b.files[target];if(!f)fail('Нет такого учебного файла.');if(!elevated&&f.owner!==user(s)&&!(f.mode&0o004))fail('Нет права чтения.');return f.text;
      }
      if(command==='hostnamectl'){
        if(!a.length){event(s,'host-info');return 'Static hostname: '+b.hostname+'\nOperating System: Ubuntu 24.04 LTS';}
        admin();exact(a.length===2&&a[0]==='set-hostname'&&/^[a-z][a-z0-9-]{0,30}$/.test(a[1]));b.hostname=a[1];event(s,'hostname');return 'Имя хоста изменено в модели; DNS не меняется.';
      }
      if(command==='timedatectl'){
        if(!a.length||a.join(' ')==='status'){event(s,'time');return 'Time zone: '+b.timezone+'\nSystem clock synchronized: yes (учебное состояние)';}
        admin();exact(a.join(' ')==='set-timezone UTC');b.timezone='UTC';event(s,'timezone');return 'Часовой пояс UTC установлен.';
      }
      if(command==='df'){exact(a.join(' ')==='-h');event(s,'disk');return 'Filesystem Size Used Avail Use% Mounted on\n/dev/vda1 25G 3G 22G 12% / (учебные значения)';}
      if(command==='free'){exact(a.join(' ')==='-h');event(s,'memory');return 'Mem: total 1.0Gi used 220Mi available 780Mi (учебные значения)';}
      if(command==='ip'){exact(a.join(' ')==='-brief address');event(s,'network');return 'lo UNKNOWN 127.0.0.1/8\nens3 UP '+IP+'/24 (учебный адрес)';}
      if(command==='ss'){exact(a.join(' ')==='-lntp');event(s,'sockets');return (b.services.ssh.active?'LISTEN 0 128 0.0.0.0:22 users:(("ssh.socket/sshd",учебный))':'')+(b.services.nginx.active?'\nLISTEN 0 511 0.0.0.0:80 users:(("nginx",учебный))':'');}
      if(command==='apt'){
        if(a.join(' ')==='list --upgradable'){event(s,'upgradable');return b.upgraded?'Listing... Done':'openssh-server, linux-image (учебный список)';}
        admin();
        if(a.join(' ')==='update'){b.updated=true;event(s,'apt-update');return 'Учебный индекс пакетов обновлён. Программы этим не обновляются.';}
        if(a[0]==='upgrade'&&a.slice(1).every(x=>x==='-y')){if(!b.updated)fail('Сначала apt update.');b.upgraded=true;b.rebootRequired=true;event(s,'apt-upgrade');return 'Учебные обновления установлены. Требуется плановая перезагрузка. Интерактивные вопросы пакетов в модели пропущены.';}
        if(a[0]==='install'){
          const names=a.slice(1).filter(x=>x!=='-y');exact(names.length>0&&names.every(n=>['nginx','unattended-upgrades'].includes(n)));if(!b.updated)fail('Сначала apt update.');
          for(const n of names)if(!b.packages.includes(n))b.packages.push(n);
          if(names.includes('nginx'))b.services.nginx={active:true,enabled:true};event(s,'install',{names});return 'Учебные пакеты установлены: '+names.join(', ')+'. Никакой загрузки в сеть нет.';
        }
        fail('Поддерживаются apt update/list --upgradable/upgrade/install.');
      }
      if(command==='adduser'){
        admin();exact(a.length===1&&/^[a-z][a-z0-9_]{0,15}$/.test(a[0])&&!['root','constructor','prototype','__proto__'].includes(a[0]));if(b.users[a[0]])fail('Пользователь уже существует.');if(Object.keys(b.users).length>=5)fail('Лимит 5 пользователей.');
        b.users[a[0]]={sudo:false,key:false,password:true,dirMode:0o700,keyMode:0o600};event(s,'user-added',{user:a[0]});return 'Создан '+a[0]+'. Пароль и вопросы adduser здесь заменены учебным состоянием. На реальном VPS задайте собственный пароль интерактивно; в сайт его не вводите.';
      }
      if(command==='usermod'){
        admin();exact(a.length===3&&a[0]==='-aG'&&a[1]==='sudo');if(!b.users[a[2]])fail('Пользователь не существует.');b.users[a[2]].sudo=true;event(s,'sudo-group',{user:a[2]});return 'Пользователь добавлен в sudo. Для проверки используйте новый SSH-сеанс.';
      }
      if(command==='chmod'){
        exact(a.length===2&&['700','600','777'].includes(a[0]));const target=path(a[1]),match=target?.match(/^\/home\/([a-z][a-z0-9_]{0,15})\/\.ssh(\/authorized_keys)?$/);if(!match||!b.users[match[1]])fail('Поддерживаются права ~/.ssh и ~/.ssh/authorized_keys.');
        if(!elevated&&match[1]!==user(s))fail('Нет права менять чужой файл.');b.users[match[1]][match[2]?'keyMode':'dirMode']=parseInt(a[0],8);event(s,'chmod');return 'Права учебного '+target+' изменены. Модель требует ровно 700 для каталога и 600 для authorized_keys; настоящий StrictModes учитывает также владельца и родительские каталоги.';
      }
      if(command==='nano'){admin();exact(a.length===1&&[SSH,AUTO].includes(a[0]));s.editor=a[0];return 'Открыт учебный редактор '+a[0]+'. Это интерфейс модели, не настоящий nano.';}
      if(command==='cp'){
        admin();exact(a.length===2);if(!b.files[a[0]])fail('Исходный файл не найден.');exact([SSH,SSH+'.bak'].includes(a[0])&&[SSH,SSH+'.bak'].includes(a[1])&&a[0]!==a[1]);b.files[a[1]]=copy(b.files[a[0]]);if(a[1]===SSH){b.revision++;b.validatedRevision=null;}event(s,'config-copy',{from:a[0],to:a[1]});return 'Учебная копия сохранена.';
      }
      if(command==='sshd'){
        admin();exact(a.length===1&&['-t','-T'].includes(a[0]));const c=config(b.files[SSH].text);
        if(a[0]==='-t'){b.validatedRevision=b.revision;event(s,'ssh-validated',{revision:b.revision});return '';}
        event(s,'ssh-effective',{revision:b.revision});return 'permitrootlogin '+(c.root?'yes':'no')+'\npasswordauthentication '+(c.password?'yes':'no')+'\nkbdinteractiveauthentication '+(c.kbd?'yes':'no')+'\npubkeyauthentication '+(c.pubkey?'yes':'no')+'\n# Это расчёт с диска модели, не доказательство уже применённых настроек.';
      }
      if(command==='ufw'){
        if(a[0]==='status'&&a.slice(1).every(x=>['verbose','numbered'].includes(x))){event(s,'ufw-status');return 'Status: '+(b.ufw.enabled?'active':'inactive')+'\nDefault: '+b.ufw.incoming+' incoming, '+b.ufw.outgoing+' outgoing\n'+b.ufw.rules.map(r=>r.port+'/tcp '+r.action.toUpperCase()+' Anywhere (модель обоих стеков)').join('\n');}
        admin();
        if(a[0]==='default'){exact(a.length===3&&['deny','allow'].includes(a[1])&&['incoming','outgoing'].includes(a[2]));b.ufw[a[2]]=a[1];event(s,'ufw-default');return 'Политика изменена.';}
        if(a.join(' ')==='enable'){s.pending={type:'ufw'};return 'Может нарушить SSH-подключения. Продолжить? (y/n)';}
        if(a.join(' ')==='disable'){b.ufw.enabled=false;event(s,'ufw-disabled');return 'Firewall отключён в модели.';}
        let remove=false;if(a[0]==='delete'){remove=true;a=a.slice(1);}
        if(['allow','deny'].includes(a[0])){
          exact(a.length===2);const port=a[1]==='OpenSSH'?22:parseInt(a[1],10);exact((a[1]==='OpenSSH'||/^(22|80)(\/tcp)?$/.test(a[1]))&&[22,80].includes(port));
          if(remove)b.ufw.rules=b.ufw.rules.filter(r=>!(r.port===port&&r.action===a[0]));else if(!b.ufw.rules.some(r=>r.port===port&&r.action===a[0]))b.ufw.rules.push({port,action:a[0]});
          event(s,'ufw-rule',{port,action:a[0],remove});return 'Правило '+(remove?'удалено':'добавлено')+'. Порядок имеет значение; модель применяет первое совпадение.';
        }
        fail('Неподдерживаемая команда UFW. См. help.');
      }
      if(command==='systemctl'){
        const op=a.shift(),name=a.filter(x=>x!=='--now')[0]?.replace(/\.service$/,'');exact(a.filter(x=>x!=='--now').length===1&&['ssh','nginx','apt-daily-upgrade.timer'].includes(name));const svc=b.services[name];
        if(name==='nginx'&&!b.packages.includes('nginx'))fail('nginx не установлен.');
        if(op==='status'){event(s,'service-status',{name});return name+': '+(svc.active?'active (running)':'inactive (dead)')+'; '+(svc.enabled?'enabled':'disabled');}
        if(op==='is-enabled'){event(s,'service-enabled',{name});return svc.enabled?'enabled':'disabled';}
        admin();
        if(op==='reload'&&name==='ssh'){
          if(!svc.active)fail('SSH-служба не активна: reload недоступен. Проверьте конфиг и start через консоль.');const c=config(b.files[SSH].text);b.ssh=c;b.sshRevision=b.revision;event(s,'ssh-reloaded',{revision:b.revision,validated:b.validatedRevision===b.revision});addLog(s,'sshd: применена конфигурация');return 'SSH-конфигурация применена. Старые сеансы модель сохраняет; обязательно проверьте новый вход.';
        }
        if(op==='enable'){svc.enabled=true;if(a.includes('--now'))svc.active=true;event(s,'service-enable',{name});return 'Служба включена для старта при загрузке'+(a.includes('--now')?' и запущена.':'.');}
        if(op==='start'||op==='stop'){if(op==='start'&&name==='ssh'){b.ssh=config(b.files[SSH].text);b.sshRevision=b.revision;}svc.active=op==='start';event(s,'service-'+op,{name});addLog(s,name+': '+op);return 'Учебная служба '+op+'.';}
        fail('Поддерживаются status/is-enabled/enable [--now]/start/stop и reload ssh.');
      }
      if(command==='journalctl'){
        exact(a.length===3&&a[0]==='-u'&&['ssh','nginx'].includes(a[1])&&a[2]==='--no-pager');event(s,'journal',{name:a[1]});return b.logs.join('\n');
      }
      if(command==='curl'){
        exact(a.length===1&&['http://localhost','http://127.0.0.1'].includes(a[0]));if(!b.services.nginx.active)fail('Connection refused: nginx не работает.');event(s,'http-local');return '<h1>Welcome to nginx!</h1>\nУчебный HTTP-ответ с localhost, без сети.';
      }
      if(command==='unattended-upgrade'){
        admin();exact(a.join(' ')==='--dry-run --debug');if(!b.packages.includes('unattended-upgrades'))fail('Сначала установите unattended-upgrades.');
        const text=b.files[AUTO].text,valid=['Update-Package-Lists','Unattended-Upgrade'].every(key=>new RegExp('APT::Periodic::'+key+'\\s+"1";').test(text));
        if(!valid)fail('Для сценария включите оба APT::Periodic параметра значением "1"; в файле.');event(s,'auto-dry-run');return 'Учебный dry-run: конфигурация ежедневных обновлений включена; изменений пакетов не произведено. Источники/Origins/PAM/таймеры настоящей ОС модель не вычисляет.';
      }
      if(command==='mkdir'){exact(a.join(' ')==='-p /tmp/restore-check');if(!b.directories.includes('/tmp/restore-check'))b.directories.push('/tmp/restore-check');return '';}
      if(command==='tar'){
        if(a.length===5&&a[0]==='-czf'&&a[2]==='-C'&&a[3]==='/srv'&&a[4]==='app'){
          const dest=a[1];exact(dest==='/home/'+user(s)+'/app.tgz'||elevated&&dest==='/home/admin/app.tgz');if(!b.users.admin)fail('Пользователь admin отсутствует.');b.archives[dest]={owner:elevated?'root':user(s),entries:{'app/settings.conf':copy(b.files['/srv/app/settings.conf'])}};event(s,'archive-created',{path:dest});return 'Создан учебный архив с относительным путём app/settings.conf.';
        }
        if(a.length===2&&a[0]==='-tzf'){const archive=b.archives[a[1]];if(!archive)fail('Архив не найден.');event(s,'archive-listed');return Object.keys(archive.entries).join('\n');}
        if(a.length===4&&a[0]==='-xzf'&&a[2]==='-C'&&a[3]==='/tmp/restore-check'){
          const archive=b.archives[a[1]];if(!archive||!b.directories.includes('/tmp/restore-check'))fail('Нет архива или каталога восстановления.');for(const [entry,value]of Object.entries(archive.entries))b.files['/tmp/restore-check/'+entry]=copy(value);event(s,'archive-restored');return 'Копия распакована в /tmp/restore-check. Рабочий /srv/app не менялся.';
        }
        fail('Поддерживаются только учебные формы tar из help.');
      }
      if(command==='reboot'){
        admin();exact(!a.length);b.boots++;b.rebootRequired=false;for(const svc of Object.values(b.services))svc.active=svc.enabled;try{b.ssh=config(b.files[SSH].text);b.sshRevision=b.revision;}catch{b.services.ssh.active=false;addLog(s,'sshd: неверная конфигурация при загрузке');}for(const x of s.sessions)x.open=false;s.context='client';event(s,'reboot');addLog(s,'система перезагружена');return 'Учебная перезагрузка завершена мгновенно. Все SSH-сеансы закрыты. На настоящем VPS нужно дождаться загрузки.';
      }
      fail('Команда не входит в модель. Введите help.');
    }
    connect(name,keyOnly=false){
      const s=this.state;if(!route(s))fail('SSH: соединение не установлено. Проверьте UFW/службу через консоль провайдера.');
      const method=auth(s,name,keyOnly);if(!method)fail('Permission denied: проверьте пользователя, ключ, права и активную конфигурацию SSH.');
      if(!s.client.known){s.pending={type:'host',name,keyOnly};return 'Отпечаток SSH-сервера: '+FP+'\nСверьте с панелью провайдера. Продолжить? (yes/no)';}
      s.sessions=s.sessions.filter(x=>x.open);if(s.sessions.length>=8)fail('Лимит 8 открытых сеансов. Закройте ненужный командой exit.');
      const id='ssh-'+s.nextId++;s.sessions.push({id,user:name,auth:method,sudo:s.server.users[name].sudo,open:true,sshRevision:s.server.sshRevision,firewall:s.server.ufw.enabled});s.context=id;
      event(s,'ssh-login',{user:name,method,revision:s.server.sshRevision,firewall:s.server.ufw.enabled});return 'Подключён '+name+' через '+(method==='key'?'учебный ключ':'учебный пароль (ввод пропущен)')+'. Старые сеансы доступны кнопками.';
    }
    local(command,a){
      const s=this.state;
      if(command==='ssh'){
        let keyOnly=false;if(a[0]==='-o'&&a[1]==='PreferredAuthentications=publickey'){keyOnly=true;a=a.slice(2);}
        if(a.length!==1)fail('Форма: ssh [ -o PreferredAuthentications=publickey ] user@'+IP);
        const match=a[0].match(/^([a-z][a-z0-9_]{0,15})@203\.0\.113\.10$/);if(!match)fail('Только учебный адрес '+IP+'; подключения в сеть отсутствуют.');return this.connect(match[1],keyOnly);
      }
      if(command==='ssh-keygen'){
        if(a.join(' ')!=='-t ed25519')fail('Форма: ssh-keygen -t ed25519');s.client.key=true;event(s,'keygen');return 'Создан учебный маркер пары ключей. Файлы/секреты не генерируются; вопросы пути/passphrase пропущены. В реальности закройте private key passphrase и не передавайте его на сервер.';
      }
      if(command==='ssh-copy-id'){
        if(a.length!==1)fail('Форма: ssh-copy-id user@'+IP);const match=a[0].match(/^([a-z][a-z0-9_]{0,15})@203\.0\.113\.10$/);if(!match||!s.client.key||!s.client.known)fail('Нужны учебный ключ, известный сервер и корректный адрес.');
        if(!route(s)||!auth(s,match[1]))fail('Публичный ключ нельзя передать: нет доступного способа входа.');s.server.users[match[1]].key=true;event(s,'key-copied',{user:match[1]});return 'Учебный public key добавлен в authorized_keys. Private key остался на локальной стороне.';
      }
      if(command==='scp'){
        if(a.length!==2||a[1]!=='./app.tgz')fail('Форма: scp admin@'+IP+':/home/admin/app.tgz ./app.tgz');const match=a[0].match(/^admin@203\.0\.113\.10:(\/home\/admin\/app\.tgz)$/);if(!match||!s.client.known||!route(s)||!auth(s,'admin'))fail('Не удалось подключиться для scp.');
        const archive=s.server.archives[match[1]];if(!archive||archive.owner!=='admin')fail('Архив не найден или недоступен пользователю admin. Создайте tar из его сеанса без sudo.');s.client.downloads['app.tgz']=copy(archive);event(s,'offsite-copy');return 'Учебная копия перенесена на локальную сторону. Файл на компьютер не скачивается; это запись модели.';
      }
      if(command==='ls'&&!a.length)return 'Локальные учебные копии: '+(Object.keys(s.client.downloads).join(', ')||'(нет)');
      fail('Это локальная вкладка. Серверные команды вводите в SSH-сеансе или консоли. См. help.');
    }
    static restore(value){
      // Недоверенный localStorage не исполняется. Структура и вложенные лимиты
      // проверяются прежде, чем снимок попадёт в интерфейс или обработчик команд.
      const raw=JSON.stringify(value);if(!raw||raw.length>300000)fail('Слишком большой снимок.');const s=copy(value);
      const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),bool=v=>typeof v==='boolean',str=(v,n)=>typeof v==='string'&&v.length<=n;
      function checkServer(b){
        if(!obj(b)||!str(b.hostname,31)||!/^[a-z][a-z0-9-]*$/.test(b.hostname)||!obj(b.users)||!obj(b.files)||!obj(b.archives)||!obj(b.services)||!obj(b.ssh)||!obj(b.ufw))fail('Структура VPS.');
        if(!b.users.root||Object.keys(b.users).length>5)fail('Пользователи.');for(const [name,u]of Object.entries(b.users))if(!/^[a-z][a-z0-9_]{0,15}$/.test(name)||['constructor','prototype'].includes(name)||!obj(u)||!['sudo','key','password'].every(k=>bool(u[k]))||![u.dirMode,u.keyMode].every(v=>Number.isInteger(v)&&v>=0&&v<=511))fail('Пользователь.');
        if(Object.keys(b.files).length>20||![SSH,AUTO,'/srv/app/settings.conf'].every(k=>obj(b.files[k])))fail('Файлы.');
        for(const [path,f]of Object.entries(b.files))if(![SSH,SSH+'.bak',AUTO,'/srv/app/settings.conf','/tmp/restore-check/app/settings.conf'].includes(path)||!str(f.text,8000)||!str(f.owner,16)||!Number.isInteger(f.mode)||f.mode<0||f.mode>511)fail('Файл.');
        if(!['root','password','kbd','pubkey'].every(k=>bool(b.ssh[k]))||!bool(b.ufw.enabled)||!['allow','deny'].includes(b.ufw.incoming)||!['allow','deny'].includes(b.ufw.outgoing)||!Array.isArray(b.ufw.rules)||b.ufw.rules.length>4||b.ufw.rules.some(r=>![22,80].includes(r.port)||!['allow','deny'].includes(r.action)))fail('Сеть.');
        if(Object.keys(b.services).length!==3)fail('Список служб.');for(const name of ['ssh','nginx','apt-daily-upgrade.timer'])if(!obj(b.services[name])||!bool(b.services[name].active)||!bool(b.services[name].enabled))fail('Службы.');
        if(!Array.isArray(b.packages)||b.packages.length>4||b.packages.some(n=>!['openssh-server','ufw','nginx','unattended-upgrades'].includes(n))||!['updated','upgraded','rebootRequired'].every(k=>bool(b[k])))fail('Пакеты.');
        if(![b.revision,b.sshRevision,b.boots].every(n=>Number.isSafeInteger(n)&&n>=0)||b.sshRevision>b.revision||!(b.validatedRevision===null||Number.isSafeInteger(b.validatedRevision)&&b.validatedRevision>=0&&b.validatedRevision<=b.revision))fail('Ревизии.');
        if(!str(b.timezone,40)||!Array.isArray(b.logs)||b.logs.length>60||b.logs.some(x=>!str(x,1000))||!Array.isArray(b.directories)||b.directories.some(x=>x!=='/tmp/restore-check')||Object.keys(b.archives).length>5)fail('Данные.');
        for(const [path,a]of Object.entries(b.archives))if(!/^\/home\/[a-z][a-z0-9_]{0,15}\/app\.tgz$/.test(path)||!obj(a)||!str(a.owner,16)||!obj(a.entries)||Object.keys(a.entries).some(k=>k!=='app/settings.conf')||!str(a.entries['app/settings.conf']?.text,8000)||!str(a.entries['app/settings.conf']?.owner,16)||!Number.isInteger(a.entries['app/settings.conf']?.mode)||a.entries['app/settings.conf'].mode<0||a.entries['app/settings.conf'].mode>511)fail('Архив.');
      }
      if(!obj(s)||s.version!==1||!obj(s.client)||!bool(s.client.key)||!bool(s.client.known)||!obj(s.client.downloads)||Object.keys(s.client.downloads).some(k=>k!=='app.tgz'))fail('Клиент.');checkServer(s.server);if(s.snapshot!==null)checkServer(s.snapshot);for(const a of Object.values(s.client.downloads)){if(!obj(a)||!str(a.owner,16)||!obj(a.entries)||Object.keys(a.entries).length!==1||!str(a.entries['app/settings.conf']?.text,8000)||!str(a.entries['app/settings.conf']?.owner,16)||!Number.isInteger(a.entries['app/settings.conf']?.mode)||a.entries['app/settings.conf'].mode<0||a.entries['app/settings.conf'].mode>511)fail('Локальная копия.');}
      if(!Array.isArray(s.sessions)||s.sessions.length>8||!Number.isSafeInteger(s.nextId)||s.nextId<1||new Set(s.sessions.map(x=>x.id)).size!==s.sessions.length)fail('Сеансы.');
      for(const x of s.sessions)if(!obj(x)||!/^ssh-[1-9][0-9]*$/.test(x.id)||Number(x.id.slice(4))>=s.nextId||!s.server.users[x.user]||!['key','password'].includes(x.auth)||!bool(x.open)||!bool(x.sudo)||!bool(x.firewall)||!Number.isSafeInteger(x.sshRevision))fail('Сеанс.');
      if(!['client','console'].includes(s.context)&&!s.sessions.some(x=>x.id===s.context&&x.open))fail('Контекст.');
      if(s.editor!==null&&(![SSH,AUTO].includes(s.editor)||!permitted(s)))fail('Редактор.');
      if(s.pending!==null&&(!obj(s.pending)||!['host','ufw'].includes(s.pending.type)||s.pending.type==='host'&&(!str(s.pending.name,16)||!bool(s.pending.keyOnly))))fail('Подтверждение.');
      if(!Array.isArray(s.events)||s.events.length>200||s.events.some(e=>!obj(e)||!str(e.type,40)||JSON.stringify(e).length>1000))fail('Наблюдения.');
      return new VPS(s);
    }
  }
  const api={VPS,IP,FP,SSH,AUTO,DEFAULT_SSH,HARDENED,AUTO_TEXT,config,route,auth,user,HELP};
  if(typeof module!=='undefined')module.exports=api;else root.VPSSim=api;
})(globalThis);
