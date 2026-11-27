// Проверка готовой сборки через обычный статический сервер, без serve.py.
// Сервер: python3 -m http.server 8773 --bind 127.0.0.1 --directory <родитель сборки>
// Папка сборки внутри него должна называться YaCoEducotion.
(async function(page){
  const base='http://127.0.0.1:8773/YaCoEducotion/';
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1050}}),p=await context.newPage();
  const errors=[],failed=[],escaped=[],report={workshops:[],dimensions:[]};
  const assert=(ok,message)=>{if(!ok)throw Error(message);};
  p.on('pageerror',error=>errors.push(error.message));
  p.on('response',response=>{if(response.status()>=400)failed.push(response.url());});
  p.on('request',request=>{if(!request.url().startsWith(base)&&!request.url().startsWith('blob:')&&!request.url().startsWith('data:'))escaped.push(request.url());});
  try{
    await p.goto(base);await p.waitForFunction(()=>document.querySelectorAll('.workshop-card').length===7);
    assert(await p.locator('#lesson-total').innerText()==='133','Число занятий');
    await p.locator('#search').fill('SSH');assert(await p.locator('.workshop-card').count()===1,'Поиск SSH');await p.locator('#search').fill('');
    const registry=await p.evaluate(()=>fetch('./workshops-public.json').then(r=>r.json()));
    for(const w of registry.workshops){
      await p.locator('[data-workshop="'+w.id+'"] .course-link').click();
      const url=new URL(w.url,base).href;
      await p.waitForFunction(()=>document.querySelector('#workshop-frame')?.contentDocument?.querySelector('#check'));
      const frame=p.frame({url});assert(!!frame,'Адрес iframe '+w.id);
      assert(await p.locator('#standalone').getAttribute('href')===w.url,'Отдельная мастерская '+w.id);
      if(w.id==='web'){const solution=await frame.evaluate(()=>TrainerLessons[0].solution);await frame.locator('#editor').fill(solution.html);await frame.locator('#check').click();}
      if(w.id==='js'){const solution=await frame.evaluate(()=>JSCourse.lessons[0].solution);await frame.locator('#editor').fill(solution);await frame.locator('#check').click();}
      if(w.id==='python'){await frame.waitForFunction(()=>document.getElementById('runtime-status').textContent.includes('3.14.2'),{},{timeout:45000});const solution=await frame.evaluate(()=>PythonCourse.lessons[0].solution);await frame.locator('#editor').fill(solution);await frame.locator('#check').click();}
      if(w.id==='ubuntu'){await frame.locator('#command').fill('pwd');await frame.locator('#command').press('Enter');await frame.locator('#check').click();}
      if(w.id==='vim'){await frame.locator('#keyboard').focus();await p.keyboard.press('Escape');await frame.locator('#check').click();}
      if(w.id==='tmux'){await frame.locator('#terminal-input').focus();await p.keyboard.press('Control+b');await p.keyboard.press('?');await p.keyboard.press('q');await frame.locator('#check').click();}
      if(w.id==='vps'){await frame.locator('[data-action=provider]').click();await frame.locator('[data-action=snapshot]').click();await frame.locator('#check').click();}
      await frame.waitForFunction(()=>!document.getElementById('check').disabled,{},{timeout:45000});
      assert(/Получилось!|Отлично!/.test(await frame.locator('#feedback').innerText()),'Выполнение задания '+w.id);
      await p.waitForFunction(()=>document.getElementById('study-progress-text').textContent==='1 из 19 занятий');
      report.workshops.push({id:w.id,url,exercise:true,liveProgress:true});
      await p.locator('.back-link').click();
    }
    await p.reload();await p.waitForFunction(()=>document.querySelectorAll('.workshop-card').length===7);
    assert(await p.locator('#completed-total').innerText()==='7','Прогресс после reload');report.reload=true;
    for(const width of [1440,390,320]){await p.setViewportSize({width,height:950});const size=await p.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth}));assert(size.width===size.document,'Переполнение '+width);report.dimensions.push(size);}
    await p.setViewportSize({width:1440,height:1050});
    await p.goto(base+'index.html#/workshop/python');await p.waitForFunction(()=>document.querySelector('#workshop-frame')?.contentDocument?.querySelector('#check'));
    assert(p.frame({url:base+'workshops/python/'}),'Прямая ссылка index.html');report.directLink=true;
    const wasm=await context.request.head(base+'workshops/python/vendor/pyodide/pyodide.asm.wasm');assert(wasm.headers()['content-type']==='application/wasm','MIME WASM');report.wasm=true;
    await p.goto(base);await p.waitForFunction(()=>document.querySelectorAll('.workshop-card').length===7);
    assert(errors.length===0,'JS ошибки: '+errors);assert(failed.length===0,'HTTP ошибки: '+failed);assert(escaped.length===0,'Запросы за пределы префикса: '+escaped);
    report.pageErrors=errors;report.failedResponses=failed;report.escapedRequests=escaped;
    return report;
  }finally{await context.close();}
})
