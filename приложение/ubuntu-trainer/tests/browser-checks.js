// Для существующего Playwright: функция получает page. Все сеансы тестовые,
// изолированы отдельными browser contexts, реальный прогресс пользователя не меняется.
async (page) => {
  const browser=page.context().browser();
  const context=await browser.newContext({viewport:{width:1440,height:1050}});
  const p=await context.newPage(),errors=[],requests=[];
  p.on('pageerror',error=>errors.push(error.message));
  p.on('request',request=>requests.push(request.url()));
  const report={};
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  const command=async value=>{await p.locator('#command').fill(value);await p.locator('#command').press('Enter');};
  const state=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('ubuntu-workshop-v1')));
  try {
    await p.goto('http://127.0.0.1:8766');
    await p.locator('#check').click();assert(await p.locator('#feedback .fail').count()>0,'Старт не должен завершать урок');
    const before=await state();await p.locator('#solution summary').click();assert(JSON.stringify((await state()).completed)===JSON.stringify(before.completed),'Решение не должно выполнять команды');
    await command('unknown-command');assert(await p.locator('.error-output').count()===1,'Неизвестная команда должна показать ошибку');
    report.lessons=[];
    for(let n=0;n<19;n++){
      await p.locator('.lesson-link').nth(n).click();
      const solutions=await p.evaluate(n=>UbuntuCourse.lessons[n].solution,n);
      for(const line of solutions)await command(line);
      await p.locator('#check').click();
      const success=await p.locator('#feedback .success-title').count()===1;assert(success,'Не пройден урок '+n);
      report.lessons.push({id:await p.locator('.lesson-link[aria-current=step]').getAttribute('data-id'),success});
    }
    assert(await p.locator('#progress-count').innerText()==='19','19 отметок');
    const finalState=await state();await p.reload();
    report.reload=await p.locator('#progress-count').innerText()==='19'&&(await state()).sessions.final.state.fs['/home/student/workspace/errors.txt'].content==='ERROR connection\nERROR timeout\n';assert(report.reload,'Сохранение проекта');
    await p.locator('#command').fill('echo неотправленный черновик');await p.reload();report.draft=await p.locator('#command').inputValue()==='echo неотправленный черновик';assert(report.draft,'Черновик ввода');
    await command('pwd');await p.locator('#command').press('ArrowUp');assert(await p.locator('#command').inputValue()==='pwd','История вверх');await p.locator('#command').press('ArrowDown');assert(await p.locator('#command').inputValue()==='','История вниз');
    report.history=true;
    await command("echo '<img src=x onerror=alert(1)>' > xss.txt");
    await p.locator('.tree-row.file').filter({hasText:'xss.txt'}).click();
    report.safeText=await p.locator('#file-content').innerText()==='<img src=x onerror=alert(1)>\n'&&await p.locator('#file-content img').count()===0;assert(report.safeText,'Текст файла не должен исполняться');
    const beforeClear=(await state()).sessions.final.state;
    await p.locator('#clear-screen').click();report.clear=JSON.stringify((await state()).sessions.final.state)===JSON.stringify(beforeClear)&&await p.locator('.terminal-entry').count()===0;assert(report.clear,'Очистка только экрана');
    await p.evaluate(()=>window.confirm=()=>false);await p.locator('#reset').click();assert((await state()).sessions.final.state.fs['/home/student/workspace/xss.txt'],'Отмена сброса');
    await p.evaluate(()=>window.confirm=()=>true);await p.locator('#reset').click();const reset=await state();report.reset=!reset.sessions.final.state.fs['/home/student/workspace/xss.txt']&&reset.sessions.final.state.fs['/home/student/workspace/temp.txt']?.type==='file'&&reset.completed.length===19;assert(report.reset,'Сброс среды и сохранение отметки');
    report.dimensions=[];
    for(const width of [1440,1024,768,390,320]){
      await p.setViewportSize({width,height:900});
      const dimension=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));report.dimensions.push(dimension);assert(dimension.width===dimension.scroll,'Переполнение '+width);
    }
    await p.setViewportSize({width:390,height:844});
    await p.locator('#tab-terminal').click();assert(await p.locator('#command').isVisible(),'Мобильный терминал');await command('pwd');
    await p.locator('#tab-terminal').press('ArrowRight');assert(await p.locator('#file-tree').isVisible(),'Мобильная клавиатурная вкладка файлов');
    await p.locator('#tab-files').press('Home');assert(await p.locator('#theory').isVisible(),'Home выбирает урок');report.mobile=true;
    await p.setViewportSize({width:1440,height:1050});await p.evaluate(()=>document.documentElement.style.fontSize='200%');
    report.largeText=await p.evaluate(()=>({font:getComputedStyle(document.querySelector('#theory')).fontSize,overflow:document.documentElement.scrollWidth>innerWidth}));assert(report.largeText.font==='32px'&&!report.largeText.overflow,'Текст 200%');
    await p.evaluate(()=>document.documentElement.style.fontSize='');
    report.corrupt=null;report.denied=null;
    for(const kind of ['corrupt','denied']){
      const ctx=await browser.newContext();
      if(kind==='corrupt')await ctx.addInitScript(()=>{if(!sessionStorage.getItem('fixture')){localStorage.setItem('ubuntu-workshop-v1','{broken');sessionStorage.setItem('fixture','1');}});
      else await ctx.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Недоступно','SecurityError');};});
      const tab=await ctx.newPage();await tab.goto('http://127.0.0.1:8766');
      const result=await tab.evaluate(()=>({warning:!document.querySelector('#storage-warning').hidden,working:!document.querySelector('#check').disabled,original:localStorage.getItem('ubuntu-workshop-v1')}));
      assert(result.warning&&result.working,'Отказ хранилища '+kind);if(kind==='corrupt')assert(result.original==='{broken','Не затирать повреждённую запись');
      report[kind]={warning:result.warning,working:result.working,preserved:kind==='corrupt'?result.original==='{broken':null};await ctx.close();
    }
    report.consoleErrors=errors;report.externalRequests=requests.filter(url=>!url.startsWith('http://127.0.0.1:8766/'));
    assert(!errors.length,'Ошибки JS');assert(!report.externalRequests.length,'Внешние запросы');
    return report;
  } finally {await context.close();}
}
