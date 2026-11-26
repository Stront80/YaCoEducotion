/* Авторские задания. Начальная среда, решения и альтернативы используют один
   движок; критерии оценивают состояние и наблюдения, а не строку ответа. */
(function(root){
  'use strict';
  const engine=typeof module!=='undefined'&&module.exports?require('./engine.js'):root.TmuxWorkshop;
  const {TmuxModel}=engine,lessons=[];
  const K=keys=>({keys}),S=shell=>({shell}),T=tmux=>({tmux});
  const goal=(label,test)=>({label,test});
  const session=(s,name)=>s.sessions.find(item=>item.name===name);
  const window=(s,name='learn',index=0)=>session(s,name)?.windows.find(w=>w.index===index);
  const event=(s,type,test=()=>true)=>s.events.some(e=>e.type===type&&test(e));
  const attached=(s,name)=>s.attached===session(s,name)?.id&&!!s.attached;
  function add(id,group,title,topic,theory,task,hint,seed,solution,alternative,goals,explanation=''){
    lessons.push({id,group,title,topic,theory,task,hint,seed,solution,alternative,goals,explanation:explanation||'Ctrl+B — префикс: нажмите, отпустите Ctrl, затем следующую клавишу. Команды с tmux вводятся в поле оболочки и завершаются Enter. Здесь это только учебная модель, без процессов ОС.'});
  }
  add('start-1','Сессии и окна','Префикс открывает возможности','Ctrl+B · ?',
    'Обычно ввод получает программа активной панели. Для управления tmux сначала нужен префикс Ctrl+B: отпустите клавиши, затем нажмите команду. Начните со справки, чтобы увидеть доступные сочетания.',
    'Откройте учебную справку через Ctrl+B, затем ?. Выйдите из неё клавишей q или Esc.',
    'Префикс показывается янтарной меткой. Последовательность: Ctrl+B, ?, q.',
    {},[K('<C-b>?q')],[S('tmux list-keys')],
    [goal('Справка просмотрена',s=>event(s,'help')),goal('Вы вернулись к вводу',s=>s.mode==='normal'&&!s.prefix)]);
  add('start-2','Сессии и окна','Первая сессия','tmux new -s',
    'Сессия объединяет окна, каждое окно содержит панели. Одна панель представляет один терминал. Сейчас вы снаружи tmux, в учебной оболочке: сначала создайте именованную сессию.',
    'Создайте сессию learn и подключитесь к ней. В ней должно быть одно окно с одной панелью.',
    'Введите tmux new -s learn и нажмите Enter. Сам знак $ из приглашения не вводите.',
    {empty:true},[S('tmux new -s learn')],[S('tmux new-session -s learn')],
    [goal('Сессия learn создана и подключена',s=>attached(s,'learn')),goal('Одно окно и одна панель',s=>session(s,'learn')?.windows.length===1&&window(s)?.panes.length===1)]);
  add('start-3','Сессии и окна','Ещё одно рабочее окно','Ctrl+B · c',
    'Окно занимает рабочую область целиком. В нём может быть несколько панелей. Создание окна не уничтожает предыдущее: список окон остаётся в строке статуса.',
    'Создайте второе окно в learn. Оно должно стать текущим и получить индекс 1.',
    'Нажмите Ctrl+B, отпустите, затем c.',
    {},[K('<C-b>c')],[S('tmux new-window')],
    [goal('В сессии два окна',s=>session(s,'learn')?.windows.length===2),goal('Текущее окно с индексом 1',s=>session(s,'learn')?.currentWindow===window(s,'learn',1)?.id)]);
  add('start-4','Сессии и окна','Понятные имена окон','Ctrl+B · ,',
    'Имя окна помогает ориентироваться в строке статуса. Индекс и имя — разные вещи: переименование не меняет номер. После префикса запятая открывает ввод нового имени.',
    'Переименуйте окно 0 в editor. Сохраните одну сессию и одно окно.',
    'Ctrl+B, запятая, затем editor и Enter. Поле ввода изменит подпись.',
    {},[K('<C-b>,editor<Enter>')],[S('tmux rename-window editor')],
    [goal('Окно 0 называется editor',s=>window(s)?.name==='editor'),goal('Структура не разрослась',s=>s.sessions.length===1&&session(s,'learn')?.windows.length===1)]);
  add('start-5','Сессии и окна','Переключаемся между окнами','n · p · номер',
    'После префикса n выбирает следующее окно, p — предыдущее, цифра — окно с этим индексом. Звёздочка в статусе показывает текущее окно. Список циклический.',
    'Из окна logs (1) перейдите в окно 0, вернитесь в 1 и закончите в 0. Оба окна должны сохраниться.',
    'Последовательность: Ctrl+B 0, Ctrl+B n, Ctrl+B p.',
    {setup:[T('new-window -n logs')]},[K('<C-b>0<C-b>n<C-b>p')],[K('<C-b>p<C-b>n<C-b>0')],
    [goal('Текущее окно — 0',s=>session(s,'learn')?.currentWindow===window(s)?.id),goal('Оба окна посещены',s=>event(s,'select-window',e=>e.id===window(s)?.id)&&event(s,'select-window',e=>e.id===window(s,'learn',1)?.id)),goal('Оба окна на месте',s=>session(s,'learn')?.windows.length===2)]);
  add('start-6','Сессии и окна','Отключиться — не закрыть','detach · attach',
    'Detach отключает клиент, сохраняя сессию, окна и панели. Attach подключает к существующей сессии. В тренажёре «жизнь» сессии представлена данными браузера, реального фонового процесса нет.',
    'Отключитесь от learn, затем подключитесь обратно. Сохраните строку MARKER в истории панели.',
    'Ctrl+B, d. Затем во внешней оболочке: tmux attach -t learn и Enter.',
    {setup:[S('echo MARKER')]},[K('<C-b>d'),S('tmux attach -t learn')],[S('tmux detach-client'),S('tmux attach-session -t learn')],
    [goal('Сейчас подключено learn',s=>attached(s,'learn')),goal('Были detach и attach',s=>event(s,'detach')&&event(s,'attach')),goal('Текст панели сохранился',s=>window(s)?.panes[0].lines.includes('MARKER'))]);
  add('panes-1','Панели и раскладки','Два терминала рядом','Ctrl+B · %',
    'Панели делят одно окно на прямоугольники. После префикса % создаёт новую панель справа от активной. Фокус переходит в новую панель; прежняя остаётся слева.',
    'Разделите окно learn:0 на две панели рядом, слева и справа. Новая правая панель должна быть активной.',
    'Ctrl+B, затем %. Эквивалентная команда: tmux split-window -h.',
    {},[K('<C-b>%')],[S('tmux split-window -h')],
    [goal('Две панели рядом',s=>window(s)?.panes.length===2&&window(s).tree.axis==='x'),goal('Новая панель активна',s=>window(s)?.activePane==='%1')]);
  add('panes-2','Панели и раскладки','Панель над панелью','Ctrl+B · "',
    'После префикса двойная кавычка создаёт панель под активной. Важнее представить положение, чем запоминать неоднозначные слова «горизонтальный» и «вертикальный»: -h — рядом, -v — сверху/снизу.',
    'Разделите окно на верхнюю и нижнюю панели. Нижняя должна стать активной.',
    'Ctrl+B, затем двойная кавычка. В командной строке подойдёт tmux split-window -v.',
    {},[K('<C-b>"')],[S('tmux split-window')],
    [goal('Две панели сверху и снизу',s=>window(s)?.panes.length===2&&window(s).tree.axis==='y'),goal('Нижняя панель активна',s=>window(s)?.activePane==='%1')]);
  add('panes-3','Панели и раскладки','Куда попадёт ввод?','Ctrl+B · o · направления',
    'Ввод получает только активная панель. Её рамка выделена. После префикса o перебирает панели, а стрелки выбирают соседнюю в нужном направлении.',
    'Переведите фокус из правой панели %1 в левую %0. Сохраните обе панели.',
    'Ctrl+B, затем Left, либо Ctrl+B, затем o.',
    {setup:[T('split-window -h')]},[K('<C-b><Left>')],[K('<C-b>o')],
    [goal('Активна левая панель %0',s=>window(s)?.activePane==='%0'),goal('Обе панели остались',s=>window(s)?.panes.length===2)]);
  add('panes-4','Панели и раскладки','Временно больше места','Ctrl+B · z',
    'Zoom разворачивает активную панель на всё окно, временно скрывая соседние. Ещё одно нажатие возвращает прежнее разделение. Скрытые панели не закрываются.',
    'Разверните активную панель, затем восстановите обычный вид. Итог — две панели без zoom.',
    'Дважды выполните Ctrl+B, z. В статусе развёрнутого окна появляется Z.',
    {setup:[T('split-window -h')]},[K('<C-b>z<C-b>z')],[S('tmux resize-pane -Z'),S('tmux resize-pane -Z')],
    [goal('Zoom включался и выключался',s=>event(s,'zoom',e=>e.enabled)&&event(s,'zoom',e=>!e.enabled)),goal('Разделение восстановлено',s=>window(s)?.panes.length===2&&!window(s).zoom)]);
  add('panes-5','Панели и раскладки','Готовая раскладка','Ctrl+B · Space',
    'Раскладка меняет геометрию, сохраняя панели. В модели цикл Space содержит even-horizontal (рядом), even-vertical (сверху/снизу), tiled (сетка). Полный tmux имеет и другие варианты.',
    'Разместите две панели поровну сверху и снизу через even-vertical.',
    'Из исходной custom-раскладки: Ctrl+B Space дважды. Можно явно выбрать select-layout even-vertical.',
    {setup:[T('split-window -h')]},[K('<C-b><Space><C-b><Space>')],[S('tmux select-layout even-vertical')],
    [goal('Выбрана even-vertical',s=>window(s)?.layout==='even-vertical'),goal('Две панели в столбец',s=>window(s)?.panes.length===2&&window(s).tree.axis==='y')]);
  add('panes-6','Панели и раскладки','Закрываем только лишнее','Ctrl+B · x · y',
    'После префикса x запрашивает подтверждение закрытия активной панели. y подтверждает, n или Esc отменяет. Закрытие последней панели удалит и окно; последнего окна — сессию. Здесь закрываются только виртуальные данные.',
    'Закройте правую панель %1. Сохраните левую %0, окно и сессию learn.',
    'Ctrl+B, x, затем y. Подтверждение относится к учебной панели, не к процессам компьютера.',
    {setup:[T('split-window -h')]},[K('<C-b>xy')],[S('tmux kill-pane -t %1')],
    [goal('Осталась только панель %0',s=>window(s)?.panes.length===1&&window(s).panes[0].id==='%0'),goal('Сессия остаётся подключённой',s=>attached(s,'learn')),goal('Панель %1 закрыта',s=>event(s,'kill-pane',e=>e.id==='%1'))]);
  add('manage-1','Управление средой','Несколько независимых сессий','new -d · list-sessions',
    'Можно создать сессию, не подключаясь к ней: для этого используется -d. Команда list-sessions (коротко ls) показывает сессии. У каждой собственные окна и активная панель.',
    'Создайте отдельную сессию work без подключения и выведите список сессий. Текущая learn должна остаться подключённой.',
    'tmux new -d -s work, затем tmux ls.',
    {},[S('tmux new -d -s work'),S('tmux ls')],[K('<C-b>:new-session -d -s work<Enter>'),S('tmux list-sessions')],
    [goal('Есть learn и work',s=>s.sessions.length===2&&!!session(s,'learn')&&!!session(s,'work')),goal('Подключение осталось к learn',s=>attached(s,'learn')),goal('Список сессий просмотрен',s=>event(s,'list-sessions'))]);
  add('manage-2','Управление средой','Имя для рабочего контекста','Ctrl+B · $',
    'Имя сессии должно отличаться от имён других сессий. После префикса $ открывается ввод нового имени. Переименование сохраняет окна, панели и подключение.',
    'Переименуйте learn в study, сохранив окно и панель.',
    'Ctrl+B, $, введите study и нажмите Enter.',
    {},[K('<C-b>$study<Enter>')],[S('tmux rename-session study')],
    [goal('Подключена сессия study',s=>attached(s,'study')),goal('Старого имени learn нет',s=>!session(s,'learn')),goal('Окно и панель на месте',s=>window(s,'study')?.panes.length===1)]);
  add('manage-3','Управление средой','Выбираем нужную сессию','Ctrl+B · s',
    'После префикса s открывается список сессий. В модели выберите строку стрелками и нажмите Enter. Это переключает клиент, не уничтожая прежнюю сессию.',
    'Переключитесь из learn в work. Обе сессии должны сохраниться. Попробуйте сделать это через список.',
    'Ctrl+B, s, Down, Enter. Альтернативная команда — tmux switch-client -t work.',
    {setup:[T('new-session -d -s work')]},[K('<C-b>s<Down><Enter>')],[S('tmux switch-client -t work')],
    [goal('Клиент подключён к work',s=>attached(s,'work')),goal('Обе сессии сохранены',s=>s.sessions.length===2&&!!session(s,'learn'))]);
  add('manage-4','Управление средой','Из панели — отдельное окно','Ctrl+B · !',
    'Панель можно вынести в отдельное окно. В модели сохраняются её ID, история и строка ввода. Команда break-pane делает это с активной панелью; единственную панель окна выносить здесь нельзя.',
    'Вынесите правую панель %1 в новое окно. В старом должна остаться %0, в новом — %1 со строкой PRIVATE_NOTE.',
    'Ctrl+B, затем !. Новое окно станет текущим.',
    {setup:[T('split-window -h'),S('echo PRIVATE_NOTE')]},[K('<C-b>!')],[S('tmux break-pane')],
    [goal('Два окна по одной панели',s=>session(s,'learn')?.windows.length===2&&session(s,'learn').windows.every(w=>w.panes.length===1)),goal('Панель %1 и её текст сохранились',s=>window(s,'learn',1)?.panes[0].id==='%1'&&window(s,'learn',1).panes[0].lines.includes('PRIVATE_NOTE')),goal('Новое окно активно',s=>session(s,'learn')?.currentWindow===window(s,'learn',1)?.id)]);
  add('manage-5','Управление средой','Вывод не исчезает сразу','Ctrl+B · [ · PageUp',
    'У панели есть история вывода. Полный tmux использует copy-mode для просмотра и копирования. В этой первой версии реализован только просмотр истории: Up/Down и PageUp/PageDown, без выделения и буфера копирования.',
    'Откройте историю, прокрутите её вверх и вернитесь к обычному вводу. Учебный журнал должен сохраниться.',
    'Ctrl+B, [, затем PageUp, затем q. Esc тоже возвращает к вводу.',
    {setup:[S('demo-log')]},[K('<C-b>[<PageUp>q')],[S('tmux copy-mode'),K('<Up><Esc>')],
    [goal('История открывалась и прокручивалась',s=>event(s,'copy-enter')&&event(s,'copy-scroll')),goal('Вы вернулись к обычному вводу',s=>s.mode==='normal'),goal('Конец журнала сохранился',s=>window(s)?.panes[0].lines.some(line=>line.startsWith('Журнал 30')))]);
  add('manage-6','Управление средой','Команды без выхода в shell','Ctrl+B · :',
    'Командная строка tmux открывается после префикса и двоеточия. В ней указывается имя команды без слова tmux. Команда new-window -n logs создаёт окно с заданным именем.',
    'Через командную строку tmux создайте второе окно logs. Оно должно стать текущим.',
    'Ctrl+B, :, затем new-window -n logs и Enter.',
    {},[K('<C-b>:new-window -n logs<Enter>')],[K('<C-b>:neww -n logs<Enter>')],
    [goal('Окно 1 называется logs',s=>window(s,'learn',1)?.name==='logs'),goal('Оно текущее',s=>session(s,'learn')?.currentWindow===window(s,'learn',1)?.id),goal('Команда выполнена из приглашения tmux',s=>event(s,'prompt-command'))]);
  add('final','Итоговая практика','Собираем рабочее место','Собираем навыки',
    'Соедините сессии, окна, вложенные разделения и восстановление подключения. Смотрите на структуру: окно editor и его панели — один рабочий контекст, logs — другое окно той же сессии.',
    'Создайте подключённую сессию project: окно editor с основной панелью слева и двумя справа друг над другом; окно logs с одной панелью. Отключитесь и подключитесь обратно. В конце должно быть выбрано editor.',
    'tmux new -s project -n editor; затем Ctrl+B %, Ctrl+B ". Создайте окно logs, вернитесь в 0, сделайте detach и attach к project. Команды вводятся отдельно, без ;.',
    {empty:true},[S('tmux new -s project -n editor'),K('<C-b>%<C-b>"<C-b>c<C-b>,logs<Enter><C-b>0<C-b>d'),S('tmux attach -t project')],
    [S('tmux new-session -s project -n editor'),S('tmux split-window -h'),S('tmux split-window -v'),S('tmux new-window -n logs'),S('tmux select-window -t 0'),S('tmux detach-client'),S('tmux attach-session -t project')],
    [goal('Сессия project подключена',s=>attached(s,'project')),goal('Есть окна editor и logs',s=>session(s,'project')?.windows.length===2&&window(s,'project',0)?.name==='editor'&&window(s,'project',1)?.name==='logs'),goal('В editor три вложенные панели',s=>{const w=window(s,'project',0);return w?.panes.length===3&&w.tree.axis==='x'&&'pane' in w.tree.first&&w.tree.second.axis==='y';}),goal('В logs одна панель',s=>window(s,'project',1)?.panes.length===1),goal('Выбрано editor',s=>session(s,'project')?.currentWindow===window(s,'project',0)?.id),goal('Подключение восстановлено после detach',s=>event(s,'detach')&&event(s,'attach'))],
    'Вы создали рабочий контекст, разделили его на панели и вернулись к нему после отключения. В настоящем tmux сессии живут в серверном процессе. Здесь весь результат — данные браузера; полноценный терминал и фоновые программы не запускаются.');
  const apply=(model,steps)=>{for(const step of steps){if(step.keys)model.feed(step.keys);else if(step.shell!==undefined)model.submit(step.shell);else if(step.tmux)model.command(step.tmux);}return model;};
  const create=lesson=>{const m=new TmuxModel({empty:!!lesson.seed.empty});apply(m,lesson.seed.setup||[]);m.state.events=[];m.state.error=false;m.tell('Учебная среда готова. Начните с задания.');m.validate();return m;};
  const check=(lesson,state)=>lesson.goals.map(g=>{try{return {label:g.label,pass:!!g.test(state)};}catch{return {label:g.label,pass:false};}});
  const describe=steps=>steps.map(step=>step.shell!==undefined?'$ '+step.shell:step.keys||': '+step.tmux).join('\n');
  const api={lessons,create,apply,check,describe};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TmuxCourse=api;
})(typeof globalThis!=='undefined'?globalThis:this);
