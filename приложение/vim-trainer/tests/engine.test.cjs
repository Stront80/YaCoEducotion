// Только виртуальные данные; команды Vim не передаются ОС.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {VimModel}=require('../engine.js');
const {lessons,check}=require('../lessons.js');
const success=(l,m)=>check(l,m.state).every(g=>g.pass);
for(const l of lessons)test(l.id+': старт, решение, альтернатива, ошибочный результат',()=>{
  assert.equal(success(l,new VimModel(l.seed)),false);
  for(const sequence of [l.solution,l.alternative]){
    const model=new VimModel(l.seed).feed(sequence);assert.equal(success(l,model),true,sequence+'\n'+JSON.stringify(model.state));
    assert.equal(success(l,VimModel.restore(model.snapshot())),true);
  }
  const wrong=new VimModel(l.seed).feed('<Esc>gg0iWRONG<Esc>');assert.equal(success(l,wrong),false);
});
test('19 занятий и уникальные ID, материалы не пустые',()=>{
  assert.equal(lessons.length,19);assert.equal(new Set(lessons.map(l=>l.id)).size,19);
  for(const l of lessons){for(const k of ['title','theory','task','hint','solution','alternative','explanation'])assert.ok(l[k].trim());assert.ok(l.goals.length);}
});
test('Insert: i/a/I/A/o/O и группировка undo',()=>{
  const m=new VimModel({text:'abc'}).feed('iHi <Esc>');assert.equal(m.text(),'Hi abc');m.feed('u');assert.equal(m.text(),'abc');m.feed('<C-r>');assert.equal(m.text(),'Hi abc');
  m.feed('0A!<Esc>');assert.equal(m.text(),'Hi abc!');
  const o=new VimModel({text:'a\nb'}).feed('oсередина<Esc>');assert.equal(o.text(),'a\nсередина\nb');o.feed('u');assert.equal(o.text(),'a\nb');o.feed('Oверх<Esc>');assert.equal(o.text(),'верх\na\nb');
});
test('Backspace, Delete, Enter, пустая строка и Unicode',()=>{
  const m=new VimModel().feed('iПривет<CR>мир<BS>р<Esc>');assert.equal(m.text(),'Привет\nмир');
  m.feed('0i<BS><Esc>');assert.equal(m.text(),'Приветмир');
  const e=new VimModel().feed('i<BS>😀я<Esc>0x');assert.equal(e.text(),'я');assert.equal(e.state.col,0);
  new VimModel().feed('i<Del><CR><BS><Esc>').validate();
});
test('Движения и желаемый столбец на коротких строках',()=>{
  const m=new VimModel({text:'abcdef\nx\nabcdef',col:4}).feed('jj');assert.deepEqual(m.cursor,{row:2,col:4});m.feed('k0j');assert.deepEqual(m.cursor,{row:2,col:0});
  m.feed('99h99k');assert.deepEqual(m.cursor,{row:0,col:0});m.feed('G');assert.equal(m.state.row,2);m.feed('gg');assert.equal(m.state.row,0);
});
test('Слова, пробелы и пунктуация',()=>{
  const m=new VimModel({text:'one,  два three'}).feed('w');assert.equal(m.state.col,3);m.feed('w');assert.equal(m.state.col,6);m.feed('e');assert.equal(m.state.col,8);m.feed('b');assert.equal(m.state.col,6);
  const cw=new VimModel({text:'a word'}).feed('cwX<Esc>');assert.equal(cw.text(),'X word');
});
test('Операторы, счётчики и включение конца слова',()=>{
  assert.equal(new VimModel({text:'one two three four'}).feed('2dw').text(),'three four');
  assert.equal(new VimModel({text:'one two three four'}).feed('d2w').text(),'three four');
  assert.equal(new VimModel({text:'one two three four five'}).feed('2d2w').text(),'five');
  assert.equal(new VimModel({text:'one two'}).feed('de').text(),' two');
  assert.equal(new VimModel({text:'one two'}).feed('cwnew<Esc>').text(),'new two');
  assert.equal(new VimModel({text:'one\ntwo'}).feed('dw').text(),'\ntwo');
  assert.equal(new VimModel({text:'one two',col:4}).feed('d0').text(),'two');
});
test('Построчный и символьный регистр, вставка перед/после',()=>{
  const m=new VimModel({text:'a\nb'}).feed('yyp');assert.equal(m.text(),'a\na\nb');m.feed('u');assert.equal(m.text(),'a\nb');
  assert.equal(new VimModel({text:'abc'}).feed('x$p').text(),'bca');assert.equal(new VimModel({text:'abc'}).feed('xP').text(),'abc');
  assert.equal(new VimModel({text:'a\nb\nc'}).feed('2ddP').text(),'a\nb\nc');
});
test('Visual: включённый конец и обратное выделение, строки',()=>{
  assert.equal(new VimModel({text:'abcde'}).feed('vllx').text(),'de');
  assert.equal(new VimModel({text:'abcde',col:2}).feed('vhhx').text(),'de');
  assert.equal(new VimModel({text:'a\nb\nc\nd'}).feed('jVjd').text(),'a\nd');
  const m=new VimModel({text:'abc'}).feed('vllcX<Esc>');assert.equal(m.text(),'X');m.feed('u');assert.equal(m.text(),'abc');
});
test('Undo/redo, новая ветка изменений, сохранение не отменяется',()=>{
  const m=new VimModel({text:'ab'}).feed('xiZ<Esc>u');assert.equal(m.text(),'b');m.feed('u');assert.equal(m.text(),'ab');m.feed('<C-r>');assert.equal(m.text(),'b');m.feed('A!<Esc><C-r>');assert.equal(m.text(),'b!');
  m.feed(':w<CR>u');assert.equal(m.state.saved,'b!');assert.equal(m.dirty(),true);
});
test('Поиск вперёд/назад, оборачивание и ошибка',()=>{
  const m=new VimModel({text:'cat\ncat\nend'}).feed('/cat<CR>');assert.deepEqual(m.cursor,{row:1,col:0});m.feed('n');assert.deepEqual(m.cursor,{row:0,col:0});m.feed('N');assert.deepEqual(m.cursor,{row:1,col:0});
  const before=m.text();m.feed('/missing<CR>');assert.equal(m.state.error,true);assert.equal(m.text(),before);
});
test('Виртуальные :w/:q/:q!/:wq, открытие сохранённого',()=>{
  const m=new VimModel({text:'old'}).feed('A!<Esc>:q<CR>');assert.equal(m.state.closed,false);assert.equal(m.state.error,true);m.feed(':wq<CR>');assert.equal(m.state.closed,true);assert.equal(m.state.saved,'old!');m.feed('x');assert.equal(m.text(),'old!');m.reopen();m.feed('A?<Esc>:q!<CR>');assert.equal(m.text(),'old!');assert.equal(m.state.closed,true);
});
test('Esc отменяет незавершённый оператор, поиск и замену',()=>{
  for(const prefix of ['d','2d','g','r','/foo',':w']){const m=new VimModel({text:'abc'}).feed(prefix+'<Esc>l');assert.equal(m.text(),'abc');assert.equal(m.state.mode,'normal');assert.equal(m.state.col,1);}
});
test('Неизвестные команды и ограничения не меняют буфер',()=>{
  const m=new VimModel({text:'abc'});for(const seq of ['z',':!ls<CR>',':w /tmp/file<CR>',':%s/a/b/<CR>','3i']){m.feed(seq);assert.equal(m.state.error,true,seq);assert.equal(m.text(),'abc');}
  const large=new VimModel({text:'a'.repeat(20000)});large.feed('A');large.key('x');assert.equal(large.text().length,20000);assert.equal(large.state.error,true);
});
test('Снимки независимы, повреждённые данные отклоняются',()=>{
  const m=new VimModel({text:'abc'}),saved=m.snapshot();saved.lines[0]='other';assert.equal(m.text(),'abc');
  for(const bad of [null,{}, {...m.snapshot(),lines:[]},{...m.snapshot(),row:999},{...m.snapshot(),mode:'bad'}])assert.throws(()=>VimModel.restore(bad));
  const insert=new VimModel({text:'abc'}).feed('iText');const restored=VimModel.restore(insert.snapshot()).feed('<Esc>u');assert.equal(restored.text(),'abc');
});
test('Детерминированные случайные клавиши сохраняют инварианты',()=>{
  let seed=20261126;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
  const keys=['h','j','k','l','w','b','e','i','a','o','O','Escape','Enter','Backspace','x','d','y','c','r','p','P','u','Ctrl-r','v','V','0','2','3','g','G','$','^',':','/','n','N','a','Z','я'];
  for(let trace=0;trace<40;trace++){
    const m=new VimModel({text:'one two\nthree four\nfive'});
    for(let step=0;step<250;step++){if(m.state.closed)m.reopen();m.key(keys[random()%keys.length]);m.validate();if(step%25===0)VimModel.restore(m.snapshot()).validate();}
  }
});
test('Блочная вставка атомарна и остаётся одним шагом Insert',()=>{
  const m=new VimModel({text:'abc'}).feed('i');m.type('Привет\nVim ');assert.equal(m.text(),'Привет\nVim abc');m.feed('<Esc>u');assert.equal(m.text(),'abc');
  const long=new VimModel({text:'x'.repeat(19999)}).feed('A');long.type('ещё');assert.equal(long.text().length,19999);assert.equal(long.state.error,true);
  long.type('x'.repeat(2001));assert.equal(long.text().length,19999);assert.equal(long.state.error,true);
});
