// Функция для существующего Playwright. Использует изолированный browser context.
async page=>{
  const context=await page.context().browser().newContext({viewport:{width:1440,height:1050}});
  const p=await context.newPage(),external=[],errors=[];
  context.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8767/'))external.push(r.url());});
  p.on('pageerror',e=>errors.push(e.message));
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  try{
    await p.goto('http://127.0.0.1:8767');
    await p.waitForFunction(()=>document.querySelector('#runtime-status').textContent.includes('локально'),{},{timeout:35000});
    const report={version:await p.locator('#runtime-status').innerText(),lessons:[]};
    await p.locator('#solution-details summary').click();const before=await p.locator('#progress-count').innerText();
    assert(before==='0','Открытие решения не засчитывает урок');
    for(let n=0;n<19;n++){
      await p.locator('.lesson-link').nth(n).click();
      const lesson=await p.evaluate(n=>PythonCourse.lessons[n],n);
      await p.locator('#editor').fill(lesson.solution);await p.locator('#stdin').fill(lesson.stdin);
      await p.locator('#check').click();await p.waitForFunction(()=>!document.querySelector('#check').disabled,{},{timeout:35000});
      const success=await p.locator('#feedback .success-title').count()===1;
      assert(success,lesson.id+': '+await p.locator('#feedback').innerText());report.lessons.push({id:lesson.id,success});
    }
    assert(await p.locator('#progress-count').innerText()==='19','Итог 19/19');
    await p.reload();assert(await p.locator('#progress-count').innerText()==='19','Прогресс после reload');
    assert((await p.locator('#editor').inputValue()).includes('def analyze_expenses'),'Код восстановлен');
    report.reload=true;
    // UI выше проверил новый Worker для каждого запуска. Собственные варианты
    // ниже используют один загруженный Worker: namespace обвязки всё равно новый,
    // а повторная загрузка WASM для каждого из 57 образцов не нужна.
    report.variants=await p.evaluate(async()=>{
      const worker=new Worker('./worker.mjs',{type:'module'});
      await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Загрузка тестового Python')),30000);worker.onmessage=e=>{if(e.data.type==='ready'){clearTimeout(timer);resolve();}else if(e.data.type==='load-error'){clearTimeout(timer);reject(new Error(e.data.message));}};});
      const execute=request=>new Promise((resolve,reject)=>{const id=crypto.randomUUID(),timer=setTimeout(()=>reject(new Error('Тест не ответил')),5000);worker.onmessage=e=>{if(e.data.id===id){clearTimeout(timer);if(e.data.type==='result')resolve(e.data.result);else reject(new Error(e.data.message));}};worker.postMessage({type:'execute',id,request});});
      const rows=[];
      try{
        for(const lesson of PythonCourse.lessons){
          const row={id:lesson.id};
          for(const [key,source]of [['alternative',lesson.alternative],['starter',lesson.start],['wrong','print("Неверный ответ")\n']]){
            const result=await execute({source,stdin:lesson.stdin,checks:lesson.checks});
            row[key]=!result.error&&result.results.length===lesson.checks.length&&result.results.every(t=>t.pass);
          }
          rows.push(row);
        }
      }finally{worker.terminate();}
      return rows;
    });
    assert(report.variants.every(r=>r.alternative&&!r.starter&&!r.wrong),'Варианты решений');
    report.externalRequests=external;report.pageErrors=errors;assert(!external.length,'Внешние запросы');assert(!errors.length,'Ошибки JS');return report;
  }finally{await context.close();}
}
