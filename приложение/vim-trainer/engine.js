/* Учебное подмножество Vim. Только JS-данные, без shell, eval, сети и файлов ОС.
   Позиции считаются в Unicode code points (кириллица не разрезается); ширина
   графем/табуляций и экранные колонки настоящего Vim здесь не моделируются. */
(function(root){
  'use strict';
  const chars=text=>Array.from(text), copy=value=>JSON.parse(JSON.stringify(value));
  const MAX_TEXT=20000,MAX_LINES=400,MAX_HISTORY=50;
  const same=(a,b)=>a.row===b.row&&a.col===b.col;
  const kind=char=>char===undefined?0:/\s/u.test(char)?0:/[\p{L}\p{N}_]/u.test(char)?1:2;
  const tokens={'<Esc>':'Escape','<CR>':'Enter','<Enter>':'Enter','<BS>':'Backspace','<Del>':'Delete','<C-r>':'Ctrl-r','<Left>':'ArrowLeft','<Right>':'ArrowRight','<Up>':'ArrowUp','<Down>':'ArrowDown'};
  class VimModel{
    constructor({text='',row=0,col=0,mode='normal'}={}){
      this.state={lines:text.split('\n'),row,col,mode,saved:text,closed:false,register:{text:'',linewise:false},count:'',operator:'',motionCount:'',waiting:'',command:'',search:'',anchor:null,undo:[],redo:[],insertStart:null,events:[],message:'Нажмите на редактор и попробуйте команду.',error:false,desiredCol:null};
      this.clamp();if(mode==='insert')this.state.insertStart=this.frame();this.validate();
    }
    text(){return this.state.lines.join('\n');}
    dirty(){return this.text()!==this.state.saved;}
    frame(){return {text:this.text(),row:this.state.row,col:this.state.col};}
    get cursor(){return {row:this.state.row,col:this.state.col};}
    line(row=this.state.row){return chars(this.state.lines[row]||'');}
    clamp(){
      const s=this.state;s.row=Math.max(0,Math.min(s.lines.length-1,s.row));
      s.col=Math.max(0,Math.min(Math.max(0,this.line().length-(s.mode==='insert'?0:1)),s.col));
    }
    offset(pos=this.cursor){let result=0;for(let i=0;i<pos.row;i++)result+=chars(this.state.lines[i]).length+1;return result+pos.col;}
    position(offset){let left=Math.max(0,offset);for(let row=0;row<this.state.lines.length;row++){const size=chars(this.state.lines[row]).length;if(left<=size)return {row,col:left};left-=size+1;}const row=this.state.lines.length-1;return {row,col:chars(this.state.lines[row]).length};}
    setText(text){if(text.length>MAX_TEXT||text.split('\n').length>MAX_LINES)throw new Error('Лимит учебного буфера: 20000 символов и 400 строк.');this.state.lines=text.split('\n');}
    at(pos){this.state.row=pos.row;this.state.col=pos.col;this.clamp();}
    tell(message,error=false){this.state.message=message;this.state.error=error;}
    event(type,data={}){this.state.events.push({type,...data});this.state.events=this.state.events.slice(-100);}
    clearPending(){Object.assign(this.state,{count:'',operator:'',motionCount:'',waiting:''});}
    remember(before){if(before.text===this.text())return;this.state.undo.push(before);this.state.undo=this.state.undo.slice(-MAX_HISTORY);this.state.redo=[];}
    edit(action){const before=this.frame();action();this.clamp();this.remember(before);this.state.desiredCol=null;}
    replace(start,end,replacement){const all=chars(this.text());all.splice(start,Math.max(0,end-start),...chars(replacement));this.setText(all.join(''));this.at(this.position(start));}
    insertBegin(pos=this.cursor,before=this.frame()){
      this.state.mode='insert';this.state.anchor=null;this.state.insertStart=before;this.state.row=pos.row;this.state.col=pos.col;this.clamp();this.clearPending();this.tell('INSERT — вводите текст. Esc возвращает в Normal.');this.event('insert');
    }
    insertEnd(){
      const before=this.state.insertStart;this.state.mode='normal';this.state.col=Math.max(0,this.state.col-1);this.state.insertStart=null;this.clamp();if(before)this.remember(before);this.tell('NORMAL — клавиши снова выполняют команды.');
    }
    insert(key){
      const s=this.state,start=this.offset();
      if(key==='Backspace'){
        if(start===0)return true;const before=chars(this.text());before.splice(start-1,1);this.setText(before.join(''));this.at(this.position(start-1));
      }else if(key==='Delete')this.replace(start,start+1,'');
      else if(key==='Enter'){
        const all=chars(this.text());all.splice(start,0,'\n');this.setText(all.join(''));this.at(this.position(start+1));
      }else if(chars(key).length===1){const all=chars(this.text());all.splice(start,0,key);this.setText(all.join(''));this.at(this.position(start+1));}
      else return false;
      this.tell('INSERT — Esc завершает ввод.');return true;
    }
    motion(name,count=1){
      const s=this.state,original=this.cursor,all=chars(this.text());let target={...original};
      if(name==='h')target.col=Math.max(0,target.col-count);
      else if(name==='l')target.col=Math.min(Math.max(0,this.line().length-1),target.col+count);
      else if(name==='j'||name==='k'){
        const desired=s.desiredCol??s.col;target.row=Math.max(0,Math.min(s.lines.length-1,s.row+(name==='j'?count:-count)));target.col=Math.min(desired,Math.max(0,this.line(target.row).length-1));s.desiredCol=desired;
      }else if(name==='0')target.col=0;
      else if(name==='^')target.col=this.firstNonblank(s.row);
      else if(name==='$') {target.row=Math.min(s.lines.length-1,s.row+count-1);target.col=Math.max(0,this.line(target.row).length-1);}
      else if(name==='gg'||name==='G'){target.row=name==='gg'?((s.count||s.motionCount)?count-1:0):((s.count||s.motionCount)?count-1:s.lines.length-1);target.row=Math.max(0,Math.min(s.lines.length-1,target.row));target.col=this.firstNonblank(target.row);}
      else if(['w','b','e'].includes(name)){
        let offset=this.offset();
        for(let n=0;n<count;n++){
          if(name==='w'){
            const type=kind(all[offset]);if(type)while(offset<all.length&&kind(all[offset])===type)offset++;
            while(offset<all.length&&kind(all[offset])===0)offset++;
          }else if(name==='b'){
            offset=Math.max(0,offset-1);while(offset>0&&kind(all[offset])===0)offset--;const type=kind(all[offset]);while(offset>0&&kind(all[offset-1])===type&&type!==0)offset--;
          }else{
            if(offset<all.length-1)offset++;
            while(offset<all.length-1&&kind(all[offset])===0)offset++;const type=kind(all[offset]);while(offset<all.length-1&&kind(all[offset+1])===type&&type!==0)offset++;
          }
        }
        target=this.position(Math.min(offset,all.length));
      }else return null;
      if(!['j','k'].includes(name))s.desiredCol=null;
      return target;
    }
    firstNonblank(row){const line=this.line(row),n=line.findIndex(c=>!/^\s$/u.test(c));return n<0?0:n;}
    lineOperation(op,count){
      const s=this.state,row=s.row,end=Math.min(s.lines.length,row+count),taken=s.lines.slice(row,end).join('\n')+'\n';
      s.register={text:taken,linewise:true};
      if(op==='y'){this.tell('Строки скопированы в учебный регистр.');return;}
      const before=this.frame(),indent=(s.lines[row].match(/^\s*/)||[''])[0];
      s.lines.splice(row,end-row,...(op==='c'?[indent]:[]));if(!s.lines.length)s.lines=[''];s.row=Math.min(row,s.lines.length-1);s.col=op==='c'?chars(indent).length:this.firstNonblank(s.row);
      if(op==='c')this.insertBegin(this.cursor,before);else{this.clamp();this.remember(before);this.tell('Строки удалены.');}
    }
    operate(op,motion,count){
      const s=this.state,start=this.offset(),target=this.motion(motion,count);if(!target){this.tell('Такое движение после оператора пока не поддерживается.',true);return;}
      let finish=this.offset(target),a=Math.min(start,finish),b=Math.max(start,finish);
      if(['j','k','gg','G'].includes(motion)){
        const first=Math.min(s.row,target.row),last=Math.max(s.row,target.row);s.row=first;s.col=0;this.lineOperation(op,last-first+1);return;
      }
      if(['e','$'].includes(motion)&&finish>=start)b=Math.min(chars(this.text()).length,b+1);
      // cw — историческое исключение Vim: меняет слово как ce, сохраняя пробел.
      if(op==='c'&&motion==='w'&&kind(this.line()[s.col])!==0){let off=count>1?this.offset(this.motion('w',count-1)):start;const all=chars(this.text()),type=kind(all[off]);while(off+1<all.length&&kind(all[off+1])===type&&type!==0)off++;b=off+1;}
      // Один dw в конце строки не поглощает перевод строки следующего абзаца.
      if(motion==='w'&&count===1&&target.row>s.row)b=this.offset({row:s.row,col:this.line().length});
      if(a===b){this.tell('В выбранном направлении нет текста.');return;}
      const taken=chars(this.text()).slice(a,b).join('');s.register={text:taken,linewise:false};
      if(op==='y'){this.tell('Текст скопирован в учебный регистр.');return;}
      const before=this.frame();this.replace(a,b,'');
      if(op==='c')this.insertBegin(this.position(a),before);else{this.remember(before);this.tell('Текст удалён.');}
    }
    visualRange(){
      const s=this.state,anchor=s.anchor||this.cursor;
      if(s.mode==='visual-line'){const a=Math.min(anchor.row,s.row),b=Math.max(anchor.row,s.row);return {linewise:true,first:a,last:b,start:this.offset({row:a,col:0}),end:this.offset({row:b,col:this.line(b).length})};}
      const a=this.offset(anchor),b=this.offset();return {linewise:false,start:Math.min(a,b),end:Math.min(chars(this.text()).length,Math.max(a,b)+1)};
    }
    visualOperation(op){
      const s=this.state,range=this.visualRange();s.mode='normal';s.anchor=null;
      if(range.linewise){s.row=range.first;s.col=0;this.lineOperation(op,range.last-range.first+1);return;}
      s.register={text:chars(this.text()).slice(range.start,range.end).join(''),linewise:false};
      if(op==='y'){this.at(this.position(range.start));this.tell('Выделенный текст скопирован.');return;}
      const before=this.frame();this.replace(range.start,range.end,'');
      if(op==='c')this.insertBegin(this.position(range.start),before);else{this.remember(before);this.tell('Выделенный текст удалён.');}
    }
    put(before=false,count=1){
      const s=this.state,register=s.register;if(!register.text){this.tell('Учебный регистр пока пуст.');return;}
      this.edit(()=>{
        if(register.linewise){const lines=register.text.replace(/\n$/,'').split('\n'),add=[];for(let n=0;n<count;n++)add.push(...lines);const row=s.row+(before?0:1);const result=[...s.lines];result.splice(row,0,...add);this.setText(result.join('\n'));s.row=row;s.col=this.firstNonblank(row);}
        else{const offset=this.offset()+(before?0:Math.min(1,this.line().length-s.col));const insert=register.text.repeat(count);this.replace(offset,offset,insert);this.at(this.position(offset+chars(insert).length-1));}
      });this.tell('Текст вставлен из учебного регистра.');
    }
    undo(redo=false){
      const s=this.state,from=redo?s.redo:s.undo,to=redo?s.undo:s.redo;
      if(!from.length){this.tell(redo?'Больше нечего повторять.':'Больше нечего отменять.');return;}
      const frame=from.pop();to.push(this.frame());to.splice(0,Math.max(0,to.length-MAX_HISTORY));this.setText(frame.text);s.row=frame.row;s.col=frame.col;s.mode='normal';this.clamp();this.event(redo?'redo':'undo');this.tell(redo?'Изменение восстановлено.':'Изменение отменено.');
    }
    search(pattern,direction=1){
      if(!pattern){this.tell('Сначала задайте текст через / и Enter.',true);return;}
      const all=chars(this.text()),needle=chars(pattern),matches=[];
      for(let n=0;n<=all.length-needle.length;n++)if(needle.every((c,i)=>all[n+i]===c))matches.push(n);
      if(!matches.length){this.tell('Текст не найден: '+pattern,true);return;}
      const current=this.offset();const next=direction===1?(matches.find(n=>n>current)??matches[0]):([...matches].reverse().find(n=>n<current)??matches.at(-1));
      this.at(this.position(next));this.state.search=pattern;this.state.desiredCol=null;this.event('search',{pattern});this.tell('Найдено: '+pattern+(direction===1&&next<=current?' · поиск с начала':''));
    }
    ex(command){
      const s=this.state,text=command.trim();
      if(['w','wq','x'].includes(text)){s.saved=this.text();this.event('write');this.tell('Виртуальный файл сохранён. Файлы компьютера не изменялись.');if(text!=='w'){s.closed=true;this.event('quit');this.tell('Виртуальный файл сохранён и закрыт.');}}
      else if(text==='q'){if(this.dirty())this.tell('Есть несохранённые изменения. Используйте :wq или :q! для их отбрасывания.',true);else{s.closed=true;this.event('quit');this.tell('Виртуальный файл закрыт.');}}
      else if(text==='q!'){this.setText(s.saved);s.row=0;s.col=0;s.closed=true;this.event('quit-discard');this.tell('Изменения отброшены, виртуальный файл закрыт.');}
      else if(['help','h'].includes(text))this.tell('Поддерживаются :w, :q, :q!, :wq, :x. Полная памятка рядом с редактором.');
      else this.tell('Команда :'+text+' не поддерживается в учебной модели.',true);
    }
    reopen(){this.setText(this.state.saved);Object.assign(this.state,{closed:false,mode:'normal',row:0,col:0,undo:[],redo:[],anchor:null,insertStart:null});this.clearPending();this.tell('Сохранённый виртуальный файл открыт.');}
    key(key){
      const snapshot=this.snapshot();
      try{this.state.error=false;this.dispatch(key);this.clamp();this.validate();return !this.state.error;}
      catch(error){this.state=snapshot;this.tell(error.message||'Не удалось выполнить действие.',true);return false;}
    }
    dispatch(key){
      const s=this.state;
      if(s.closed){this.tell('Виртуальный файл закрыт. Нажмите «Открыть файл».',true);return;}
      if(key==='Escape'){
        if(s.mode==='insert')this.insertEnd();else{s.mode='normal';s.anchor=null;s.command='';this.tell('NORMAL — команда отменена.');}
        this.clearPending();this.event('escape');return;
      }
      if(s.mode==='command'||s.mode==='search'){
        if(key==='Enter'){const mode=s.mode,command=s.command;s.mode='normal';s.command='';if(mode==='command')this.ex(command);else if(command)this.search(command);else this.search(s.search);}
        else if(key==='Backspace'){if(!s.command){s.mode='normal';this.tell('Командная строка закрыта.');}else s.command=chars(s.command).slice(0,-1).join('');}
        else if(chars(key).length===1){if(s.command.length>=200)this.tell('Командная строка ограничена 200 символами.',true);else s.command+=key;}
        else this.tell('В командной строке доступны текст, Enter, Backspace и Esc.',true);return;
      }
      if(s.mode==='insert'){
        if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key)){
          const dr=key==='ArrowDown'?1:key==='ArrowUp'?-1:0;s.row=Math.max(0,Math.min(s.lines.length-1,s.row+dr));if(key==='ArrowLeft')s.col--;if(key==='ArrowRight')s.col++;this.clamp();return;
        }
        if(!this.insert(key))this.tell('В Insert доступны текст, Enter, Backspace, Delete и Esc.',true);return;
      }
      key=({ArrowLeft:'h',ArrowRight:'l',ArrowUp:'k',ArrowDown:'j'})[key]||key;
      const visual=s.mode==='visual'||s.mode==='visual-line';
      if(visual&&['d','x','y','c'].includes(key)){this.visualOperation(key==='x'?'d':key);this.clearPending();return;}
      if(s.waiting==='r'){
        const count=Number(s.count)||1;this.clearPending();if(chars(key).length!==1){this.tell('После r введите один символ.',true);return;}
        if(s.col+count>this.line().length){this.tell('Недостаточно символов для замены.',true);return;}
        this.edit(()=>{const line=this.line();line.splice(s.col,count,...Array(count).fill(key));s.lines[s.row]=line.join('');s.col+=count-1;});this.tell('Символ заменён.');return;
      }
      if(/^\d$/.test(key)&&(key!=='0'||s.operator&&s.motionCount||!s.operator&&s.count)){
        const field=s.operator?'motionCount':'count';const text=s[field]+key;if(Number(text)>99){this.clearPending();this.tell('Учебный счётчик ограничен числом 99.',true);}else s[field]=text;return;
      }
      let motion=key;
      if(s.waiting==='g'){s.waiting='';if(key!=='g'){this.clearPending();this.tell('После g поддерживается только gg.',true);return;}motion='gg';}
      else if(key==='g'){s.waiting='g';return;}
      const count=(Number(s.count)||1)*(Number(s.motionCount)||1);
      if(s.operator){const op=s.operator;if(key===op&&motion!=='gg')this.lineOperation(op,count);else this.operate(op,motion,count);this.clearPending();return;}
      const target=this.motion(motion,count);
      if(target){this.at(target);this.clearPending();this.tell('Курсор: строка '+(s.row+1)+', столбец '+(s.col+1));return;}
      this.clearPending();
      if(key==='v'||key==='V'){
        const mode=key==='v'?'visual':'visual-line';if(s.mode===mode){s.mode='normal';s.anchor=null;}else{if(!visual)s.anchor=this.cursor;s.mode=mode;this.event('visual',{linewise:mode==='visual-line'});}this.tell(s.mode==='normal'?'NORMAL':'VISUAL — выделяйте движениями, затем y/d/c.');return;
      }
      if(visual){this.tell('В Visual доступны движения и y/d/c, выход — Esc.',true);return;}
      if(['d','y','c'].includes(key)){s.operator=key;s.count=count===1?'':String(count);return;}
      if(['i','a','I','A','o','O'].includes(key)){
        if(count!==1){this.tell('Счётчик перед Insert-командами в модели не поддерживается.',true);return;}
        const before=this.frame();let pos=this.cursor;
        if(key==='a')pos={row:s.row,col:Math.min(this.line().length,s.col+1)};
        if(key==='I')pos={row:s.row,col:this.firstNonblank(s.row)};
        if(key==='A')pos={row:s.row,col:this.line().length};
        if(key==='o'||key==='O'){const row=s.row+(key==='o'?1:0),lines=[...s.lines];lines.splice(row,0,'');this.setText(lines.join('\n'));pos={row,col:0};}
        this.insertBegin(pos,before);return;
      }
      if(key==='x'||key==='Delete'){
        if(!this.line().length){this.tell('Строка пуста.');return;}
        const start=this.offset(),end=start+Math.min(count,this.line().length-s.col);s.register={text:chars(this.text()).slice(start,end).join(''),linewise:false};this.edit(()=>this.replace(start,end,''));this.tell('Символы удалены.');return;
      }
      if(key==='r'){s.waiting='r';s.count=count===1?'':String(count);return;}
      if(key==='D'||key==='C'){this.operate(key==='D'?'d':'c','$',count);return;}
      if(key==='p'||key==='P'){this.put(key==='P',count);return;}
      if(key==='u'||key==='Ctrl-r'){for(let n=0;n<count;n++)this.undo(key==='Ctrl-r');return;}
      if(key==='/'||key===':'){s.mode=key==='/'?'search':'command';s.command='';this.tell(key==='/'?'Введите буквальный текст поиска и Enter.':'Введите команду без начального двоеточия.');return;}
      if(key==='n'||key==='N'){for(let n=0;n<count;n++)this.search(s.search,key==='n'?1:-1);return;}
      this.tell(/[а-яё]/i.test(key)?'В Normal переключите раскладку на латинскую. Русский текст вводится в Insert.':'Клавиша '+key+' не поддерживается. Смотрите памятку.',true);
    }
    feed(notation){
      let rest=notation;while(rest){const token=Object.keys(tokens).find(t=>rest.startsWith(t));if(token){this.key(tokens[token]);rest=rest.slice(token.length);}else{const char=chars(rest)[0];this.key(char==='\n'?'Enter':char);rest=rest.slice(char.length);}}return this;
    }
    type(text){
      if(typeof text!=='string'||text.length>2000){this.tell('Один ввод текста ограничен 2000 символами.',true);return this;}
      text=text.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
      // Вставка блока атомарна и не копирует историю для каждой буквы. Это
      // важно для мобильного ввода, IME и буфера обмена на длинных строках.
      if(this.state.mode==='insert'&&!this.state.closed){
        const before=this.snapshot(),offset=this.offset();
        try{this.replace(offset,offset,text);this.at(this.position(offset+chars(text).length));this.tell('INSERT — Esc завершает ввод.');this.validate();}
        catch(error){this.state=before;this.tell(error.message,true);}
      }else for(const char of chars(text))this.key(char==='\n'?'Enter':char);
      return this;
    }
    snapshot(){return copy(this.state);}
    validate(){
      const s=this.state,modes=['normal','insert','visual','visual-line','command','search'];
      const frameValid=f=>f&&typeof f.text==='string'&&f.text.length<=MAX_TEXT&&f.text.split('\n').length<=MAX_LINES&&Number.isInteger(f.row)&&Number.isInteger(f.col)&&f.row>=0&&f.col>=0;
      if(!s||!Array.isArray(s.lines)||!s.lines.length||s.lines.length>MAX_LINES||s.lines.some(l=>typeof l!=='string'||/[\n\r]/.test(l))||s.lines.join('\n').length>MAX_TEXT)throw new Error('Некорректный учебный буфер.');
      if(!modes.includes(s.mode)||!Number.isInteger(s.row)||s.row<0||s.row>=s.lines.length||!Number.isInteger(s.col)||s.col<0||s.col>chars(s.lines[s.row]).length)throw new Error('Некорректная позиция или режим.');
      if(typeof s.saved!=='string'||s.saved.length>MAX_TEXT||s.saved.split('\n').length>MAX_LINES||s.saved.includes('\r')||typeof s.closed!=='boolean'||!s.register||typeof s.register.text!=='string'||s.register.text.length>MAX_TEXT+1||typeof s.register.linewise!=='boolean')throw new Error('Некорректное сохранение или регистр.');
      for(const field of ['count','operator','motionCount','waiting','command','search','message'])if(typeof s[field]!=='string'||s[field].length>2000)throw new Error('Некорректная команда.');
      for(const field of ['undo','redo'])if(!Array.isArray(s[field])||s[field].length>MAX_HISTORY||!s[field].every(frameValid))throw new Error('Некорректная история отмены.');
      if(s.insertStart!==null&&!frameValid(s.insertStart))throw new Error('Некорректный блок вставки.');
      if(s.anchor!==null&&(!Number.isInteger(s.anchor.row)||!Number.isInteger(s.anchor.col)||s.anchor.row<0||s.anchor.row>=s.lines.length||s.anchor.col<0||s.anchor.col>chars(s.lines[s.anchor.row]).length))throw new Error('Некорректное выделение.');
      if(!Array.isArray(s.events)||s.events.length>100||s.events.some(e=>!e||typeof e.type!=='string')||typeof s.error!=='boolean'||!(s.desiredCol===null||Number.isInteger(s.desiredCol)&&s.desiredCol>=0&&s.desiredCol<=MAX_TEXT))throw new Error('Некорректные метаданные.');
    }
    static restore(snapshot){const model=new VimModel();model.state=copy(snapshot);model.validate();model.clamp();return model;}
  }
  const api={VimModel,tokens};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.VimWorkshop=api;
})(typeof globalThis!=='undefined'?globalThis:this);
