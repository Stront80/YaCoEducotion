/* Один запуск — один Worker. Завершение, ошибка, тайм-аут и ручная остановка
   проходят через finish: Worker уничтожается, URL освобождается, Promise
   завершается один раз. Устаревшие сообщения не попадают в новый запуск. */
(function(){
  'use strict';
  class JSRunner{
    constructor(onState=()=>{}){this.onState=onState;this.active=null;}
    execute({source,checks=[]}){
      this.stop();
      if(typeof source!=='string'||source.length>20000)return Promise.reject(new Error('Код должен содержать не больше 20000 символов.'));
      return new Promise((resolve,reject)=>{
        let worker,url,timer,finished=false;
        const finish=(result,error)=>{
          if(finished)return;finished=true;clearTimeout(timer);worker?.terminate();if(url)URL.revokeObjectURL(url);this.active=null;
          this.onState('ready',error?error.name==='AbortError'?'Остановлено':'Запуск прерван':'Готово к запуску');
          if(error)reject(error);else resolve(result);
        };
        this.active={finish};
        try{
          url=URL.createObjectURL(new Blob([window.JSWorkerSource],{type:'text/javascript'}));
          worker=new Worker(url);
          worker.onmessage=event=>{
            const r=event.data;
            if(r?.type!=='done'||typeof r.stdout!=='string'||r.stdout.length>32000||!Array.isArray(r.results)){finish(null,new Error('Неверный ответ среды выполнения.'));return;}
            finish(r);
          };
          worker.onerror=event=>{event.preventDefault();finish(null,new Error('Ошибка Worker: '+(event.message||'проверьте поддержку браузера и запуск через HTTP.')));};
          worker.onmessageerror=()=>finish(null,new Error('Не удалось прочитать ответ Worker.'));
          timer=setTimeout(()=>{const error=new Error('Лимит 3 секунды. Worker остановлен. Проверьте циклы и ожидание Promise.');error.name='TimeoutError';finish(null,error);},3000);
          this.onState('running','Выполняется · лимит 3 с');
          worker.postMessage({source,checks});
        }catch(error){finish(null,error);}
      });
    }
    stop(){if(this.active){const error=new Error('Выполнение остановлено. Код сохранён, можно запустить снова.');error.name='AbortError';this.active.finish(null,error);}}
  }
  window.JSRunner=JSRunner;
})();
