/* Один Worker на запуск исключает утечку переменных/изменённых модулей между
   программами. Остановка terminate() работает и для while True, без COOP/COEP
   или SharedArrayBuffer. Таймер начинается после загрузки интерпретатора. */
(function(){
  'use strict';
  class PythonRunner {
    constructor(onStatus=()=>{}){this.worker=null;this.pending=null;this.onStatus=onStatus;this.state='idle';this.version='';}
    status(state,message=''){this.state=state;this.onStatus(state,message);}
    prepare(){
      if(this.ready)return this.ready;
      this.status('loading','Загрузка локального Python…');
      const worker=new Worker('./worker.mjs',{type:'module'});this.worker=worker;
      this.ready=new Promise((resolve,reject)=>{
        this.rejectLoad=reject;
        const timer=setTimeout(()=>{if(this.worker!==worker)return;this.fail('Python не загрузился за 30 секунд. Проверьте локальный сервер и повторите.');},30000);
        this.loadTimer=timer;
        worker.onerror=()=>{if(this.worker===worker)this.fail('Не удалось загрузить Python. Запустите сайт через локальный HTTP-сервер.');};
        worker.onmessage=event=>{
          if(this.worker!==worker)return;
          const data=event.data;
          if(data?.type==='ready'){clearTimeout(timer);this.rejectLoad=null;this.version=data.version;this.status('ready','Python '+this.version+' готов');resolve();}
          else if(data?.type==='load-error')this.fail('Ошибка загрузки: '+data.message);
          else if(this.pending&&data.id===this.pending.id){
            if(data.type==='result'){
              const pending=this.pending;this.pending=null;clearTimeout(pending.timer);
              this.dispose();this.status('idle','Готов к следующему запуску');pending.resolve(data.result);
            }else if(data.type==='execution-error')this.fail(data.message);
          }
        };
      });
      // prepare может предварительно вызываться UI: потребитель сообщает ошибку,
      // а обработчик исключает unhandledrejection до следующего явного запуска.
      this.ready.catch(()=>{});return this.ready;
    }
    dispose(){clearTimeout(this.loadTimer);if(this.worker)this.worker.terminate();this.worker=null;this.ready=null;this.rejectLoad=null;}
    fail(message){
      const loadReject=this.rejectLoad,pending=this.pending;this.pending=null;if(pending)clearTimeout(pending.timer);
      this.dispose();this.status('error',message);if(loadReject)loadReject(new Error(message));if(pending)pending.reject(new Error(message));
    }
    stop(){
      const loadReject=this.rejectLoad,pending=this.pending;this.pending=null;if(pending)clearTimeout(pending.timer);
      this.dispose();this.status('stopped','Выполнение остановлено. Код сохранён.');
      const error=new Error('Выполнение остановлено. Код сохранён.');error.name='AbortError';
      if(loadReject)loadReject(error);if(pending)pending.reject(error);
    }
    async execute(request,{timeout=5000}={}){
      if(this.pending||this.executing)throw new Error('Дождитесь текущего запуска или остановите его.');
      if(typeof request.source!=='string'||request.source.length>20000)throw new Error('Код ограничен 20000 символами.');
      if(typeof request.stdin!=='string'||request.stdin.length>10000)throw new Error('Входные данные ограничены 10000 символами.');
      this.executing=true;
      try{
        await this.prepare();this.status('running','Выполняется Python…');
        return await new Promise((resolve,reject)=>{
          const id=crypto.randomUUID();
          const timer=setTimeout(()=>this.fail('Превышено время выполнения (5 секунд). Проверьте условия циклов.'),timeout);
          this.pending={id,resolve,reject,timer};this.worker.postMessage({type:'execute',id,request});
        });
      }finally{this.executing=false;}
    }
  }
  window.PythonRunner=PythonRunner;
})();
