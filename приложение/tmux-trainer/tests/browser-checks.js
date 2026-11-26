// Для существующего Playwright. Изолированные contexts не изменяют прогресс
// пользователя, никаких процессов tmux или shell в тесте не запускается.
async page=>{
  const browser=page.context().browser(),context=await browser.newContext({viewport:{width:1440,height:1050}}),p=await context.newPage();
  const report={},errors=[],external=[];
  p.on('pageerror',e=>errors.push(e.message));context.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8769/'))external.push(r.url());});
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  const state=()=>p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('tmux-workshop-v1'));return {data:d,state:d.sessions[d.last]};});
  const input=p.locator('#terminal-input');
  const command=async text=>{await input.fill(text);await input.press('Enter');};
  const keys=async notation=>{const special={'<C-b>':'Control+b','<Enter>':'Enter','<Esc>':'Escape','<Down>':'ArrowDown','<Up>':'ArrowUp','<Left>':'ArrowLeft','<Right>':'ArrowRight','<PageUp>':'PageUp','<Space>':'Space'};let rest=notation;await input.focus();while(rest){const token=Object.keys(special).find(t=>rest.startsWith(t));if(token){await input.press(special[token]);rest=rest.slice(token.length);}else{const char=Array.from(rest)[0];await input.press(char===' '?'Space':char);rest=rest.slice(char.length);}}};
  const prefixButton=()=>p.locator('[data-key="Ctrl-b"]').click();
  try{
    await p.goto('http://127.0.0.1:8769');await p.locator('#solution-details summary').click();assert(await p.locator('#progress-count').innerText()==='0','Решение не засчитывает урок');await p.locator('#check').click();assert(await p.locator('#feedback .fail').count()>0,'Старт не должен проходить');
    report.lessons=[];
    for(let n=0;n<19;n++){
      await p.locator('.lesson-link').nth(n).click();const lesson=await p.evaluate(n=>TmuxCourse.lessons[n],n);
      for(const step of lesson.solution){if(step.shell!==undefined)await command(step.shell);else await keys(step.keys);}
      await p.locator('#check').click();const success=await p.locator('#feedback .success-title').count()===1;assert(success,lesson.id+': '+await p.locator('#feedback').innerText());report.lessons.push({id:lesson.id,success});
    }
    assert(await p.locator('#progress-count').innerText()==='19','Прогресс 19/19');const before=(await state()).state;await p.reload();assert(JSON.stringify((await state()).state)===JSON.stringify(before)&&(await state()).data.completed.length===19,'Восстановление состояния');report.reload=true;
    // Координаты DOM действительно отражают вложенное дерево итогового проекта.
    const geometry=await p.locator('.terminal-pane').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.id,x:r.x,y:r.y,w:r.width,h:r.height};}));
    const a=geometry.find(r=>r.id==='%0'),b=geometry.find(r=>r.id==='%1'),c=geometry.find(r=>r.id==='%2');assert(a.x<b.x&&b.x===c.x&&b.y<c.y&&a.h>b.h,'Геометрия вложенных панелей');report.nestedGeometry=true;
    await p.locator('.lesson-link').nth(6).click();await p.evaluate(()=>window.confirm=()=>false);await p.locator('#reset').click();assert((await state()).state.sessions[0].windows[0].panes.length===2,'Отмена сброса');await p.evaluate(()=>window.confirm=()=>true);await p.locator('#reset').click();assert((await state()).state.sessions[0].windows[0].panes.length===1&&(await state()).data.completed.length===19,'Сброс и сохранение отметок');report.reset=true;
    await prefixButton();await p.locator('[data-key="%"] ').click();assert((await state()).state.sessions[0].windows[0].panes.length===2&&await p.locator('.terminal-pane').count()===2,'Экранный split');report.screenKeys=true;
    await prefixButton();await p.locator('[data-key="z"]').click();assert(await p.locator('.terminal-pane').count()===1&&(await state()).state.sessions[0].windows[0].panes.length===2,'Zoom не удаляет панели');await prefixButton();await p.locator('[data-key="z"]').click();assert(await p.locator('.terminal-pane').count()===2,'Возврат zoom');report.zoom=true;
    await keys('<C-b>xn');assert((await state()).state.sessions[0].windows[0].panes.length===2,'Отмена закрытия');await keys('<C-b>xy');assert((await state()).state.sessions[0].windows[0].panes.length===1,'Подтверждение закрытия');report.confirmClose=true;
    await command('echo KEEP');await keys('<C-b>d');assert((await state()).state.attached===null,'Detach');await command('tmux attach -t learn');assert((await state()).state.sessions[0].windows[0].panes[0].lines.includes('KEEP'),'Attach сохраняет текст');report.detachAttach=true;
    await command('echo "<img src=x onerror=alert(1)>"');assert(await p.locator('#terminal-canvas img').count()===0&&(await p.locator('.pane-output').innerText()).includes('<img'),'Вывод только текст');report.safeText=true;
    await command('unknown-command');assert((await state()).state.error,'Неизвестная команда');await input.fill('');await keys('<C-b><Esc>');assert(!(await state()).state.prefix,'Esc отменяет префикс');report.cancelPrefix=true;
    await input.press('Tab');assert(await p.evaluate(()=>document.activeElement.id!=='terminal-input'),'Tab выходит из терминала');await p.locator('#workspace').focus();await p.evaluate(()=>document.querySelector('#workspace').dispatchEvent(new KeyboardEvent('keydown',{key:'b',ctrlKey:true,bubbles:true,cancelable:true})));assert(!(await state()).state.prefix,'Нет глобального Ctrl+B');report.focusIsolation=true;
    await command('tmux new -d -s work');await keys('<C-b>s');await p.locator('[data-choice="1"]').click();assert((await state()).state.attached==='$1','Выбор сессии нажатием');report.touchChoice=true;
    await command('demo-log');await keys('<C-b>[<PageUp>');assert((await state()).state.copyOffset>0,'Прокрутка истории');await keys('q');assert((await state()).state.mode==='normal','Выход из истории');report.history=true;
    report.dimensions=[];for(const width of [1440,1024,768,390,320]){await p.setViewportSize({width,height:900});const r=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));report.dimensions.push(r);assert(r.width===r.scroll,'Переполнение страницы '+width);}
    await p.setViewportSize({width:390,height:844});await p.locator('#tab-practice').click();assert(await input.isVisible(),'Мобильный терминал');await p.locator('#tab-practice').press('ArrowRight');assert(await p.locator('#structure-tree').isVisible(),'Структура на телефоне');await p.locator('#tab-structure').press('Home');assert(await p.locator('#theory').isVisible(),'Мобильный урок');report.mobile=true;
    await p.setViewportSize({width:1440,height:1050});await p.evaluate(()=>document.documentElement.style.fontSize='200%');report.largeText=await p.evaluate(()=>({font:getComputedStyle(document.querySelector('#theory')).fontSize,overflow:document.documentElement.scrollWidth>innerWidth}));assert(report.largeText.font==='32px'&&!report.largeText.overflow,'Текст 200%');await p.evaluate(()=>document.documentElement.style.fontSize='');
    for(const kind of ['corrupt','denied']){const ctx=await browser.newContext();if(kind==='corrupt')await ctx.addInitScript(()=>localStorage.setItem('tmux-workshop-v1','{bad'));else await ctx.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Denied','SecurityError');};});const q=await ctx.newPage();await q.goto('http://127.0.0.1:8769');report[kind]=await q.evaluate(()=>({warning:!document.querySelector('#storage-warning').hidden,usable:!document.querySelector('#check').disabled,preserved:localStorage.getItem('tmux-workshop-v1')==='{bad'}));assert(report[kind].warning&&report[kind].usable&&(kind!=='corrupt'||report[kind].preserved),'Хранилище '+kind);await ctx.close();}
    report.pageErrors=errors;report.externalRequests=external;assert(!errors.length,'Ошибки JS');assert(!external.length,'Внешние запросы');return report;
  }finally{await context.close();}
}
