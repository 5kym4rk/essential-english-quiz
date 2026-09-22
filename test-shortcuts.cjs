
const fs=require('fs'),vm=require('vm');
const harness=fs.readFileSync('test-quiz.cjs','utf8').split('vm.createContext(ctx);')[0];
vm.runInNewContext(harness+String.raw`
vm.createContext(ctx);vm.runInContext(source,ctx);
function press(key,extra,target){let prevented=false;events.keydown(Object.assign({key,target:target||{tagName:'BODY'},preventDefault(){prevented=true;}},extra));return prevented;}
nodes.activity.value='learn';ctx.begin();
assert.equal(press('ArrowRight'),true);assert.equal(ctx.index,1);
assert.equal(press('Enter',{}, {tagName:'BUTTON'}),false);assert.equal(ctx.index,1);
press('ArrowRight',{repeat:true});assert.equal(ctx.index,1);
press('ArrowRight',{ctrlKey:true});assert.equal(ctx.index,1);
press('ArrowRight',{}, {tagName:'SELECT'});assert.equal(ctx.index,1);
press('ArrowRight',{}, {tagName:'DIV',isContentEditable:true});assert.equal(ctx.index,1);
const imageBefore=ctx.showImages;press('i');assert.equal(ctx.showImages,!imageBefore);
press('h');assert.equal(nodes['shortcut-help'].hidden,false);press('ArrowRight');assert.equal(ctx.index,1);
press('Escape');assert.equal(nodes['shortcut-help'].hidden,true);
press('t');assert.equal(nodes['stats-panel'].hidden,false);press('0');assert.equal(ctx.index,1);
press('b');assert(nodes['stats-book'].focused);press('Escape');assert.equal(nodes['stats-panel'].hidden,true);
const spyIds=['audio','toggle-auto-read','toggle-images','toggle-diagram','pause-auto','study-theme-toggle','change-settings'];
for(const id of spyIds){nodes[id].hidden=false;nodes[id].disabled=false;}
for(const pair of [['a','audio'],['r','toggle-auto-read'],['i','toggle-images'],['g','toggle-diagram'],['p','pause-auto'],['d','study-theme-toggle'],['c','change-settings']]){
 let calls=0;nodes[pair[1]].onclick=()=>calls++;press(pair[0]);assert.equal(calls,1,pair[1]);
 nodes[pair[1]].disabled=true;press(pair[0]);assert.equal(calls,1,'disabled '+pair[1]);nodes[pair[1]].disabled=false;
 nodes[pair[1]].hidden=true;press(pair[0]);assert.equal(calls,1,'hidden '+pair[1]);nodes[pair[1]].hidden=false;
}
const parent=new El('section');parent.hidden=true;nodes.audio.parentNode=parent;
let audioCalls=0;nodes.audio.onclick=()=>audioCalls++;press('a');assert.equal(audioCalls,0,'hidden ancestor');delete nodes.audio.parentNode;
nodes.quiz.hidden=true;nodes.result.hidden=false;nodes.setup.hidden=true;
for(const pair of [['n','next-lesson'],['v','review-lesson'],['q','retry'],['s','again']]){
 let calls=0;nodes[pair[1]].hidden=false;nodes[pair[1]].onclick=()=>calls++;press(pair[0]);assert.equal(calls,1,pair[1]);
}
for(const name of ['index.html','chinese-vocabulary.html','chinese-grammar.html','chinese-radicals.html','hsk-reference.html']){
 const page=fs.readFileSync(name,'utf8');
 for(const id of Object.keys(ctx.shortcutButtons))assert(page.includes('id="'+id+'"'),name+' '+id);
 assert(page.includes('app.js?v=23'));
}
console.log('PASS: shortcut actions, help, stats, result actions, native Enter, modifiers, repeated keys, editable fields, hidden/disabled controls and all five pages.');
`,{require,console});
