// Для существующего Playwright. Изолированные contexts не затрагивают прогресс
// пользователя. Все команды исполняются только учебной JS-моделью.
async page=>{
  const browser=page.context().browser(),context=await browser.newContext({viewport:{width:1440,height:1050}}),p=await context.newPage();
  const report={},errors=[],external=[];
  p.on('pageerror',e=>errors.push(e.message));context.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8768/'))external.push(r.url());});
  const assert=(v,m)=>{if(!v)throw new Error(m);};
  const state=()=>p.evaluate(()=>{const data=JSON.parse(localStorage.getItem('vim-workshop-v1'));return {data,state:data.sessions[data.last]};});
  const keys=async notation=>{
    const special={'<Esc>':'Escape','<CR>':'Enter','<C-r>':'Control+r','<BS>':'Backspace'};
    let rest=notation;await p.locator('#keyboard').focus();
    while(rest){const token=Object.keys(special).find(t=>rest.startsWith(t));if(token){await p.locator('#keyboard').press(special[token]);rest=rest.slice(token.length);}else{const c=Array.from(rest)[0];if(c.codePointAt(0)>127)await p.keyboard.insertText(c);else await p.locator('#keyboard').press(c===' '?'Space':c);rest=rest.slice(c.length);}}
  };
  try{
    await p.goto('http://127.0.0.1:8768');await p.locator('#solution-details summary').click();assert(await p.locator('#progress-count').innerText()==='0','Решение не засчитывает урок');
    await p.locator('#check').click();assert(await p.locator('#feedback .fail').count()>0,'Старт не должен проходить');
    report.lessons=[];
    for(let n=0;n<19;n++){
      await p.locator('.lesson-link').nth(n).click();const lesson=await p.evaluate(n=>VimCourse.lessons[n],n);await keys(lesson.solution);await p.locator('#check').click();
      const success=await p.locator('#feedback .success-title').count()===1;assert(success,lesson.id+': '+await p.locator('#feedback').innerText());report.lessons.push({id:lesson.id,success});
    }
    assert(await p.locator('#progress-count').innerText()==='19','Итог 19/19');const before=(await state()).state;await p.reload();const after=await state();assert(after.data.completed.length===19&&JSON.stringify(after.state)===JSON.stringify(before),'Состояние после reload');report.reload=true;
    await p.locator('.lesson-link').nth(2).click();await keys('A!<Esc>');await p.evaluate(()=>window.confirm=()=>false);await p.locator('#reset').click();assert((await state()).state.lines.join('\n').endsWith('!'),'Отмена сброса');await p.evaluate(()=>window.confirm=()=>true);await p.locator('#reset').click();assert((await state()).state.lines.join('\n')==='Vim'&&(await state()).data.completed.length===19,'Сброс состояния, отметки сохранены');report.reset=true;
    // Экранные клавиши и отдельное поле текста используют тот же движок.
    await p.locator('[data-key="i"]').click();await p.locator('#insert-text').fill('Экран ');await p.locator('#type-text').click();await p.locator('[data-key="Escape"]').click();assert((await state()).state.lines.join('\n')==='Экран Vim','Экранный ввод');report.screenKeys=true;
    await p.locator('#insert-text').fill('не команда');await p.locator('#insert-text').press('i');assert((await state()).state.mode==='normal','Нет глобального перехвата');report.focusIsolation=true;
    await p.locator('#keyboard').focus();await p.locator('#keyboard').press('Tab');assert(await p.evaluate(()=>document.activeElement.id!=='keyboard'),'Tab выходит из редактора');report.tabEscape=true;
    await p.locator('[data-key="u"]').click();await p.locator('#keyboard').press('Control+r');assert((await state()).state.lines.join('\n')==='Экран Vim','Ctrl+R восстанавливает');report.redo=true;
    await p.locator('.lesson-link').nth(5).click();assert(await p.locator('#closed-panel').isVisible(),'Закрытый файл после сохранения');await p.locator('#reopen').click();assert(!(await state()).state.closed&&(await state()).state.saved==='done','Открытие сохранённого файла');report.reopen=true;
    await keys('A!<Esc>:q<CR>');assert(!(await state()).state.closed&&(await state()).state.error,'q предупреждает о несохранённых');await keys(':q!<CR>');assert((await state()).state.closed&&(await state()).state.lines.join('\n')==='done','q! отбрасывает изменения');report.virtualQuit=true;
    await p.locator('.lesson-link').nth(2).click();await p.evaluate(()=>window.confirm=()=>true);await p.locator('#reset').click();await p.locator('[data-key="i"]').click();await p.locator('#insert-text').fill('<img src=x onerror=alert(1)>');await p.locator('#type-text').click();await p.locator('[data-key="Escape"]').click();assert(await p.locator('#buffer img').count()===0&&(await p.locator('#buffer').innerText()).includes('<img'),'Текст не исполняется');report.safeText=true;
    // Имитация input/composition дополняет физическую клавиатуру. Это не тест
    // физической мобильной клавиатуры или конкретного IME.
    await p.evaluate(()=>{const e=document.querySelector('#keyboard');e.focus();e.dispatchEvent(new KeyboardEvent('keydown',{key:'i',bubbles:true,cancelable:true}));e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));e.value='ёж';e.dispatchEvent(new InputEvent('input',{inputType:'insertCompositionText',isComposing:true,bubbles:true}));e.dispatchEvent(new CompositionEvent('compositionend',{data:'ёж',bubbles:true}));});
    await keys('<Esc>');assert((await state()).state.lines.join('\n').includes('ёж'),'Композиционный ввод без потерь');report.composition=true;
    report.dimensions=[];for(const width of [1440,1024,768,390,320]){await p.setViewportSize({width,height:900});const r=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));report.dimensions.push(r);assert(r.width===r.scroll,'Переполнение '+width);}
    await p.setViewportSize({width:390,height:844});await p.locator('#tab-practice').click();assert(await p.locator('#keyboard').isVisible(),'Мобильная практика');await p.locator('#tab-practice').press('ArrowRight');assert(await p.locator('#reference-panel dl').isVisible(),'Мобильная памятка');await p.locator('#tab-reference').press('Home');assert(await p.locator('#theory').isVisible(),'Home возвращает урок');report.mobile=true;
    await p.setViewportSize({width:1440,height:1050});await p.evaluate(()=>document.documentElement.style.fontSize='200%');report.largeText=await p.evaluate(()=>({font:getComputedStyle(document.querySelector('#theory')).fontSize,overflow:document.documentElement.scrollWidth>innerWidth}));assert(report.largeText.font==='32px'&&!report.largeText.overflow,'Текст 200%');await p.evaluate(()=>document.documentElement.style.fontSize='');
    for(const kind of ['corrupt','denied']){const ctx=await browser.newContext();if(kind==='corrupt')await ctx.addInitScript(()=>localStorage.setItem('vim-workshop-v1','{bad'));else await ctx.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Denied','SecurityError');};});const q=await ctx.newPage();await q.goto('http://127.0.0.1:8768');report[kind]=await q.evaluate(()=>({warning:!document.querySelector('#storage-warning').hidden,usable:!document.querySelector('#check').disabled,preserved:localStorage.getItem('vim-workshop-v1')==='{bad'}));assert(report[kind].warning&&report[kind].usable&&(kind!=='corrupt'||report[kind].preserved),'Хранилище '+kind);await ctx.close();}
    report.pageErrors=errors;report.externalRequests=external;assert(!errors.length,'Ошибки JS');assert(!external.length,'Внешние запросы');return report;
  }finally{await context.close();}
}
