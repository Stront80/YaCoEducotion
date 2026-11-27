/* Чистые функции каталога. Они не меняют сохранения мастерских и используются
   и интерфейсом, и тестами: фильтрация, маршруты и сводка прогресса. */
(function(root){
  'use strict';
  const accents=['blue','amber','violet','coral','green','teal','slate'];
  function validate(value){
    if(value?.version!==1||value.brand!=='YaCoEducation'||!Array.isArray(value.workshops)||!value.workshops.length||value.workshops.length>60)throw new Error('Неверный формат каталога.');
    const ids=new Set(),keys=new Set();
    for(const w of value.workshops){
      // Разрешены только два точных маршрута: локального сервера и сборки.
      // Относительный путь сохраняет префикс проекта на GitHub Pages.
      if(!w||!/^([a-z][a-z0-9-]{0,39})$/.test(w.id)||ids.has(w.id)||!['/workshops/'+w.id+'/', './workshops/'+w.id+'/'].includes(w.url)||!accents.includes(w.accent)||!Number.isInteger(w.lessonCount)||w.lessonCount<1||w.lessonCount>1000)throw new Error('Неверная запись мастерской.');
      ids.add(w.id);
      for(const name of ['title','subtitle','category','badge','mode','description','level'])if(typeof w[name]!=='string'||!w[name].trim()||w[name].length>500)throw new Error('Неверное описание мастерской.');
      if(!Array.isArray(w.topics)||w.topics.length<1||w.topics.length>5||w.topics.some(t=>typeof t!=='string'||!t.trim()||t.length>40))throw new Error('Неверные темы.');
      if(w.progress!==null){const p=w.progress;if(!p||p.version!==1||typeof p.storageKey!=='string'||!/^[a-z][a-z0-9-]{0,99}$/.test(p.storageKey)||p.storageKey==='yacoeducation-v1'||keys.has(p.storageKey)||!Array.isArray(p.lessonIds)||p.lessonIds.length!==w.lessonCount||new Set(p.lessonIds).size!==w.lessonCount||p.lessonIds.some(id=>typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(id)))throw new Error('Неверные настройки прогресса.');keys.add(p.storageKey);}
    }
    if(!Array.isArray(value.paths)||value.paths.length>12||value.paths.some(p=>!p||typeof p.title!=='string'||typeof p.description!=='string'||!Array.isArray(p.workshops)||p.workshops.length<1||p.workshops.some(id=>!ids.has(id))))throw new Error('Неверный учебный маршрут.');
    return value;
  }
  function progress(workshop,storage){
    const total=workshop.lessonCount;
    if(!workshop.progress)return {count:0,total,status:'untracked'};
    try{
      const raw=storage.getItem(workshop.progress.storageKey);
      if(!raw)return {count:0,total,status:'empty'};
      if(raw.length>6000000)throw new Error('Размер');const value=JSON.parse(raw);
      if(value?.version!==workshop.progress.version||!Array.isArray(value.completed))throw new Error('Формат');
      const valid=new Set(workshop.progress.lessonIds),count=new Set(value.completed.filter(id=>valid.has(id))).size;
      return {count,total,status:count===total?'done':count?'active':'empty'};
    }catch{return {count:0,total,status:'unavailable'};}
  }
  const normalize=text=>String(text).normalize('NFKC').toLowerCase().replaceAll('ё','е').replace(/[^\p{L}\p{N}+#]+/gu,' ').trim();
  function filter(workshops,{query='',category='',status='all'}={},states={}){
    const words=normalize(query).split(/\s+/).filter(Boolean);
    return workshops.filter(w=>{
      const text=normalize([w.id,w.title,w.subtitle,w.category,w.description,...w.topics].join(' ').replace(/javascript/gi,'javascript js'));
      const p=states[w.id]||{status:'empty'};
      return (!category||w.category===category)&&words.every(word=>text.includes(word))&&(status==='all'||(status==='new'&&p.status==='empty')||(status==='active'&&p.status==='active')||(status==='done'&&p.status==='done'));
    });
  }
  function route(hash,workshops){
    if(!hash||hash==='#'||hash==='#/')return {kind:'catalog'};
    const match=hash.match(/^#\/workshop\/([a-z][a-z0-9-]{0,39})$/);
    if(match){const workshop=workshops.find(w=>w.id===match[1]);if(workshop)return {kind:'workshop',workshop};}
    return {kind:'missing'};
  }
  const api={validate,progress,filter,route,normalize};if(typeof module!=='undefined')module.exports=api;else root.EducationCore=api;
})(globalThis);
