const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8'),data=JSON.parse(fs.readFileSync('data.json','utf8'));
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'unique DOM ids');
class El{
 constructor(tag){this.tagName=tag;this.children=[];this.style={};this.hidden=false;this.disabled=false;this.value='';this.classList={add(){},remove(){}};}
 appendChild(n){n.parentNode=this;this.children.push(n);return n;}removeChild(n){this.children.splice(this.children.indexOf(n),1);}
 get firstChild(){return this.children[0];}get lastElementChild(){return this.children[this.children.length-1];}
 add(n){this.appendChild(n);}querySelector(tag){for(const c of this.children){if(c.tagName===tag)return c;const found=c.querySelector(tag);if(found)return found;}return null;}
 getBoundingClientRect(){return {top:0,bottom:500,height:120};}scrollIntoView(){}
}
const nodes={};ids.forEach(id=>nodes[id]=new El('div'));
nodes.book.value='1';nodes.unit.value='0';nodes.mode.value='en';nodes.count.value='10';nodes['auto-next'].value='0';
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
