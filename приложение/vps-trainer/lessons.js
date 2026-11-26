/* Уроки хранят собственные независимые среды. Сценарии описаны шагами:
   строка — команда, action — интерфейс, edit — сохранение учебного файла. */
(function(root){
  'use strict';
  const S=typeof module!=='undefined'?require('./engine.js'):root.VPSSim;
  const {VPS,IP,SSH,AUTO,HARDENED,AUTO_TEXT,config}=S;
  const local={action:'client'},provider={action:'provider'},snapshot={action:'snapshot'};
  const login='ssh admin@'+IP,keyLogin='ssh -o PreferredAuthentications=publickey admin@'+IP;
  const hardEdit={edit:HARDENED},autoEdit={edit:AUTO_TEXT};
  const keySteps=[local,'ssh-keygen -t ed25519','ssh-copy-id admin@'+IP,keyLogin,'sudo -v'];
  const hardSteps=['sudo cp '+SSH+' '+SSH+'.bak','sudo nano '+SSH,hardEdit,'sudo sshd -t','sudo sshd -T','sudo systemctl reload ssh',local,keyLogin,'sudo -v'];
  const firewallSteps=['sudo ufw default deny incoming','sudo ufw default allow outgoing','sudo ufw allow OpenSSH','sudo ufw enable','y','sudo ufw status verbose',local,keyLogin,'sudo -v'];
  function apply(vps,steps){for(const step of steps){
    if(typeof step==='string'){const r=vps.run(step);if(r.error)throw new Error(step+': '+r.output);}
    else if(step.action)vps.action(step.action,step.id);
    else if(typeof step.edit==='string')vps.saveFile(step.edit);
  }return vps;}
  function base(stage='client'){
    const v=new VPS();if(stage==='client')return v;
    v.state.client.known=true;apply(v,['ssh root@'+IP]);if(stage==='root'){v.state.events=[];return v;}
    apply(v,['adduser admin','usermod -aG sudo admin',local,login]);if(stage==='admin'){v.state.events=[];return v;}
    apply(v,keySteps);if(stage==='key'){v.state.events=[];return v;}
    apply(v,hardSteps);if(stage==='hardened'){v.state.events=[];return v;}
    apply(v,firewallSteps);if(stage==='firewall'){v.state.events=[];return v;}
    apply(v,['sudo apt update','sudo apt install nginx','sudo systemctl enable --now nginx']);v.state.events=[];return v;
  }
  const has=(s,type,p=()=>true)=>s.events.some(e=>e.type===type&&p(e));
  const after=(s,earlier,later,p=()=>true)=>{const i=s.events.map(e=>e.type).lastIndexOf(earlier);return i>=0&&s.events.slice(i+1).some(e=>e.type===later&&p(e));};
  const g=(label,test)=>({label,test}),lessons=[];
  function add(title,command,theory,task,hint,solution,goals,stage='root',extra={},explanation=''){
    const n=lessons.length;lessons.push({id:'vps-'+(n+1),group:['Первый доступ','Защита без потери входа','Обслуживание и восстановление','Итоговая практика'][Math.min(3,Math.floor(n/6))],title,command,theory,task,hint,solution,alternative:extra.alternative||solution,goals,stage,seed:extra.seed,explanation:explanation||'Проверка учитывает состояние модели и выполненные проверки. Команды вводятся по одной; действия панели и редактор отмечены отдельно.'});
  }
  add('Паспорт VPS и точка возврата','Панель провайдера · снимок',
    'После аренды проверьте образ ОС, IP, доступ к консоли восстановления и условия резервирования у провайдера. Снимок помогает вернуть состояние, но обычно хранится у того же провайдера и не заменяет отдельную копию. Здесь IP и отпечаток вымышленные.',
    'Откройте «Панель провайдера», затем создайте учебный снимок до изменений. Команды в этом уроке не нужны.',
    'Кнопки панели находятся над терминалом. Снимок и восстановление относятся только к данным этой модели.',[provider,snapshot],
    [g('Паспорт VPS просмотрен',s=>has(s,'provider')),g('Снимок до изменений создан',s=>!!s.snapshot&&has(s,'snapshot'))],'client',{},
    'На настоящем VPS сначала убедитесь, что умеете открыть консоль и понимаете, какие данные и диски попадают в snapshot. Здесь снимок — копия объектов модели, без заморозки реальных дисков.');
  add('Первое SSH-подключение','ssh · host key',
    'SSH соединяет клиент с сервером. При первом входе клиент показывает отпечаток host key. Сверьте его через доверенный канал, например консоль или панель провайдера. Не подтверждайте незнакомый отпечаток вслепую. В сценарии провайдер выдал первоначальный root-доступ; другие образы часто дают пользователя ubuntu.',
    'В локальной вкладке подключитесь root@203.0.113.10. Сверьте отпечаток с панелью провайдера и ответьте yes. Проверьте пользователя whoami.',
    'Выполните ssh root@203.0.113.10, откройте панель, затем в том же поле введите yes и whoami.',
    ['ssh root@'+IP,provider,'yes','whoami'],[g('Отпечаток подтверждён после сверки',s=>has(s,'host-verified')),g('Открыт root-сеанс и проверен пользователь',s=>S.user(s)==='root'&&has(s,'whoami'))],'client',{alternative:[provider,'ssh root@'+IP,'yes','whoami']},
    'В модели парольная аутентификация пропущена, реальные пароли не вводятся. При изменении host key на реальном сервере выясните причину, а не удаляйте известный ключ автоматически.');
  add('Что именно арендовано','cat · df · free · ip',
    'Проверьте ОС, место на диске, память и адрес интерфейса до установки приложений. Вывод диагностических команд помогает сопоставить заказ и фактическую машину. Значения в этом уроке учебные, а не характеристики вашего компьютера.',
    'Прочитайте /etc/os-release, посмотрите диск df -h, память free -h и адреса ip -brief address. Задайте hostname vps-lab и часовой пояс UTC, затем проверьте timedatectl.',
    'Имя: hostnamectl set-hostname vps-lab. Часовой пояс: timedatectl set-timezone UTC. Вы уже root.',
    ['cat /etc/os-release','df -h','free -h','ip -brief address','hostnamectl set-hostname vps-lab','timedatectl set-timezone UTC','timedatectl'],
    [g('ОС, диск, память и сеть просмотрены',s=>has(s,'read',e=>e.path==='/etc/os-release')&&has(s,'disk')&&has(s,'memory')&&has(s,'network')),g('Имя и UTC настроены, время проверено',s=>s.server.hostname==='vps-lab'&&s.server.timezone==='UTC'&&has(s,'time'))]);
  add('Обновления и перезагрузка','apt update · apt upgrade',
    'apt update обновляет индекс доступных пакетов. apt upgrade устанавливает обновления. Прочитайте список и вопросы менеджера пакетов; обновление ядра может потребовать перезагрузки. Модель не скачивает пакеты и мгновенно имитирует успешную установку.',
    'Обновите индекс, просмотрите apt list --upgradable, установите обновления и прочитайте /var/run/reboot-required. Перезагрузку пока не выполняйте.',
    'Введите apt update, apt list --upgradable, apt upgrade, затем cat /var/run/reboot-required.',
    ['apt update','apt list --upgradable','apt upgrade','cat /var/run/reboot-required'],
    [g('Индекс и пакеты обновлены',s=>s.server.updated&&s.server.upgraded),g('Список и необходимость reboot проверены',s=>has(s,'upgradable')&&has(s,'read',e=>e.path==='/var/run/reboot-required')&&s.server.rebootRequired)],'root',{alternative:['sudo apt update','apt list --upgradable','sudo apt upgrade -y','cat /var/run/reboot-required']});
  add('Отдельный администратор','adduser · usermod -aG sudo',
    'Для повседневной работы используйте отдельного пользователя. Группа sudo даёт административные возможности по запросу. Ключ -a у usermod добавляет группу, сохраняя другие. После изменения групп нужен новый вход. Интерактивное задание пароля adduser в тренажёре заменено учебным состоянием.',
    'Создайте пользователя admin, добавьте его в sudo и проверьте id admin. Существующий root-сеанс сохраните.',
    'adduser admin; затем отдельной командой usermod -aG sudo admin. Не вводите реальный пароль в тренажёр.',
    ['adduser admin','usermod -aG sudo admin','id admin'],
    [g('admin создан и добавлен в sudo',s=>!!s.server.users.admin?.sudo),g('Группы пользователя просмотрены',s=>has(s,'id',e=>e.user==='admin'))]);
  add('Ключ вместо передачи пароля','ssh-keygen · ssh-copy-id',
    'Пара ключей создаётся на вашем компьютере: private key хранится там и защищается passphrase, public key добавляется на VPS. ssh-copy-id использует уже доступный способ входа. Сначала проверьте отдельный вход по ключу и sudo, сохраняя прежний сеанс.',
    'Из локальной вкладки создайте учебную пару Ed25519, передайте public key admin, войдите с PreferredAuthentications=publickey и проверьте sudo -v. admin уже создан.',
    'Переключитесь кнопкой «Локальная вкладка». Затем ssh-keygen -t ed25519, ssh-copy-id admin@203.0.113.10, ssh -o PreferredAuthentications=publickey admin@203.0.113.10 и sudo -v.',keySteps,
    [g('Публичный ключ установлен',s=>s.client.key&&s.server.users.admin.key),g('Новый вход по ключу и sudo проверены',s=>has(s,'ssh-login',e=>e.user==='admin'&&e.method==='key')&&has(s,'sudo-tested',e=>e.user==='admin'))],'admin',{},
    'Никакие ключи здесь не генерируются: только маркеры в модели. На реальном компьютере не перезаписывайте существующий ключ; задайте отдельный путь при необходимости. PreferredAuthentications=publickey исключает парольную альтернативу для этой проверки.');
  add('Права на ключи','chmod 700 · chmod 600',
    'Для каталога ~/.ssh и файла authorized_keys важны владелец и права: доступ на запись другим пользователям может помешать проверке StrictModes. Учебная модель требует ровно 700 для каталога и 600 для файла; настоящий OpenSSH также проверяет владельца и родительские каталоги.',
    'У admin намеренно выставлены небезопасные права 777. В открытом сеансе исправьте ~/.ssh и authorized_keys, затем проверьте новый вход по ключу.',
    'chmod 700 ~/.ssh и chmod 600 ~/.ssh/authorized_keys. Затем локальная вкладка и SSH с PreferredAuthentications=publickey.',
    ['chmod 700 ~/.ssh','chmod 600 ~/.ssh/authorized_keys',local,keyLogin],
    [g('Права 700/600 исправлены',s=>s.server.users.admin.dirMode===0o700&&s.server.users.admin.keyMode===0o600),g('Свежий вход по ключу успешен',s=>has(s,'ssh-login',e=>e.user==='admin'&&e.method==='key'))],'key',{seed:v=>{v.state.server.users.admin.dirMode=0o777;v.state.server.users.admin.keyMode=0o777;}});
  add('Копия конфигурации SSH','cp · nano · drop-in',
    'Настройки на диске не меняют уже работающий sshd до применения. В Ubuntu используются drop-in файлы sshd_config.d; первое значение большинства директив имеет приоритет. Мы моделируем только один ранний файл 00-workshop.conf, без прочих Include и Match.',
    'Сначала скопируйте 00-workshop.conf в 00-workshop.conf.bak. Откройте исходный файл через sudo nano и задайте PermitRootLogin no, PasswordAuthentication no, KbdInteractiveAuthentication no, PubkeyAuthentication yes. Пока не применяйте.',
    'nano открывает редактор сайта. Перенесите четыре строки из разбора и нажмите «Сохранить файл». Суффикс .bak не попадает под Include *.conf.',
    ['sudo cp '+SSH+' '+SSH+'.bak','sudo nano '+SSH,hardEdit],
    [g('Копия исходного файла создана до редактирования',s=>!!s.server.files[SSH+'.bak']&&s.events.findIndex(e=>e.type==='config-copy')>=0&&s.events.findIndex(e=>e.type==='config-copy')<s.events.findIndex(e=>e.type==='edit')),g('На диске подготовлены четыре параметра',s=>{try{const c=config(s.server.files[SSH].text);return !c.root&&!c.password&&!c.kbd&&c.pubkey;}catch{return false;}}),g('Активная конфигурация пока прежняя',s=>s.server.ssh.password&&s.server.ssh.root)],'key');
  add('Применить и проверить новый вход','sshd -t · sshd -T · reload',
    'sshd -t проверяет синтаксис. sshd -T показывает вычисленные настройки с диска; это не тест успешной аутентификации. После reload проверьте новое соединение и sudo, прежде чем закрывать старое. Не отключайте способы входа, пока альтернативный доступ не проверен.',
    'Ключ и sudo уже подготовлены. До применения проверьте новый вход по ключу и sudo. Подготовьте защищённый конфиг с копией, выполните sshd -t и -T, reload, затем ещё раз новый вход и sudo.',
    'Порядок: проверить ключ/sudo; cp; nano; sshd -t; sshd -T; systemctl reload ssh; локальная вкладка; новый SSH; sudo -v.',
    [local,keyLogin,'sudo -v',...hardSteps],
    [g('Ключ и sudo проверены до reload',s=>{const r=s.events.findIndex(e=>e.type==='ssh-reloaded');return r>0&&s.events.slice(0,r).some(e=>e.type==='ssh-login'&&e.method==='key')&&s.events.slice(0,r).some(e=>e.type==='sudo-tested'&&e.user==='admin');}),g('Актуальная конфигурация проверена и применена',s=>!s.server.ssh.root&&!s.server.ssh.password&&!s.server.ssh.kbd&&s.server.ssh.pubkey&&has(s,'ssh-reloaded',e=>e.validated&&e.revision===s.server.revision)&&has(s,'ssh-effective',e=>e.revision===s.server.revision)),g('После reload открыт новый ключевой вход и проверен sudo',s=>after(s,'ssh-reloaded','ssh-login',e=>e.user==='admin'&&e.method==='key'&&e.revision===s.server.revision)&&after(s,'ssh-reloaded','sudo-tested',e=>e.user==='admin'))],'key',{},
    'На реальной машине сначала выясните все источники конфигурации (включая cloud-init), затем проверьте эффективные параметры. Здесь порт 22 не меняется; особенности socket activation и Match не моделируются.');
  add('Сначала разрешить SSH, затем UFW','ufw allow · ufw enable',
    'UFW — firewall внутри ОС. Firewall панели провайдера — отдельный уровень: нужный трафик должен проходить оба. Перед включением запрета входящих разрешите текущий SSH-порт. OpenSSH в этом сценарии соответствует 22/tcp. Учебная модель упрощает IPv4/IPv6 до общего набора правил.',
    'Задайте deny incoming и allow outgoing, разрешите SSH до включения UFW, подтвердите y. Просмотрите status verbose, проверьте новый ключевой вход и sudo.',
    'Сначала sudo ufw allow OpenSSH, затем enable. Не удаляйте правило SSH в существующем сеансе без плана восстановления.',firewallSteps,
    [g('UFW включён с нужными политиками и SSH-правилом',s=>s.server.ufw.enabled&&s.server.ufw.incoming==='deny'&&s.server.ufw.outgoing==='allow'&&S.route(s)),g('Разрешение SSH создано до enable',s=>{const i=s.events.findIndex(e=>e.type==='ufw-enabled');return i>=0&&s.events.slice(0,i).some(e=>e.type==='ufw-rule'&&e.port===22&&e.action==='allow'&&!e.remove);}),g('Правила и новый вход проверены',s=>has(s,'ufw-status')&&has(s,'ssh-login',e=>e.user==='admin'&&e.method==='key'&&e.firewall)&&has(s,'sudo-tested'))],'hardened',{alternative:firewallSteps.map(s=>s==='sudo ufw allow OpenSSH'?'sudo ufw allow 22/tcp':s)});
  add('Порт слушается, но доступен ли он?','ss · systemctl · свежий SSH',
    'ss показывает слушающие сокеты на сервере. Это ещё не доказывает внешнюю доступность: её ограничивают UFW, сеть провайдера и маршрутизация. Старый SSH-сеанс также не доказывает, что новый вход работает.',
    'Просмотрите ss -lntp, systemctl status ssh и ufw status verbose. Из локальной вкладки откройте новый SSH по ключу, затем sudo -v.',
    'Диагностику выполняйте в серверном сеансе, само подключение — из локальной вкладки.',
    ['sudo ss -lntp','systemctl status ssh','sudo ufw status verbose',local,keyLogin,'sudo -v'],
    [g('Сокет, служба и firewall проверены',s=>has(s,'sockets')&&has(s,'service-status',e=>e.name==='ssh')&&has(s,'ufw-status')),g('Новый доступ по ключу и sudo подтверждены',s=>has(s,'ssh-login',e=>e.method==='key'&&e.firewall)&&has(s,'sudo-tested'))],'firewall');
  add('Потеряли SSH: консоль провайдера','Консоль · ufw allow',
    'Ошибка firewall может закрыть новые соединения. Консоль провайдера обычно даёт другой путь, но её наличие и аутентификацию нужно проверить заранее. Не путайте её с ещё одной вкладкой SSH. В модели консоль доступна кнопкой и пропускает реальный вход.',
    'VPS уже блокирует SSH: разрешение 22/tcp удалено, входящие по умолчанию запрещены. Откройте консоль провайдера, верните правило 22/tcp и проверьте новый ключевой SSH-вход. UFW оставьте включённым.',
    'Нажмите «Консоль восстановления», выполните ufw allow 22/tcp, затем локальная вкладка и новый SSH.',
    [{action:'console'},'ufw allow 22/tcp',local,keyLogin],
    [g('Использована консоль восстановления',s=>has(s,'console')),g('UFW активен, SSH снова разрешён',s=>s.server.ufw.enabled&&S.route(s)),g('После исправления открыт новый SSH',s=>has(s,'ssh-login',e=>e.method==='key'&&e.firewall))],'firewall',{seed:v=>{v.state.server.ufw.rules=[];v.state.sessions=[];v.state.context='client';}});
  add('Автоматические обновления','unattended-upgrades · dry-run',
    'unattended-upgrades устанавливает разрешённые обновления автоматически. Поведение задают несколько файлов: расписание APT::Periodic и правила источников пакетов. Dry-run помогает проверить работу без установки, но не отменяет наблюдение за журналами и планирование reboot.',
    'Обновите индекс, установите unattended-upgrades, откройте 20auto-upgrades и включите Update-Package-Lists и Unattended-Upgrade значением "1". Выполните dry-run и проверьте таймер apt-daily-upgrade.timer.',
    'Содержимое файла — в разборе. Команда: sudo unattended-upgrade --dry-run --debug.',
    ['sudo apt update','sudo apt install unattended-upgrades','sudo nano '+AUTO,autoEdit,'sudo unattended-upgrade --dry-run --debug','systemctl status apt-daily-upgrade.timer'],
    [g('Пакет установлен и учебный dry-run выполнен',s=>s.server.packages.includes('unattended-upgrades')&&has(s,'auto-dry-run')),g('Таймер просмотрен',s=>has(s,'service-status',e=>e.name==='apt-daily-upgrade.timer'))],'firewall',{},
    'Модель проверяет два параметра расписания, а не весь набор Origins/таймеров/блокировок APT. В реальной Ubuntu пакет и настройки уже могут присутствовать: сначала осмотрите текущую конфигурацию. Автоматический reboot здесь не включается.');
  add('Служба и нужный порт','nginx · enable --now',
    'systemctl start запускает службу сейчас, enable включает старт при загрузке, --now сочетает оба действия. Сначала проверьте приложение через localhost. Порт наружу открывайте только для нужной службы. В этом уроке HTTP демонстрационный; реальный сайт потребует домен, TLS и настройку приложения.',
    'Установите nginx, включите автозапуск и запуск сейчас. Разрешите 80/tcp в UFW. Проверьте status, is-enabled и curl http://localhost.',
    'sudo apt update; sudo apt install nginx; sudo systemctl enable --now nginx; sudo ufw allow 80/tcp. Это отдельные команды.',
    ['sudo apt update','sudo apt install nginx','sudo systemctl enable --now nginx','sudo ufw allow 80/tcp','systemctl status nginx','systemctl is-enabled nginx','curl http://localhost'],
    [g('nginx установлен, активен и включён',s=>s.server.packages.includes('nginx')&&s.server.services.nginx.active&&s.server.services.nginx.enabled),g('Открыт только нужный HTTP-порт и выполнена проверка',s=>s.server.ufw.rules.some(r=>r.port===80&&r.action==='allow')&&has(s,'http-local')&&has(s,'service-enabled',e=>e.name==='nginx'))],'firewall');
  add('Диагностика службы','journalctl · status · ss',
    'Если приложение недоступно, начните с состояния службы и её журнала. Затем проверьте слушающий порт и локальный HTTP-ответ. Это разные уровни диагностики. Учебный журнал синтетический: в реальности изучайте конкретную причину сбоя, а не просто перезапускайте всё.',
    'nginx намеренно остановлен. Прочитайте status и journalctl -u nginx --no-pager, запустите службу и проверьте ss -lntp и curl http://localhost.',
    'После чтения журнала выполните sudo systemctl start nginx.',
    ['systemctl status nginx','sudo journalctl -u nginx --no-pager','sudo systemctl start nginx','sudo ss -lntp','curl http://localhost'],
    [g('Состояние и журнал изучены до запуска',s=>{const i=s.events.findIndex(e=>e.type==='service-start'&&e.name==='nginx');return i>=0&&s.events.slice(0,i).some(e=>e.type==='journal')&&s.events.slice(0,i).some(e=>e.type==='service-status');}),g('Служба активна, сокет и HTTP проверены',s=>s.server.services.nginx.active&&has(s,'sockets')&&has(s,'http-local'))],'web',{seed:v=>{v.state.server.services.nginx.active=false;v.state.server.logs.push('[учебный журнал] nginx: остановлен для упражнения, не авария реального сервера.');}});
  add('Копия, вынос и пробное восстановление','tar · scp · restore-check',
    'Копия на том же диске не защищает от потери VPS. Вынесите архив в независимое место и проверьте восстановление в отдельный каталог. Для реальной БД требуется согласованный дамп или подходящий backup-метод; один tar каталога работающей БД недостаточен.',
    'В сеансе admin без sudo создайте /home/admin/app.tgz из /srv/app с относительными путями. Просмотрите архив, восстановите в /tmp/restore-check и прочитайте app/settings.conf. Затем из локальной вкладки перенесите архив через scp.',
    'tar -czf /home/admin/app.tgz -C /srv app. Каталог теста создаётся mkdir -p /tmp/restore-check. Команда scp полностью показана в решении.',
    ['tar -czf /home/admin/app.tgz -C /srv app','tar -tzf /home/admin/app.tgz','mkdir -p /tmp/restore-check','tar -xzf /home/admin/app.tgz -C /tmp/restore-check','cat /tmp/restore-check/app/settings.conf',local,'scp admin@'+IP+':/home/admin/app.tgz ./app.tgz','ls'],
    [g('Архив просмотрен и проверен распаковкой',s=>has(s,'archive-listed')&&has(s,'archive-restored')&&has(s,'read',e=>e.path==='/tmp/restore-check/app/settings.conf')&&s.server.files['/tmp/restore-check/app/settings.conf']?.text===s.server.files['/srv/app/settings.conf'].text),g('Отдельная локальная копия получена',s=>!!s.client.downloads['app.tgz']&&has(s,'offsite-copy'))],'firewall',{},
    'scp и tar здесь копируют объекты модели. На реальной машине выберите защищённое хранилище, шифрование, период хранения, контроль ошибок и регулярную проверку восстановления. Архив создаётся пользователем admin, чтобы он мог прочитать его для scp.');
  add('Плановая перезагрузка','snapshot · reboot · проверка',
    'Перед reboot проверьте окно обслуживания, резервную копию и доступ к консоли. После загрузки проверьте новый вход, sudo и автозапуск нужных служб. Перезагрузка обрывает SSH; успешная команда reboot сама по себе не доказывает, что VPS вернулся.',
    'Создайте снимок, обновите индекс и пакеты, проверьте reboot-required и перезагрузите VPS. После этого войдите по ключу, проверьте sudo, nginx и локальный HTTP.',
    'Снимок — кнопкой провайдера. После sudo reboot вы окажетесь в локальной вкладке; ключевой SSH создаётся заново.',
    [snapshot,'sudo apt update','sudo apt upgrade','cat /var/run/reboot-required','sudo reboot',keyLogin,'sudo -v','systemctl status nginx','curl http://localhost'],
    [g('Снимок создан до reboot',s=>has(s,'snapshot')&&after(s,'snapshot','reboot')),g('Перезагрузка завершена и вход восстановлен',s=>s.server.boots>0&&!s.server.rebootRequired&&after(s,'reboot','ssh-login',e=>e.method==='key')&&after(s,'reboot','sudo-tested')),g('Служба вернулась и проверена',s=>s.server.services.nginx.active&&s.server.services.nginx.enabled&&after(s,'reboot','service-status',e=>e.name==='nginx')&&after(s,'reboot','http-local'))],'web');
  add('Возврат к снимку','восстановление · новая проверка',
    'Снимок возвращает более раннее состояние, поэтому изменения после него теряются. Он не является гарантией согласованности БД и не заменяет проверку приложения после восстановления. Здесь состояние и все последствия учебные.',
    'После сохранённого снимка SSH-служба была остановлена. Восстановите снимок кнопкой панели, подтвердите замену, затем проверьте новый ключевой вход, sudo и systemctl status ssh.',
    'Панель провайдера — «Восстановить снимок». После восстановления старые соединения закрыты.',
    [{action:'restore'},keyLogin,'sudo -v','systemctl status ssh'],
    [g('Учебный снимок восстановлен',s=>has(s,'snapshot-restored')),g('Новый доступ и SSH-служба проверены после восстановления',s=>after(s,'snapshot-restored','ssh-login',e=>e.method==='key')&&after(s,'snapshot-restored','sudo-tested')&&after(s,'snapshot-restored','service-status',e=>e.name==='ssh'))],'firewall',{seed:v=>{v.action('snapshot');v.state.server.services.ssh.active=false;v.state.sessions=[];v.state.context='client';v.state.events=[];}});
  const finalSteps=[provider,snapshot,'ssh root@'+IP,'yes','cat /etc/os-release','apt update','apt upgrade','adduser admin','usermod -aG sudo admin',...keySteps,...hardSteps,...firewallSteps,'sudo apt install unattended-upgrades','sudo nano '+AUTO,autoEdit,'sudo unattended-upgrade --dry-run --debug','tar -czf /home/admin/app.tgz -C /srv app','tar -tzf /home/admin/app.tgz','mkdir -p /tmp/restore-check','tar -xzf /home/admin/app.tgz -C /tmp/restore-check','cat /tmp/restore-check/app/settings.conf',local,'scp admin@'+IP+':/home/admin/app.tgz ./app.tgz'];
  add('Подготовьте свой учебный VPS','от первого входа до проверенной копии',
    'Соберите путь целиком. Успех — не количество выполненных команд, а обновлённая система, отдельный администратор, проверенный ключевой вход после SSH/UFW и копия, которую удалось восстановить. Это вводный фундамент, а не универсальная production-конфигурация.',
    'С чистого состояния: паспорт и снимок, первый SSH, ОС/обновления, admin+sudo, ключ и проверка sudo; копия SSH-конфига, запрет root/парольного/keyboard-interactive входа, проверка и reload; UFW deny incoming/allow outgoing с SSH-правилом до enable и новым входом; автообновления с dry-run; архив приложения, тест восстановления и отдельная локальная копия. Reboot и веб-сервер в этом итоговом задании не требуются.',
    'Проходите этапы сверху вниз. Держите root-сеанс, пока не проверили admin по ключу и sudo. Статус VPS показывает настройки на диске и активные отдельно.',finalSteps,
    [g('Исходная точка сохранена, ОС и обновления проверены',s=>!!s.snapshot&&has(s,'provider')&&has(s,'read',e=>e.path==='/etc/os-release')&&s.server.upgraded),g('Администратор и ключ проверены до ограничения SSH',s=>s.server.users.admin?.sudo&&s.server.users.admin.key&&(()=>{const i=s.events.findIndex(e=>e.type==='ssh-reloaded');return i>0&&s.events.slice(0,i).some(e=>e.type==='ssh-login'&&e.user==='admin'&&e.method==='key')&&s.events.slice(0,i).some(e=>e.type==='sudo-tested'&&e.user==='admin');})()),g('SSH применён после проверки и резервной копии',s=>!!s.server.files[SSH+'.bak']&&!s.server.ssh.root&&!s.server.ssh.password&&!s.server.ssh.kbd&&s.server.ssh.pubkey&&has(s,'ssh-reloaded',e=>e.validated&&e.revision===s.server.revision)),g('UFW настроен без потери нового входа',s=>s.server.ufw.enabled&&s.server.ufw.incoming==='deny'&&s.server.ufw.outgoing==='allow'&&S.route(s)&&after(s,'ufw-enabled','ssh-login',e=>e.user==='admin'&&e.method==='key'&&e.firewall)&&(()=>{const i=s.events.findIndex(e=>e.type==='ufw-enabled');return s.events.slice(0,i).some(e=>e.type==='ufw-rule'&&e.port===22&&e.action==='allow'&&!e.remove);})()),g('Автообновления проверены',s=>has(s,'auto-dry-run')),g('Копия восстановлена, прочитана и вынесена',s=>has(s,'archive-restored')&&has(s,'read',e=>e.path==='/tmp/restore-check/app/settings.conf')&&!!s.client.downloads['app.tgz']&&s.server.files['/tmp/restore-check/app/settings.conf']?.text===s.server.files['/srv/app/settings.conf'].text)],'client',{alternative:finalSteps.map(step=>step==='sudo ufw allow OpenSSH'?'sudo ufw allow 22/tcp':step)});
  function create(lesson){const v=base(lesson.stage);if(lesson.seed)lesson.seed(v);v.state.events=[];return v;}
  function check(lesson,state){return lesson.goals.map(goal=>{try{return {label:goal.label,pass:!!goal.test(state)};}catch{return {label:goal.label,pass:false};}});}
  function describe(steps){return steps.map(step=>typeof step==='string'?step:step.edit!==undefined?'[Редактор: сохранить текст]\n'+step.edit:'[Кнопка: '+({client:'Локальная вкладка',provider:'Панель провайдера',console:'Консоль восстановления',snapshot:'Создать снимок',restore:'Восстановить снимок'}[step.action]||step.action)+']').join('\n');}
  const api={lessons,create,apply,check,describe,base};if(typeof module!=='undefined')module.exports=api;else root.VPSCourse=api;
})(globalThis);
