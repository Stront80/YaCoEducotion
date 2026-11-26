// Тестируются только JS-данные, реальный tmux/оболочка не запускаются.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {TmuxModel,leaves,rectangles}=require('../engine.js');
const {lessons,create,apply,check}=require('../lessons.js');
const passed=(l,m)=>check(l,m.state).every(g=>g.pass);
for(const l of lessons)test(l.id+': старт, решение, альтернатива, ошибочная команда',()=>{
  assert.equal(passed(l,create(l)),false);
  for(const steps of [l.solution,l.alternative]){const m=apply(create(l),steps);assert.equal(passed(l,m),true,JSON.stringify(m.state));assert.equal(passed(l,TmuxModel.restore(m.snapshot())),true);}
  const wrong=create(l);assert.equal(wrong.submit('unknown-command'),false);assert.equal(passed(l,wrong),false);
});
test('Структура курса и уникальные ID',()=>{assert.equal(lessons.length,19);assert.equal(new Set(lessons.map(l=>l.id)).size,19);for(const l of lessons){for(const field of ['title','theory','task','hint','explanation'])assert.ok(l[field].trim());assert.ok(l.goals.length);}});
test('Префикс не печатается, действует ровно на следующую клавишу',()=>{
  const m=new TmuxModel();m.feed('c');assert.equal(m.window().panes.length,1);assert.equal(m.getInput(),'c');m.feed('<C-b>c');assert.equal(m.session().windows.length,2);assert.equal(m.state.prefix,false);m.feed('<C-b><C-b>');assert.equal(m.state.prefix,false);assert.equal(m.session().windows.length,2);
  m.feed('<C-b><Esc>c');assert.equal(m.getInput(),'c');
});
test('Сессии/окна, уникальные имена, detach/attach',()=>{
  const m=new TmuxModel({empty:true});assert.equal(m.submit('tmux new -s alpha -n editor'),true);m.submit('echo marker');m.feed('<C-b>d');assert.equal(m.state.attached,null);m.submit('tmux attach -t alpha');assert.equal(m.pane().lines.includes('marker'),true);
  m.submit('tmux new -d -s beta');assert.equal(m.state.sessions.length,2);assert.equal(m.session().name,'alpha');const before=m.snapshot();assert.equal(m.submit('tmux new -d -s alpha'),false);assert.equal(m.state.sessions.length,2);assert.equal(m.state.nextSession,before.nextSession);
});
test('Геометрия вложенного разделения и направленный фокус',()=>{
  const m=new TmuxModel().feed('<C-b>%<C-b>"');assert.equal(m.window().panes.length,3);const boxes=rectangles(m.window().tree);
  assert.deepEqual(boxes,[{id:'%0',x:0,y:0,w:50,h:100},{id:'%1',x:50,y:0,w:50,h:50},{id:'%2',x:50,y:50,w:50,h:50}]);
  m.feed('<C-b><Up>');assert.equal(m.window().activePane,'%1');m.feed('<C-b><Left>');assert.equal(m.window().activePane,'%0');m.feed('<C-b>o');assert.equal(m.window().activePane,'%1');
});
test('Стабильные ID, переключение окон и свободные индексы',()=>{
  const m=new TmuxModel();m.command('new-window -n logs');m.command('new-window -n tasks');m.feed('<C-b>0<C-b>n');assert.equal(m.window().index,1);m.command('kill-window');m.command('new-window -n other');assert.equal(m.window().index,1);assert.equal(m.window().id,'@3');m.command('last-window');assert.equal(m.window().index,0);
});
test('Подтверждение закрытия и схлопывание дерева',()=>{
  const m=new TmuxModel().feed('<C-b>%<C-b>"<C-b>xn');assert.equal(m.window().panes.length,3);m.feed('<C-b>xy');assert.equal(m.window().panes.length,2);assert.deepEqual(leaves(m.window().tree),['%0','%1']);m.command('kill-pane -t %1');assert.deepEqual(m.window().tree,{pane:'%0'});m.command('kill-pane');assert.equal(m.state.sessions.length,0);assert.equal(m.state.attached,null);
});
test('Zoom и раскладки не теряют панели и историю',()=>{
  const m=new TmuxModel().feed('<C-b>%<C-b>"');m.submit('echo text');m.feed('<C-b>z');assert.equal(m.window().zoom,true);m.feed('<C-b>z');assert.equal(m.window().zoom,false);m.command('select-layout even-horizontal');const rects=rectangles(m.window().tree);assert.ok(rects.every(r=>Math.abs(r.w-100/3)<1e-8));m.command('select-layout even-vertical');assert.ok(rectangles(m.window().tree).every(r=>Math.abs(r.h-100/3)<1e-8));assert.equal(m.pane().lines.includes('text'),true);
});
test('Вынос панели переносит тот же объект с текстом',()=>{
  const m=new TmuxModel().feed('<C-b>%');m.submit('echo keep');const id=m.pane().id;m.feed('<C-b>!');assert.equal(m.window().panes.length,1);assert.equal(m.pane().id,id);assert.equal(m.pane().lines.includes('keep'),true);assert.equal(m.session().windows[0].panes.length,1);
});
test('Командная строка, переименование и выбор сессии',()=>{
  const m=new TmuxModel().feed('<C-b>:new-window -n logs<Enter><C-b>,build<Enter><C-b>$study<Enter>');assert.equal(m.session().name,'study');assert.equal(m.window().name,'build');assert.ok(m.state.events.some(e=>e.type==='prompt-command'));
  m.command('new-session -d -s work');m.feed('<C-b>s<Down><Enter>');assert.equal(m.session().name,'work');assert.equal(m.state.mode,'normal');
});
test('Просмотр истории: прокрутка и выход не теряют вывод',()=>{
  const m=new TmuxModel();m.submit('demo-log');const lines=[...m.pane().lines];m.feed('<C-b>[<PageUp>');assert.equal(m.state.copyOffset,8);m.feed('q');assert.equal(m.state.mode,'normal');assert.deepEqual(m.pane().lines,lines);
});
test('Цели с ID и явной сессией работают без подключения',()=>{
  const m=new TmuxModel();m.feed('<C-b>d');assert.equal(m.command('split-window -h -t learn:0.0'),true);assert.equal(m.command('kill-pane -t %1'),true);assert.equal(m.command('list-windows -t learn'),true);assert.equal(m.state.attached,null);
});
test('Разбор кавычек, сгруппированных флагов и неизвестных команд',()=>{
  const m=new TmuxModel({empty:true});assert.equal(m.submit('tmux new -dswork -neditor'),true);assert.equal(m.state.attached,null);m.submit('tmux a -twork');assert.equal(m.window().name,'editor');m.submit('echo "<b>текст</b>"');assert.ok(m.pane().lines.includes('<b>текст</b>'));
  for(const cmd of ['tmux run-shell reboot','tmux new-session -s "bad name"','echo $(whoami)','echo hi; tmux kill-server','tmux split-window -Q','tmux split-window -h -v','curl https://example.com']){const before=m.snapshot();assert.equal(m.submit(cmd),false,cmd);assert.deepEqual(m.state.sessions,before.sessions);}
});
test('Лимиты, ошибка после префикса и атомарность',()=>{
  const m=new TmuxModel();m.feed('<C-b>%<C-b>%<C-b>%');const before=m.window().panes.length;m.feed('<C-b>%');assert.equal(m.state.error,true);assert.equal(m.state.prefix,false);assert.equal(m.window().panes.length,before);
  const empty=new TmuxModel({empty:true});assert.equal(empty.submit('tmux new -s valid -n "bad name"'),false);assert.equal(empty.state.sessions.length,0);assert.equal(empty.state.nextSession,0);
  assert.equal(m.submit('x'.repeat(1001)),false);assert.equal(m.submit('echo '+ 'a'.repeat(995)),true);
});
test('Снимки независимы, повреждённые структуры отвергаются',()=>{
  const m=new TmuxModel(),s=m.snapshot();s.sessions[0].name='other';assert.equal(m.session().name,'learn');
  const corrupt=m.snapshot();corrupt.sessions[0].windows[0].tree={axis:'x',ratio:.5,first:{pane:'%0'},second:{pane:'%0'}};
  for(const bad of [null,{},corrupt,{...m.snapshot(),attached:'$999'},{...m.snapshot(),nextPane:0}])assert.throws(()=>TmuxModel.restore(bad));
});
test('10000 детерминированных случайных клавиш сохраняют инварианты',()=>{
  let seed=20261126;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;},keys=['Ctrl-b','c','%','"','o','z',' ','n','p','d','s','x','y','N',':','[','q','?','Escape','Enter','ArrowDown','ArrowUp','ArrowLeft','ArrowRight',',','$','1','0','!'];
  for(let trace=0;trace<40;trace++){const m=new TmuxModel();for(let n=0;n<250;n++){if(!m.state.attached){if(!m.state.sessions.length)m.command('new-session -s learn');else m.command('attach-session');}m.key(keys[random()%keys.length]);m.validate();if(n%25===0)TmuxModel.restore(m.snapshot()).validate();}}
});
