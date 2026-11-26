// Только JS-данные: тесты не вызывают shell, не создают реальные учебные файлы.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Terminal,HOME,parse}=require('../engine.js');
const {lessons,check}=require('../lessons.js');
const complete=(lesson,t)=>check(lesson,t.state).every(g=>g.pass);
function execute(t,commands){for(const command of commands){const r=t.run(command);assert.equal(r.error,false,command+': '+r.output);}}
for(const lesson of lessons){
  test(lesson.id+': старт, решение, альтернативное решение, незавершённое задание',()=>{
    assert.equal(complete(lesson,new Terminal(lesson.seed)),false);
    for(const commands of [lesson.solution,lesson.alternative]){const t=new Terminal(lesson.seed);execute(t,commands);assert.equal(complete(lesson,t),true);assert.equal(complete(lesson,Terminal.restore(t.snapshot())),true);}
    const incomplete=new Terminal(lesson.seed);execute(incomplete,lesson.solution.slice(0,-1));assert.equal(complete(lesson,incomplete),false);
  });
}
test('Структура курса: 18 уроков и проект, полные материалы, уникальные ID',()=>{
  assert.equal(lessons.length,19);assert.equal(new Set(lessons.map(l=>l.id)).size,19);
  for(const l of lessons){for(const k of ['title','command','theory','task','hint','explanation'])assert.ok(l[k]?.trim());assert.ok(l.goals.length);}
});
test('Кавычки, пустые строки, экранирование, операторы внутри текста',()=>{
  const t=new Terminal();execute(t,['mkdir "мои файлы"','echo "a | b > c" > "мои файлы/заметка.txt"',"echo '' >> 'мои файлы/заметка.txt'",'touch имя\\ с\\ пробелом']);
  assert.equal(t.state.fs[HOME+'/мои файлы/заметка.txt'].content,'a | b > c\n\n');assert.ok(t.state.fs[HOME+'/имя с пробелом']);
  assert.equal(t.run("echo 'text").error,true);assert.equal(t.run('echo a |').error,true);assert.equal(t.run('echo a >').error,true);assert.equal(t.run('pwd > a > b').error,true);
});
test('Нормализация путей, домашняя папка и возврат cd -',()=>{
  const t=new Terminal();execute(t,['cd Documents','cd ../Downloads','cd -']);assert.equal(t.state.cwd,HOME+'/Documents');
  execute(t,['cd','cd /','pwd']);assert.equal(t.run('pwd').output,'/\n');assert.equal(t.run('ls /home').error,false);
  execute(t,['cd ~/Documents/../Downloads']);assert.equal(t.state.cwd,HOME+'/Downloads');assert.equal(t.run('cd ../../../../').error,false);assert.equal(t.state.cwd,'/');
});
test('Копирование папки, перенос, отказ от циклической структуры',()=>{
  const t=new Terminal();execute(t,['cp -r Documents copy','mv copy archive']);assert.equal(t.state.fs[HOME+'/archive/notes.txt'].content,'Ubuntu\nтерминал\nпрактика\n');assert.equal(t.state.fs[HOME+'/copy'],undefined);
  const snapshot=t.snapshot();assert.equal(t.run('cp -r Documents Documents/loop').error,true);assert.deepEqual(t.snapshot(),snapshot);
  assert.equal(t.run('cp Documents backup').error,true);assert.equal(t.run('mv Documents/notes.txt readme.txt').error,false);
});
test('Удаление только виртуальных данных и защита каталогов',()=>{
  const t=new Terminal();assert.equal(t.run('rm /').error,true);assert.equal(t.run('rm -r /home/student').error,true);assert.equal(t.run('rm -r /etc').error,true);
  execute(t,['mkdir sandbox','touch sandbox/a','rm sandbox/a','rmdir sandbox']);assert.equal(t.state.fs[HOME+'/sandbox'],undefined);
  assert.equal(t.run('rmdir Documents').error,true);assert.equal(t.run('rm Documents').error,true);
});
test('Права на чтение и запись, ограничение внешнего дерева',()=>{
  const t=new Terminal();execute(t,['touch private','chmod 000 private']);assert.equal(t.run('cat private').error,true);assert.equal(t.run('echo text > private').error,true);
  execute(t,['chmod 600 private','echo text > private']);assert.equal(t.run('cat private').output,'text\n');
  assert.equal(t.run('touch /etc/change').error,true);assert.equal(t.run('chmod 777 /etc/os-release').error,true);assert.equal(t.run('cat /etc/os-release').error,false);
  execute(t,['mkdir blocked','touch blocked/file','chmod 600 blocked']);assert.equal(t.run('find blocked -name \"*\"').error,true);assert.equal(t.run('cd blocked').error,true);assert.equal(t.run('touch blocked/a').error,true);
});
test('Перенаправление заменяет и дописывает, touch не стирает текст',()=>{
  const t=new Terminal();execute(t,['echo one > a','echo two >> a','touch a']);assert.equal(t.run('cat a').output,'one\ntwo\n');
  execute(t,['echo three > a']);assert.equal(t.run('cat a').output,'three\n');assert.equal(t.run('echo lost > missing/a').error,true);
});
test('head/tail, grep с параметрами, wc и конвейер',()=>{
  const t=new Terminal();assert.equal(t.run('head -n 1 Documents/events.log').output,'INFO start\n');assert.equal(t.run('tail -n 0 Documents/events.log').output,'');
  assert.equal(t.run('grep -in error Documents/events.log').output,'2:ERROR connection\n4:ERROR timeout\n');
  assert.equal(t.run('cat Documents/events.log | grep -v ERROR | wc -l').output,'3\n');assert.equal(t.run('grep absent Documents/events.log').status,1);
  execute(t,['echo -n abc > a']);assert.equal(t.run('wc -l a').output,'0 a\n');assert.equal(t.run('head -n 1 a').output,'abc');assert.equal(t.run('tail -n 1 a').output,'abc');
});
test('find: шаблоны в кавычках и корень',()=>{
  const t=new Terminal();assert.ok(t.run('find / -name "notes.?xt"').output.includes('/home/student/Documents/notes.txt'));
  assert.equal(t.run('find . -name *.txt').error,true);assert.equal(t.run('find missing -name "*"').error,true);
});
test('APT, sudo и процессы строго моделируются',()=>{
  const t=new Terminal();assert.equal(t.run('apt install tree').error,true);assert.equal(t.run('sudo apt install tree').error,true);
  execute(t,['sudo apt update','sudo apt install -y tree','tree']);assert.ok(t.state.packages.includes('tree'));assert.equal(t.run('sudo reboot').error,true);assert.equal(t.run('sudo apt install unknown').error,true);
  assert.equal(t.run('kill 1').error,true);assert.equal(t.run('kill 120').error,true);assert.equal(t.run('kill 999').error,true);execute(t,['kill -15 450']);assert.equal(t.state.processes.some(p=>p.pid===450),false);
});
test('Отказ неизвестных команд, shell-подстановок, JavaScript, сетевых команд',()=>{
  const t=new Terminal();for(const cmd of ['curl https://example.com','fetch("https://example.com")','eval 1','bash -c pwd','echo $(pwd)','pwd; whoami','pwd && whoami','cat < a','echo `pwd`','echo $HOME','ls --unknown'])assert.equal(t.run(cmd).error,true,cmd);
  assert.deepEqual(parse('echo "a|b"').parts,[['echo','a|b']]);
});
test('Ошибки атомарны, снимки независимы и проверяются',()=>{
  const t=new Terminal(),before=t.snapshot();assert.equal(t.run('touch valid missing/path').error,true);assert.deepEqual(t.snapshot(),before);
  const snapshot=t.snapshot();snapshot.fs[HOME+'/readme.txt'].content='changed';assert.notEqual(t.state.fs[HOME+'/readme.txt'].content,'changed');
  for(const bad of [null,{}, {...before,cwd:'/missing'}, {...before,fs:{'/':{type:'file',mode:0o777,content:''}}}, {...before,packages:['virus']}])assert.throws(()=>Terminal.restore(bad));
});
test('Лимиты ввода, размеров файлов и количества узлов',()=>{
  const t=new Terminal();assert.equal(t.run('x'.repeat(2001)).error,true);const snapshot=t.snapshot();snapshot.fs[HOME+'/oversize']={type:'file',mode:0o644,content:'x'.repeat(64001)};assert.throws(()=>Terminal.restore(snapshot));
  for(let i=0;i<240;i++){const r=t.run('touch file'+i);if(r.error)break;}assert.ok(Object.keys(t.state.fs).length<=256);assert.equal(t.run('mkdir -p '+Array.from({length:260},(_,i)=>'a'+i).join('/')).error,true);
});
