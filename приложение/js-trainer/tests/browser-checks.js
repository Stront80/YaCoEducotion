(async function(page){
  const browser=page.context().browser();
  const context=await browser.newContext({viewport:{width:1440,height:1050}});
  const p=await context.newPage();
  const report={lessons:[],variants:[],dimensions:[]},errors=[],external=[];
  const assert=(ok,message)=>{if(!ok)throw new Error(message);};
  p.on('pageerror',e=>errors.push(e.message));
  p.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8770/')&&!r.url().startsWith('blob:'))external.push(r.url());});
  await p.goto('http://127.0.0.1:8770/');
  const lessons=await p.evaluate(()=>JSCourse.lessons);
  async function execute(code,check=true){
    if(await p.locator('#view-code').isVisible())await p.locator('#view-code').click();
    await p.locator('#editor').fill(code);await p.locator(check?'#check':'#run').click();
    await p.waitForFunction(()=>!document.getElementById('check').disabled);
    return await p.locator('#feedback').innerText();
  }
  for(const lesson of lessons){
    await p.locator('.lesson-link[data-id="'+lesson.id+'"]').click();
    const before=await p.locator('#progress-count').innerText();
    await p.locator('#solution-details summary').click();
    assert(await p.locator('#progress-count').innerText()===before,'Просмотр не засчитывает');
    const feedback=await execute(lesson.solution);assert(feedback.includes('Получилось!'),lesson.id+': '+feedback);
    report.lessons.push(lesson.id);
    // Альтернатива/старт/ошибка проходят через настоящий браузерный Worker.
    const variants=await p.evaluate(async lesson=>{
      const runner=new JSRunner();const rows=[];
      for(const key of ['alternative','start'])rows.push({key,...await runner.execute({source:lesson[key],checks:lesson.checks})});
      rows.push({key:'error',...await runner.execute({source:'throw new Error("ошибка");',checks:lesson.checks})});return rows;
    },lesson);
    assert(!variants[0].error&&variants[0].results.length===lesson.checks.length&&variants[0].results.every(x=>x.pass),'Альтернатива '+lesson.id);
    assert(variants.slice(1).every(r=>r.error||r.results.some(x=>!x.pass)),'Неверные решения '+lesson.id);
    report.variants.push({id:lesson.id,alternative:true,startRejected:true,errorRejected:true});
  }
  assert(await p.locator('#progress-count').innerText()==='19','Курс 19/19');
  const stored=await p.evaluate(()=>localStorage.getItem('js-workshop-v1'));
  await p.reload();assert(await p.locator('#progress-count').innerText()==='19','reload progress');
  assert(await p.locator('#editor').inputValue()===lessons[18].solution,'reload draft');report.reload=true;
  // Диалоги сброса и переноса решения.
  p.once('dialog',d=>d.dismiss());await p.locator('#reset').click();assert(await p.locator('#editor').inputValue()===lessons[18].solution,'reset отмена');
  p.once('dialog',d=>d.accept());await p.locator('#reset').click();assert(await p.locator('#editor').inputValue()===lessons[18].start,'reset подтверждение');
  assert(await p.locator('#progress-count').innerText()==='19','reset сохраняет отметку');
  await p.locator('#solution-details summary').click();p.once('dialog',d=>d.accept());await p.locator('#use-solution').click();assert(await p.locator('#editor').inputValue()===lessons[18].solution,'перенос решения');report.dialogs=true;
  await execute('console.log("<img src=x onerror=alert(1)>");',false);assert(await p.locator('#output img').count()===0,'HTML только текст');report.textOnly=true;
  await execute('const broken = ;',false);assert((await p.locator('#js-error').innerText()).includes('SyntaxError'),'синтаксическая ошибка');report.syntax=true;
  await execute('console.log("x".repeat(32001));',false);assert((await p.locator('#js-error').innerText()).includes('OutputLimitError'),'лимит вывода');report.outputLimit=true;
  await p.locator('#editor').fill('while(true){}');await p.locator('#run').click();await p.locator('#stop').click();await p.waitForFunction(()=>!document.getElementById('check').disabled);assert((await p.locator('#output-state').innerText())==='Остановлено','stop');
  await execute('console.log("После остановки");',false);assert((await p.locator('#output').innerText()).includes('После остановки'),'восстановление');report.stop=true;
  await execute('while(true){}',false);assert((await p.locator('#feedback').innerText()).includes('Лимит 3 секунды'),'тайм-аут');
  await execute('console.log("После тайм-аута");',false);assert((await p.locator('#output').innerText()).includes('После тайм-аута'),'восстановление timeout');report.timeout=true;
  await execute('await new Promise(()=>{});',false);assert((await p.locator('#feedback').innerText()).includes('Лимит 3 секунды'),'Promise timeout');report.promiseTimeout=true;
  // Контекст Worker не имеет DOM и localStorage; CSP запрещает внешнее подключение.
  const isolation=await p.evaluate(async()=>new JSRunner().execute({source:'console.log(typeof document, typeof window, typeof localStorage);try { await fetch("https://example.invalid/js-test");console.log("unexpected"); }catch {console.log("blocked");}'}));
  assert(isolation.stdout==='undefined undefined undefined\nblocked\n','изоляция DOM/CSP');report.workerContext=true;
  await p.locator('#editor').focus();await p.keyboard.press('Tab');assert(!await p.locator('#editor').evaluate(e=>e===document.activeElement),'Tab выходит');report.tab=true;
  for(const width of [1440,1024,768,390,320]){
    await p.setViewportSize({width,height:950});
    const dim=await p.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth}));
    assert(dim.width===dim.document,'переполнение '+width);report.dimensions.push(dim);
  }
  await p.locator('#view-code').click();await p.locator('#view-code').focus();await p.keyboard.press('ArrowRight');assert(await p.locator('#view-result').getAttribute('aria-selected')==='true','мобильная стрелка');await p.keyboard.press('Home');assert(await p.locator('#view-task').getAttribute('aria-selected')==='true','mobile Home');report.mobileTabs=true;
  await p.setViewportSize({width:1440,height:1050});await p.evaluate(()=>document.documentElement.style.fontSize='200%');
  const zoom=await p.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,text:getComputedStyle(document.querySelector('#theory')).fontSize}));
  assert(zoom.width===zoom.document&&zoom.text==='32px','200%');report.largeText=zoom;
  // Повреждённое сохранение проверяется в отдельном origin-состоянии.
  const c2=await browser.newContext();const p2=await c2.newPage();await p2.goto('http://127.0.0.1:8770/');await p2.evaluate(()=>localStorage.setItem('js-workshop-v1','{broken'));await p2.reload();assert(await p2.locator('#storage-warning').isVisible(),'corrupt warning');assert(await p2.evaluate(()=>localStorage.getItem('js-workshop-v1'))==='{broken','corrupt preserved');report.corrupt=true;await c2.close();
  const c3=await browser.newContext();await c3.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Quota','QuotaExceededError');};});const p3=await c3.newPage();await p3.goto('http://127.0.0.1:8770/');assert(await p3.locator('#storage-warning').isVisible(),'denied warning');await p3.locator('#editor').fill(lessons[0].solution);await p3.locator('#check').click();await p3.waitForFunction(()=>!document.getElementById('check').disabled);assert((await p3.locator('#feedback').innerText()).includes('Получилось!'),'denied usable');report.denied=true;await c3.close();
  report.pageErrors=errors;report.externalRequests=external;assert(errors.length===0,'Ошибки страницы');assert(external.length===0,'Внешние запросы');
  await context.close();return report;
})
