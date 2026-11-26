(async function(page){
  const browser=page.context().browser(),context=await browser.newContext({viewport:{width:1440,height:1050}}),p=await context.newPage();
  const report={lessons:[],dimensions:[]},errors=[],external=[];
  const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8771/'))external.push(r.url());});
  await p.goto('http://127.0.0.1:8771/');
  const lessons=await p.evaluate(()=>VPSCourse.lessons.map(({id,title,solution})=>({id,title,solution})));
  async function terminal(){if(await p.locator('#tab-terminal').isVisible())await p.locator('#tab-terminal').click();}
  async function command(text){await terminal();await p.locator('#command').fill(text);await p.locator('#command').press('Enter');}
  async function action(name){await terminal();if(['snapshot','restore'].includes(name)&&!await p.locator('[data-action="'+name+'"]').isVisible())await p.locator('[data-action=provider]').click();
    if(name==='restore')p.once('dialog',d=>d.accept());await p.locator('[data-action="'+name+'"]').click();}
  async function steps(items){for(const item of items){if(typeof item==='string')await command(item);else if(item.action)await action(item.action);else if(item.edit!==undefined){await p.locator('#config-text').fill(item.edit);await p.locator('#save-config').click();}}}
  async function select(id){if(!await p.locator('.lesson-link[data-id="'+id+'"]').isVisible())await p.locator('#course-menu summary').click();await p.locator('.lesson-link[data-id="'+id+'"]').click();}
  for(const lesson of lessons){
    await select(lesson.id);await p.locator('#check').click();assert(!(await p.locator('#feedback').innerText()).includes('Получилось!'),'старт '+lesson.id);
    const before=await p.locator('#progress-count').innerText();await p.locator('#solution summary').click();assert(await p.locator('#progress-count').innerText()===before,'Просмотр не завершает');
    await steps(lesson.solution);await p.locator('#check').click();const feedback=await p.locator('#feedback').innerText();assert(feedback.includes('Получилось!'),lesson.id+': '+feedback+'\n'+await p.locator('#terminal-output').innerText());report.lessons.push(lesson.id);
  }
  assert(await p.locator('#progress-count').innerText()==='19','19/19');
  const state=await p.evaluate(()=>JSON.parse(localStorage.getItem('vps-workshop-v1')).sessions['vps-19'].state);await p.reload();assert(await p.locator('#progress-count').innerText()==='19','reload progress');assert(await p.evaluate(state=>JSON.stringify(JSON.parse(localStorage.getItem('vps-workshop-v1')).sessions['vps-19'].state)===JSON.stringify(state),state),'reload entire state');report.reload=true;
  p.once('dialog',d=>d.dismiss());await p.locator('#reset').click();assert((await p.locator('#user-state').textContent()).includes('Копий на локальной стороне: 1'),'reset отмена');
  p.once('dialog',d=>d.accept());await p.locator('#reset').click();assert((await p.locator('#user-state').textContent()).includes('Копий на локальной стороне: 0'),'reset принят');assert(await p.locator('#progress-count').innerText()==='19','marks remain');report.reset=true;
  // Потеря доступа новым входом, сохранённый старый сеанс и консоль.
  await select('vps-10');p.once('dialog',d=>d.accept());await p.locator('#reset').click();
  await command('sudo ufw default deny incoming');await command('sudo ufw enable');await command('y');await action('client');await command('ssh -o PreferredAuthentications=publickey admin@203.0.113.10');
  assert((await p.locator('#terminal-output').innerText()).includes('соединение не установлено'),'блокировка нового SSH');
  await p.locator('#session-tabs button').last().click();await command('sudo -v');assert((await p.locator('#terminal-output').innerText()).includes('проверка sudo успешна'),'старый сеанс');
  await action('console');await command('ufw allow 22/tcp');await action('client');await command('ssh -o PreferredAuthentications=publickey admin@203.0.113.10');
  assert((await p.locator('#terminal-context').innerText()).includes('admin@'),'console recovery');await p.locator('#check').click();assert(!(await p.locator('#feedback').innerText()).includes('Получилось!'),'неправильный порядок не засчитан');report.lockoutRecovery=true;
  // Ошибка конфигурации и сохранение черновика редактора при reload.
  await select('vps-9');p.once('dialog',d=>d.accept());await p.locator('#reset').click();
  await command('sudo nano /etc/ssh/sshd_config.d/00-workshop.conf');await p.locator('#config-text').fill('InvalidOption yes\n');await p.reload();await terminal();assert(await p.locator('#config-text').inputValue()==='InvalidOption yes\n','editor reload');
  await p.locator('#save-config').click();await command('sudo sshd -t');assert((await p.locator('#terminal-output').innerText()).includes('неверная директива'),'invalid SSH');await command('sudo systemctl reload ssh');assert((await p.locator('#ssh-state').textContent()).includes('password: yes'),'runtime survived invalid config');report.configError=true;report.editorReload=true;
  await command('sudo nano /etc/ssh/sshd_config.d/00-workshop.conf');await p.locator('#config-text').fill('PermitRootLogin no\n');await p.locator('#cancel-config').click();assert((await p.locator('#ssh-state').textContent()).includes('Ошибка:'),'cancel no disk write');report.editorCancel=true;
  await command('<img src=x onerror=alert(1)>');assert(await p.locator('#terminal-output img').count()===0,'HTML only text');report.safeText=true;
  await p.locator('#command').fill('whoami');await p.locator('#command').press('Enter');await p.locator('#command').press('ArrowUp');assert(await p.locator('#command').inputValue()==='whoami','history up');await p.locator('#command').press('ArrowDown');assert(await p.locator('#command').inputValue()==='','history down');report.history=true;
  await p.locator('#command').focus();await p.keyboard.press('Tab');assert(!await p.locator('#command').evaluate(e=>e===document.activeElement),'Tab exits');report.tab=true;
  await p.locator('[data-insert=whoami]').click();assert(await p.locator('#command').inputValue()==='whoami','reference only inserts');report.reference=true;
  for(const width of [1440,1024,768,390,320]){await p.setViewportSize({width,height:950});const d=await p.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth}));assert(d.width===d.document,'overflow '+width);report.dimensions.push(d);}
  await p.locator('#tab-terminal').focus();await p.keyboard.press('ArrowRight');assert(await p.locator('#tab-files').getAttribute('aria-selected')==='true','mobile arrow');await p.keyboard.press('Home');assert(await p.locator('#tab-task').getAttribute('aria-selected')==='true','mobile Home');report.mobileTabs=true;
  await p.setViewportSize({width:1440,height:1050});await p.evaluate(()=>document.documentElement.style.fontSize='200%');const zoom=await p.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth,text:getComputedStyle(document.querySelector('#theory')).fontSize}));assert(zoom.width===zoom.document&&zoom.text==='32px','200%');report.largeText=zoom;
  const c2=await browser.newContext(),p2=await c2.newPage();await p2.goto('http://127.0.0.1:8771/');await p2.evaluate(()=>localStorage.setItem('vps-workshop-v1','{broken'));await p2.reload();assert(await p2.locator('#storage-warning').isVisible(),'corrupt warning');assert(await p2.evaluate(()=>localStorage.getItem('vps-workshop-v1'))==='{broken','corrupt preserved');report.corrupt=true;await c2.close();
  const c3=await browser.newContext();await c3.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Quota','QuotaExceededError');};});const p3=await c3.newPage();await p3.goto('http://127.0.0.1:8771/');assert(await p3.locator('#storage-warning').isVisible(),'denied warning');await p3.locator('[data-action=provider]').click();await p3.locator('[data-action=snapshot]').click();await p3.locator('#check').click();assert((await p3.locator('#feedback').innerText()).includes('Получилось!'),'denied works');report.denied=true;await c3.close();
  report.pageErrors=errors;report.externalRequests=external;assert(errors.length===0,'page errors '+errors);assert(external.length===0,'external requests');await context.close();return report;
})
