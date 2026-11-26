// Выполняется через существующий Playwright, в отдельных тестовых contexts.
async page=>{
  const browser=page.context().browser(),context=await browser.newContext({viewport:{width:1440,height:1050}}),p=await context.newPage();
  const report={},errors=[],external=[];
  p.on('pageerror',e=>errors.push(e.message));context.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8767/'))external.push(r.url());});
  const assert=(v,m)=>{if(!v)throw new Error(m);};
  const idle=()=>p.waitForFunction(()=>!document.querySelector('#run').disabled,{},{timeout:35000});
  const run=async(source,stdin='')=>{await p.locator('#editor').fill(source);await p.locator('#stdin').fill(stdin);await p.locator('#run').click();await idle();};
  try{
    await p.goto('http://127.0.0.1:8767');await p.waitForFunction(()=>document.querySelector('#runtime-status').textContent.includes('локально'),{},{timeout:35000});
    // Подтверждение замены в тесте имитируется, отдельно проверяется отмена.
    await p.locator('#editor').fill('print("черновик")');await p.evaluate(()=>window.confirm=()=>false);await p.locator('#reset').click();assert(await p.locator('#editor').inputValue()==='print("черновик")','Отмена сброса');
    await p.evaluate(()=>window.confirm=()=>true);await p.locator('#reset').click();assert((await p.locator('#editor').inputValue()).startsWith('#'),'Подтверждённый сброс');report.reset=true;
    await p.locator('#solution-details summary').click();await p.locator('#use-solution').click();assert(await p.locator('#progress-count').innerText()==='0','Перенос решения не засчитывает урок');report.solution=true;
    await run('print(input("Имя: "))\nprint(int(input()) + 1)','Анна\n4\n');assert(await p.locator('#output').innerText()==='Имя: Анна\n5\n','Ввод');report.input=true;
    await run('print("<img src=x onerror=alert(1)>")');assert(await p.locator('#output img').count()===0&&await p.locator('#output').innerText()==='<img src=x onerror=alert(1)>\n','Вывод как текст');report.safeText=true;
    await run('value = 5\nprint(value)');await run('print(value)');assert((await p.locator('#python-error').innerText()).includes('NameError'),'Чистый namespace');report.isolation=true;
    await run('x = 0\nprint(1 / x)');assert((await p.locator('#python-error').innerText()).includes('строка 2'),'Строка ошибки');report.lineNumber=true;
    await run('input()');assert((await p.locator('#python-error').innerText()).includes('EOFError'),'Недостаточный input');report.eof=true;
    await run('print("x" * 40000)');assert((await p.locator('#python-error').innerText()).includes('OutputLimitError')&&(await p.locator('#output').innerText()).length===32000,'Ограничение вывода');report.outputLimit=true;
    await p.locator('#editor').fill('while True:\n    pass\n');await p.locator('#run').click();await p.waitForFunction(()=>document.querySelector('#execution-state').textContent.includes('Выполняется Python'),{},{timeout:35000});await p.locator('#stop').click();await idle();assert((await p.locator('#output').innerText()).includes('остановлено'),'Остановка');report.stop=true;
    await run('print("После остановки")');assert(await p.locator('#output').innerText()==='После остановки\n','Восстановление');report.recovery=true;
    await run('while True:\n    pass\n');assert((await p.locator('#output').innerText()).includes('Превышено время'),'Тайм-аут');report.timeout=true;
    await p.locator('#retry').click();await p.waitForFunction(()=>document.querySelector('#runtime-status').textContent.includes('локально'),{},{timeout:35000});await run('print("Снова работает")');assert(await p.locator('#output').innerText()==='Снова работает\n','Восстановление после тайм-аута');report.retry=true;
    await p.locator('#editor').fill('print("сохранено")');await p.locator('#stdin').fill('строка\n');await p.reload();assert(await p.locator('#editor').inputValue()==='print("сохранено")'&&await p.locator('#stdin').inputValue()==='строка\n','Черновики после reload');report.drafts=true;
    report.dimensions=[];
    for(const width of [1440,1024,768,390,320]){await p.setViewportSize({width,height:900});const r=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));report.dimensions.push(r);assert(r.width===r.scroll,'Переполнение '+width);}
    await p.setViewportSize({width:390,height:844});await p.locator('#view-code').click();assert(await p.locator('#editor').isVisible(),'Код на телефоне');await p.locator('#view-code').press('ArrowRight');assert(await p.locator('#output').isVisible(),'Вкладка результата');await p.locator('#view-result').press('Home');assert(await p.locator('#theory').isVisible(),'Home выбирает задание');report.mobile=true;
    await p.setViewportSize({width:1440,height:1050});await p.evaluate(()=>document.documentElement.style.fontSize='200%');report.largeText=await p.evaluate(()=>({font:getComputedStyle(document.querySelector('#theory')).fontSize,overflow:document.documentElement.scrollWidth>innerWidth}));assert(report.largeText.font==='32px'&&!report.largeText.overflow,'Текст 200%');await p.evaluate(()=>document.documentElement.style.fontSize='');
    for(const kind of ['corrupt','denied']){
      const ctx=await browser.newContext();
      if(kind==='corrupt')await ctx.addInitScript(()=>{localStorage.setItem('python-workshop-v1','{bad-json');});else await ctx.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Denied','SecurityError');};});
      const q=await ctx.newPage();await q.goto('http://127.0.0.1:8767');const value=await q.evaluate(()=>({warning:!document.querySelector('#storage-warning').hidden,usable:!document.querySelector('#run').disabled,preserved:localStorage.getItem('python-workshop-v1')==='{bad-json'}));
      assert(value.warning&&value.usable&&(kind!=='corrupt'||value.preserved),'Отказ хранилища '+kind);report[kind]=value;await ctx.close();
    }
    // Ошибка загрузки зависимого Worker ожидаема в отдельном тестовом контексте.
    const loadContext=await browser.newContext();await loadContext.route('**/worker.mjs',r=>r.abort());const q=await loadContext.newPage();await q.goto('http://127.0.0.1:8767');await q.waitForFunction(()=>document.querySelector('#runtime-status').textContent.includes('недоступен'),{},{timeout:35000});report.loadFailure=await q.locator('#retry').isVisible();assert(report.loadFailure,'Повтор после ошибки загрузки');await loadContext.close();
    report.pageErrors=errors;report.externalRequests=external;assert(!errors.length,'Ошибки страницы');assert(!external.length,'Внешние запросы');return report;
  }finally{await context.close();}
}
