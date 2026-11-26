// Модульный Worker не имеет DOM. Ресурсы загружаются только из папки проекта;
// автоматическая установка Python-пакетов и loadPackagesFromImports не вызываются.
import {loadPyodide} from './vendor/pyodide/pyodide.mjs';
let python;
try {
  const [runtime, response] = await Promise.all([
    loadPyodide({indexURL:new URL('./vendor/pyodide/',import.meta.url).href,jsglobals:Object.freeze({})}),
    fetch(new URL('./harness.py',import.meta.url))
  ]);
  if(!response.ok)throw new Error('Не удалось загрузить обвязку Python.');
  python=runtime;
  python.runPython(await response.text());
  const version=python.runPython('import sys; sys.version.split()[0]');
  self.postMessage({type:'ready',version});
}catch(error){self.postMessage({type:'load-error',message:String(error.message||error)});}
self.onmessage=event=>{
  const message=event.data;
  if(message?.type!=='execute'||!python||typeof message.id!=='string')return;
  try {
    python.globals.set('__request_json',JSON.stringify(message.request));
    // Возвращаем только JSON: произвольные Python-объекты не попадают в UI.
    const text=python.runPython('json.dumps(trainer_execute(json.loads(__request_json)), ensure_ascii=False)');
    self.postMessage({type:'result',id:message.id,result:JSON.parse(text)});
  }catch(error){self.postMessage({type:'execution-error',id:message.id,message:String(error.message||error)});}
};
