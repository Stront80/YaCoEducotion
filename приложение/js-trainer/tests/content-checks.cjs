/* Проверяем настоящий JS-код курса в изолированных Node Workers.
   Браузерная интеграция и CSP проверяются отдельно в Chromium. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Worker}=require('node:worker_threads');
const {lessons}=require('../lessons.js');
const {source}=require('../worker.js');
function run(code,checks=[],timeout=1500){
  return new Promise((resolve,reject)=>{
    const worker=new Worker(`const {parentPort}=require('node:worker_threads');global.self={postMessage:data=>parentPort.postMessage(data)};${source};parentPort.on('message',data=>self.onmessage({data}));`,{eval:true});
    const timer=setTimeout(()=>{worker.terminate();reject(new Error('timeout'));},timeout);
    worker.once('message',r=>{clearTimeout(timer);worker.terminate();resolve(r);});
    worker.once('error',e=>{clearTimeout(timer);worker.terminate();reject(e);});
    worker.postMessage({source:code,checks});
  });
}
test('Материалы: стабильные уникальные ID, 19 занятий, непустые поля',()=>{
  assert.equal(lessons.length,19);assert.equal(new Set(lessons.map(l=>l.id)).size,19);
  for(const l of lessons){for(const key of ['id','group','title','topic','theory','task','hint','start','solution','alternative','explanation'])assert.ok(l[key].trim(),l.id+': '+key);assert.ok(l.checks.length>=1);}
});
for(const lesson of lessons)test(lesson.id+' '+lesson.title,async()=>{
  for(const variant of ['solution','alternative']){
    const r=await run(lesson[variant],lesson.checks);assert.equal(r.error,null,variant+': '+JSON.stringify(r.error));assert.equal(r.results.length,lesson.checks.length);assert.ok(r.results.every(x=>x.pass),variant+': '+JSON.stringify(r.results));
  }
  for(const code of [lesson.start,'throw new Error("учебная ошибка");']){
    const r=await run(code,lesson.checks);assert.ok(r.error||r.results.some(x=>!x.pass),'неверный код не должен пройти');
  }
});
test('Синтаксические ошибки передаются',async()=>{const r=await run('const = ;');assert.equal(r.error.type,'SyntaxError');});
test('Ограничение вывода 32000',async()=>{const r=await run('console.log("x".repeat(32001));');assert.equal(r.error.type,'OutputLimitError');assert.ok(r.stdout.length<=32000);});
test('Циклический объект, BigInt, undefined и HTML выводятся текстом',async()=>{const r=await run('const a={};a.self=a;console.log(a,1n,undefined,"<img>");');assert.equal(r.error,null);assert.match(r.stdout,/Circular/);assert.match(r.stdout,/1n undefined <img>/);});
test('Ожидание асинхронного решения',async()=>{const r=await run('const n=await Promise.resolve(7);console.log(n);',[{label:'n',expression:'n===7'}]);assert.equal(r.stdout,'7\n');assert.equal(r.results[0].pass,true);});
test('Отдельные запуски не делят переменные',async()=>{await run('globalThis.privateValue=4;');const r=await run('console.log(typeof globalThis.privateValue);');assert.equal(r.stdout,'undefined\n');});
test('Исключение проверки становится непрошедшим условием',async()=>{const r=await run('',[{label:'нет функции',expression:'missing()===1'}]);assert.equal(r.error,null);assert.equal(r.results[0].pass,false);assert.match(r.results[0].detail,/missing/);});
test('Зависший Worker завершается, следующий работает',async()=>{await assert.rejects(run('while(true){}',[],100),/timeout/);const r=await run('console.log("после");');assert.equal(r.stdout,'после\n');});
