
const fs=require('fs'),vm=require('vm');
const harness=fs.readFileSync('test-quiz.cjs','utf8').split('vm.createContext(ctx);')[0];
vm.runInNewContext(harness+String.raw`
vm.createContext(ctx);vm.runInContext(source,ctx);
function press(key,extra,target){let prevented=false;const event=Object.assign({key,target:target||{tagName:'BODY'},preventDefault(){prevented=true;}},extra);events.keydown(event);events.keyup(event);return prevented;}
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
// Simulate Enter's native click when it is not prevented: stale help focus
// must not reopen help after a numeric answer.
nodes.activity.value='quiz';ctx.begin();
const helpButton=nodes['shortcut-help-toggle'];helpButton.tagName='BUTTON';
press('0');const quizIndex=ctx.index;
if(!press('Enter',{},helpButton))helpButton.click();
assert.equal(ctx.index,quizIndex+1,'Enter advances despite focused help button');
assert.equal(nodes['shortcut-help'].hidden,true,'Enter does not reopen shortcuts');
assert.equal(ctx.locked,false);
for(const id of ['audio','toggle-images','next']){
 ctx.choose(0);const before=ctx.index;nodes[id].tagName='BUTTON';
 assert(press('Enter',{},nodes[id]));assert.equal(ctx.index,before+1);
}
ctx.choose(0);press('h');const helpIndex=ctx.index;
assert.equal(press('Enter',{},helpButton),false,'open help preserves native Enter');
assert.equal(ctx.index,helpIndex);press('Escape');
press('t');assert.equal(press('Enter',{},helpButton),false,'stats preserves native Enter');
assert.equal(ctx.index,helpIndex);press('Escape');
nodes.activity.value='learn';ctx.begin();
const spyIds=['audio','toggle-auto-read','toggle-images','toggle-diagram','pause-auto','study-theme-toggle','change-settings'];
for(const id of spyIds){nodes[id].hidden=false;nodes[id].disabled=false;}
for(const pair of [['a','audio'],['r','toggle-auto-read'],['i','toggle-images'],['g','toggle-diagram'],['p','pause-auto'],['d','study-theme-toggle'],['c','change-settings']]){
 let calls=0;nodes[pair[1]].onclick=()=>calls++;press(pair[0]);assert.equal(calls,1,pair[1]);
 nodes[pair[1]].disabled=true;press(pair[0]);assert.equal(calls,1,'disabled '+pair[1]);nodes[pair[1]].disabled=false;
 nodes[pair[1]].hidden=true;press(pair[0]);assert.equal(calls,1,'hidden '+pair[1]);nodes[pair[1]].hidden=false;
}
let themeCalls=0;nodes['study-theme-toggle'].onclick=()=>themeCalls++;
for(const target of [{tagName:'BODY'},{tagName:'BUTTON'},{tagName:'SELECT'}]){
 for(const event of [{key:'d'},{key:'D'},{key:'Process',code:'KeyD',isComposing:true,keyCode:229},{key:'Unidentified',keyCode:68}]){
  const before=themeCalls;assert(press(event.key,event,target));assert.equal(themeCalls,before+1,'theme works immediately');
 }
}
// A physical press must toggle only on release, including consecutive D presses
// whose keydown was swallowed or rewritten by an input method.
for(const down of [{key:'d',code:'KeyD'},{key:'Process',keyCode:229,isComposing:true},null,{key:'\u0111',isComposing:true}]){
 const before=themeCalls;
 const base={target:{tagName:'BODY'},preventDefault(){}};
 if(down)events.keydown(Object.assign({},base,down));
 assert.equal(themeCalls,before,'keydown must not toggle');
 events.keyup(Object.assign({},base,{key:'d',code:'KeyD'}));
 assert.equal(themeCalls,before+1,'each consecutive release toggles once');
}
const beforeTheme=themeCalls;
for(const target of [{tagName:'INPUT'},{tagName:'TEXTAREA'},{tagName:'DIV',isContentEditable:true}])press('d',{code:'KeyD'},target);
for(const extra of [{ctrlKey:true},{altKey:true},{metaKey:true},{repeat:true}])press('d',extra);
assert.equal(themeCalls,beforeTheme,'text input and browser shortcuts preserved');
const parent=new El('section');parent.hidden=true;nodes.audio.parentNode=parent;
let audioCalls=0;nodes.audio.onclick=()=>audioCalls++;press('a');assert.equal(audioCalls,0,'hidden ancestor');delete nodes.audio.parentNode;
nodes.quiz.hidden=true;nodes.result.hidden=false;nodes.setup.hidden=true;
for(const pair of [['n','next-lesson'],['v','review-lesson'],['q','retry'],['s','again']]){
 let calls=0;nodes[pair[1]].hidden=false;nodes[pair[1]].onclick=()=>calls++;press(pair[0]);assert.equal(calls,1,pair[1]);
}
for(const name of ['index.html','chinese-vocabulary.html','chinese-grammar.html','chinese-radicals.html','hsk-reference.html']){
 const page=fs.readFileSync(name,'utf8');
 for(const id of Object.keys(ctx.shortcutButtons))assert(page.includes('id="'+id+'"'),name+' '+id);
 assert(page.includes('app.js?v=29'));
}
console.log('PASS: shortcut actions, help, stats, result actions, native Enter, modifiers, repeated keys, editable fields, hidden/disabled controls and all five pages.');
`,{require,console});
