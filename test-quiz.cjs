const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8'),data=JSON.parse(fs.readFileSync('data.json','utf8'));
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'unique DOM ids');
class El{
 constructor(tag){this.tagName=tag;this.children=[];this.style={};this.hidden=false;this.disabled=false;this.value='';this.classList={add(){},remove(){}};}
 appendChild(n){n.parentNode=this;this.children.push(n);return n;}removeChild(n){this.children.splice(this.children.indexOf(n),1);}
 get firstChild(){return this.children[0];}get lastElementChild(){return this.children[this.children.length-1];}
 setAttribute(k,v){this[k]=v;}focus(){}
 add(n){this.appendChild(n);}querySelector(tag){for(const c of this.children){if(c.tagName===tag)return c;const found=c.querySelector(tag);if(found)return found;}return null;}
 getBoundingClientRect(){return {top:0,bottom:500,height:120};}scrollIntoView(){}
}
const nodes={};ids.forEach(id=>nodes[id]=new El('div'));
nodes['stats-panel'].hidden=true;nodes['quiz'].hidden=true;
nodes.activity.value='quiz';nodes.book.value='1';nodes.unit.value='0';nodes.mode.value='en';nodes['auto-next'].value='0';
const events={},intervals=new Map();let timerid=0;
const ctx={console,JSON,Math,Date,document:{hidden:false,body:new El('body'),getElementById:id=>{assert(nodes[id],id);return nodes[id];},createElement:tag=>new El(tag),addEventListener:(k,f)=>events[k]=f},window:{innerHeight:720,matchMedia:()=>({matches:false}),addEventListener(){},scrollTo(){}},localStorage:{getItem(){return null;},setItem(){}},Option:function(t,v){this.textContent=t;this.value=v;},XMLHttpRequest:function(){this.open=()=>{};this.send=()=>{this.status=200;this.responseText=JSON.stringify(data);this.onload();};},Audio:function(){this.play=()=>undefined;this.pause=()=>{};},requestAnimationFrame:f=>{f();return 1;},cancelAnimationFrame(){},setInterval:f=>{intervals.set(++timerid,f);return timerid;},clearInterval:id=>intervals.delete(id)};
vm.createContext(ctx);vm.runInContext(source,ctx);
assert.equal(ctx.words.length,3600);assert.equal(nodes.start.disabled,false);
ctx.begin();assert.equal(nodes.options.children.length,4);assert.deepEqual(nodes.options.children.map(b=>b.children[0].textContent),[0,1,2,3]);
function key(k){events.keydown({key:k,target:{tagName:'BODY'},preventDefault(){}});}
key('4');assert.equal(ctx.answers.length,0);key('0');assert.equal(ctx.answers.length,1);assert.equal(ctx.answers[0].selected.id,ctx.choices[0].id);key('3');assert.equal(ctx.answers.length,1);
assert.equal(intervals.size,0);ctx.advance();key('3');assert.equal(ctx.answers[1].selected.id,ctx.choices[3].id);
ctx.begin();nodes['auto-next'].value='8';key('1');assert.equal(intervals.size,1);
for(let i=0;i<8;i++){Array.from(intervals.values()).forEach(f=>f());}assert.equal(ctx.index,1);assert.equal(intervals.size,0);assert.equal(ctx.locked,false);
key('2');nodes['pause-auto'].onclick();assert.equal(intervals.size,0);
ctx.advance();key('0');assert.equal(intervals.size,1);ctx.document.hidden=true;events.visibilitychange();assert.equal(intervals.size,0);ctx.document.hidden=false;
ctx.begin();assert.equal(ctx.index,0);assert.equal(intervals.size,0);
ctx.index=ctx.queue.length-1;key('0');ctx.advance();assert.equal(nodes.result.hidden,false);assert.equal(nodes['study-panel'].hidden,true);assert.equal(intervals.size,0);
nodes['auto-next'].value='0';nodes.mode.value='vi';ctx.begin();assert.equal(ctx.mode,'vi');assert.equal(nodes.audio.hidden,true);key('2');assert.equal(nodes.audio.hidden,false);nodes.audio.onclick();
assert(!source.includes('?.'));assert(!source.includes('=>'));assert(!source.includes('replaceChildren'));assert(!source.includes('\\p{'));assert(!source.includes('fetch('));
console.log('PASS: 0-3 keyboard mapping, duplicate-answer lock, both quiz modes, old audio return value, auto-next/off/pause/background/manual/restart/finish, 3600 words loaded through XHR, unique DOM IDs.');
try{require('acorn').parse(source,{ecmaVersion:5});console.log('PASS: ES5 parser');}catch(e){if(e.code==='MODULE_NOT_FOUND')console.log('ES5 parser unavailable locally');else throw e;}

const storage={};ctx.localStorage.getItem=k=>Object.prototype.hasOwnProperty.call(storage,k)?storage[k]:null;ctx.localStorage.setItem=(k,v)=>storage[k]=v;
ctx.studyStats={version:1,completedSessions:0,lessons:{}};ctx.statsMemoryOnly=false;
const unitA=data.filter(w=>w.book===1&&w.unit===1),unitB=data.filter(w=>w.book===1&&w.unit===2);
function startStatsQuiz(items){ctx.begin();ctx.queue=items;ctx.index=0;ctx.answers=[];ctx.sessionRecorded=false;ctx.render();}
function answerAll(){for(let i=0;i<ctx.queue.length;i++){ctx.choose(0);if(i<ctx.queue.length-1)ctx.advance();}}
startStatsQuiz([unitA[0],unitA[1]]);ctx.choose(0);assert.equal(ctx.studyStats.completedSessions,0,'incomplete is not counted');
ctx.advance();ctx.choose(0);assert.equal(ctx.studyStats.completedSessions,1);assert.equal(ctx.studyStats.lessons['1-1'].sessions,1,'one lesson once per quiz');
ctx.finish();ctx.finish();assert.equal(ctx.studyStats.completedSessions,1,'finish cannot double count');
startStatsQuiz([unitA[0],unitB[0],unitA[1]]);answerAll();assert.equal(ctx.studyStats.completedSessions,2);assert.equal(ctx.studyStats.lessons['1-1'].sessions,2);assert.equal(ctx.studyStats.lessons['1-2'].sessions,1,'mixed lesson counted');
startStatsQuiz([unitB[1]]);answerAll();assert.equal(ctx.studyStats.lessons['1-2'].sessions,2,'new retry quiz counts once');
startStatsQuiz([unitA[0],unitB[0]]);ctx.choose(0);ctx.begin();assert.equal(ctx.studyStats.completedSessions,3,'abandoned session does not count');
ctx.studyStats={version:1,completedSessions:0,lessons:{}};ctx.readStudyStats();assert.equal(ctx.studyStats.completedSessions,3,'reload retains saved totals');
nodes['stats-book'].value='1';ctx.renderStudyStats();assert.equal(nodes['stats-chart'].children.length,30);
nodes['stats-book'].value='6';ctx.renderStudyStats();assert.equal(nodes['stats-chart'].children.length,29,'source deck has 29 actual groups');
const before=ctx.answers.length;ctx.openStudyStats();key('0');assert.equal(ctx.answers.length,before,'stats screen blocks quiz shortcuts');ctx.closeStudyStats();
ctx.localStorage.getItem=()=>{throw Error('private browsing');};ctx.localStorage.setItem=()=>{throw Error('quota');};
startStatsQuiz([unitA[0]]);answerAll();const temporaryCount=ctx.studyStats.completedSessions;ctx.readStudyStats();assert.equal(ctx.studyStats.completedSessions,temporaryCount,'blocked storage retains in-memory stats');
assert(ctx.statsStorageWarning.length>0);startStatsQuiz([unitA[0]]);answerAll();assert.equal(ctx.studyStats.completedSessions,temporaryCount+1,'continued study works with blocked storage');
assert.throws(()=>ctx.parseStudyStats('{invalid'));const cleaned=ctx.parseStudyStats(JSON.stringify({version:1,completedSessions:-1,lessons:{'1-1':{sessions:-5},'1-2':{sessions:2.9},'__proto__':{},'7-1':{sessions:3}}}));
assert.equal(cleaned.completedSessions,0);assert.equal(cleaned.lessons['1-2'].sessions,2);assert(!cleaned.lessons['7-1']);
const natives=process.binding('natives'),acornKey=Object.keys(natives).find(k=>/acorn\/dist\/acorn$/.test(k));if(acornKey){const parser={};vm.runInNewContext(natives[acornKey],parser);parser.acorn.parse(source,{ecmaVersion:5});}
console.log('PASS: completed/partial/retry/mixed quizzes, duplicate protection, saved reload, blocked storage, chart lesson counts, safe parsing, ES5 syntax.');

ctx.localStorage.getItem=k=>Object.prototype.hasOwnProperty.call(storage,k)?storage[k]:null;
ctx.localStorage.setItem=(k,v)=>storage[k]=v;
ctx.begin();assert.equal(ctx.showImages,true);assert(nodes['question-image'].querySelector('img'));
nodes['toggle-images'].onclick();assert.equal(ctx.showImages,false);assert.equal(nodes['question-image'].hidden,true);assert.equal(nodes['question-image'].children.length,0);assert.equal(ctx.readImagePreference(),false);
ctx.choose(0);const answerCount=ctx.answers.length,oldIndex=ctx.index;
nodes['toggle-images'].onclick();assert(nodes['question-image'].querySelector('img'));assert.equal(ctx.answers.length,answerCount);assert.equal(ctx.index,oldIndex);assert.equal(ctx.locked,true);assert.equal(ctx.readImagePreference(),true);
nodes['toggle-images'].onclick();ctx.advance();assert.equal(nodes['question-image'].children.length,0,'hidden preference survives next question');
ctx.localStorage.getItem=()=>{throw Error('blocked');};ctx.localStorage.setItem=()=>{throw Error('blocked');};
assert.equal(ctx.readImagePreference(),true);nodes['toggle-images'].onclick();assert(nodes['question-image'].querySelector('img'));
console.log('PASS: image toggle, persistence, next-question preference, preserved answer state, blocked storage.');

ctx.localStorage.getItem=k=>Object.prototype.hasOwnProperty.call(storage,k)?storage[k]:null;
ctx.localStorage.setItem=(k,v)=>storage[k]=v;
ctx.statsMemoryOnly=false;ctx.readStudyStats();
nodes.activity.value='learn';nodes.book.value='1';nodes.unit.value='1';nodes['auto-next'].value='5';
ctx.updateActivitySetup();assert.equal(nodes['quiz-settings'].hidden,true);
ctx.begin();assert.equal(ctx.activity,'learn');assert.equal(ctx.queue.length,20,'learn all selected lesson words');
assert.equal(nodes['learn-meaning'].textContent,ctx.queue[0].meaning);assert.equal(nodes.options.hidden,true);assert.equal(nodes['previous-word'].disabled,true);
key('0');assert.equal(ctx.answers.length,0);assert.equal(intervals.size,0,'learning has no quiz auto timer');
key('ArrowLeft');assert.equal(ctx.index,0);key('ArrowRight');assert.equal(ctx.index,1);key('ArrowLeft');assert.equal(ctx.index,0);
const previousReading=ctx.studyStats.readingSessions||0,previousQuiz=ctx.studyStats.completedSessions;
for(let i=0;i<20;i++)key('ArrowRight');
assert.equal(nodes.result.hidden,false);assert.equal(ctx.studyStats.readingSessions,previousReading+1);
assert.equal(ctx.studyStats.completedSessions,previousQuiz,'reading is not quiz score');
ctx.finishLearning();assert.equal(ctx.studyStats.readingSessions,previousReading+1,'no duplicate completion');
ctx.readStudyStats();assert.equal(ctx.studyStats.readingSessions,previousReading+1,'reading persisted');
ctx.begin();key('ArrowRight');ctx.begin();assert.equal(ctx.studyStats.readingSessions,previousReading+1,'unfinished reading is not counted');
nodes.activity.value='quiz';ctx.updateActivitySetup();ctx.begin();assert.equal(ctx.activity,'quiz');assert.equal(nodes.options.hidden,false);assert.equal(nodes['learn-content'].hidden,true);key('0');assert.equal(ctx.answers.length,1);
console.log('PASS: learning meanings, full lesson order, arrow navigation/bounds, no quiz answers/timer, completed reading statistics, quiz switching.');

let autoPlays=0,autoPauses=0;
ctx.Audio=function(){this.play=()=>{autoPlays++;return undefined;};this.pause=()=>{autoPauses++;};};
ctx.document.hidden=false;nodes.activity.value='learn';nodes.book.value='1';nodes.unit.value='1';ctx.autoRead=false;
ctx.begin();assert.equal(autoPlays,0);
nodes['toggle-auto-read'].onclick();assert.equal(autoPlays,1);assert.equal(ctx.readAutoReadPreference(),true);
ctx.advance();assert.equal(autoPlays,2);assert(autoPauses>0);
nodes['toggle-auto-read'].onclick();ctx.advance();assert.equal(autoPlays,2);assert.equal(ctx.readAutoReadPreference(),false);
nodes.activity.value='quiz';nodes.mode.value='vi';ctx.autoRead=true;ctx.begin();assert.equal(autoPlays,2,'reverse quiz does not reveal word through audio');
ctx.choose(0);assert.equal(autoPlays,3);ctx.advance();assert.equal(autoPlays,3);
nodes.mode.value='en';ctx.begin();assert.equal(autoPlays,4);
ctx.document.hidden=true;events.visibilitychange();ctx.maybeAutoRead();assert.equal(autoPlays,4);ctx.document.hidden=false;
const card=ctx.queue[ctx.index],sound=card.audio;delete card.audio;ctx.maybeAutoRead();assert.equal(autoPlays,4);card.audio=sound;
ctx.Audio=function(){this.play=()=>({'catch':f=>f()});this.pause=()=>{};};ctx.playCardAudio(true);assert(nodes['audio-status'].textContent.length>0,'blocked autoplay gives manual playback hint');
ctx.localStorage.getItem=()=>{throw Error('blocked');};ctx.localStorage.setItem=()=>{throw Error('blocked');};assert.equal(ctx.readAutoReadPreference(),false);nodes['toggle-auto-read'].onclick();
console.log('PASS: auto-read toggle, saved preference, learning navigation, quiz directions, missing audio, background stop, blocked playback/storage.');

ctx.autoRead=false;nodes.activity.value='learn';nodes.book.value='0';nodes.unit.value='0';ctx.begin();
assert.equal(ctx.learningPlan.length,179);assert.equal(ctx.queue.length,20);assert(ctx.queue.every(w=>w.book===1&&w.unit===1));
const firstLessonCount=ctx.queue.length;for(let i=0;i<firstLessonCount;i++)ctx.advance();assert.equal(nodes['next-lesson'].hidden,false);
nodes['next-lesson'].onclick();assert.equal(ctx.learningLessonIndex,1);assert(ctx.queue.every(w=>w.book===1&&w.unit===2));assert.equal(nodes.book.value,'1');assert.equal(nodes.unit.value,'2');
const learnedIds=ctx.queue.map(w=>w.id).sort();const secondLessonCount=ctx.queue.length;for(let i=0;i<secondLessonCount;i++)ctx.advance();nodes['review-lesson'].onclick();assert.equal(ctx.activity,'quiz');assert.deepEqual(ctx.queue.map(w=>w.id).sort(),learnedIds);
console.log('PASS: all-lessons learning is split by original quiz lessons, next lesson, and exact same-card review.');

nodes.activity.value='quiz';nodes.book.value='6';nodes.unit.value='14';ctx.begin();assert.equal(ctx.queue.length,40,'quiz includes all cards in the original 40-card lesson');nodes.unit.value='0';ctx.begin();assert.equal(ctx.queue.length,600,'all lessons include the entire selected book');assert(!html.includes('id="count"'));console.log('PASS: full lesson and full book quizzes, no question-count control.');
