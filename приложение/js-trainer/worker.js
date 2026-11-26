/* Функция превращается в Blob-Worker: CSP родительского документа наследуется.
   Учебный код не исполняется в DOM приложения. Это не защита от вредоносного
   кода: Worker остаётся контекстом этого origin и может расходовать память. */
(function(root){
  function workerMain(){
    'use strict';
    const send=self.postMessage.bind(self);
    const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
    let started=false;
    self.onmessage=async event=>{
      if(started)return;started=true;
      const {source,checks}=event.data;
      let stdout='';
      function format(value){
        if(typeof value==='string')return value;
        if(typeof value==='undefined')return 'undefined';
        if(typeof value==='bigint')return String(value)+'n';
        if(typeof value==='function')return '[Function]';
        if(typeof value==='symbol')return String(value);
        const seen=new WeakSet();
        try{return JSON.stringify(value,(_,v)=>{
          if(typeof v==='bigint')return String(v)+'n';
          if(typeof v==='object'&&v!==null){if(seen.has(v))return '[Circular]';seen.add(v);}return v;
        })??String(value);}catch{return '[Не удалось вывести значение]';}
      }
      const consoleProxy={};
      for(const method of ['log','info','warn','error','debug'])consoleProxy[method]=(...values)=>{
        const line=values.map(format).join(' ')+'\n';
        if(stdout.length+line.length>32000){const e=new Error('Вывод превысил 32000 символов.');e.name='OutputLimitError';throw e;}
        stdout+=line;
      };
      // Лексические const/let пользователя доступны условиям проверки в конце
      // той же async-функции. Выражения условий — собственные материалы курса.
      // Сгенерированное имя уменьшает случайные конфликты с кодом ученика.
      const slot='__course_'+Math.random().toString(36).slice(2);
      const tail='\n;const '+slot+'=[];\n'+checks.map(c=>
        'try {'+slot+'.push({label:'+JSON.stringify(c.label)+',pass:!!('+c.expression+')});} catch(e) {'+slot+'.push({label:'+JSON.stringify(c.label)+',pass:false,detail:String(e.message).slice(0,500)});}'
      ).join('\n')+'\nreturn '+slot+';';
      try{
        const run=new AsyncFunction('console','getOutput','"use strict";\n'+source+tail);
        const results=await run(consoleProxy,()=>stdout);
        send({type:'done',stdout,results:Array.isArray(results)?results:[],error:null});
      }catch(error){
        send({type:'done',stdout,results:[],error:{type:String(error?.name||'Error').slice(0,100),message:String(error?.message??error).slice(0,2000)}});
      }
    };
  }
  const source='('+workerMain.toString()+')();';
  if(typeof module!=='undefined')module.exports={source};else root.JSWorkerSource=source;
})(globalThis);
