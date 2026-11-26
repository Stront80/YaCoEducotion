// Собственные фиксированные примеры для сравнения с Vim без пользовательского vimrc.
const {VimModel}=require('../engine.js');
const cases=[
 ['insert','abc','iHi <Esc>'],['append','abc','A!<Esc>'],['open','top\nbottom','omiddle<Esc>'],
 ['replace','cot!','lra$x'],['delete-word','red green blue','dw'],['delete-end','red green blue','de'],
 ['count-operator','one two three four','2dw'],['operator-count','one two three four','d2w'],
 ['combined-count','one two three four five','2d2w'],['change-word','slow editor','cwfast<Esc>'],
 ['one-letter-change','a word','cwX<Esc>'],['delete-lines','a\nb\nc\nd','j2dd'],
 ['yank-lines','item\nend','yyp'],['put-before','abc','xP'],['put-after','abc','x$p'],
 ['visual-char','abcde','vllx'],['visual-line','a\nb\nc\nd','jVjd'],
 ['search','start\ncat one\ncat two','/cat<CR>n'],['undo-redo','ready','A!<Esc>u<C-r>'],
 ['word-punctuation','one, two three','wwe'],['file-start-end','a\nb\nc','Ggg'],
 ['end-line-delete','one\ntwo','dw'],['backward-delete','one two','wd0'],
 ['line-change','one two','c$new<Esc>']
];
process.stdout.write(JSON.stringify(cases.map(([id,text,sequence])=>{const m=new VimModel({text}).feed(sequence);return {id,text,sequence,expected:{lines:m.state.lines,row:m.state.row,col:m.state.col}};})));
