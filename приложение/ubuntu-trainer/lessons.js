/* Авторские задания используют виртуальные результаты. Содержимое состояния
   проверяется независимо от точного текста введённых команд. */
(function(root){
  'use strict';
  const home='/home/student';
  const file=(content='',mode=0o644)=>({type:'file',content,mode});
  const dir=()=>({type:'dir',mode:0o755});
  const node=(s,path)=>s.fs[home+'/'+path];
  const event=(s,type,test=()=>true)=>s.events.some(e=>e.type===type&&test(e));
  const goal=(label,test)=>({label,test});
  const lessons=[];
  function add(id,group,title,command,theory,task,hint,solution,alternative,goals,seed={},explanation=''){
    lessons.push({id,group,title,command,theory,task,hint,solution,alternative,goals,seed,explanation:explanation||'Команды выполняются по очереди. Проверка смотрит на результат в учебной среде, поэтому абсолютные и относительные пути могут быть равноценны.'});
  }
  add('start-1','Первые шаги','Где я нахожусь?','pwd',
    'Терминал принимает текстовые команды. Введите команду и нажмите Enter. Приглашение student@ubuntu:~$ показывает имя, учебный компьютер и папку. Символ ~ означает домашнюю папку. Сам знак $ вводить не нужно.',
    'Узнайте полный путь к текущей папке командой pwd. Начальная папка — /home/student.',
    'Введите три латинские буквы: pwd. Регистр имеет значение.',
    ['pwd'],['pwd   '],
    [goal('Показан путь /home/student',s=>event(s,'pwd',e=>e.path===home))],{},
    'pwd расшифровывается как print working directory. Команда ничего не меняет: она сообщает ваше положение в файловой системе.');
  add('start-2','Первые шаги','Что лежит в папке?','ls · ls -a',
    'ls выводит содержимое папки. Имена с точкой в начале обычно скрыты. Параметр -a включает их в список, а -l показывает подробности. Команда, параметры и путь разделяются пробелами.',
    'Выведите содержимое домашней папки, включая скрытый файл .profile.',
    'Используйте ls -a. Можно добавить -l: ls -la.',
    ['ls -a'],['ls -la /home/student'],
    [goal('Домашняя папка просмотрена со скрытыми именами',s=>event(s,'ls',e=>e.path===home&&e.hidden))],{},
    'Параметры меняют поведение команды. В симуляторе ls -a показывает скрытые файлы, но служебные записи . и .. в вывод не добавляются.');
  add('start-3','Первые шаги','Переходим между папками','cd · .. · ~',
    'cd меняет текущий каталог. Documents — относительный путь от текущей папки, /home/student/Documents — абсолютный от корня /. Две точки .. ведут к родителю, ~ — домой.',
    'Перейдите в Documents и выведите полный путь. Завершите урок внутри Documents.',
    'Сначала cd Documents, затем pwd. Команды вводятся отдельно.',
    ['cd Documents','pwd'],['cd /home/student/Documents','pwd'],
    [goal('Текущая папка — Documents',s=>s.cwd===home+'/Documents'),goal('Полный путь Documents выведен',s=>event(s,'pwd',e=>e.path===home+'/Documents'))]);
  add('start-4','Первые шаги','Создаём структуру','mkdir -p',
    'Каталоги организуют файлы. mkdir создаёт папку, а -p позволяет сразу создать отсутствующие родительские каталоги. Если путь содержит пробелы, заключите его в кавычки.',
    'В домашней папке создайте структуру practice/week1. Перейдите в week1.',
    'mkdir -p practice/week1, затем cd practice/week1.',
    ['mkdir -p practice/week1','cd practice/week1'],['mkdir practice','mkdir practice/week1','cd ~/practice/week1'],
    [goal('Создана папка practice/week1',s=>node(s,'practice/week1')?.type==='dir'),goal('Вы находитесь внутри week1',s=>s.cwd===home+'/practice/week1')]);
  add('start-5','Первые шаги','Первые файлы','touch',
    'touch создаёт пустой файл, если такого имени ещё нет. Если файл существует, его текст сохраняется. В настоящей системе touch также обновляет временные метки; в модели время не учитывается.',
    'Создайте в домашней папке пустые plan.txt и ideas.txt.',
    'Одна команда может получить два пути: touch plan.txt ideas.txt.',
    ['touch plan.txt ideas.txt'],['touch ~/ideas.txt','touch /home/student/plan.txt'],
    [goal('plan.txt существует и пуст',s=>node(s,'plan.txt')?.type==='file'&&node(s,'plan.txt').content===''),goal('ideas.txt существует и пуст',s=>node(s,'ideas.txt')?.type==='file'&&node(s,'ideas.txt').content==='')]);
  add('start-6','Первые шаги','Читаем текст','cat',
    'cat выводит содержимое файла в терминал. После команды укажите путь. Это удобно для небольших текстовых файлов. Чтение в панели файлов помогает ориентироваться, но в этом задании нужна практика команды.',
    'Прочитайте файл Documents/notes.txt командой cat.',
    'Файл уже существует. Используйте cat Documents/notes.txt.',
    ['cat Documents/notes.txt'],['cd Documents','cat ./notes.txt'],
    [goal('notes.txt прочитан в терминале',s=>event(s,'read',e=>e.path===home+'/Documents/notes.txt'))]);
  add('files-1','Файлы и текст','Копия без потери оригинала','cp',
    'cp создаёт копию: сначала источник, затем назначение. При назначении существующего файла его содержимое может замениться. Для копирования целой папки используется cp -r.',
    'Скопируйте readme.txt в backup.txt в домашней папке. Сохраните оригинал без изменений.',
    'cp readme.txt backup.txt. Команда обычно ничего не печатает при успехе.',
    ['cp readme.txt backup.txt'],['cp /home/student/readme.txt ~/backup.txt'],
    [goal('backup.txt содержит копию readme.txt',s=>node(s,'backup.txt')?.type==='file'&&node(s,'backup.txt').content===node(s,'readme.txt')?.content),goal('Исходный readme.txt сохранён',s=>node(s,'readme.txt')?.content.startsWith('Добро пожаловать'))]);
  add('files-2','Файлы и текст','Переименовываем файл','mv',
    'mv переносит или переименовывает: источник указывается перед назначением. В отличие от копирования, прежнее имя исчезает. Существующее назначение может быть перезаписано.',
    'Переименуйте draft.txt в report.txt, сохранив текст «Первый отчёт».',
    'mv draft.txt report.txt.',
    ['mv draft.txt report.txt'],['mv ~/draft.txt /home/student/report.txt'],
    [goal('report.txt сохранил текст',s=>node(s,'report.txt')?.content==='Первый отчёт\n'),goal('Старого имени draft.txt нет',s=>!node(s,'draft.txt'))],{'draft.txt':file('Первый отчёт\n')});
  add('files-3','Файлы и текст','Удаление и аккуратность','rm · rmdir',
    'rm удаляет файлы, rm -r — папку вместе с содержимым. rmdir удаляет только пустую папку. В обычном терминале корзина не используется. Здесь вы меняете лишь виртуальные данные урока; сброс восстановит начальную среду.',
    'Удалите папку junk вместе с temp.txt внутри. Сохраните Documents/notes.txt.',
    'Используйте rm -r junk. Вариант: удалить файл, затем пустую папку через rmdir.',
    ['rm -r junk'],['rm junk/temp.txt','rmdir junk'],
    [goal('Папка junk и её файл удалены',s=>!node(s,'junk')&&!node(s,'junk/temp.txt')),goal('Учебные заметки сохранены',s=>node(s,'Documents/notes.txt')?.content==='Ubuntu\nтерминал\nпрактика\n')],{'junk':dir(),'junk/temp.txt':file('Временный файл\n')},
    'Перед удалением полезно посмотреть ls и проверить путь. Не переносите команды удаления на свой компьютер без понимания их действия. В модели можно восстановить весь урок кнопкой сброса.');
  add('files-4','Файлы и текст','Записываем и дописываем','echo · > · >>',
    'echo выводит текст. Оболочка перенаправляет вывод: > заменяет содержимое файла, >> дописывает в конец. Кавычки объединяют текст с пробелами в один аргумент. Сам echo без -n добавляет перевод строки.',
    'Создайте learning.txt с двумя строками в порядке: Ubuntu, затем Практика.',
    'echo Ubuntu > learning.txt, затем echo Практика >> learning.txt.',
    ['echo Ubuntu > learning.txt','echo Практика >> learning.txt'],['echo "Ubuntu" > ~/learning.txt',"echo 'Практика' >> /home/student/learning.txt"],
    [goal('Файл содержит ровно две нужные строки',s=>node(s,'learning.txt')?.content==='Ubuntu\nПрактика\n')]);
  add('files-5','Файлы и текст','Начало и конец файла','head · tail',
    'Большой файл не всегда нужно читать целиком. head показывает начало, tail — конец. Параметр -n задаёт число строк. По умолчанию обе команды показывают до десяти строк.',
    'Выведите первые две строки Documents/events.log, затем последнюю строку этого файла.',
    'head -n 2 Documents/events.log и tail -n 1 Documents/events.log.',
    ['head -n 2 Documents/events.log','tail -n 1 Documents/events.log'],['cd Documents','head -n 2 ./events.log','tail -n 1 /home/student/Documents/events.log'],
    [goal('Показаны первые две строки журнала',s=>event(s,'head',e=>e.path===home+'/Documents/events.log'&&e.count===2&&e.output==='INFO start\nERROR connection')),goal('Показана последняя строка журнала',s=>event(s,'tail',e=>e.path===home+'/Documents/events.log'&&e.count===1&&e.output==='INFO done'))]);
  add('files-6','Файлы и текст','Находим строки','grep',
    'grep отбирает строки, содержащие искомый текст. Параметр -i игнорирует регистр, -n добавляет номера строк. Настоящий grep поддерживает регулярные выражения; здесь реализован только буквальный поиск, как с -F.',
    'Найдите и выведите обе строки с ERROR из Documents/events.log.',
    'grep ERROR Documents/events.log. Можно передать содержимое через cat и |.',
    ['grep ERROR Documents/events.log'],['cat Documents/events.log | grep -i error'],
    [goal('Выведены две строки ошибок',s=>event(s,'grep',e=>e.output==='ERROR connection\nERROR timeout\n'))]);
  add('tools-1','Поиск и инструменты','Поиск файла по имени','find -name',
    'find обходит дерево от указанной папки. -name фильтрует имя: * означает любое число символов, ? — один символ. Кавычки передают шаблон самой команде, а не оболочке.',
    'Из домашней папки найдите notes.txt в её дереве командой find с параметром -name.',
    'find . -name "notes.txt". Подойдёт и шаблон "notes.*".',
    ['find . -name "notes.txt"'],['find /home/student -name "notes.*"'],
    [goal('find нашёл Documents/notes.txt',s=>event(s,'find',e=>e.found?.includes(home+'/Documents/notes.txt')))]);
  add('tools-2','Поиск и инструменты','Соединяем команды','| · wc -l',
    'Конвейер | передаёт текстовый вывод одной команды на вход следующей. wc -l считает символы перевода строки. Так можно сначала отобрать нужные строки, затем посчитать их.',
    'Через конвейер отберите ERROR в Documents/events.log и посчитайте строки с помощью wc -l. Результат должен быть 2.',
    'grep ERROR Documents/events.log | wc -l.',
    ['grep ERROR Documents/events.log | wc -l'],['cat Documents/events.log | grep -i error | wc -l'],
    [goal('Конвейер grep и wc вернул 2',s=>event(s,'pipeline',e=>e.commands?.includes('grep')&&e.commands?.includes('wc')&&e.output==='2\n'))]);
  add('tools-3','Поиск и инструменты','Знакомство с правами','chmod · ls -l',
    'Права делятся на владельца, группу и остальных. r — чтение (4), w — запись (2), x — выполнение или проход по папке (1). Цифры складываются: 6 = 4 + 2. В модели владелец учебных файлов — student.',
    'Задайте private.txt права 640: владелец читает и пишет, группа читает, остальные без доступа. Посмотрите подробности через ls -l.',
    'chmod 640 private.txt, затем ls -l private.txt. Не используйте 777 как универсальное решение.',
    ['chmod 640 private.txt','ls -l private.txt'],['chmod 640 ~/private.txt','ls -l /home/student/private.txt'],
    [goal('Права private.txt — rw-r----- (640)',s=>node(s,'private.txt')?.mode===0o640),goal('Права файла просмотрены',s=>event(s,'ls',e=>e.path===home+'/private.txt'&&e.long))],{'private.txt':file('Моя учебная заметка\n')},
    'В реальной системе учитываются владелец, группы и другие механизмы доступа. Модель упрощена: проверяются биты владельца и запрет изменений вне домашней папки. chmod здесь принимает только три восьмеричные цифры.');
  add('tools-4','Поиск и инструменты','Как устроена установка пакетов','sudo apt',
    'APT управляет пакетами Ubuntu. update обновляет список доступных пакетов, install устанавливает выбранный пакет. Это разные действия. sudo запускает команду с повышенными правами. Здесь все три действия только моделируются, без пароля и сети.',
    'Обновите учебный список пакетов, затем установите tree. На вашем компьютере ничего не устанавливается.',
    'Введите отдельно sudo apt update и sudo apt install tree. Затем можно попробовать tree.',
    ['sudo apt update','sudo apt install tree'],['sudo apt update','sudo apt install -y tree'],
    [goal('Список учебных пакетов обновлён',s=>s.updated),goal('Учебный tree установлен',s=>s.packages.includes('tree'))],{},
    'В реальной Ubuntu apt update не обновляет установленные программы. Здесь каталог ограничен tree, nano, curl; их установка — только отметка в данных урока. Рабочая команда после установки реализована только для tree.');
  add('tools-5','Поиск и инструменты','Процессы и PID','ps · kill',
    'Процесс — запущенная программа, PID — её числовой идентификатор. ps показывает процессы. kill по умолчанию посылает сигнал завершения SIGTERM; настоящая программа может обработать его. Здесь завершение учебного процесса происходит сразу.',
    'Посмотрите список процессов, затем завершите demo-worker с PID 450. Сохраните systemd и terminal.',
    'ps, затем kill 450. Это условные процессы, не программы компьютера.',
    ['ps','kill 450'],['ps aux','kill -TERM 450'],
    [goal('Список процессов просмотрен',s=>event(s,'ps')),goal('demo-worker завершён',s=>!s.processes.some(p=>p.pid===450)),goal('Служебные процессы сохранены',s=>s.processes.some(p=>p.pid===1)&&s.processes.some(p=>p.pid===120))]);
  add('tools-6','Поиск и инструменты','Справка всегда рядом','help · man · --help',
    'Не нужно помнить все параметры. --help обычно показывает краткую справку программы, man открывает руководство. Здесь man и help выводят короткие учебные подсказки по поддерживаемому подмножеству команд.',
    'Посмотрите список всех поддерживаемых команд через help и откройте справку для grep.',
    'help, затем man grep. Также подойдут help grep или grep --help.',
    ['help','man grep'],['help','grep --help'],
    [goal('Открыт список команд',s=>event(s,'help',e=>e.name==='all')),goal('Прочитана справка grep',s=>event(s,'help',e=>e.name==='grep'))]);
  add('final','Итоговая практика','Собираем рабочую папку','Ваш первый сценарий',
    'Теперь объедините навигацию, файлы и обработку текста. Здесь нет единственной правильной последовательности. Проверка оценивает готовую структуру, содержимое и права. Любое задание можно сбросить и попробовать ещё раз.',
    'Создайте ~/workspace/backup. Скопируйте туда Documents/notes.txt без изменения оригинала. Сохраните строки ERROR из Documents/events.log в ~/workspace/errors.txt, задайте файлу права 640. Удалите ~/workspace/temp.txt. Завершите в ~/workspace.',
    'Используйте mkdir -p, cp, grep с перенаправлением >, chmod, rm и cd. Файл temp.txt уже подготовлен.',
    ['mkdir -p workspace/backup','cp Documents/notes.txt workspace/backup/notes.txt','grep ERROR Documents/events.log > workspace/errors.txt','chmod 640 workspace/errors.txt','rm workspace/temp.txt','cd workspace'],
    ['mkdir ~/workspace/backup','cp ~/Documents/notes.txt ~/workspace/backup','cat ~/Documents/events.log | grep -i error > ~/workspace/errors.txt','chmod 640 ~/workspace/errors.txt','rm /home/student/workspace/temp.txt','cd /home/student/workspace'],
    [goal('Создан workspace/backup с копией заметок',s=>node(s,'workspace/backup')?.type==='dir'&&node(s,'workspace/backup/notes.txt')?.content==='Ubuntu\nтерминал\nпрактика\n'),goal('Оригинал заметок сохранён',s=>node(s,'Documents/notes.txt')?.content==='Ubuntu\nтерминал\nпрактика\n'),goal('errors.txt содержит две строки ERROR',s=>node(s,'workspace/errors.txt')?.content==='ERROR connection\nERROR timeout\n'),goal('Права errors.txt — 640',s=>node(s,'workspace/errors.txt')?.mode===0o640),goal('Временный файл удалён',s=>!node(s,'workspace/temp.txt')),goal('Текущая папка — workspace',s=>s.cwd===home+'/workspace')],{'workspace':dir(),'workspace/temp.txt':file('Черновик\n')},
    'Вы создали структуру, резервную копию и небольшой отчёт, сохранив исходные данные. Следующий шаг вне этого курса — практика в отдельной учебной Ubuntu с пониманием отличий от симулятора.');
  const check=(lesson,state)=>lesson.goals.map(g=>{try{return {label:g.label,pass:!!g.test(state)};}catch{return {label:g.label,pass:false};}});
  const api={lessons,check};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.UbuntuCourse=api;
})(typeof globalThis!=='undefined'?globalThis:this);
