// Запуск через существующий Playwright: async-функция получает page.
// Ничего не устанавливает, не публикует и работает только с loopback-сайтом.
async (page) => {
  await page.setViewportSize({width:1440,height:1050});
  await page.goto('http://127.0.0.1:8765');
  await page.waitForFunction(() => !document.querySelector('#run').disabled);
  const checks = await page.evaluate(async () => {
    const reports = [];
    async function execute(lesson, source, width=900) {
      const frame=document.createElement('iframe');frame.style.width=width+'px';document.body.append(frame);
      try {const r=await TrainerRunner.execute(frame,source,lesson.tests);return {pass:!r.errors.length && r.results.every(t=>t.pass), details:r.results.filter(t=>!t.pass),errors:r.errors};}
      finally{frame.remove();}
    }
    for(const lesson of TrainerLessons){
      const alt={...lesson.solution};
      if(lesson.group==='HTML')alt.html=alt.html.replace(/<(h1|h2|p|a|li|button)([ >])/g,'<$1 class="my-element"$2').replace('<html lang="ru">','<html lang="ru" dir="ltr">');
      if(lesson.group==='CSS')alt.css=alt.css.replaceAll('.card','article.card').replaceAll('.items','div.items').replace('#e8edff','rgb(232, 237, 255)').replace('#18233b','rgb(24, 35, 59)').replace('repeat(3, 1fr)','1fr 1fr 1fr');
      if(lesson.id==='js-1')alt.js='const name = "Мир"; document.getElementById("output").textContent = `Привет, ${name}!`;';
      if(lesson.id==='js-2')alt.js='const access = age => age < 18 ? "Рано" : "Можно"; document.getElementById("output").textContent = access(18);';
      if(lesson.id==='js-3')alt.js='const total = (price, count) => count * price; document.getElementById("output").textContent = total(120, 3);';
      if(lesson.id==='js-4')alt.js='const sum = numbers => numbers.reduce((a,b) => a+b, 0); document.getElementById("output").textContent = sum([2,4,6]);';
      if(lesson.id==='js-5')alt.js='["HTML","CSS","JavaScript"].forEach(text=>{const li=document.createElement("li");li.textContent=text;document.getElementById("topics").appendChild(li);});';
      if(lesson.id==='js-6')alt.js='document.getElementById("increment").onclick = () => {const o=document.getElementById("count");o.textContent=Number(o.textContent)+1;};';
      if(lesson.id==='project')alt.js=alt.js.replace('item.remove()','list.removeChild(item)').replace('list.append(item)','list.appendChild(item)');
      const wrong={...lesson.solution};
      if(lesson.group==='HTML')wrong.html=wrong.html.replace(/<h1/g,'<div').replace(/<\/h1>/g,'</div>').replace('href="#practice"','href="#wrong"').replace('alt="Окно с кодом"','alt=""').replaceAll('<li>','<div>').replaceAll('</li>','</div>').replace('required','');
      if(lesson.group==='CSS')wrong.css='';
      if(lesson.group==='JavaScript'||lesson.group==='Проект')wrong.js='';
      reports.push({id:lesson.id,solution:await execute(lesson,lesson.solution),starter:await execute(lesson,lesson.start),alternative:await execute(lesson,alt),wrong:await execute(lesson,wrong)});
    }
    const adaptive=TrainerLessons.find(l=>l.id==='css-6');
    const narrow=await execute(adaptive,adaptive.solution,360);
    const noMedia={...adaptive.solution,css:'.card { width:100%;max-width:480px;box-sizing:border-box;padding:24px; }'};
    const narrowWrong=await execute(adaptive,noMedia,360);
    const securityFrame=document.createElement('iframe');document.body.append(securityFrame);
    const security=await TrainerRunner.execute(securityFrame,{html:'<p>Изоляция</p>',css:'',js:''},[
      {label:'Нет доступа к DOM родителя',expression:'(()=>{try{parent.document.body;return false}catch{return true}})()'},
      {label:'Нет доступа к localStorage',expression:'(()=>{try{localStorage.getItem("web-workshop-v1");return false}catch{return true}})()'}
    ]);securityFrame.remove();
    const errorFrame=document.createElement('iframe');document.body.append(errorFrame);
    const runtimeError=await TrainerRunner.execute(errorFrame,{html:'',css:'',js:'throw new Error("Тестовая ошибка")'},[]);errorFrame.remove();
    const syntaxFrame=document.createElement('iframe');document.body.append(syntaxFrame);
    const syntaxError=await TrainerRunner.execute(syntaxFrame,{html:'',css:'',js:'const = ;'},[]);syntaxFrame.remove();
    // Поддельное сообщение из родительского окна должно быть проигнорировано.
    const spoofFrame=document.createElement('iframe');document.body.append(spoofFrame);
    const promised=TrainerRunner.execute(spoofFrame,{html:'',css:'',js:''},[{label:'Настоящий ответ',expression:'true'}]);
    const token=spoofFrame.srcdoc.match(/token:"([^"]+)"/)?.[1];
    window.postMessage({token,type:'result',results:[{label:'Поддельный ответ',pass:true}],errors:[]},'*');
    const spoof=await promised;spoofFrame.remove();
    return {reports,narrow,narrowWrong,security:security.results,runtimeError:runtimeError.errors,syntaxError:syntaxError.errors,spoof:spoof.results};
  });
  await page.evaluate(value=>window.__checks=value,checks);
  // Проверяем реальные действия интерфейса и постоянное сохранение.
  await page.evaluate(()=>{window.confirm=()=>true;});
  await page.locator('[data-id="html-2"]').click();
  await page.waitForFunction(()=>!document.querySelector('#run').disabled);
  await page.locator('#solution-details summary').click();
  const beforeSolution=await page.locator('#progress-count').innerText();
  await page.locator('#use-solution').click();
  const afterSolution=await page.locator('#progress-count').innerText();
  await page.locator('#check').click();
  await page.waitForFunction(()=>!document.querySelector('#check').disabled);
  const completed=await page.locator('#lesson-state').innerText();
  const savedCode=await page.locator('#editor').inputValue();
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#run').disabled);
  const reload={lesson:await page.locator('#lesson-title').innerText(),codeRestored:savedCode===await page.locator('#editor').inputValue(),state:await page.locator('#lesson-state').innerText()};
  await page.locator('#tab-css').click();await page.locator('#tab-css').press('ArrowRight');
  const keyboard=await page.locator('#tab-js').getAttribute('aria-selected');
  await page.evaluate(()=>{window.confirm=()=>true;});
  await page.locator('#reset').click();
  const reset=await page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('web-workshop-v1')).drafts['html-2'])===JSON.stringify(TrainerLessons[1].start));
  const context=page.context();
  const corrupt=await context.newPage();await corrupt.goto('http://127.0.0.1:8765');
  const savedStore=await corrupt.evaluate(()=>localStorage.getItem('web-workshop-v1'));
  await corrupt.evaluate(()=>localStorage.setItem('web-workshop-v1','{bad-json'));
  await corrupt.reload();await corrupt.waitForFunction(()=>!document.querySelector('#run').disabled);
  const corruptState=await corrupt.evaluate(()=>({warning:!document.querySelector('#storage-warning').hidden,preserved:localStorage.getItem('web-workshop-v1')==='{bad-json',usable:!document.querySelector('#check').disabled}));
  await corrupt.evaluate(value=>localStorage.setItem('web-workshop-v1',value),savedStore);await corrupt.close();
  // Отказ записи проверяется в отдельной вкладке, без изменения реальных прав браузера.
  const denied=await context.newPage();await denied.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Denied','SecurityError');};});
  await denied.goto('http://127.0.0.1:8765');await denied.waitForFunction(()=>!document.querySelector('#run').disabled);
  const deniedState=await denied.evaluate(()=>({warning:!document.querySelector('#storage-warning').hidden,usable:!document.querySelector('#check').disabled}));await denied.close();
  const dimensions=[];
  for(const width of [1440,1024,768,390,320]){
    await page.setViewportSize({width,height:900});
    dimensions.push(await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth})));
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#view-code').click();
  const mobile=await page.locator('#editor').isVisible();
  await page.locator('#view-result').click();
  const mobileResult=await page.locator('#preview').isVisible();
  await page.setViewportSize({width:1440,height:1050});
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  const largeText=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth}));
  await page.evaluate(()=>document.documentElement.style.fontSize='');
  const failures = checks.reports.filter(r=>!r.solution.pass || !r.alternative.pass || r.starter.pass || r.wrong.pass).map(r=>r.id);
  if(failures.length || !checks.narrow.pass || checks.narrowWrong.pass || checks.security.some(r=>!r.pass) || !checks.runtimeError.length || !checks.syntaxError.length || checks.spoof[0].label !== 'Настоящий ответ') throw new Error('Проверки кода: ' + failures.join(', '));
  if(beforeSolution!==afterSolution || completed!=='Пройдено' || !reload.codeRestored || reload.state!=='Пройдено' || keyboard!=='true' || !reset || !corruptState.warning || !corruptState.preserved || !corruptState.usable || !deniedState.warning || !deniedState.usable || dimensions.some(d=>d.overflow) || !mobile || !mobileResult || largeText.overflow) throw new Error('Проверки интерфейса не прошли');
  return {checks,ui:{beforeSolution,afterSolution,completed,reload,keyboard,reset,corruptState,deniedState,dimensions,mobile,mobileResult,largeText}};
}
