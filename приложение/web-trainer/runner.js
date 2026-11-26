/* Изолированный запуск. allow-same-origin намеренно отсутствует: учебный код
   не получает DOM и localStorage приложения. Это учебный стенд, не защита
   от вредоносного кода: бесконечный цикл способен заблокировать вкладку. */
(() => {
  const picture = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="140"><rect width="240" height="140" rx="18" fill="#e8edff"/><rect x="54" y="28" width="132" height="84" rx="10" fill="#3456d4"/><text x="90" y="86" fill="white" font-size="40" font-family="monospace">&lt;/&gt;</text></svg>';
  const imageUrl = 'data:image/svg+xml;base64,' + btoa(picture);
  const jsLiteral = value => JSON.stringify(value).replace(/</g, '\\u003c');
  const text = source => source.replace(/<\/script/gi, '<\\/script');

  function buildDocument(draft, tests, token) {
    const nonce = crypto.randomUUID().replaceAll('-', '');
    const doc = new DOMParser().parseFromString(draft.html, 'text/html');
    // HTML используется для структуры; исполняемый код вводится во вкладке JS.
    // Удаляем настройки документа, способные заменить ограничения sandbox/CSP.
    doc.querySelectorAll('script,base,meta[http-equiv],iframe,object,embed,link').forEach(e => e.remove());
    doc.querySelectorAll('*').forEach(element => {
      for (const attr of [...element.attributes]) {
        if (/^on/i.test(attr.name) || attr.name === 'nonce' || attr.name === 'srcdoc') element.removeAttribute(attr.name);
      }
    });
    doc.querySelectorAll('img').forEach(img => {
      if (['hello.svg','assets/hello.svg'].includes(img.getAttribute('src'))) img.src = imageUrl;
    });
    const policy = `default-src 'none'; script-src 'nonce-${nonce}' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`;
    const csp = doc.createElement('meta');
    csp.httpEquiv = 'Content-Security-Policy'; csp.content = policy;
    doc.head.prepend(csp);
    const style = doc.createElement('style');
    style.textContent = 'body{overflow-wrap:anywhere}img{max-width:100%;height:auto}button,input{font:inherit}' + draft.css;
    doc.head.append(style);
    // Источник и одноразовый token проверяются родителем. Это фильтрация чужих
    // сообщений, а не аттестация кода: ученик контролирует собственный sandbox.
    const harness = `
      const errors = [];
      const send = data => parent.postMessage({token:${jsLiteral(token)}, ...data}, '*');
      addEventListener('error', event => {errors.push(event.message || 'Ошибка JavaScript'); send({type:'error', message: errors.at(-1)});});
      addEventListener('unhandledrejection', event => {errors.push(String(event.reason));send({type:'error',message:errors.at(-1)});});
      document.addEventListener('submit', event => event.preventDefault(), true);
      document.addEventListener('click', event => {if(event.target.closest('a')) event.preventDefault();}, true);
      const user = document.createElement('script');
      user.nonce = ${jsLiteral(nonce)}; user.textContent = ${jsLiteral(draft.js)};
      document.body.append(user);
      setTimeout(async () => {
        await Promise.all([...document.images].map(img => img.complete ? Promise.resolve() : new Promise(resolve => {img.onload=resolve;img.onerror=resolve;setTimeout(resolve,700);} )));
        const results = [];
        for(const item of ${jsLiteral(tests)}) {
          try { results.push({label:item.label,pass:!!(new Function('source', 'return ('+item.expression+')'))(${jsLiteral(draft)})}); }
          catch(error) { results.push({label:item.label,pass:false,detail:error.message}); }
        }
        if (errors.length) results.push({label:'Код выполняется без ошибок',pass:false});
        send({type:'result',results,errors});
      }, 100);
    `;
    const script = doc.createElement('script'); script.setAttribute('nonce', nonce);
    script.textContent = text('(() => {' + harness + '})();');
    doc.body.append(script);
    return '<!doctype html>\n' + doc.documentElement.outerHTML;
  }

  function execute(frame, draft, tests, onError = () => {}) {
    const token = crypto.randomUUID();
    // allow-forms нужен для события submit; отправка блокируется CSP form-action.
    frame.setAttribute('sandbox', 'allow-scripts allow-forms');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.title = 'Результат учебного кода';
    return new Promise(resolve => {
      let finished = false;
      const finish = result => {
        if (finished) return;
        finished = true; clearTimeout(timer); removeEventListener('message', listener); resolve(result);
      };
      const listener = event => {
        if (event.source !== frame.contentWindow || event.data?.token !== token) return;
        if (event.data.type === 'error') onError(String(event.data.message));
        if (event.data.type === 'result' && Array.isArray(event.data.results)) finish(event.data);
      };
      const timer = setTimeout(() => finish({results:[{label:'Страница ответила вовремя',pass:false}],errors:['Нет ответа. Исправьте код и повторите запуск.']}), 3500);
      addEventListener('message', listener);
      frame.srcdoc = buildDocument(draft, tests, token);
    });
  }
  window.TrainerRunner = {execute};
})();
